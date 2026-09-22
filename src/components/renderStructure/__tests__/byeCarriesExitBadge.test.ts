/**
 * @vitest-environment happy-dom
 */
import { renderMatchUp } from '../renderMatchUp';
import { describe, it, expect } from 'vitest';
import type { MatchUp } from '../../../types';

/**
 * A BYE matchUp can carry a propagated exit on the side that is NOT the BYE.
 *
 * The mirror of #577. That fix stopped a badge appearing where there was no origin; this one makes a
 * badge appear where there IS one. `BYE` is a fact about the MATCH, so it is in neither status list
 * in `renderParticipant` — the per-side record was never consulted and a TD saw a plain BYE with no
 * sign that a walkover had arrived beside it and travelled on.
 *
 * The badge is decided by the side's OWN `matchUpStatus`. The BYE side carries provenance too
 * (`BYE -> BYE`); keying on the presence of a record would put a `WO` on the BYE — #577 inverted.
 *
 * Both fixtures below are MEASURED, not invented: factory `fix/converged-double-exit-cascades-onward`
 * @ `426384fe8`, SINGLE_ELIMINATION 8 with 7 participants, drawPosition 1 replaced with a BYE, then
 * `MAIN|1|2` entered as a DOUBLE_WALKOVER.
 */

const pillCount = (el: HTMLElement) => el.querySelectorAll('.chc-pill').length;
const pillSides = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.chc-side-container'))
    .filter((side) => side.querySelector('.chc-pill'))
    .map((side) => Number(side.getAttribute('sidenumber')))
    .sort((a, b) => a - b);
const pillText = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.chc-pill')).map((pill) => pill.textContent?.trim());

function base(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-bye-exit',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 2,
    roundPosition: 1,
    finishingRound: 2,
    sides: [{ sideNumber: 1, bye: true }, { sideNumber: 2 }],
    score: { scoreStringSide1: '', scoreStringSide2: '' },
    ...overrides
  } as MatchUp;
}

describe('a BYE matchUp shows the exit its side carries', () => {
  it('badges the exit side of MAIN|2|1 — and not the BYE side, which has BYE -> BYE provenance', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'BYE',
        matchUpStatusCodes: [
          { previousMatchUpStatus: 'BYE', matchUpStatus: 'BYE', sideNumber: 1 },
          { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
        ],
        sideExitProvenance: {
          1: { matchUpStatus: 'BYE', previousMatchUpStatus: 'BYE', sourceMatchUpId: 'm-1-1' },
          2: { matchUpStatus: 'WALKOVER', previousMatchUpStatus: 'DOUBLE_WALKOVER', sourceMatchUpId: 'm-1-2' }
        }
      } as unknown as Partial<MatchUp>)
    });

    expect(pillSides(el)).toEqual([2]);
    expect(pillCount(el)).toBe(1);
    // the pill reads the exit the side carries, not the matchUp's own BYE
    expect(pillText(el)).toEqual(['WO']);
  });

  it('badges the exit side of CONSOLATION|1|1, where the other side is a bare reserved slot', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'BYE',
        matchUpStatusCodes: [
          { sideNumber: 1 },
          { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
        ],
        sideExitProvenance: {
          2: { matchUpStatus: 'WALKOVER', previousMatchUpStatus: 'DOUBLE_WALKOVER', sourceMatchUpId: 'm-1-2' }
        }
      } as unknown as Partial<MatchUp>)
    });

    expect(pillSides(el)).toEqual([2]);
    expect(pillCount(el)).toBe(1);
  });

  it('falls back to matchUpStatusCodes for a record written before sideExitProvenance', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'BYE',
        matchUpStatusCodes: [
          { previousMatchUpStatus: 'BYE', matchUpStatus: 'BYE', sideNumber: 1 },
          { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
        ]
      } as Partial<MatchUp>)
    });

    expect(pillSides(el)).toEqual([2]);
  });

  it('CONTROL — an ordinary BYE with nothing propagated renders no badge at all', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'BYE',
        sides: [
          { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Advancing Player' } },
          { sideNumber: 2, bye: true }
        ]
      } as unknown as Partial<MatchUp>)
    });

    expect(pillCount(el)).toBe(0);
  });

  it('CONTROL — a BYE whose only record is a RETIRED exit shows RET, not WO', () => {
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'BYE',
        sideExitProvenance: {
          2: { matchUpStatus: 'RETIRED', previousMatchUpStatus: 'RETIRED', sourceMatchUpId: 'm-1-2' }
        }
      } as unknown as Partial<MatchUp>)
    });

    expect(pillSides(el)).toEqual([2]);
    expect(pillText(el)).toEqual(['RET']);
  });

  it('CONTROL — a BYE side whose record names a non-exit status raises nothing', () => {
    // `BYE -> BYE` on BOTH sides: two byes converging is not an exit, and must stay silent
    const el = renderMatchUp({
      matchUp: base({
        matchUpStatus: 'BYE',
        sideExitProvenance: {
          1: { matchUpStatus: 'BYE', previousMatchUpStatus: 'BYE', sourceMatchUpId: 'm-1-1' },
          2: { matchUpStatus: 'BYE', previousMatchUpStatus: 'BYE', sourceMatchUpId: 'm-1-3' }
        }
      } as unknown as Partial<MatchUp>)
    });

    expect(pillCount(el)).toBe(0);
  });
});
