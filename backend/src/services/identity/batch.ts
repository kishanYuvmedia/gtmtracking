import type { AnyBulkWriteOperation } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '../../database/models/Event';
import { Identity, type IdentityType } from '../../database/models/Identity';
import { IdentityConflict } from '../../database/models/IdentityConflict';
import { Profile } from '../../database/models/Profile';
import { ProfileMerge } from '../../database/models/ProfileMerge';
import { ProfileTraitChange } from '../../database/models/ProfileTraitChange';
import { displayName, extractIdentifiers, extractTraits, identityKey, isEmptyTrait, type IdentifiableEvent, type Identifier } from './extract';
import { planResolution, type CandidateProfile } from './plan';
import { conflictFingerprint } from './resolver';
import { getIdentitySettings } from './settings';
import { rebuildProfileSummaries } from './summary';

interface MemoryProfile extends CandidateProfile {
  lastSeen: Date;
  traits: Record<string, unknown>;
  keys: Set<string>;
}

interface RerunStats {
  events: number;
  eventsWithoutIdentifiers: number;
  profiles: number;
  identities: number;
  merges: number;
  conflicts: number;
}

const WRITE_BATCH = 1_000;
const safeTraitKey = (key: string) => !!key && !key.includes('.') && !key.startsWith('$');
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function insertInBatches(model: { insertMany: (docs: object[], options: object) => Promise<unknown> }, docs: object[]) {
  for (let i = 0; i < docs.length; i += WRITE_BATCH) await model.insertMany(docs.slice(i, i + WRITE_BATCH), { ordered: false });
}

/**
 * Rebuilds a workspace's identity graph from scratch by replaying every event in time order
 * through the same planResolution() rules the live worker uses. Profiles, identities,
 * merges, trait history and conflicts for the workspace are deleted and re-derived.
 */
export async function rerunIdentityResolution(
  workspaceId: string,
  log: (message: string) => void = () => {},
): Promise<RerunStats> {
  const settings = await getIdentitySettings(workspaceId);
  const scope = { workspace_id: workspaceId };

  const owners = new Map<string, string>();
  const identityMeta = new Map<string, { identifier: Identifier; first: Date; last: Date }>();
  const profiles = new Map<string, MemoryProfile>();
  const parent = new Map<string, string>();
  const assignments = new Map<string, string[]>();
  const merges: { merged_id: string; survivor_id: string; identifier: Identifier; event_id: string; merged_at: Date }[] = [];
  const traitChanges: { profile_id: string; key: string; old_value: unknown; new_value: unknown; event_id: string; source: string; changed_at: Date }[] = [];
  const conflicts = new Map<string, { profile_ids: string[]; values: string[]; linking: Identifier[]; first_event: string; last_event: string; count: number; at: Date }>();
  const stats: RerunStats = { events: 0, eventsWithoutIdentifiers: 0, profiles: 0, identities: 0, merges: 0, conflicts: 0 };
  const find = (id: string): string => {
    let current = id;
    while (parent.has(current)) current = parent.get(current)!;
    return current;
  };

  const cursor = Event.find(scope).sort({ timestamp: 1, _id: 1 })
    .select('_id event_id event_type anonymous_id visitor_id user_id properties payload context page_info url_params click_ids timestamp created_at')
    .lean<(IdentifiableEvent & { _id: string; event_id: string; timestamp?: Date; created_at: Date })[]>()
    .cursor({ batchSize: 2_000 });

  for await (const event of cursor) {
    stats.events++;
    if (stats.events % 20_000 === 0) log(`  replayed ${stats.events.toLocaleString()} events`);
    const ts = event.timestamp || event.created_at;
    const identifiers = extractIdentifiers(event, settings);
    if (!identifiers.length) {
      stats.eventsWithoutIdentifiers++;
      continue;
    }

    const plan = planResolution(identifiers, owners, profiles);
    if (plan.conflict) {
      const fingerprint = conflictFingerprint(plan.conflict.userIds);
      const existing = conflicts.get(fingerprint);
      if (existing) {
        existing.count++;
        existing.last_event = event.event_id;
        existing.profile_ids = [...new Set([...existing.profile_ids, ...plan.conflict.profileIds])];
        for (const link of plan.conflict.linking) {
          if (!existing.linking.some(item => identityKey(item) === identityKey(link))) existing.linking.push(link);
        }
      } else {
        conflicts.set(fingerprint, {
          profile_ids: plan.conflict.profileIds, values: [...plan.conflict.userIds].sort(), linking: plan.conflict.linking,
          first_event: event.event_id, last_event: event.event_id, count: 1, at: ts,
        });
      }
    }

    let survivorId = plan.survivorId;
    if (!survivorId) {
      survivorId = uuidv4();
      profiles.set(survivorId, { id: survivorId, firstSeen: ts, createdAt: ts, lastSeen: ts, userIds: [], traits: {}, keys: new Set() });
    }
    const survivor = profiles.get(survivorId)!;

    if (plan.merges.length) {
      const involved = [survivor, ...plan.merges.map(merge => profiles.get(merge.profileId)!)]
        .sort((a, b) => a.lastSeen.getTime() - b.lastSeen.getTime());
      const folded: Record<string, unknown> = {};
      for (const profile of involved) {
        for (const [key, value] of Object.entries(profile.traits)) if (!isEmptyTrait(value)) folded[key] = value;
      }
      for (const [key, value] of Object.entries(folded)) {
        if (!sameValue(survivor.traits[key], value)) {
          traitChanges.push({ profile_id: survivorId, key, old_value: survivor.traits[key] ?? null, new_value: value, event_id: event.event_id, source: 'merge', changed_at: ts });
        }
      }
      survivor.traits = folded;
      for (const merge of plan.merges) {
        const merged = profiles.get(merge.profileId)!;
        for (const key of merged.keys) {
          owners.set(key, survivorId);
          survivor.keys.add(key);
        }
        survivor.userIds = [...new Set([...survivor.userIds, ...merged.userIds])];
        if (merged.firstSeen < survivor.firstSeen) survivor.firstSeen = merged.firstSeen;
        if (merged.lastSeen > survivor.lastSeen) survivor.lastSeen = merged.lastSeen;
        parent.set(merged.id, survivorId);
        profiles.delete(merged.id);
        merges.push({ merged_id: merged.id, survivor_id: survivorId, identifier: merge.identifier, event_id: event.event_id, merged_at: ts });
      }
    }

    for (const identifier of plan.attach) {
      const key = identityKey(identifier);
      owners.set(key, survivorId);
      survivor.keys.add(key);
      identityMeta.set(key, { identifier, first: ts, last: ts });
      if (identifier.type === 'user_id' && !survivor.userIds.includes(identifier.value)) survivor.userIds.push(identifier.value);
    }
    for (const identifier of identifiers) {
      const key = identityKey(identifier);
      if (owners.get(key) !== survivorId) continue;
      const meta = identityMeta.get(key)!;
      if (ts > meta.last) meta.last = ts;
      if (ts < meta.first) meta.first = ts;
    }

    for (const [key, value] of Object.entries(extractTraits(event))) {
      if (!safeTraitKey(key) || isEmptyTrait(value) || sameValue(survivor.traits[key], value)) continue;
      traitChanges.push({ profile_id: survivorId, key, old_value: survivor.traits[key] ?? null, new_value: value, event_id: event.event_id, source: 'event', changed_at: ts });
      survivor.traits[key] = value;
    }
    if (ts > survivor.lastSeen) survivor.lastSeen = ts;

    const list = assignments.get(survivorId) || [];
    list.push(event._id);
    assignments.set(survivorId, list);
  }

  log(`  writing ${profiles.size.toLocaleString()} profiles`);
  for (const model of [Profile, Identity, ProfileMerge, ProfileTraitChange, IdentityConflict] as { deleteMany: (filter: object) => Promise<unknown> }[]) {
    await model.deleteMany(scope);
  }

  await insertInBatches(Profile, [...profiles.values()].map(profile => ({
    _id: profile.id, workspace_id: workspaceId, traits: profile.traits, name: displayName(profile.traits),
    first_seen: profile.firstSeen, last_seen: profile.lastSeen, event_count: 0, lock_version: 0,
    created_at: profile.createdAt, updated_at: new Date(),
  })));
  await insertInBatches(Identity, [...identityMeta.entries()].map(([key, meta]) => ({
    _id: uuidv4(), workspace_id: workspaceId, profile_id: owners.get(key)!, type: meta.identifier.type as IdentityType,
    value: meta.identifier.value, first_seen: meta.first, last_seen: meta.last, created_at: meta.first,
  })));
  await insertInBatches(ProfileMerge, merges.map(merge => ({
    _id: uuidv4(), workspace_id: workspaceId, survivor_id: find(merge.survivor_id), merged_id: merge.merged_id,
    reason: `${merge.identifier.type} matched`, identifier: merge.identifier, event_id: merge.event_id, merged_at: merge.merged_at,
  })));
  await insertInBatches(ProfileTraitChange, traitChanges.map(change => ({ _id: uuidv4(), workspace_id: workspaceId, ...change, profile_id: find(change.profile_id) })));
  await insertInBatches(IdentityConflict, [...conflicts.entries()].map(([fingerprint, conflict]) => ({
    _id: uuidv4(), workspace_id: workspaceId, event_id: conflict.first_event, last_event_id: conflict.last_event,
    profile_ids: [...new Set(conflict.profile_ids.map(find))], conflicting_type: 'user_id', conflicting_values: conflict.values,
    linking_identifiers: conflict.linking, fingerprint, occurrences: conflict.count, last_seen_at: conflict.at,
    resolved: false, created_at: conflict.at,
  })));

  log('  re-linking events');
  await Event.updateMany(scope, { $set: { profile_id: null } });
  const operations: AnyBulkWriteOperation[] = [];
  for (const [profileId, eventIds] of assignments) {
    const target = find(profileId);
    for (let i = 0; i < eventIds.length; i += WRITE_BATCH) {
      operations.push({ updateMany: { filter: { _id: { $in: eventIds.slice(i, i + WRITE_BATCH) } }, update: { $set: { profile_id: target } } } });
    }
    if (operations.length >= 500) await Event.bulkWrite(operations.splice(0), { ordered: false });
  }
  if (operations.length) await Event.bulkWrite(operations, { ordered: false });

  log('  rebuilding profile summaries');
  await rebuildProfileSummaries(workspaceId);

  stats.profiles = profiles.size;
  stats.identities = identityMeta.size;
  stats.merges = merges.length;
  stats.conflicts = conflicts.size;
  return stats;
}
