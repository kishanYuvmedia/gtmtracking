import { IDENTIFIER_PRIORITY, identityKey, type Identifier } from './extract';

export interface CandidateProfile {
  id: string;
  firstSeen: Date;
  createdAt: Date;
  userIds: string[];
}

export interface ResolutionPlan {
  /** Profile the event belongs to; null → create a new profile. */
  survivorId: string | null;
  /** Profiles to fold into the survivor, each with the identifier that linked it. */
  merges: { profileId: string; identifier: Identifier }[];
  /** Identifiers not yet owned by any profile; they get linked to the survivor. */
  attach: Identifier[];
  /** Set when linked profiles carry different user_ids and were deliberately not merged. */
  conflict: { profileIds: string[]; userIds: string[]; linking: Identifier[] } | null;
}

function oldest(a: CandidateProfile, b: CandidateProfile): number {
  return a.firstSeen.getTime() - b.firstSeen.getTime()
    || a.createdAt.getTime() - b.createdAt.getTime()
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Pure identity-resolution decision, shared by the live worker and the bulk re-run.
 *
 * - Identifiers are matched to their owning profiles.
 * - All compatible matched profiles merge into the oldest one.
 * - Strong-identifier guard: profiles with different user_ids are never merged. When the
 *   event carries a user_id, only profiles without a user_id or with that same user_id are
 *   compatible; if none are, a new profile is created for the event's user_id. Without a
 *   user_id on the event, the anchor is the profile owning the strongest identifier.
 */
export function planResolution(
  identifiers: Identifier[],
  owners: Map<string, string>,
  profiles: Map<string, CandidateProfile>,
): ResolutionPlan {
  const ordered = [...identifiers].sort((a, b) => IDENTIFIER_PRIORITY[a.type] - IDENTIFIER_PRIORITY[b.type]);
  const linkFor = new Map<string, Identifier>();
  for (const identifier of ordered) {
    const owner = owners.get(identityKey(identifier));
    if (owner && profiles.has(owner) && !linkFor.has(owner)) linkFor.set(owner, identifier);
  }
  const matched = [...linkFor.keys()];
  const unowned = ordered.filter(identifier => !owners.has(identityKey(identifier)));
  if (!matched.length) return { survivorId: null, merges: [], attach: ordered, conflict: null };

  const userIdOf = (id: string) => profiles.get(id)!.userIds;
  const eventUserId = ordered.find(identifier => identifier.type === 'user_id')?.value ?? null;
  const targetUserId = eventUserId
    ?? matched.map(id => userIdOf(id)).find(ids => ids.length)?.[0]
    ?? null;
  const compatible = matched.filter(id => {
    const ids = userIdOf(id);
    return ids.length === 0 || (ids.length === 1 && ids[0] === targetUserId);
  });
  const incompatible = matched.filter(id => !compatible.includes(id));

  const conflict = incompatible.length
    ? {
      profileIds: matched,
      userIds: [...new Set([...(eventUserId ? [eventUserId] : []), ...matched.flatMap(userIdOf)])],
      linking: matched.map(id => linkFor.get(id)!),
    }
    : null;

  if (!compatible.length) return { survivorId: null, merges: [], attach: unowned, conflict };

  const [survivor, ...others] = compatible.map(id => profiles.get(id)!).sort(oldest);
  // The reason a profile merges is the strongest identifier that ties this event to one of
  // the *other* profiles (e.g. the email), not the browser id that found the profile itself.
  const bridge = (profileId: string) => ordered.find(identifier => {
    const owner = owners.get(identityKey(identifier));
    return owner && owner !== profileId && compatible.includes(owner);
  }) || linkFor.get(profileId)!;
  return {
    survivorId: survivor.id,
    merges: others.map(profile => ({ profileId: profile.id, identifier: bridge(profile.id) })),
    attach: unowned,
    conflict,
  };
}
