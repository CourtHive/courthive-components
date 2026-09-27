import { describe, it, expect } from 'vitest';
import { matchUpStatusConstants, entryStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import {
  groupKeysForStatus,
  normalizeStatusCode,
  groupKeyForStatus,
  statusCodeSubtext,
  statusCodeDisplay,
  codesForStatus,
  type StatusCodeGroups,
} from '../statusCodes';

const { WALKOVER, DEFAULTED, RETIRED, DOUBLE_WALKOVER, DOUBLE_DEFAULT, ABANDONED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

// The real shipped vocabulary, not a hand-written mirror of it. A hand-mirror is how the scoring
// editor and the factory fixture drifted apart while both looked correct.
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

describe('groupKeyForStatus', () => {
  // A double exit has no group of its own; the policy files Wo/Wo under WALKOVER.
  it.each([
    [DOUBLE_WALKOVER, WALKOVER],
    [DOUBLE_DEFAULT, DEFAULTED],
  ])('%s reads its codes from %s', (status, expected) => {
    expect(groupKeyForStatus(status)).toBe(expected);
  });

  it.each([RETIRED, WALKOVER, DEFAULTED, ABANDONED])('%s reads its own group', (status) => {
    expect(groupKeyForStatus(status)).toBe(status);
  });

  it('is undefined for no status', () => {
    expect(groupKeyForStatus(undefined)).toBeUndefined();
  });
});

describe('normalizeStatusCode — all three shapes a code legitimately takes', () => {
  it('reads a bare string, as the modal writes it', () => {
    expect(normalizeStatusCode('RJ')).toBe('RJ');
  });

  // What the factory's updateMatchUpStatusCodes rewrites a string to once propagation runs.
  it('reads a { code } wrapper, as the factory rewraps it', () => {
    expect(normalizeStatusCode({ code: 'RJ' })).toBe('RJ');
  });

  it('reads a policy entry object', () => {
    expect(normalizeStatusCode({ matchUpStatusCode: 'RJ', matchUpStatusCodeDisplay: 'Ret [inj]' })).toBe('RJ');
  });

  // Provenance shares the array and carries no code. It must read as absent, not as a code.
  it('returns undefined for a propagation provenance element', () => {
    expect(
      normalizeStatusCode({ previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 }),
    ).toBeUndefined();
  });

  it.each([[''], [null], [undefined], [{}], [{ code: '' }], [42]])('returns undefined for %p', (input) => {
    expect(normalizeStatusCode(input)).toBeUndefined();
  });
});

/**
 * A walkover reads the withdrawal reasons too.
 *
 * CA, 2026-09-27, verbatim:
 *
 *   "WITHDRAWN is a statusCode on a WALKOVER... WALKOVER (withdrawn injured or withdrawn ill)"
 *
 * Each part of that is asserted separately below, because they fail independently: that WITHDRAWN is
 * not a matchUpStatus, that a walkover reaches the group anyway, and that the specific reasons CA
 * named are among what it reaches.
 */
describe('a walkover offers the withdrawal reasons — CA, 2026-09-27', () => {
  it('WITHDRAWN is not a matchUpStatus, so nothing can key a lookup on it', () => {
    // The premise. If the factory ever promotes WITHDRAWN to a matchUpStatus this test fails, and it
    // should — the whole mapping below would then be the wrong shape.
    //
    // Asserted on the key set rather than as `matchUpStatusConstants.WITHDRAWN`, because that does
    // not COMPILE — TS2339, "Property 'WITHDRAWN' does not exist". The type system is the stronger
    // evidence and it is the reason this assertion has to be written the long way round.
    expect(Object.keys(matchUpStatusConstants)).not.toContain('WITHDRAWN');
    expect(entryStatusConstants.WITHDRAWN).toBe('WITHDRAWN');
  });

  it('the policy files those codes under a key a status lookup would never produce', () => {
    // Not asserting our code here — asserting the SHIPPED POLICY's shape, which is the reason the
    // mapping has to exist. A hand-written mirror of this would have hidden it.
    expect(Object.keys(REAL_GROUPS)).toContain('WITHDRAWN');
    expect(REAL_GROUPS.WITHDRAWN.map((c) => c.matchUpStatusCode)).toEqual([
      'WD.INJ',
      'WD.ILL',
      'WD.PC',
      'WD.WD',
      'WD.TAE',
    ]);
  });

  it('groupKeysForStatus sends a walkover to both groups, walkover first', () => {
    // Order is part of the contract: WALKOVER's own codes lead, so an existing picker's first rows
    // do not move under operators who have learned their positions.
    expect(groupKeysForStatus(WALKOVER)).toEqual([WALKOVER, 'WITHDRAWN']);
  });

  it('withdrawn injured and withdrawn ill are both offered on a walkover — the two CA named', () => {
    const codes = codesForStatus(REAL_GROUPS, WALKOVER).map((c) => c.matchUpStatusCode);

    expect(codes).toContain('WD.INJ');
    expect(codes).toContain('WD.ILL');
  });

  it('offers all eleven the policy authors, not the six a status-keyed lookup found', () => {
    // The defect, in one number. Five real USTA reason codes were unreachable from the picker.
    const codes = codesForStatus(REAL_GROUPS, WALKOVER).map((c) => c.matchUpStatusCode);

    expect(codes).toHaveLength(11);
    expect(codes.slice(0, 6)).toEqual(['W1', 'W2', 'W3', 'WOWO', 'W4', 'W5']);
  });

  it('a double walkover reaches Wd/Wd — double withdrawal is what two withdrawals display', () => {
    // Follows from the double-exit mapping composing with this one, and it is the case that proves
    // the two mappings belong on the same axis rather than fighting each other.
    const codes = codesForStatus(REAL_GROUPS, DOUBLE_WALKOVER).map((c) => c.matchUpStatusCode);

    expect(codes).toContain('WD.WD');
    expect(codes).toContain('WOWO');
  });

  it('leaves every other status reading exactly one group', () => {
    // The regression this change could plausibly cause: withdrawal reasons leaking onto a retirement
    // or a default, where they would be nonsense.
    for (const status of [RETIRED, DEFAULTED, DOUBLE_DEFAULT, ABANDONED]) {
      expect(groupKeysForStatus(status)).toHaveLength(1);
      expect(codesForStatus(REAL_GROUPS, status).map((c) => c.matchUpStatusCode)).not.toContain('WD.INJ');
    }
  });

  it('a policy with no WITHDRAWN group yields exactly what it did before', () => {
    // Every non-USTA policy today. The mapping must be additive, not a requirement.
    const groups = { [WALKOVER]: [{ matchUpStatusCode: 'W1' }] } as unknown as StatusCodeGroups;

    expect(codesForStatus(groups, WALKOVER).map((c) => c.matchUpStatusCode)).toEqual(['W1']);
  });
});

describe('codesForStatus against the real shipped policy', () => {
  it('finds the retirement reasons', () => {
    const codes = codesForStatus(REAL_GROUPS, RETIRED).map((c) => c.matchUpStatusCode);

    expect(codes).toContain('RJ');
    expect(codes.length).toBeGreaterThan(1);
  });

  // The thing that makes the double-exit choice and the code list one control rather than two.
  it('a double walkover reaches the walkover group, including its own Wo/Wo code', () => {
    const codes = codesForStatus(REAL_GROUPS, DOUBLE_WALKOVER).map((c) => c.matchUpStatusCode);

    expect(codes).toContain('WOWO');
  });

  it('a double default reaches the default group, including Def/Def', () => {
    const codes = codesForStatus(REAL_GROUPS, DOUBLE_DEFAULT).map((c) => c.matchUpStatusCode);

    expect(codes).toContain('DD');
  });

  it('every returned entry has a usable code', () => {
    for (const status of [RETIRED, WALKOVER, DEFAULTED, ABANDONED]) {
      for (const entry of codesForStatus(REAL_GROUPS, status)) {
        expect(normalizeStatusCode(entry)).toBeTruthy();
      }
    }
  });

  it('drops entries with no code rather than rendering a blank option', () => {
    const groups = { [RETIRED]: [{ matchUpStatusCode: 'RJ' }, { label: 'no code' } as any] };

    expect(codesForStatus(groups, RETIRED)).toHaveLength(1);
  });
});

describe('codesForStatus when the policy carries none', () => {
  // The designed state on a tournament with no federation policy attached: no control is drawn.
  it.each([
    ['no groups at all', undefined],
    ['the factory default, every key empty', { ABANDONED: [], CANCELLED: [], DEFAULTED: [], RETIRED: [] }],
    ['a group that is not an array', { RETIRED: 'RJ' as any }],
  ])('%s → empty', (_label, groups) => {
    expect(codesForStatus(groups as StatusCodeGroups | undefined, RETIRED)).toEqual([]);
  });

  it('a status with no group of its own → empty', () => {
    expect(codesForStatus(REAL_GROUPS, 'COMPLETED')).toEqual([]);
  });
});

describe('display text is read from the policy, never synthesised', () => {
  it('prefers the authored display form', () => {
    expect(statusCodeDisplay({ matchUpStatusCode: 'RJ', matchUpStatusCodeDisplay: 'Ret [inj]', label: 'Injury' })).toBe(
      'Ret [inj]',
    );
  });

  it('falls back to the label, then to the code itself', () => {
    expect(statusCodeDisplay({ matchUpStatusCode: 'RJ', label: 'Injury' })).toBe('Injury');
    expect(statusCodeDisplay({ matchUpStatusCode: 'RJ' })).toBe('RJ');
  });

  it('offers the label as subtext when it says something the display does not', () => {
    expect(
      statusCodeSubtext({ matchUpStatusCode: 'RJ', matchUpStatusCodeDisplay: 'Ret [inj]', label: 'Injury' }),
    ).toBe('Injury');
  });

  it('does not repeat the display form as its own subtext', () => {
    expect(statusCodeSubtext({ matchUpStatusCode: 'RJ', matchUpStatusCodeDisplay: 'Ret [inj]', label: 'Ret [inj]' }))
      .toBeUndefined();
    expect(statusCodeSubtext({ matchUpStatusCode: 'RJ' })).toBeUndefined();
  });

  it('renders the real policy entries with distinct, non-empty display text', () => {
    const displays = codesForStatus(REAL_GROUPS, RETIRED).map(statusCodeDisplay);

    expect(displays.every((d) => !!d)).toBe(true);
    expect(new Set(displays).size).toBe(displays.length);
  });
});
