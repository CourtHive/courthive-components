/**
 * Tests for pure Dynamic Sets logic functions
 * These tests verify business logic without any DOM dependencies
 */

import { scoreGovernor } from 'tods-competition-factory';
import { describe, it, expect } from 'vitest';
import {
  getSetFormatForIndex,
  isSetTiebreakOnly,
  getMaxAllowedScore,
  isSetComplete,
  getSetWinner,
  isMatchComplete,
  getMatchWinner,
  calculateComplement,
  shouldApplySmartComplement,
  shouldShowTiebreak,
  shouldCreateNextSet,
  buildSetScore,
  matchUpConfigFor,
  type MatchUpConfig
} from '../dynamicSetsLogic';
import type { SetScore } from '../../types';
import { MATCH_FORMATS } from '../../../../constants/matchUpFormats';
import { matchUpFormatCode } from 'tods-competition-factory';

// Helper to create MatchUpConfig from format string
function parseFormat(formatString: string): MatchUpConfig {
  const parsed = matchUpFormatCode.parse(formatString);
  const regex = /SET(\d+)/;
  const bestOfMatch = regex.exec(formatString);
  const bestOf = bestOfMatch ? Number.parseInt(bestOfMatch[1]) : 3;

  return {
    bestOf,
    setFormat: parsed?.setFormat,
    finalSetFormat: parsed?.finalSetFormat
  };
}

/**
 * A config for a plain best-of-N of standard sets.
 *
 * `isMatchComplete` and `getMatchWinner` now take a `MatchUpConfig` rather than a bare `bestOf`, because
 * they delegate to `analyzeMatchUp`, which reads a TODS format string — and a faithful string can be
 * rebuilt from a config but not from a set count alone.
 */
function bestOfConfig(bestOf: number, exactly?: number): MatchUpConfig {
  const base = parseFormat(bestOf === 5 ? MATCH_FORMATS.SET5_S6_TB7 : MATCH_FORMATS.SET3_S6_TB7);
  return { ...base, bestOf, exactly };
}

const FINAL_TB10 = 'SET3-S:6/TB7-F:TB10';

/**
 * `matchUpConfigFor` — the derivation `dynamicSetsApproach` already carried its own copy of.
 *
 * It takes TWO sources and they must agree: `bestOf` comes from `parseMatchUpFormat`, which resolves
 * an `exactly:N` format down to a set count, while `exactly`, `setFormat` and `finalSetFormat` come
 * straight off `matchUpFormatCode.parse`. Hoisted so a region does not become a second copy whose
 * halves can drift apart.
 */
describe('matchUpConfigFor', () => {
  it('reads a best-of-3 off a standard format', () => {
    const config = matchUpConfigFor('SET3-S:6/TB7');

    expect(config.bestOf).toBe(3);
    expect(config.exactly).toBeUndefined();
    expect(config.setFormat?.setTo).toBe(6);
  });

  it('reads a best-of-5', () => {
    expect(matchUpConfigFor('SET5-S:6/TB7').bestOf).toBe(5);
  });

  it('carries a distinct final-set format when the format has one', () => {
    // The half that comes from the factory parse rather than from parseMatchUpFormat. A config that
    // dropped it would score a deciding match tiebreak as a full set.
    const config = matchUpConfigFor(FINAL_TB10);

    expect(config.finalSetFormat).toBeDefined();
    expect(config.setFormat?.setTo).toBe(6);
  });

  it('falls back to best-of-3 for an unparseable format instead of throwing', () => {
    // A dialog that will not open is worse than one that opens on the wrong best-of, and an operator
    // can see and correct a wrong column count. Never parse a matchUpFormat with a regex.
    expect(matchUpConfigFor('NOT-A-FORMAT').bestOf).toBe(3);
    expect(matchUpConfigFor(undefined).bestOf).toBe(3);
    expect(matchUpConfigFor('').bestOf).toBe(3);
  });

  it('agrees with getSetFormatForIndex, which is the whole point of assembling it', () => {
    // The config exists to be handed to the other pure functions. If the two halves disagreed, this is
    // where it would show: the final set would resolve to the wrong format.
    const config = matchUpConfigFor(FINAL_TB10);

    expect(getSetFormatForIndex(0, config)).toEqual(config.setFormat);
    expect(getSetFormatForIndex(2, config)).toEqual(config.finalSetFormat);
  });
});

describe('dynamicSetsLogic - Pure Functions', () => {
  // Use constants and parse them dynamically
  const standardBestOf3 = parseFormat(MATCH_FORMATS.SET3_S6_TB7);

  // Note: Can't parse this format cleanly because F:TB10 creates tiebreakSet (tiebreak-only) not tiebreakFormat
  // Using inline config to match original test expectations
  const standardBestOf5: MatchUpConfig = {
    bestOf: 5,
    setFormat: { setTo: 6, tiebreakAt: 6, tiebreakFormat: { tiebreakTo: 7 } },
    finalSetFormat: { setTo: 6, tiebreakAt: 6, tiebreakFormat: { tiebreakTo: 10 } }
  };

  const set8Config = parseFormat(MATCH_FORMATS.SET1_S8_TB7);
  const tb10Config = parseFormat(MATCH_FORMATS.SET3_S6_TB7_F_TB10);

  describe('getSetFormatForIndex', () => {
    it('returns standard format for first set of best-of-3', () => {
      const format = getSetFormatForIndex(0, standardBestOf3);
      expect(format?.setTo).toBe(6);
    });

    it('returns standard format for second set of best-of-3', () => {
      const format = getSetFormatForIndex(1, standardBestOf3);
      expect(format?.setTo).toBe(6);
    });

    it('returns finalSetFormat for deciding set of best-of-3', () => {
      const config = parseFormat(MATCH_FORMATS.SET3_S6_F_TB10);
      const format = getSetFormatForIndex(2, config);
      expect(format?.tiebreakSet?.tiebreakTo).toBe(10);
    });

    it('returns finalSetFormat for deciding set of best-of-5', () => {
      const format = getSetFormatForIndex(4, standardBestOf5);
      expect(format?.tiebreakFormat?.tiebreakTo).toBe(10);
    });

    it('returns standard format for non-deciding sets of best-of-5', () => {
      const format = getSetFormatForIndex(2, standardBestOf5);
      expect(format?.tiebreakFormat?.tiebreakTo).toBe(7);
    });
  });

  describe('isSetTiebreakOnly', () => {
    it('returns false for regular set format', () => {
      expect(isSetTiebreakOnly(standardBestOf3.setFormat)).toBe(false);
    });

    it('returns true for tiebreak-only format (TB10)', () => {
      expect(isSetTiebreakOnly(tb10Config.finalSetFormat)).toBe(true);
    });

    it('returns false for undefined format', () => {
      expect(isSetTiebreakOnly()).toBe(false);
    });
  });

  describe('getMaxAllowedScore', () => {
    describe('Standard S:6/TB7@6 format (tiebreakAt === setTo)', () => {
      it('allows up to setTo+1 when opponent has no score', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 0 }, standardBestOf3);
        expect(max).toBe(7); // 6 + 1 (absoluteMax for tiebreakAt===setTo)
      });

      it('allows up to setTo when opponent well below tiebreakAt', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 3 }, standardBestOf3);
        expect(max).toBe(6);
      });

      it('allows up to setTo+1 when opponent at tiebreakAt-1 (5)', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 5 }, standardBestOf3);
        expect(max).toBe(7); // Can win 7-5
      });

      it('allows up to setTo+1 when opponent at tiebreakAt', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 6 }, standardBestOf3);
        expect(max).toBe(7);
      });

      it('allows up to setTo+2 when opponent at setTo (deuce)', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 6 }, standardBestOf3);
        expect(max).toBe(7); // At tiebreakAt, max is absoluteMax (7)
      });

      it('caps at the ceiling when the opponent already holds the set (CA 2026-10-08: follow the factory)', () => {
        // a tiebreak set ends 7-5 or 7-6; it never runs on by two like an advantage set
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 7 }, standardBestOf3);
        expect(max).toBe(7);
      });
    });

    describe('S:5/TB9@4 format (tiebreakAt === setTo - 1)', () => {
      const s5at4Config = parseFormat(MATCH_FORMATS.SET1_S5_TB9_AT4);

      it('allows up to setTo when opponent has no score (absoluteMax = setTo)', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 0 }, s5at4Config);
        expect(max).toBe(5); // absoluteMax is setTo because tiebreakAt < setTo
      });

      it('allows up to setTo when opponent well below tiebreakAt', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 2 }, s5at4Config);
        expect(max).toBe(5);
      });

      it('allows up to setTo when opponent at tiebreakAt-1 (3) for S:5@4', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 3 }, s5at4Config);
        expect(max).toBe(5); // Max is setTo (5) since tiebreakAt < setTo, can win 5-3
      });

      it('allows up to setTo when opponent at tiebreakAt', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 4 }, s5at4Config);
        expect(max).toBe(5); // Can win 5-4 after tiebreak
      });

      it('caps at the ceiling when the opponent already holds the set at 5 (follow the factory)', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 5 }, s5at4Config);
        expect(max).toBe(5); // 5-4 is the set's ceiling, tiebreak included
      });

      it('enforces max of 5 when opponent is 0', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 0 }, s5at4Config);
        expect(max).toBe(5); // absoluteMax for S:5@4 is 5
      });
    });

    describe('S:8 format', () => {
      it('allows up to setTo+1 when opponent at tiebreakAt-1 (7)', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 7 }, set8Config);
        expect(max).toBe(9); // Can win 9-7 (opponent at tiebreakAt-1, need win by 2)
      });

      it('allows up to setTo+1 when opponent at tiebreakAt', () => {
        const max = getMaxAllowedScore(0, 1, { side1: 0, side2: 8 }, set8Config);
        expect(max).toBe(9); // 8 + 1 (absoluteMax for tiebreakAt===setTo)
      });
    });
  });

  describe('isSetComplete', () => {
    describe('Regular sets (S:6)', () => {
      it('recognizes 6-4 as complete', () => {
        expect(isSetComplete(0, { side1: 6, side2: 4 }, standardBestOf3)).toBe(true);
      });

      it('recognizes 6-0 as complete', () => {
        expect(isSetComplete(0, { side1: 6, side2: 0 }, standardBestOf3)).toBe(true);
      });

      it('recognizes 7-5 as complete', () => {
        expect(isSetComplete(0, { side1: 7, side2: 5 }, standardBestOf3)).toBe(true);
      });

      it('recognizes 7-6 with tiebreak as complete', () => {
        expect(isSetComplete(0, { side1: 7, side2: 6, tiebreak: 5 }, standardBestOf3)).toBe(true);
      });

      it('recognizes 5-4 as incomplete', () => {
        expect(isSetComplete(0, { side1: 5, side2: 4 }, standardBestOf3)).toBe(false);
      });

      it('recognizes 6-5 as incomplete', () => {
        expect(isSetComplete(0, { side1: 6, side2: 5 }, standardBestOf3)).toBe(false);
      });

      it('recognizes 7-6 without tiebreak as incomplete', () => {
        expect(isSetComplete(0, { side1: 7, side2: 6 }, standardBestOf3)).toBe(false);
      });

      it('recognizes 0-0 as incomplete', () => {
        expect(isSetComplete(0, { side1: 0, side2: 0 }, standardBestOf3)).toBe(false);
      });
    });

    describe('S:8 format', () => {
      it('recognizes 8-6 as complete', () => {
        expect(isSetComplete(0, { side1: 8, side2: 6 }, set8Config)).toBe(true);
      });

      it('recognizes 9-7 as complete', () => {
        expect(isSetComplete(0, { side1: 9, side2: 7 }, set8Config)).toBe(true);
      });

      it('recognizes 9-8 with tiebreak as complete', () => {
        expect(isSetComplete(0, { side1: 9, side2: 8, tiebreak: 5 }, set8Config)).toBe(true);
      });

      it('recognizes 8-7 as incomplete', () => {
        expect(isSetComplete(0, { side1: 8, side2: 7 }, set8Config)).toBe(false);
      });
    });

    describe('Tiebreak-only sets (TB10)', () => {
      it('recognizes 11-9 as complete', () => {
        expect(isSetComplete(2, { side1: 11, side2: 9 }, tb10Config)).toBe(true);
      });

      it('recognizes 10-8 as complete', () => {
        expect(isSetComplete(2, { side1: 10, side2: 8 }, tb10Config)).toBe(true);
      });

      it('recognizes 5-5 as incomplete', () => {
        expect(isSetComplete(2, { side1: 5, side2: 5 }, tb10Config)).toBe(false);
      });

      it('recognizes 0-0 as incomplete', () => {
        expect(isSetComplete(2, { side1: 0, side2: 0 }, tb10Config)).toBe(false);
      });
    });

    describe('S:5/TB9@4 format (tiebreakAt < setTo)', () => {
      const s5at4Config = parseFormat(MATCH_FORMATS.SET1_S5_TB9_AT4);

      it('recognizes 5-0 as complete', () => {
        expect(isSetComplete(0, { side1: 5, side2: 0 }, s5at4Config)).toBe(true);
      });

      it('recognizes 5-3 as complete', () => {
        expect(isSetComplete(0, { side1: 5, side2: 3 }, s5at4Config)).toBe(true);
      });

      it('recognizes 5-4 with tiebreak as complete', () => {
        expect(isSetComplete(0, { side1: 5, side2: 4, tiebreak: 7 }, s5at4Config)).toBe(true);
      });

      it('recognizes 4-5 with tiebreak as complete', () => {
        expect(isSetComplete(0, { side1: 4, side2: 5, tiebreak: 7 }, s5at4Config)).toBe(true);
      });

      it('recognizes 5-4 without tiebreak as incomplete', () => {
        expect(isSetComplete(0, { side1: 5, side2: 4 }, s5at4Config)).toBe(false);
      });

      it('recognizes 4-4 as incomplete', () => {
        expect(isSetComplete(0, { side1: 4, side2: 4 }, s5at4Config)).toBe(false);
      });

      it('recognizes 4-3 as incomplete', () => {
        expect(isSetComplete(0, { side1: 4, side2: 3 }, s5at4Config)).toBe(false);
      });
    });

    describe('S:5WB1 no-tiebreak win-by-1 format (TYPTI variant)', () => {
      const wb1Config = parseFormat('SET3-S:5WB1');

      it('recognizes 5-0 as complete', () => {
        expect(isSetComplete(0, { side1: 5, side2: 0 }, wb1Config)).toBe(true);
      });

      it('recognizes 5-4 as complete (win-by 1, no tiebreak)', () => {
        expect(isSetComplete(0, { side1: 5, side2: 4 }, wb1Config)).toBe(true);
      });

      it('recognizes 4-5 as complete (side 2 wins by 1)', () => {
        expect(isSetComplete(0, { side1: 4, side2: 5 }, wb1Config)).toBe(true);
      });

      it('recognizes 1-5 as complete (side 2 wins by 4)', () => {
        expect(isSetComplete(0, { side1: 1, side2: 5 }, wb1Config)).toBe(true);
      });

      it('recognizes 4-4 as incomplete', () => {
        expect(isSetComplete(0, { side1: 4, side2: 4 }, wb1Config)).toBe(false);
      });

      it('recognizes 5-5 as incomplete (no winner)', () => {
        expect(isSetComplete(0, { side1: 5, side2: 5 }, wb1Config)).toBe(false);
      });
    });
  });

  describe('getSetWinner', () => {
    it('returns 1 when side 1 wins 6-4', () => {
      expect(getSetWinner(0, { side1: 6, side2: 4 }, standardBestOf3)).toBe(1);
    });

    it('returns 2 when side 2 wins 6-3', () => {
      expect(getSetWinner(0, { side1: 3, side2: 6 }, standardBestOf3)).toBe(2);
    });

    it('returns undefined for incomplete set 5-4', () => {
      expect(getSetWinner(0, { side1: 5, side2: 4 }, standardBestOf3)).toBeUndefined();
    });

    it('returns undefined for tied score 6-6', () => {
      expect(getSetWinner(0, { side1: 6, side2: 6 }, standardBestOf3)).toBeUndefined();
    });
  });

  describe('isMatchComplete', () => {
    it('returns true when side 1 wins 2-0 in best-of-3', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 6, side2Score: 3, winningSide: 1 }
      ];
      expect(isMatchComplete(sets, bestOfConfig(3))).toBe(true);
    });

    it('returns true when side 2 wins 2-0 in best-of-3', () => {
      const sets: SetScore[] = [
        { side1Score: 4, side2Score: 6, winningSide: 2 },
        { side1Score: 3, side2Score: 6, winningSide: 2 }
      ];
      expect(isMatchComplete(sets, bestOfConfig(3))).toBe(true);
    });

    it('returns true when side 1 wins 2-1 in best-of-3', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 },
        { side1Score: 6, side2Score: 2, winningSide: 1 }
      ];
      expect(isMatchComplete(sets, bestOfConfig(3))).toBe(true);
    });

    it('returns false when match is 1-1 in best-of-3', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 }
      ];
      expect(isMatchComplete(sets, bestOfConfig(3))).toBe(false);
    });

    it('returns false when match is 0-0', () => {
      const sets: SetScore[] = [];
      expect(isMatchComplete(sets, bestOfConfig(3))).toBe(false);
    });

    it('returns true when side 1 wins 3-0 in best-of-5', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 6, side2Score: 3, winningSide: 1 },
        { side1Score: 6, side2Score: 2, winningSide: 1 }
      ];
      expect(isMatchComplete(sets, bestOfConfig(5))).toBe(true);
    });

    it('returns false when match is 2-2 in best-of-5', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 },
        { side1Score: 6, side2Score: 2, winningSide: 1 },
        { side1Score: 2, side2Score: 6, winningSide: 2 }
      ];
      expect(isMatchComplete(sets, bestOfConfig(5))).toBe(false);
    });
  });

  describe('getMatchWinner', () => {
    it('returns 1 when side 1 wins 2-0', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 6, side2Score: 3, winningSide: 1 }
      ];
      expect(getMatchWinner(sets, bestOfConfig(3))).toBe(1);
    });

    it('returns 2 when side 2 wins 2-1', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 },
        { side1Score: 2, side2Score: 6, winningSide: 2 }
      ];
      expect(getMatchWinner(sets, bestOfConfig(3))).toBe(2);
    });

    it('returns undefined when match is 1-1', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 }
      ];
      expect(getMatchWinner(sets, bestOfConfig(3))).toBeUndefined();
    });
  });

  describe('calculateComplement', () => {
    const s6Format = parseFormat(MATCH_FORMATS.SET1_S6_TB7).setFormat!;
    const s8Format = parseFormat(MATCH_FORMATS.SET1_S8_TB7).setFormat!;

    it('returns 6 for digit 0 with S:6', () => {
      expect(calculateComplement(0, s6Format)).toBe(6);
    });

    it('returns 6 for digit 2 with S:6', () => {
      expect(calculateComplement(2, s6Format)).toBe(6);
    });

    it('returns 6 for digit 4 with S:6', () => {
      expect(calculateComplement(4, s6Format)).toBe(6);
    });

    it('returns 7 for digit 5 with S:6', () => {
      expect(calculateComplement(5, s6Format)).toBe(7);
    });

    it('returns 7 for digit 6 with S:6 — a 6 is a loser score when the set can reach 6-6', () => {
      // CHANGED 2026-09-27 on CA's instruction, matching USTA Tournament Desk: "just a 6 in one auto
      // completes the 7 in the other". This asserted null, described as "tied or winning".
      //
      // The table's convention throughout is that the typed digit is the LOSER's games — 0-4 complete to
      // 6, 5 completes to 7 — so 6 completing to 7 is the continuation and the null was the anomaly.
      // Nothing is lost: the complement fires once per set, so an operator who meant to WIN 6-4 types 6,
      // receives 7 and corrects it, exactly as the 0-4 cases already behave.
      expect(calculateComplement(6, s6Format)).toBe(7);
    });

    it('returns null for digit 7 with S:6 (winning)', () => {
      expect(calculateComplement(7, s6Format)).toBeNull();
    });

    it('returns 8 for digit 3 with S:8', () => {
      expect(calculateComplement(3, s8Format)).toBe(8);
    });

    it('returns 9 for digit 7 with S:8', () => {
      expect(calculateComplement(7, s8Format)).toBe(9);
    });

    it("returns 9 for digit 8 with S:8 — the same rule, at that format's setTo", () => {
      // Follows from the change above rather than being a separate decision: an 8-8 goes to a tiebreak in
      // this format, so 8 is a reachable loser score and the winner took 9.
      expect(calculateComplement(8, s8Format)).toBe(9);
    });

    it('still returns null ABOVE setTo, where nothing can be inferred', () => {
      // A 7 in a set to 6 cannot be a loser's score, so there is no winner's score to derive.
      expect(calculateComplement(7, s6Format)).toBeNull();
      expect(calculateComplement(9, s8Format)).toBeNull();
    });

    describe('S:5/TB9@4 format (tiebreakAt = setTo - 1)', () => {
      const s5at4Format = parseFormat(MATCH_FORMATS.SET1_S5_TB9_AT4).setFormat!;

      it('returns 5 for digit 0 with S:5@4', () => {
        expect(calculateComplement(0, s5at4Format)).toBe(5);
      });

      it('returns 5 for digit 1 with S:5@4', () => {
        expect(calculateComplement(1, s5at4Format)).toBe(5);
      });

      it('returns 5 for digit 2 with S:5@4', () => {
        expect(calculateComplement(2, s5at4Format)).toBe(5);
      });

      it('returns 5 for digit 3 with S:5@4', () => {
        expect(calculateComplement(3, s5at4Format)).toBe(5);
      });

      it('returns 5 for digit 4 with S:5@4 (setTo-1, tiebreakAt < setTo)', () => {
        expect(calculateComplement(4, s5at4Format)).toBe(5);
      });

      it('returns null for digit 5 with S:5@4 — the loser tops out a game lower', () => {
        // The 6 -> 7 change does NOT reach here, and this is the test that says why: with the tiebreak at
        // 4-4 the set is decided before either side reaches 5, so a 5 is never a loser's score.
        expect(calculateComplement(5, s5at4Format)).toBeNull();
      });
    });

    describe('S:6/TB7@5 format (tiebreakAt = setTo - 1)', () => {
      const s6at5Format = parseFormat(MATCH_FORMATS.SET1_S6_TB7_AT5).setFormat!;

      it('returns 6 for digit 2 with S:6@5', () => {
        expect(calculateComplement(2, s6at5Format)).toBe(6);
      });

      it('returns 6 for digit 4 with S:6@5', () => {
        expect(calculateComplement(4, s6at5Format)).toBe(6);
      });

      it('returns 6 for digit 5 with S:6@5 (setTo-1, tiebreakAt < setTo)', () => {
        expect(calculateComplement(5, s6at5Format)).toBe(6);
      });

      it('returns null for digit 6 with S:6@5 — the loser tops out a game lower', () => {
        // Same reasoning: a tiebreak at 5-5 means the winner takes it 6-5, so a 6 cannot be the loser's.
        expect(calculateComplement(6, s6at5Format)).toBeNull();
      });
    });

    describe('S:5WB1 no-tiebreak win-by-1 format (TYPTI variant)', () => {
      const wb1Format = parseFormat('SET3-S:5WB1').setFormat!;

      it('returns 5 for digit 0 with S:5WB1', () => {
        expect(calculateComplement(0, wb1Format)).toBe(5);
      });

      it('returns 5 for digit 1 with S:5WB1 (low loser → 1-5)', () => {
        expect(calculateComplement(1, wb1Format)).toBe(5);
      });

      it('returns 5 for digit 4 with S:5WB1 (4-5, no win-by-2 extension)', () => {
        expect(calculateComplement(4, wb1Format)).toBe(5);
      });

      it('returns null for digit 5 with S:5WB1 (at setTo)', () => {
        expect(calculateComplement(5, wb1Format)).toBeNull();
      });
    });
  });

  describe('shouldApplySmartComplement', () => {
    const emptySet: SetScore[] = [];
    const oneSetWon: SetScore[] = [{ side1Score: 6, side2Score: 4, winningSide: 1 }];
    const matchComplete: SetScore[] = [
      { side1Score: 6, side2Score: 4, winningSide: 1 },
      { side1Score: 6, side2Score: 3, winningSide: 1 }
    ];

    it('applies complement: digit 2 → field1=2, field2=6', () => {
      const result = shouldApplySmartComplement(2, false, 0, emptySet, standardBestOf3, new Set(), true);
      expect(result.shouldApply).toBe(true);
      expect(result.field1Value).toBe(2);
      expect(result.field2Value).toBe(6);
    });

    it('applies complement with shift: shift+2 → field1=6, field2=2', () => {
      const result = shouldApplySmartComplement(2, true, 0, emptySet, standardBestOf3, new Set(), true);
      expect(result.shouldApply).toBe(true);
      expect(result.field1Value).toBe(6);
      expect(result.field2Value).toBe(2);
    });

    it('does not apply when feature disabled', () => {
      const result = shouldApplySmartComplement(2, false, 0, emptySet, standardBestOf3, new Set(), false);
      expect(result.shouldApply).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('does not apply when already used for this set', () => {
      const used = new Set([0]);
      const result = shouldApplySmartComplement(2, false, 0, emptySet, standardBestOf3, used, true);
      expect(result.shouldApply).toBe(false);
      expect(result.reason).toContain('Already used');
    });

    it('does not apply when match is complete', () => {
      const result = shouldApplySmartComplement(2, false, 2, matchComplete, standardBestOf3, new Set(), true);
      expect(result.shouldApply).toBe(false);
      expect(result.reason).toContain('complete');
    });

    it('does not apply for tiebreak-only set', () => {
      const result = shouldApplySmartComplement(5, false, 2, oneSetWon, tb10Config, new Set(), true);
      expect(result.shouldApply).toBe(false);
      expect(result.reason).toContain('Tiebreak-only');
    });

    it('does not apply for timed sets (e.g., INTENNSE T10P)', () => {
      const timedConfig: MatchUpConfig = {
        bestOf: 7,
        exactly: 7,
        setFormat: { timed: true, minutes: 10 }
      };
      const result = shouldApplySmartComplement(5, false, 0, emptySet, timedConfig, new Set(), true);
      expect(result.shouldApply).toBe(false);
      expect(result.reason).toContain('Timed set');
    });

    it('applies AT setTo, where the set can be tied and decided by a tiebreak', () => {
      // CHANGED 2026-09-27 with `calculateComplement`: this asserted that a 6 does not apply. A 6 read as
      // the LOSER's games means 7-6, which is the table's own convention for 0-5 extended one step.
      const result = shouldApplySmartComplement(6, false, 0, emptySet, standardBestOf3, new Set(), true);
      expect(result.shouldApply).toBe(true);
      expect(result.field1Value).toBe(6);
      expect(result.field2Value).toBe(7);
    });

    it('does not apply ABOVE setTo, where there is nothing to infer', () => {
      const result = shouldApplySmartComplement(7, false, 0, emptySet, standardBestOf3, new Set(), true);
      expect(result.shouldApply).toBe(false);
      expect(result.reason).toContain('No predictable complement');
    });

    it('applies correctly for S:8 format', () => {
      const result = shouldApplySmartComplement(3, false, 0, emptySet, set8Config, new Set(), true);
      expect(result.shouldApply).toBe(true);
      expect(result.field1Value).toBe(3);
      expect(result.field2Value).toBe(8);
    });
  });

  describe('shouldShowTiebreak', () => {
    it('shows tiebreak when scores are 7-6', () => {
      expect(shouldShowTiebreak(0, { side1: 7, side2: 6 }, standardBestOf3)).toBe(true);
    });

    it('shows tiebreak when scores are 6-7', () => {
      expect(shouldShowTiebreak(0, { side1: 6, side2: 7 }, standardBestOf3)).toBe(true);
    });

    it('does not show tiebreak when scores are 6-6', () => {
      expect(shouldShowTiebreak(0, { side1: 6, side2: 6 }, standardBestOf3)).toBe(false);
    });

    it('does not show tiebreak when scores are 5-5', () => {
      expect(shouldShowTiebreak(0, { side1: 5, side2: 5 }, standardBestOf3)).toBe(false);
    });

    it('does not show tiebreak when scores are 6-4', () => {
      expect(shouldShowTiebreak(0, { side1: 6, side2: 4 }, standardBestOf3)).toBe(false);
    });

    it('shows tiebreak when scores are 9-8 for S:8', () => {
      expect(shouldShowTiebreak(0, { side1: 9, side2: 8 }, set8Config)).toBe(true);
    });

    it('does not show tiebreak for tiebreak-only sets', () => {
      expect(shouldShowTiebreak(2, { side1: 5, side2: 5 }, tb10Config)).toBe(false);
    });

    describe('S:5/TB9@4 format (tiebreakAt < setTo)', () => {
      const s5at4Config = parseFormat(MATCH_FORMATS.SET1_S5_TB9_AT4);

      it('shows tiebreak when scores are 5-4', () => {
        expect(shouldShowTiebreak(0, { side1: 5, side2: 4 }, s5at4Config)).toBe(true);
      });

      it('shows tiebreak when scores are 4-5', () => {
        expect(shouldShowTiebreak(0, { side1: 4, side2: 5 }, s5at4Config)).toBe(true);
      });

      it('does not show tiebreak when scores are 4-4', () => {
        expect(shouldShowTiebreak(0, { side1: 4, side2: 4 }, s5at4Config)).toBe(false);
      });

      it('does not show tiebreak when scores are 5-3', () => {
        expect(shouldShowTiebreak(0, { side1: 5, side2: 3 }, s5at4Config)).toBe(false);
      });

      it('does not show tiebreak when scores are 5-0', () => {
        expect(shouldShowTiebreak(0, { side1: 5, side2: 0 }, s5at4Config)).toBe(false);
      });
    });
  });

  describe('shouldCreateNextSet', () => {
    it('creates next set after first set complete', () => {
      const sets: SetScore[] = [{ side1Score: 6, side2Score: 4, winningSide: 1 }];
      expect(shouldCreateNextSet(0, sets, standardBestOf3)).toBe(true);
    });

    it('does not create when match is complete', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 6, side2Score: 3, winningSide: 1 }
      ];
      expect(shouldCreateNextSet(1, sets, standardBestOf3)).toBe(false);
    });

    it('does not create when exceeding bestOf', () => {
      const sets: SetScore[] = [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 },
        { side1Score: 6, side2Score: 2, winningSide: 1 }
      ];
      expect(shouldCreateNextSet(2, sets, standardBestOf3)).toBe(false);
    });

    it('does not create when current set incomplete', () => {
      const sets: SetScore[] = [{ side1Score: 5, side2Score: 4, winningSide: undefined }];
      expect(shouldCreateNextSet(0, sets, standardBestOf3)).toBe(false);
    });
  });

  describe('buildSetScore', () => {
    it('builds regular set 6-4', () => {
      const set = buildSetScore(0, '6', '4', undefined, standardBestOf3);
      expect(set.setNumber).toBe(1);
      expect(set.side1Score).toBe(6);
      expect(set.side2Score).toBe(4);
      expect(set.winningSide).toBe(1);
    });

    it('builds regular set 7-6 with tiebreak', () => {
      const set = buildSetScore(0, '7', '6', '5', standardBestOf3);
      expect(set.setNumber).toBe(1);
      expect(set.side1Score).toBe(7);
      expect(set.side2Score).toBe(6);
      expect(set.winningSide).toBe(1);
      expect(set.side1TiebreakScore).toBe(7);
      expect(set.side2TiebreakScore).toBe(5);
    });

    it('builds incomplete set 5-4', () => {
      const set = buildSetScore(0, '5', '4', undefined, standardBestOf3);
      expect(set.setNumber).toBe(1);
      expect(set.side1Score).toBe(5);
      expect(set.side2Score).toBe(4);
      expect(set.winningSide).toBeUndefined();
    });

    it('builds tiebreak-only set TB10', () => {
      const set = buildSetScore(2, '11', '9', undefined, tb10Config);
      expect(set.setNumber).toBe(3);
      expect(set.side1Score).toBe(0);
      expect(set.side2Score).toBe(0);
      expect(set.side1TiebreakScore).toBe(11);
      expect(set.side2TiebreakScore).toBe(9);
      expect(set.winningSide).toBe(1);
    });

    it('builds incomplete tiebreak-only set', () => {
      const set = buildSetScore(2, '5', '5', undefined, tb10Config);
      expect(set.setNumber).toBe(3);
      expect(set.winningSide).toBeUndefined();
    });
  });
});

/**
 * Delegation to the factory — CA, 2026-09-27.
 *
 * *"why would we hand roll something? The factory should export all the logic we'd need for scoring
 * interfaces ... my rule is we must do things properly!"*
 *
 * `getSetFormatForIndex`, `shouldShowTiebreak`, `getSetWinner` and `calculateComplement` keep their
 * signatures but now ask `scoreGovernor`. The suite above is the proof that behaviour is preserved; what
 * follows pins the two things the delegation newly DEPENDS on, neither of which had a test.
 */
describe('delegation to the factory', () => {
  const s6tb7 = parseFormat(MATCH_FORMATS.SET3_S6_TB7);

  it("recognises a 7-6 from the LOSER's tiebreak points alone", () => {
    // This module's convention is one tiebreak value, the loser's. `analyzeSet` and `checkSetIsComplete`
    // both read BOTH sides and return "unfinished" when handed only one — measured — so the pair is
    // completed with `getTiebreakComplement` before either is asked. Without that a 7-6(3) read as an
    // unfinished set, the winner came back undefined, and the card never opened the second set.
    const scores = { side1: 7, side2: 6, tiebreak: 3 };

    expect(getSetWinner(0, scores, s6tb7)).toBe(1);
    expect(isSetComplete(0, scores, s6tb7)).toBe(true);
  });

  it('recognises it the other way round too', () => {
    // The loser is whichever side has fewer games, not whichever is listed first.
    const scores = { side1: 6, side2: 7, tiebreak: 4 };

    expect(getSetWinner(0, scores, s6tb7)).toBe(2);
    expect(isSetComplete(0, scores, s6tb7)).toBe(true);
  });

  it('separates a tiebreak BEING PLAYED from one that has been won', () => {
    // `hasTiebreakCondition` alone is true at 6-6, where this must be false: at six-all the tiebreak is in
    // progress and there is no result to type. `leadingSide` is how the factory tells them apart.
    expect(shouldShowTiebreak(0, { side1: 6, side2: 6 }, s6tb7)).toBe(false);
    expect(shouldShowTiebreak(0, { side1: 7, side2: 6 }, s6tb7)).toBe(true);
    expect(shouldShowTiebreak(0, { side1: 6, side2: 7 }, s6tb7)).toBe(true);
    expect(shouldShowTiebreak(0, { side1: 6, side2: 4 }, s6tb7)).toBe(false);
  });

  it('keeps the deciding-set rule in the factory rather than re-deriving it', () => {
    // `analyzeSet` applies it: set 3 of a format with a final-set tiebreak comes back as the tiebreak set.
    const withFinal = matchUpConfigFor(FINAL_TB10);

    expect(getSetFormatForIndex(0, withFinal)).toEqual(withFinal.setFormat);
    expect(getSetFormatForIndex(2, withFinal)).toEqual(withFinal.finalSetFormat);
    expect(isSetTiebreakOnly(getSetFormatForIndex(2, withFinal))).toBe(true);
  });

  it('gives an unparseable format a REAL fallback, not a bare set count', () => {
    // The fallback used to be `{ bestOf: 3 }` with no set format. That survived only while these helpers
    // hand-rolled their own `setTo || 6` defaults: once they ask the factory, a config with no set format
    // means `analyzeSet` correctly has no opinion about who won a 6-4, and the card opened one column and
    // never revealed another. A dialog that will not open is worse than one on the wrong best-of — but only
    // if it works once open.
    const config = matchUpConfigFor('NOT-A-FORMAT');

    expect(config.bestOf).toBe(3);
    expect(config.setFormat?.setTo).toBe(6);
    expect(getSetWinner(0, { side1: 6, side2: 4 }, config)).toBe(1);
    expect(isSetComplete(0, { side1: 6, side2: 4 }, config)).toBe(true);
  });

  it('agrees with the factory complement, which this table had diverged from', () => {
    // `getSetComplement` already answered `[6, 7]` for a low value of 6 while `calculateComplement` returned
    // null, so CA's correction on 2026-09-27 restored agreement rather than deciding something new. Now
    // there is one implementation and they cannot drift again.
    for (const digit of [0, 1, 2, 3, 4, 5, 6]) {
      const pair = scoreGovernor.getSetComplement({ lowValue: digit, setTo: 6, tiebreakAt: 6, isSide1: true });
      const expected = Array.isArray(pair) && pair[1] !== digit ? pair[1] : null;
      expect(calculateComplement(digit, s6tb7.setFormat), `complement of ${digit}`).toBe(expected);
    }
  });
});

/**
 * Match-level completeness now comes from the factory too.
 *
 * `isMatchComplete` and `getMatchWinner` delegate to `matchUpGovernor.analyzeMatchUp`, whose
 * `calculatedWinningSide` is set only when one side has reached `setsToWin` under the format.
 *
 * My first audit claimed these mapped to `validateMatchUpScore` / `isComplete` / `getWinner`, and
 * measurement refuted all three: `validateMatchUpScore` returns `isValid: true` for a single set of three
 * because it checks validity rather than completeness, and `isComplete` / `getWinner` need a matchUp that
 * already carries a winner. `analyzeMatchUp` lives on `matchUpGovernor` rather than `scoreGovernor`, which
 * is why searching the scoring surface concluded, wrongly, that this was missing.
 */
describe('match completeness delegates to analyzeMatchUp', () => {
  const won = (a: number, b: number, side: 1 | 2, n: number): SetScore => ({
    setNumber: n,
    side1Score: a,
    side2Score: b,
    winningSide: side
  });

  it('is undecided on one set of three, and decided on two to the same side', () => {
    const config = bestOfConfig(3);

    expect(isMatchComplete([won(6, 4, 1, 1)], config)).toBe(false);
    expect(getMatchWinner([won(6, 4, 1, 1)], config)).toBeUndefined();

    expect(isMatchComplete([won(6, 4, 1, 1), won(6, 3, 1, 2)], config)).toBe(true);
    expect(getMatchWinner([won(6, 4, 1, 1), won(6, 3, 1, 2)], config)).toBe(1);
  });

  it('stays undecided at one set each, then resolves on the third', () => {
    const config = bestOfConfig(3);
    const level = [won(6, 4, 1, 1), won(3, 6, 2, 2)];

    expect(isMatchComplete(level, config)).toBe(false);
    expect(getMatchWinner([...level, won(6, 2, 1, 3)], config)).toBe(1);
    expect(getMatchWinner([...level, won(2, 6, 2, 3)], config)).toBe(2);
  });

  it('needs three sets in a best-of-five', () => {
    const config = bestOfConfig(5);

    expect(isMatchComplete([won(6, 4, 1, 1), won(6, 3, 1, 2)], config)).toBe(false);
    expect(isMatchComplete([won(6, 4, 1, 1), won(6, 3, 1, 2), won(6, 2, 1, 3)], config)).toBe(true);
  });

  it('rebuilds a faithful format string from the config, which is what makes this possible', () => {
    // `analyzeMatchUp` reads a TODS format STRING; a `MatchUpConfig` is the parsed form. The round-trip was
    // measured across SET3-S:6/TB7, SET3-S:6/TB7-F:TB10, SET1-S:TB10, SET5-S:6/TB7 and SET1-S:5WB1.
    //
    // The alternative was synthesising a plausible format and reading only the field that does not depend
    // on the invented parts — which works until someone reads another field.
    for (const format of ['SET3-S:6/TB7', FINAL_TB10, 'SET1-S:TB10', 'SET5-S:6/TB7', 'SET1-S:5WB1']) {
      expect(scoreGovernor.stringifyMatchUpFormat(matchUpConfigFor(format) as any), format).toBe(format);
    }
  });
});

/**
 * A tiebreak-only set is complete when the FACTORY says so — 2026-10-01.
 *
 * `isSetComplete` and `buildSetScore` hand-rolled "both sides above zero and unequal" for a match
 * tiebreak, so a `3-1` in a tiebreak to ten read as won and a `10-0` as unfinished. Both ask
 * `analyzeSet` now, which since `#5049(factory)` (7.4.0) names a winner only at the target by the
 * margin. The shipping dialog still calls both; CA, 2026-10-01: *"We are not yet ready to retire the
 * old modal."*
 */
describe('a tiebreak-only set asks the factory', () => {
  const matchTiebreak = matchUpConfigFor('SET1-S:TB10');

  it('isSetComplete: a 10-0 is won, a 3-1 and a 10-9 are not', () => {
    expect(isSetComplete(0, { side1: 10, side2: 0 }, matchTiebreak)).toBe(true);
    expect(isSetComplete(0, { side1: 0, side2: 10 }, matchTiebreak)).toBe(true);
    expect(isSetComplete(0, { side1: 12, side2: 10 }, matchTiebreak)).toBe(true);
    expect(isSetComplete(0, { side1: 3, side2: 1 }, matchTiebreak)).toBe(false);
    expect(isSetComplete(0, { side1: 10, side2: 9 }, matchTiebreak)).toBe(false);
  });

  it('buildSetScore: the winner follows the same rule', () => {
    expect(buildSetScore(0, '10', '0', undefined, matchTiebreak).winningSide).toBe(1);
    expect(buildSetScore(0, '0', '10', undefined, matchTiebreak).winningSide).toBe(2);
    expect(buildSetScore(0, '3', '1', undefined, matchTiebreak).winningSide).toBeUndefined();
    expect(buildSetScore(0, '10', '9', undefined, matchTiebreak).winningSide).toBeUndefined();
  });

  it('the deciding match tiebreak of a mixed format too', () => {
    const decider = matchUpConfigFor('SET3-S:6/TB7-F:TB10');
    expect(isSetComplete(2, { side1: 10, side2: 0 }, decider)).toBe(true);
    expect(isSetComplete(2, { side1: 3, side2: 1 }, decider)).toBe(false);
  });
});
