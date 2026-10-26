import { describe, expect, it } from 'vitest';
import { planResolution, type CandidateProfile } from '../../src/services/identity/plan';

const day = (n: number) => new Date(Date.UTC(2026, 9, n));
const profile = (id: string, firstDay: number, userIds: string[] = []): CandidateProfile =>
  ({ id, firstSeen: day(firstDay), createdAt: day(firstDay), userIds });

describe('planResolution', () => {
  it('creates a new profile when nothing matches', () => {
    const plan = planResolution([{ type: 'anonymous_id', value: 'a' }], new Map(), new Map());
    expect(plan).toMatchObject({ survivorId: null, merges: [], conflict: null });
    expect(plan.attach).toEqual([{ type: 'anonymous_id', value: 'a' }]);
  });

  it('merges every linked profile into the oldest one', () => {
    const owners = new Map([['anonymous_id:a', 'P-new'], ['email:r@x.io', 'P-old']]);
    const profiles = new Map([['P-new', profile('P-new', 10)], ['P-old', profile('P-old', 2)]]);
    const plan = planResolution(
      [{ type: 'anonymous_id', value: 'a' }, { type: 'email', value: 'r@x.io' }, { type: 'phone', value: '+919876543210' }],
      owners, profiles,
    );
    expect(plan.survivorId).toBe('P-old');
    // Reason is the identifier that bridged to the survivor, not P-new's own browser id.
    expect(plan.merges).toEqual([{ profileId: 'P-new', identifier: { type: 'email', value: 'r@x.io' } }]);
    expect(plan.attach).toEqual([{ type: 'phone', value: '+919876543210' }]);
  });

  it('refuses to merge profiles with different user_ids and logs a conflict', () => {
    const owners = new Map([['anonymous_id:shared', 'P-ravi'], ['user_id:u-anita', 'P-anita']]);
    const profiles = new Map([['P-ravi', profile('P-ravi', 1, ['u-ravi'])], ['P-anita', profile('P-anita', 5, ['u-anita'])]]);
    const plan = planResolution([{ type: 'user_id', value: 'u-anita' }, { type: 'anonymous_id', value: 'shared' }], owners, profiles);
    expect(plan.survivorId).toBe('P-anita');
    expect(plan.merges).toEqual([]);
    expect(plan.conflict?.userIds.sort()).toEqual(['u-anita', 'u-ravi']);
  });

  it('starts a new profile for a new user_id seen on a browser owned by another user', () => {
    const owners = new Map([['anonymous_id:shared', 'P-ravi']]);
    const profiles = new Map([['P-ravi', profile('P-ravi', 1, ['u-ravi'])]]);
    const plan = planResolution([{ type: 'user_id', value: 'u-anita' }, { type: 'anonymous_id', value: 'shared' }], owners, profiles);
    expect(plan.survivorId).toBeNull();
    expect(plan.attach).toEqual([{ type: 'user_id', value: 'u-anita' }]);
    expect(plan.conflict).not.toBeNull();
  });
});
