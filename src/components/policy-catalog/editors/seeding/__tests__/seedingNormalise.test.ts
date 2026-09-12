import { normaliseSeedingProfile, toDraft } from '../domain/seedingNormalise';
import { canonicalPositioning } from '../domain/seedingProjections';
import { SeedingEditorStore } from '../seedingEditorStore';
import { describe, expect, it } from 'vitest';

import type { SeedingPolicyData } from '../types';

/**
 * The editor used to hand-mirror the factory's seeding policy shape and assumed the profile
 * was always an object. The factory also accepts a BARE POSITIONING STRING there, and for each
 * drawType override — `getSeedPattern` and `structureTemplate` both honour it. A policy in that
 * form rendered an empty positioning control rather than the value it held.
 *
 * Adopting the factory's own `SeedingPolicy` made that form visible in the types, and these
 * cover the handling it forced.
 */
describe('normaliseSeedingProfile', () => {
  it('widens the bare-string profile form the factory still honours', () => {
    expect(normaliseSeedingProfile('WATERFALL')).toEqual({ positioning: 'WATERFALL' });
  });

  it('widens a bare-string drawType override', () => {
    const profile = normaliseSeedingProfile({
      positioning: 'SEPARATE',
      drawTypes: { ROUND_ROBIN: 'WATERFALL' },
    });
    expect(profile).toEqual({ positioning: 'SEPARATE', drawTypes: { ROUND_ROBIN: { positioning: 'WATERFALL' } } });
  });

  it('leaves the object form alone', () => {
    const profile = { positioning: 'CLUSTER' as const, drawTypes: { RR: { positioning: 'WATERFALL' as const } } };
    expect(normaliseSeedingProfile(profile)).toEqual(profile);
  });

  it('returns undefined for an absent profile rather than an empty object', () => {
    expect(normaliseSeedingProfile(undefined)).toBeUndefined();
  });

  it('drops a drawTypes key only when the override itself is absent', () => {
    const profile = normaliseSeedingProfile({ drawTypes: { RR: undefined as never, SE: 'CLUSTER' } });
    expect(profile?.drawTypes).toEqual({ SE: { positioning: 'CLUSTER' } });
  });
});

describe('the store normalises on every ingest path', () => {
  const stringForm = { policyName: 'legacy', seedingProfile: 'CLUSTER' } as SeedingPolicyData;

  it('normalises an initialPolicy', () => {
    const store = new SeedingEditorStore({ initialPolicy: stringForm });
    expect(store.getData().seedingProfile).toEqual({ positioning: 'CLUSTER' });
  });

  it('normalises a later setData', () => {
    const store = new SeedingEditorStore({});
    store.setData(stringForm);
    expect(store.getData().seedingProfile).toEqual({ positioning: 'CLUSTER' });
  });

  it('does not mutate the caller’s policy object', () => {
    const original = { policyName: 'legacy', seedingProfile: 'CLUSTER' } as SeedingPolicyData;
    new SeedingEditorStore({ initialPolicy: original });
    expect(original.seedingProfile).toBe('CLUSTER');
  });
});

describe('canonicalPositioning', () => {
  it('selects the Cluster option for the ADJACENT synonym', () => {
    expect(canonicalPositioning('ADJACENT')).toBe('CLUSTER');
  });

  it('leaves every other member alone', () => {
    for (const value of ['CLUSTER', 'SEPARATE', 'WATERFALL'] as const) {
      expect(canonicalPositioning(value)).toBe(value);
    }
  });

  it('is display-only — the stored value survives a round trip through the store', () => {
    const store = new SeedingEditorStore({
      initialPolicy: { seedingProfile: { positioning: 'ADJACENT' } } as SeedingPolicyData,
    });
    // ADJACENT is a synonym, not a typo: rewriting it would be an unrequested edit.
    expect(store.getData().seedingProfile?.positioning).toBe('ADJACENT');
  });
});

describe('toDraft', () => {
  it('preserves every non-profile field', () => {
    const policy = {
      policyName: 'USTA SEEDING',
      seedingProfile: 'SEPARATE',
      duplicateSeedNumbers: true,
      drawSizeProgression: true,
      validSeedPositions: { ignore: true },
      seedsCountThresholds: [{ drawSize: 32, minimumParticipantCount: 24, seedsCount: 8 }],
    } as SeedingPolicyData;
    const draft = toDraft(policy);
    expect(draft).toEqual({ ...policy, seedingProfile: { positioning: 'SEPARATE' } });
  });
});
