import { describe, it, expect } from 'vitest';
import { fixtures, policyConstants } from 'tods-competition-factory';
import { ScoringEditorStore } from '../scoringEditorStore';
import type { ScoringPolicyData } from '../types';

const { POLICY_TYPE_SCORING } = policyConstants;

/**
 * The editor modelled `matchUpStatusCodes` as `string[]` while the factory shipped objects, so a
 * round trip through this editor DESTROYED `matchUpStatusCodeDisplay` and `label` — the two fields
 * the scoring modal's reason picker renders. CA settled the canonical shape as the object on
 * 2026-09-19; these tests are the guard that the lossy direction stays closed.
 *
 * They assert against the REAL shipped vocabulary rather than a hand-written sample. A hand-mirror
 * is what let the two sides drift while both looked correct — the story in this repo claimed to
 * mirror a policy whose every key was empty, so it could invent any shape without contradicting
 * its source, and it invented the wrong one.
 */
const REAL_POLICY = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING];
const REAL_CODES = REAL_POLICY.matchUpStatusCodes as ScoringPolicyData['matchUpStatusCodes'];

function makeStore(initialPolicy: ScoringPolicyData) {
  let latest: ScoringPolicyData = initialPolicy;
  const store = new ScoringEditorStore({
    initialPolicy,
    onChange: (next: ScoringPolicyData) => {
      latest = next;
    },
  });
  return { store, saved: () => latest };
}

describe('the editor preserves an authored vocabulary', () => {
  // CONTROL — if the fixture ever stops carrying display text, every assertion below is vacuous.
  it('the fixture under test actually carries display text', () => {
    const retired = REAL_CODES?.RETIRED ?? [];

    expect(retired.length).toBeGreaterThan(1);
    expect(retired.some((e) => !!e.matchUpStatusCodeDisplay)).toBe(true);
  });

  it('round-trips a real policy without losing display text or labels', () => {
    const { store, saved } = makeStore({ matchUpStatusCodes: structuredClone(REAL_CODES) });

    // Any edit at all commits a new draft — this is the save path that used to be lossy.
    store.addStatusCode('RETIRED', 'ZZ_NEW');

    const retired = saved().matchUpStatusCodes?.RETIRED ?? [];
    const injury = retired.find((e) => e.matchUpStatusCode === 'RJ');

    expect(injury).toBeDefined();
    expect(injury?.matchUpStatusCodeDisplay).toBe('Ret [inj]');
    expect(injury?.label).toBe('Injury');
  });

  it('keeps every originally authored code across an edit', () => {
    const before = (REAL_CODES?.DEFAULTED ?? []).map((e) => e.matchUpStatusCode);
    const { store, saved } = makeStore({ matchUpStatusCodes: structuredClone(REAL_CODES) });

    store.addStatusCode('DEFAULTED', 'ZZ_NEW');

    const after = (saved().matchUpStatusCodes?.DEFAULTED ?? []).map((e) => e.matchUpStatusCode);
    for (const code of before) expect(after).toContain(code);
  });
});

describe('adding a code', () => {
  it('stores an object, not a bare string', () => {
    const { store, saved } = makeStore({});

    store.addStatusCode('RETIRED', 'RJ');

    const entry = (saved().matchUpStatusCodes?.RETIRED ?? [])[0];
    expect(typeof entry).toBe('object');
    expect(entry.matchUpStatusCode).toBe('RJ');
  });

  it('leaves display text absent rather than inventing it', () => {
    const { store, saved } = makeStore({});

    store.addStatusCode('RETIRED', 'RJ');

    const entry = (saved().matchUpStatusCodes?.RETIRED ?? [])[0];
    expect(entry.matchUpStatusCodeDisplay).toBeUndefined();
    expect(entry.label).toBeUndefined();
  });

  it('trims, and ignores an empty code', () => {
    const { store, saved } = makeStore({});

    store.addStatusCode('RETIRED', '  RJ  ');
    store.addStatusCode('RETIRED', '   ');

    const codes = (saved().matchUpStatusCodes?.RETIRED ?? []).map((e) => e.matchUpStatusCode);
    expect(codes).toEqual(['RJ']);
  });

  // The dedupe used to be `list.includes(trimmed)` against strings, which cannot see a code that
  // arrived as an object — so re-adding an authored code would have appended a bare duplicate and
  // the richer entry would have been shadowed by it in every list that reads the first match.
  it('does not duplicate a code that is already there with display text', () => {
    const { store, saved } = makeStore({ matchUpStatusCodes: structuredClone(REAL_CODES) });
    const before = (REAL_CODES?.RETIRED ?? []).length;

    store.addStatusCode('RETIRED', 'RJ');

    const retired = saved().matchUpStatusCodes?.RETIRED ?? [];
    expect(retired).toHaveLength(before);
    expect(retired.find((e) => e.matchUpStatusCode === 'RJ')?.matchUpStatusCodeDisplay).toBe('Ret [inj]');
  });
});

describe('removing a code', () => {
  it('removes by index and leaves the rest authored', () => {
    const { store, saved } = makeStore({ matchUpStatusCodes: structuredClone(REAL_CODES) });
    const before = (REAL_CODES?.RETIRED ?? []).length;

    store.removeStatusCode('RETIRED', 0);

    const retired = saved().matchUpStatusCodes?.RETIRED ?? [];
    expect(retired).toHaveLength(before - 1);
    expect(retired.every((e) => typeof e === 'object')).toBe(true);
  });
});
