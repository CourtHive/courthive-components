import { describe, it, expect } from 'vitest';
import { matchUpStatusConstants, entryStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import {
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
 * WITHDRAWN is a walkover REASON, and the two code groups stay separate.
 *
 * CA, 2026-09-27: "WITHDRAWN is a statusCode on a WALKOVER... WALKOVER (withdrawn injured or
 * withdrawn ill)". A withdrawal is not its own matchUpStatus — it is expressed as a WALKOVER, and
 * `W5` / "Wo/Withdrawn" is that expression, already inside the WALKOVER group.
 *
 * This is recorded as a test because the obvious reading of that sentence — "so merge the WITHDRAWN
 * group into the walkover picker" — was implemented, and is WRONG. The two groups are label-for-label
 * parallel (Injury, Illness, Personal circumstance, Tournament Administrative Error each appear in
 * both, under different codes), so merging offers the operator four pairs of identically-labelled
 * chips they cannot tell apart.
 *
 * CA, 2026-09-19, on why they are parallel rather than redundant: the WALKOVER group records "a match
 * that did not happen because someone withdrew", which is a RESULT and belongs to scoring; the
 * WITHDRAWN group records "the withdrawal itself", which is an ENTRY action and belongs to the
 * entries UI. Same reasons, two different events, two different surfaces.
 */
describe('the WITHDRAWN group belongs to entries, not to scoring — CA, 2026-09-19 and 2026-09-27', () => {
  it('WITHDRAWN is not a matchUpStatus, so no status-keyed lookup can produce it', () => {
    // Asserted on the key set rather than as `matchUpStatusConstants.WITHDRAWN`, because that does
    // not COMPILE — TS2339. The type system is the stronger evidence for the premise, and it is why
    // this assertion is written the long way round.
    expect(Object.keys(matchUpStatusConstants)).not.toContain('WITHDRAWN');
    expect(entryStatusConstants.WITHDRAWN).toBe('WITHDRAWN');
  });

  it('a withdrawal is already expressible as a walkover — W5, "Wo/Withdrawn"', () => {
    // The fact that makes the separation workable rather than a gap. Asserted against the SHIPPED
    // policy, because it is the policy's claim, not ours.
    const walkoverCodes = REAL_GROUPS[WALKOVER];
    const withdrawn = walkoverCodes.find((c) => c.matchUpStatusCode === 'W5');

    expect(withdrawn?.matchUpStatusCodeDisplay).toBe('Wo/Withdrawn');
    expect(withdrawn?.label).toBe('Withdrawn');
  });

  it('the two groups are label-for-label parallel, which is why merging them is wrong', () => {
    // The measurement that refuted the merge. Four labels occur in BOTH groups under different
    // codes, so a merged picker shows each of them twice with nothing to distinguish the rows.
    const labels = (key: string) => REAL_GROUPS[key].map((c) => c.label).filter(Boolean);
    const shared = labels(WALKOVER).filter((l) => labels('WITHDRAWN').includes(l));

    expect(shared).toEqual(['Injury', 'Illness', 'Personal circumstance', 'Tournament Administrative Error']);
  });

  it('a walkover offers its own six codes and none of the WD.* codes', () => {
    // The behaviour. If someone widens this lookup again, this is the test that says why not.
    const codes = codesForStatus(REAL_GROUPS, WALKOVER).map((c) => c.matchUpStatusCode);

    expect(codes).toEqual(['W1', 'W2', 'W3', 'WOWO', 'W4', 'W5']);
    for (const code of codes) expect(code).not.toMatch(/^WD\./);
  });

  it('no status reaches the WITHDRAWN group at all', () => {
    // Including the double exits, which map onto WALKOVER and DEFAULTED. WD.WD is double WITHDRAWAL,
    // not double walkover — WOWO is that, and it is already in the walkover group.
    for (const status of [WALKOVER, DOUBLE_WALKOVER, DEFAULTED, DOUBLE_DEFAULT, RETIRED, ABANDONED]) {
      const codes = codesForStatus(REAL_GROUPS, status).map((c) => c.matchUpStatusCode);
      expect(codes.filter((c) => c.startsWith('WD.')), `${status} reached a WD.* code`).toEqual([]);
    }
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
