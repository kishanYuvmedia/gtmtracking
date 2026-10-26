import mongoose, { type ClientSession } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '../../database/models/Event';
import { Identity, STRONG_IDENTITY_TYPES } from '../../database/models/Identity';
import { IdentityConflict } from '../../database/models/IdentityConflict';
import { Profile } from '../../database/models/Profile';
import { ProfileMerge } from '../../database/models/ProfileMerge';
import { ProfileTraitChange } from '../../database/models/ProfileTraitChange';
import { displayName, identityKey, isEmptyTrait, type Identifier } from './extract';
import { planResolution, type CandidateProfile } from './plan';

export interface ResolveInput {
  workspaceId: string;
  identifiers: Identifier[];
  traits?: Record<string, unknown>;
  eventId?: string | null;
  timestamp: Date;
}

export interface ResolveResult {
  profileId: string;
  created: boolean;
  mergedIds: string[];
  backfilledEvents: number;
  conflict: boolean;
}

interface ProfileRow {
  _id: string;
  first_seen: Date;
  last_seen: Date;
  created_at: Date;
  traits: Record<string, unknown>;
}

const MAX_ATTEMPTS = 6;
const BACKFILL_MIN_AGE_MS = 10 * 60 * 1000;

function isRetryable(error: unknown): boolean {
  const e = error as { code?: number; errorLabels?: string[]; hasErrorLabel?: (label: string) => boolean } | null;
  if (!e) return false;
  return e.code === 11000 // two workers inserted the same new identity; re-read and attach
    || e.code === 112 // WriteConflict: another transaction holds one of our profiles
    || !!e.hasErrorLabel?.('TransientTransactionError')
    || !!e.errorLabels?.includes('TransientTransactionError');
}

/** One conflict row per set of clashing user_ids, however many profiles/events hit it. */
export const conflictFingerprint = (userIds: string[]) => `user_id:${[...userIds].sort().join(',')}`;

// Trait keys become Mongo field paths (traits.<key>); refuse ones that would change the path.
const safeTraitKey = (key: string) => !!key && !key.includes('.') && !key.startsWith('$');
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Resolves an event's identifiers to one profile inside a transaction: creates, attaches,
 * merges (oldest survives) or logs a user_id conflict. Retries on write conflicts, which is
 * how concurrent workers serialise on the same profile.
 */
export async function resolveIdentity(
  input: ResolveInput,
  // Runs inside the same transaction (so under the same profile lock) once the profile is
  // known: link the event to it here so a concurrent merge can never strand the event.
  // May run more than once if the transaction retries.
  inTransaction?: (result: ResolveResult, session: ClientSession) => Promise<void>,
): Promise<ResolveResult> {
  if (!input.identifiers.length) throw new Error('resolveIdentity needs at least one identifier');
  for (let attempt = 1; ; attempt++) {
    const session = await mongoose.startSession();
    try {
      let result: ResolveResult | undefined;
      await session.withTransaction(async () => {
        result = await resolveInSession(input, session);
        if (inTransaction) await inTransaction(result, session);
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      return result!;
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, 10 * attempt + Math.random() * 40));
    } finally {
      await session.endSession();
    }
  }
}

async function resolveInSession(input: ResolveInput, session: ClientSession): Promise<ResolveResult> {
  const { workspaceId, identifiers, timestamp } = input;
  const scope = { workspace_id: workspaceId };

  const matches = await Identity.find({ ...scope, $or: identifiers.map(({ type, value }) => ({ type, value })) })
    .select('type value profile_id').session(session).lean<{ type: string; value: string; profile_id: string }[]>();
  const owners = new Map(matches.map(match => [`${match.type}:${match.value}`, match.profile_id]));
  const matchedIds = [...new Set(matches.map(match => match.profile_id))];

  const rows = new Map<string, ProfileRow>();
  const candidates = new Map<string, CandidateProfile>();
  if (matchedIds.length) {
    // Row lock: the first write of every transaction touching these profiles.
    await Profile.updateMany({ ...scope, _id: { $in: matchedIds } }, { $inc: { lock_version: 1 } }, { session });
    const profiles = await Profile.find({ ...scope, _id: { $in: matchedIds } })
      .select('_id first_seen last_seen created_at traits').session(session).lean<ProfileRow[]>();
    const userIds = await Identity.find({ ...scope, profile_id: { $in: matchedIds }, type: 'user_id' })
      .select('profile_id value').session(session).lean<{ profile_id: string; value: string }[]>();
    for (const profile of profiles) {
      rows.set(profile._id, profile);
      candidates.set(profile._id, {
        id: profile._id,
        firstSeen: profile.first_seen,
        createdAt: profile.created_at,
        userIds: userIds.filter(row => row.profile_id === profile._id).map(row => row.value),
      });
    }
  }

  const plan = planResolution(identifiers, owners, candidates);

  if (plan.conflict) {
    await IdentityConflict.updateOne(
      { ...scope, fingerprint: conflictFingerprint(plan.conflict.userIds) },
      {
        $setOnInsert: {
          _id: uuidv4(),
          event_id: input.eventId || null,
          conflicting_type: 'user_id',
          conflicting_values: [...plan.conflict.userIds].sort(),
          resolved: false,
        },
        $addToSet: { profile_ids: { $each: plan.conflict.profileIds }, linking_identifiers: { $each: plan.conflict.linking } },
        $set: { last_event_id: input.eventId || null, last_seen_at: new Date() },
        $inc: { occurrences: 1 },
      },
      { upsert: true, session }
    );
  }

  let profileId = plan.survivorId;
  const created = !profileId;
  if (!profileId) {
    profileId = uuidv4();
    await Profile.create([{
      _id: profileId, workspace_id: workspaceId, traits: {}, first_seen: timestamp, last_seen: timestamp, event_count: 0,
    }], { session });
  }

  const mergedIds = plan.merges.map(merge => merge.profileId);
  if (mergedIds.length) {
    await mergeProfiles(workspaceId, profileId, plan.merges, rows, input.eventId || null, session);
  }

  if (plan.attach.length) {
    await Identity.insertMany(plan.attach.map(identifier => ({
      _id: uuidv4(), workspace_id: workspaceId, profile_id: profileId, type: identifier.type, value: identifier.value,
      first_seen: timestamp, last_seen: timestamp,
    })), { session });
  }

  const survivorOwns = (identifier: Identifier) => {
    const owner = owners.get(identityKey(identifier));
    return !owner || owner === profileId || mergedIds.includes(owner);
  };
  const owned = identifiers.filter(survivorOwns);
  if (owned.length) {
    await Identity.updateMany(
      { ...scope, profile_id: profileId, $or: owned.map(({ type, value }) => ({ type, value })) },
      [{ $set: { last_seen: { $max: ['$last_seen', timestamp] }, first_seen: { $min: ['$first_seen', timestamp] } } }],
      { session, updatePipeline: true }
    );
  }

  // Back-fill: events from this browser that were stored but never resolved (e.g. before the
  // pipeline existed or while the worker was down) now belong to this person too.
  const anonymousIds = owned.filter(identifier => identifier.type === 'anonymous_id').map(identifier => identifier.value);
  const backfilled = anonymousIds.length
    ? await Event.updateMany(
      {
        ...scope,
        anonymous_id: { $in: anonymousIds },
        profile_id: null,
        // Recent unresolved events are still queued; their own job resolves them.
        received_at: { $lt: new Date(Date.now() - BACKFILL_MIN_AGE_MS) },
        ...(input.eventId ? { event_id: { $ne: input.eventId } } : {}),
      },
      { $set: { profile_id: profileId } },
      { session }
    )
    : { modifiedCount: 0 };

  const columns: Record<string, unknown> = {};
  for (const identifier of owned) {
    if (STRONG_IDENTITY_TYPES.includes(identifier.type)) {
      columns[identifier.type] = identifier.value;
      columns.is_known = true;
    }
  }
  if (input.traits && Object.keys(input.traits).length) {
    Object.assign(columns, await applyTraits(workspaceId, profileId, input.traits, input.eventId || null, timestamp, session));
  }
  if (Object.keys(columns).length) await Profile.updateOne({ ...scope, _id: profileId }, { $set: columns }, { session });

  return { profileId, created, mergedIds, backfilledEvents: backfilled.modifiedCount, conflict: !!plan.conflict };
}

/** Sets non-empty traits that changed and records history. Returns columns derived from traits. */
async function applyTraits(
  workspaceId: string,
  profileId: string,
  traits: Record<string, unknown>,
  eventId: string | null,
  timestamp: Date,
  session: ClientSession,
): Promise<Record<string, unknown>> {
  const profile = await Profile.findOne({ workspace_id: workspaceId, _id: profileId })
    .select('traits').session(session).lean<{ traits: Record<string, unknown> }>();
  const current = profile?.traits || {};
  const set: Record<string, unknown> = {};
  const history = [];
  for (const [key, value] of Object.entries(traits)) {
    if (!safeTraitKey(key) || isEmptyTrait(value) || sameValue(current[key], value)) continue;
    set[`traits.${key}`] = value;
    history.push({
      _id: uuidv4(), workspace_id: workspaceId, profile_id: profileId, key,
      old_value: current[key] ?? null, new_value: value, event_id: eventId, source: 'event', changed_at: timestamp,
    });
  }
  if (!history.length) return {};
  await ProfileTraitChange.insertMany(history, { session });
  const name = displayName({ ...current, ...traits });
  return { ...set, ...(name ? { name } : {}) };
}

async function mergeProfiles(
  workspaceId: string,
  survivorId: string,
  merges: { profileId: string; identifier: Identifier }[],
  rows: Map<string, ProfileRow>,
  eventId: string | null,
  session: ClientSession,
): Promise<void> {
  const scope = { workspace_id: workspaceId };
  const mergedIds = merges.map(merge => merge.profileId);
  const moved = { ...scope, profile_id: { $in: mergedIds } };
  await Event.updateMany(moved, { $set: { profile_id: survivorId } }, { session });
  await Identity.updateMany(moved, { $set: { profile_id: survivorId } }, { session });
  await ProfileTraitChange.updateMany(moved, { $set: { profile_id: survivorId } }, { session });

  // Traits: newest non-empty value wins, judged by each profile's last activity.
  const involved = [survivorId, ...mergedIds].map(id => rows.get(id)).filter((row): row is ProfileRow => !!row)
    .sort((a, b) => a.last_seen.getTime() - b.last_seen.getTime());
  const survivorTraits = rows.get(survivorId)?.traits || {};
  const traits: Record<string, unknown> = {};
  for (const row of involved) {
    for (const [key, value] of Object.entries(row.traits || {})) {
      if (safeTraitKey(key) && !isEmptyTrait(value)) traits[key] = value;
    }
  }
  const history = Object.entries(traits)
    .filter(([key, value]) => !sameValue(survivorTraits[key], value))
    .map(([key, value]) => ({
      _id: uuidv4(), workspace_id: workspaceId, profile_id: survivorId, key,
      old_value: survivorTraits[key] ?? null, new_value: value, event_id: eventId, source: 'merge', changed_at: new Date(),
    }));
  if (history.length) await ProfileTraitChange.insertMany(history, { session });

  await Profile.updateOne(
    { ...scope, _id: survivorId },
    {
      $set: { traits, name: displayName(traits) },
      $min: { first_seen: involved.reduce((min, row) => (row.first_seen < min ? row.first_seen : min), involved[0].first_seen) },
      $max: { last_seen: involved[involved.length - 1].last_seen },
    },
    { session }
  );

  // Redirects: anything that pointed at a merged profile now points at the survivor.
  await ProfileMerge.updateMany({ ...scope, survivor_id: { $in: mergedIds } }, { $set: { survivor_id: survivorId } }, { session });
  await ProfileMerge.insertMany(merges.map(merge => ({
    _id: uuidv4(),
    workspace_id: workspaceId,
    survivor_id: survivorId,
    merged_id: merge.profileId,
    reason: `${merge.identifier.type} matched`,
    identifier: merge.identifier,
    event_id: eventId,
    merged_at: new Date(),
  })), { session });
  await Profile.deleteMany({ ...scope, _id: { $in: mergedIds } }, { session });
}
