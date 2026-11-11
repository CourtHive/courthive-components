import { makeMatchUp, pillSides } from './helpers/matchUpFixtures';
import { describe, it, expect } from 'vitest';

// constants and types
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
 *
 * The rules live in `../sideStatus` (`sideStatusPill`), which `renderParticipant` calls; these tests
 * run them in node through `sidePills`. That the rendered card puts the pill on the side the rule
 * names is asserted in a browser by `StructureRenderMatchUpTests.stories.ts` (ExitPillOnTheExitingSide).
 */

/** How many pills the matchUp shows, across both sides. */
const pillCount = (matchUp: MatchUp) => pillSides(matchUp).length;

function base(overrides: Partial<MatchUp> = {}): MatchUp {
  return makeMatchUp({
    matchUpId: 'mu-exit',
    roundNumber: 3,
    finishingRound: 1,
    sides: [{ sideNumber: 1 }, { sideNumber: 2 }],
    ...overrides
  } as Partial<MatchUp>);
}

describe('the exit pill belongs to the exiting side', () => {
  it('renders WO on side 1 only, when the codes name side 1 and reserve side 2', () => {
    // the exact record TMX reported
    const matchUp = base({
      matchUpStatus: 'WALKOVER',
      matchUpStatusCodes: [
        { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 },
        { sideNumber: 2 }
      ]
    } as Partial<MatchUp>);
    expect(pillSides(matchUp)).toEqual([1]);
    expect(pillCount(matchUp)).toBe(1);
  });

  it('prefers sideExitProvenance when present', () => {
    const matchUp = base({
      matchUpStatus: 'WALKOVER',
      sideExitProvenance: { 2: { matchUpStatus: 'WALKOVER', previousMatchUpStatus: 'DOUBLE_WALKOVER' } }
    } as Partial<MatchUp>);
    expect(pillSides(matchUp)).toEqual([2]);
  });

  /**
   * THE FALLBACK IS LOAD-BEARING, NOT RESIDUE. CA, 2026-09-22, deciding against step 3 of
   * `Mentat/planning/COMPONENTS_PROVENANCE_AFTER_7_0_0_PUBLISH.md`, which asked for the
   * `matchUpStatusCodes` read to be deleted once factory 7.0.0 typed `sideExitProvenance`.
   *
   * `sideExitProvenance` is PERSISTED, and its writes are gated on the factory's
   * `writeNativeEnabled()` — false under `schemaWriteMode: LEGACY`. So a matchUp last mutated by
   * factory 6.x, which this package's peerDependency range still admits (`^6.0.0 || ^7.0.0`), or by
   * a LEGACY-mode consumer, carries its provenance ONLY in `matchUpStatusCodes`. Deleting that read
   * blanks the exit pill for those records with no error and no other failing test — the same
   * silent-blank failure the badge work has been chasing since #577.
   *
   * The record below is deliberately provenance-free. If a later eviction sweep removes the
   * fallback, this is the test that must fail first.
   */
  it('renders the exit for a record that has NO sideExitProvenance — the retained legacy fallback', () => {
    const matchUp = base({
      matchUpStatus: 'WALKOVER',
      matchUpStatusCodes: [{ previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }]
    } as Partial<MatchUp>);
    expect(pillSides(matchUp)).toEqual([2]);
    expect(pillCount(matchUp)).toBe(1);
  });

  it('CONTROL — a double walkover naming BOTH sides still badges both', () => {
    const matchUp = base({
      matchUpStatus: 'DOUBLE_WALKOVER',
      matchUpStatusCodes: [
        { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 },
        { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
      ]
    } as Partial<MatchUp>);
    expect(pillSides(matchUp)).toEqual([1, 2]);
  });

  it('CONTROL — a DIRECTLY ENTERED double walkover, which records no sides, still badges both', () => {
    // nothing here says anything about sides, so the match-level status is all there is
    const matchUp = base({ matchUpStatus: 'DOUBLE_WALKOVER' } as Partial<MatchUp>);
    expect(pillSides(matchUp)).toEqual([1, 2]);
  });

  it('CONTROL — a match-level status (SUSPENDED) is not side-attributable and stays on both', () => {
    const matchUp = base({ matchUpStatus: 'SUSPENDED' } as Partial<MatchUp>);
    expect(pillSides(matchUp)).toEqual([1, 2]);
  });
});
