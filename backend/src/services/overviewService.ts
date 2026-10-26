import type { PipelineStage } from 'mongoose';
import { DestinationMapping } from '../database/models/DestinationMapping';
import { Event } from '../database/models/Event';
import { Source } from '../database/models/Source';
import { Website } from '../database/models/Website';
import { AppError } from '../middleware/errorHandler';

export type OverviewInterval = 'day' | 'week' | 'month';

export interface OverviewQuery {
  websiteId?: string;
  eventName?: string;
  from?: Date;
  to?: Date;
  interval?: OverviewInterval;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 400;

function validTimeZone(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

// Bucket key for a date in the workspace timezone: YYYY-MM-DD (day, or the Sunday starting
// the week) or YYYY-MM. Mirrors the $dateToString keys produced by the aggregation.
function bucketKey(date: Date, interval: OverviewInterval, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  const [year, month, day] = [Number(get('year')), Number(get('month')), Number(get('day'))];
  if (interval === 'month') return `${year}-${String(month).padStart(2, '0')}`;
  const local = new Date(Date.UTC(year, month - 1, day));
  if (interval === 'week') local.setUTCDate(local.getUTCDate() - local.getUTCDay());
  return local.toISOString().slice(0, 10);
}

function bucketKeys(from: Date, to: Date, interval: OverviewInterval, timeZone: string): string[] {
  const keys = new Set<string>();
  // 6h steps survive DST shifts; the Set collapses repeats.
  for (let t = from.getTime(); t < to.getTime(); t += 6 * 60 * 60 * 1000) keys.add(bucketKey(new Date(t), interval, timeZone));
  keys.add(bucketKey(new Date(to.getTime() - 1), interval, timeZone));
  return [...keys];
}

function bucketExpression(interval: OverviewInterval, timezone: string) {
  if (interval === 'month') return { $dateToString: { format: '%Y-%m', date: '$created_at', timezone } };
  const date = interval === 'week'
    ? { $dateTrunc: { date: '$created_at', unit: 'week', timezone, startOfWeek: 'sunday' } }
    : '$created_at';
  return { $dateToString: { format: '%Y-%m-%d', date, timezone } };
}

// Legacy pixel events keep the IP in location_info; processed events also copy it to `ip`.
const IP_EXPRESSION = { $ifNull: ['$ip', '$location_info.ip_address'] };
const HAS_IP = { $and: [{ $ne: ['$_id.ip', null] }, { $ne: ['$_id.ip', ''] }] };

function countFacets(): Record<string, PipelineStage.FacetPipelineStage[]> {
  return {
    total: [{ $count: 'n' }],
    visitors: [{ $group: { _id: '$visitor_id' } }, { $count: 'n' }],
    ips: [{ $match: { ip: { $nin: [null, ''] } } }, { $group: { _id: '$ip' } }, { $count: 'n' }],
    sessions: [{ $group: { _id: '$session_id' } }, { $count: 'n' }],
  };
}

interface CountResult { total: { n: number }[]; visitors: { n: number }[]; ips: { n: number }[]; sessions: { n: number }[] }
function readCounts(result: CountResult | undefined) {
  return {
    events: result?.total[0]?.n || 0,
    unique_users: result?.ips[0]?.n || 0,
    unique_visitors: result?.visitors[0]?.n || 0,
    sessions: result?.sessions[0]?.n || 0,
  };
}

export async function getEventOverview(userId: string, query: OverviewQuery) {
  const websites = await Website.find({ user_id: userId }).select('_id workspace_id timezone').lean<{
    _id: string; workspace_id?: string | null; timezone?: string;
  }[]>();
  if (query.websiteId && !websites.some(website => website._id === query.websiteId)) {
    throw new AppError(404, 'Website not found');
  }
  const scoped = query.websiteId ? websites.filter(website => website._id === query.websiteId) : websites;
  const websiteIds = scoped.map(website => website._id);
  const workspaceIds = [...new Set(scoped.map(website => website.workspace_id).filter((id): id is string => !!id))];
  const timezone = validTimeZone(scoped.length === 1 ? scoped[0].timezone : 'UTC');
  const interval: OverviewInterval = query.interval || 'day';

  const to = query.to || new Date();
  const from = query.from || new Date(to.getTime() - 30 * DAY_MS);
  if (from >= to) throw new AppError(400, '"from" must be before "to"');
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) throw new AppError(400, `Date range cannot exceed ${MAX_RANGE_DAYS} days`);
  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));

  const serverSourceIds = workspaceIds.length
    ? (await Source.find({ workspace_id: { $in: workspaceIds }, type: 'server' }).select('_id').lean<{ _id: string }[]>()).map(s => s._id)
    : [];
  const baseMatch: Record<string, unknown> = { website_id: { $in: websiteIds } };
  if (query.eventName) baseMatch.event_name = query.eventName;
  const project: PipelineStage.Project = {
    $project: {
      event_name: 1, visitor_id: 1, session_id: 1, created_at: 1,
      ip: IP_EXPRESSION,
      server: { $in: ['$source_id', serverSourceIds] },
    },
  };

  const [current, previous, mappings] = await Promise.all([
    Event.aggregate([
      { $match: { ...baseMatch, created_at: { $gte: from, $lt: to } } },
      project,
      {
        $facet: {
          ...countFacets(),
          trend: [
            {
              $group: {
                _id: { bucket: bucketExpression(interval, timezone), ip: '$ip' },
                web: { $sum: { $cond: ['$server', 0, 1] } },
                server: { $sum: { $cond: ['$server', 1, 0] } },
              },
            },
            {
              $group: {
                _id: '$_id.bucket',
                web: { $sum: '$web' },
                server: { $sum: '$server' },
                unique_users: { $sum: { $cond: [HAS_IP, 1, 0] } },
              },
            },
          ],
          events: [
            {
              $group: {
                _id: { name: '$event_name', ip: '$ip' },
                total: { $sum: 1 },
                web: { $sum: { $cond: ['$server', 0, 1] } },
                server: { $sum: { $cond: ['$server', 1, 0] } },
                last_seen: { $max: '$created_at' },
              },
            },
            {
              $group: {
                _id: '$_id.name',
                total: { $sum: '$total' },
                web: { $sum: '$web' },
                server: { $sum: '$server' },
                last_seen: { $max: '$last_seen' },
                unique_users: { $sum: { $cond: [HAS_IP, 1, 0] } },
              },
            },
            { $sort: { total: -1 } },
            { $limit: 200 },
          ],
        },
      },
    ]).allowDiskUse(true),
    Event.aggregate([
      { $match: { ...baseMatch, created_at: { $gte: previousFrom, $lt: from } } },
      project,
      { $facet: countFacets() },
    ]).allowDiskUse(true),
    workspaceIds.length
      ? DestinationMapping.aggregate([
        { $match: { workspace_id: { $in: workspaceIds }, enabled: true } },
        { $group: { _id: '$source_event', destinations: { $addToSet: '$destination_id' } } },
      ])
      : Promise.resolve([]),
  ]);

  const result = current[0];
  const destinationsByEvent = new Map<string, number>(
    mappings.map((row: { _id: string; destinations: string[] }) => [row._id, row.destinations.length])
  );
  const trendByBucket = new Map<string, { web: number; server: number; unique_users: number }>(
    (result?.trend || []).map((row: { _id: string; web: number; server: number; unique_users: number }) => [row._id, row])
  );

  return {
    range: { from: from.toISOString(), to: to.toISOString(), interval, timezone },
    totals: readCounts(result),
    previous: readCounts(previous[0]),
    trend: bucketKeys(from, to, interval, timezone).map(bucket => ({
      bucket,
      web: trendByBucket.get(bucket)?.web || 0,
      server: trendByBucket.get(bucket)?.server || 0,
      unique_users: trendByBucket.get(bucket)?.unique_users || 0,
    })),
    events: (result?.events || []).map((row: {
      _id: string; total: number; web: number; server: number; last_seen: Date; unique_users: number;
    }) => ({
      name: row._id,
      total: row.total,
      unique_users: row.unique_users,
      last_seen: row.last_seen,
      sources: [...(row.web ? ['Browser'] : []), ...(row.server ? ['Server-side'] : [])],
      destinations: destinationsByEvent.get(row._id) || 0,
    })),
  };
}
