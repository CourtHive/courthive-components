/**
 * @vitest-environment happy-dom
 */
import { renderMatchUp } from '../renderMatchUp';
import { describe, it, expect } from 'vitest';
import type { MatchUp } from '../../../types';

/**
 * A `WO` badge belongs beside the side that EXITED, not beside every side.
 *
 * `matchUpStatus` is a fact about the MATCH; a walkover is a fact about a SIDE. `renderParticipant`
 * decided the badge from the match-level status alone, gated only on "is this the winning side", so
 * a matchUp with no `winningSide` raised `WO` on BOTH sides.
 *
 * Reported from TMX 2026-09-20 on a MAIN final of an 8-draw FIRST_MATCH_LOSER_CONSOLATION after two
 * adjacent double walkovers. The record was unambiguous — side 1 exited, side 2 was a reserved slot
 * holding nobody — and both sides rendered `WO`:
 *
 *     matchUpStatusCodes: [
 *       { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 },
 *       { sideNumber: 2 },
 *     ]
 *
 * The second element is a RESERVED SLOT, not an exit: it is how the engine records a side whose
 * origin is not yet known. Reading it as an exit is what put the badge on an empty chair.
 */

// `renderStatusPill` names the variant after the lowercased status, so WALKOVER and
// DOUBLE_WALKOVER carry DIFFERENT classes (`--walkover` / `--double_walkover`) while both read
// "WO". Selecting the specific class silently matched nothing for the double exits, so the sides
// are found by the pill element itself.
const pillCount = (el: HTMLElement) => el.querySelectorAll('.chc-pill').length;
const pillSides = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.chc-side-container'))
    .filter((side) => side.querySelector('.chc-pill'))
    .map((side) => Number(side.getAttribute('sidenumber')))
    .sort((a, b) => a - b);

function base(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-exit',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 3,
    roundPosition: 1,
    finishingRound: 1,
    sides: [{ sideNumber: 1 }, { sideNumber: 2 }],
    score: { scoreStringSide1: '', scoreStringSide2: '' },
    ...overrides
  } as MatchUp;
}

describe('the exit pill belongs to the exiting side', () => {
  it('renders WO on side 1 only, when the codes name side 1 and reserve side 2', () => {
    // the exact record TMX reported
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'WALKOVER',
        matchUpStatusCodes: [
          { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 },
          { sideNumber: 2 }
        ]
      } as Partial<MatchUp>)
    });
    expect(pillSides(el)).toEqual([1]);
    expect(pillCount(el)).toBe(1);
  });

  it('prefers sideExitProvenance when present', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'WALKOVER',
        sideExitProvenance: { 2: { matchUpStatus: 'WALKOVER', previousMatchUpStatus: 'DOUBLE_WALKOVER' } }
      } as unknown as Partial<MatchUp>)
    });
    expect(pillSides(el)).toEqual([2]);
  });

  it('CONTROL — a double walkover naming BOTH sides still badges both', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'DOUBLE_WALKOVER',
        matchUpStatusCodes: [
          { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 },
          { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
        ]
      } as Partial<MatchUp>)
    });
    expect(pillSides(el)).toEqual([1, 2]);
  });

  it('CONTROL — a DIRECTLY ENTERED double walkover, which records no sides, still badges both', () => {
    // nothing here says anything about sides, so the match-level status is all there is
    const el = renderMatchUp({ matchUp: base({ matchUpStatus: 'DOUBLE_WALKOVER' } as Partial<MatchUp>) });
    expect(pillSides(el)).toEqual([1, 2]);
  });

  it('CONTROL — a match-level status (SUSPENDED) is not side-attributable and stays on both', () => {
    const el = renderMatchUp({ matchUp: base({ matchUpStatus: 'SUSPENDED' } as Partial<MatchUp>) });
    expect(pillSides(el)).toEqual([1, 2]);
  });
});
