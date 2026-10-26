import type { ClientSession, PipelineStage } from 'mongoose';
import { Event } from '../../database/models/Event';
import { Identity, STRONG_IDENTITY_TYPES } from '../../database/models/Identity';
import { Profile } from '../../database/models/Profile';

export const PURCHASE_EVENT_NAMES = ['purchase', 'order completed', 'order_completed', 'checkout_completed'];

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function isPurchase(eventName: string): boolean {
  return PURCHASE_EVENT_NAMES.includes(eventName.toLowerCase());
}

export function purchaseValue(properties: unknown): number {
  const props = record(properties);
  const value = Number(props.value ?? props.revenue ?? props.total ?? 0);
  return Number.isFinite(value) ? value : 0;
}

const hasKeys = (field: string) => ({ $gt: [{ $size: { $objectToArray: { $ifNull: [field, {}] } } }, 0] });
const IS_PURCHASE = { $in: [{ $toLower: '$event_name' }, PURCHASE_EVENT_NAMES] };
const PURCHASE_VALUE = {
  $convert: {
    input: { $ifNull: ['$properties.value', { $ifNull: ['$properties.revenue', '$properties.total'] }] },
    to: 'double', onError: 0, onNull: 0,
  },
};

/**
 * Recomputes summary columns from events + identities and $merges them into profiles.
 * Pass profileIds to refresh specific profiles (after a merge); omit to rebuild a workspace.
 */
export async function rebuildProfileSummaries(workspaceId: string, profileIds?: string[]): Promise<void> {
  const profileMatch = profileIds ? { $in: profileIds } : { $ne: null };
  const eventPipeline: PipelineStage[] = [
    { $match: { workspace_id: workspaceId, profile_id: profileMatch } },
    {
      $set: {
        _has_utm: { $cond: [hasKeys('$utm'), 1, 0] },
        _has_location: { $cond: [{ $gt: ['$country', null] }, 1, 0] },
        _has_device: { $cond: [hasKeys('$device'), 1, 0] },
      },
    },
    {
      $group: {
        _id: '$profile_id',
        first_seen: { $min: '$timestamp' },
        last_seen: { $max: '$timestamp' },
        event_count: { $sum: 1 },
        sessions: { $addToSet: '$session_id' },
        first_utm: { $top: { sortBy: { _has_utm: -1, timestamp: 1 }, output: { has: '$_has_utm', utm: '$utm' } } },
        last_utm: { $top: { sortBy: { _has_utm: -1, timestamp: -1 }, output: { has: '$_has_utm', utm: '$utm' } } },
        location: {
          $top: {
            sortBy: { _has_location: -1, timestamp: -1 },
            output: { has: '$_has_location', country: '$country', city: '$location_info.city' },
          },
        },
        device: { $top: { sortBy: { _has_device: -1, timestamp: -1 }, output: { has: '$_has_device', device: '$device' } } },
        revenue: { $sum: { $cond: [IS_PURCHASE, PURCHASE_VALUE, 0] } },
        order_count: { $sum: { $cond: [IS_PURCHASE, 1, 0] } },
        last_purchase_at: { $max: { $cond: [IS_PURCHASE, '$timestamp', null] } },
      },
    },
    {
      $project: {
        first_seen: 1, last_seen: 1, event_count: 1, revenue: 1, order_count: 1, last_purchase_at: 1,
        session_count: { $size: '$sessions' },
        first_utm: { $cond: [{ $eq: ['$first_utm.has', 1] }, '$first_utm.utm', null] },
        last_utm: { $cond: [{ $eq: ['$last_utm.has', 1] }, '$last_utm.utm', null] },
        country: { $cond: [{ $eq: ['$location.has', 1] }, '$location.country', null] },
        city: { $cond: [{ $eq: ['$location.has', 1] }, { $ifNull: ['$location.city', null] }, null] },
        device: { $cond: [{ $eq: ['$device.has', 1] }, '$device.device', null] },
      },
    },
    { $merge: { into: Profile.collection.collectionName, on: '_id', whenMatched: 'merge', whenNotMatched: 'discard' } },
  ];

  const firstOfType = (type: string) => ({
    $ifNull: [{ $getField: { field: 'value', input: { $first: { $filter: { input: '$ids', cond: { $eq: ['$$this.type', type] } } } } } }, null],
  });
  const identityPipeline: PipelineStage[] = [
    { $match: { workspace_id: workspaceId, profile_id: profileMatch } },
    { $sort: { last_seen: -1 } },
    { $group: { _id: '$profile_id', ids: { $push: { type: '$type', value: '$value' } } } },
    {
      $project: {
        email: firstOfType('email'),
        phone: firstOfType('phone'),
        user_id: firstOfType('user_id'),
        device_count: { $size: { $filter: { input: '$ids', cond: { $eq: ['$$this.type', 'anonymous_id'] } } } },
        is_known: { $gt: [{ $size: { $filter: { input: '$ids', cond: { $in: ['$$this.type', STRONG_IDENTITY_TYPES] } } } }, 0] },
      },
    },
    { $merge: { into: Profile.collection.collectionName, on: '_id', whenMatched: 'merge', whenNotMatched: 'discard' } },
  ];

  await Event.aggregate(eventPipeline).allowDiskUse(true);
  await Identity.aggregate(identityPipeline).allowDiskUse(true);
}

export interface SummaryEvent {
  _id: string;
  event_name: string;
  session_id: string;
  timestamp: Date;
  properties?: unknown;
  utm?: Record<string, unknown> | null;
  country?: string | null;
  location_info?: unknown;
  device?: Record<string, unknown> | null;
}

/** O(1) summary update for one newly processed event (no merge involved). */
export async function applyEventToSummary(
  workspaceId: string,
  profileId: string,
  event: SummaryEvent,
  session?: ClientSession,
): Promise<void> {
  const newSession = !(await Event.exists({
    workspace_id: workspaceId, profile_id: profileId, session_id: event.session_id, _id: { $ne: event._id },
  }).session(session || null));
  const ts = event.timestamp;
  const purchase = isPurchase(event.event_name);
  const utm = event.utm && Object.keys(event.utm).length ? event.utm : null;
  const isLatest = { $gte: [ts, '$last_seen'] };
  const update: Record<string, unknown> = {
    first_seen: { $cond: [{ $eq: ['$event_count', 0] }, ts, { $min: ['$first_seen', ts] }] },
    last_seen: { $cond: [{ $eq: ['$event_count', 0] }, ts, { $max: ['$last_seen', ts] }] },
    event_count: { $add: ['$event_count', 1] },
    session_count: { $add: [{ $ifNull: ['$session_count', 0] }, newSession ? 1 : 0] },
  };
  if (utm) {
    update.first_utm = {
      $cond: [{ $or: [{ $eq: [{ $ifNull: ['$first_utm', null] }, null] }, { $lt: [ts, '$first_seen'] }] }, { $literal: utm }, '$first_utm'],
    };
    update.last_utm = { $cond: [isLatest, { $literal: utm }, '$last_utm'] };
  }
  if (event.country) {
    update.country = { $cond: [isLatest, event.country, '$country'] };
    const city = record(event.location_info).city;
    if (typeof city === 'string') update.city = { $cond: [isLatest, city, '$city'] };
  }
  if (event.device && Object.keys(event.device).length) {
    update.device = { $cond: [isLatest, { $literal: event.device }, '$device'] };
  }
  if (purchase) {
    update.revenue = { $add: [{ $ifNull: ['$revenue', 0] }, purchaseValue(event.properties)] };
    update.order_count = { $add: [{ $ifNull: ['$order_count', 0] }, 1] };
    update.last_purchase_at = { $max: [{ $ifNull: ['$last_purchase_at', null] }, ts] };
  }
  await Profile.updateOne({ _id: profileId, workspace_id: workspaceId }, [{ $set: update }], { session, updatePipeline: true });
}
