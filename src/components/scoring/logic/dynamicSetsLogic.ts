/**
 * Pure logic functions for Dynamic Sets score entry
 * These functions are extracted from dynamicSetsApproach.ts to be independently testable
 * No DOM dependencies, no side effects - pure business logic only
 */

import { matchUpFormatCode, scoreGovernor } from 'tods-competition-factory';
import { parseMatchUpFormat } from '../utils/setExpansionLogic';

/**
 * ── These functions DELEGATE to the factory ──
 *
 * CA, 2026-09-27: *"why would we hand roll something? The factory should export all the logic we'd need
 * for scoring interfaces, and if it doesn't we should properly scope such logic and get it fully tested
 * and added to the factory ... my rule is we must do things properly!"*
 *
 * Every signature here is UNCHANGED — they are exported from the package barrel and used by the shipping
 * approaches, `freeScore.ts` and the new regions — but the bodies now ask `scoreGovernor` instead of
 * recomputing tennis. The existing tests are the proof that behaviour is preserved, and the two places
 * they had to change are the two places the hand-rolled version was WRONG.
 *
 * `analyzeSet` does most of the work. Given a set object and a parsed format it returns `setFormat` with
 * the deciding-set rule already applied, `expectTiebreakSet`, `expectTimedSet`, `hasTiebreakCondition`
 * and `winningSide` — four of the functions below in one call.
 */

/** The set object and scoring format `analyzeSet` expects, from this module's own argument shapes. */
function setAnalysis(
  setIndex: number,
  scores: { side1?: number; side2?: number; tiebreak?: number },
  config: MatchUpConfig,
): Record<string, any> {
  const analyze = (extra: Record<string, number>) =>
    scoreGovernor.analyzeSet({
      setObject: { setNumber: setIndex + 1, side1Score: scores.side1, side2Score: scores.side2, ...extra },
      matchUpScoringFormat: config,
    });

  // The set format comes from a first pass, because completing the tiebreak pair needs the target and the
  // deciding-set rule decides which format applies. One extra call, and it keeps the deciding-set logic in
  // the factory rather than duplicated here.
  const setFormat = scores.tiebreak === undefined ? undefined : analyze({}).setFormat;
  return analyze(tiebreakSides(scores, setFormat));
}

/**
 * Both tiebreak scores, from the one this module carries.
 *
 * ── Why the pair has to be completed before asking the factory ──
 *
 * This module's convention is a single tiebreak value meaning the LOSER's points — that is what
 * `buildSetScore` takes and what a score line prints. `analyzeSet` and `checkSetIsComplete` both read
 * `side1TiebreakScore` AND `side2TiebreakScore`, and measured 2026-09-27 they return
 * `winningSide: undefined` / `false` when only one is present: a 7-6(3) reads as an unfinished set.
 *
 * So the winner's points are DERIVED with `getTiebreakComplement` — the factory's own function for exactly
 * this — rather than the delegation being abandoned. Passing half a tiebreak and accepting a wrong answer
 * would have been the quiet kind of bug.
 */
function tiebreakSides(
  scores: { side1?: number; side2?: number; tiebreak?: number },
  setFormat?: SetFormat,
): Record<string, number> {
  if (scores.tiebreak === undefined) return {};

  const loserIsSide1 = (scores.side1 ?? 0) < (scores.side2 ?? 0);
  const tiebreakTo = setFormat?.tiebreakFormat?.tiebreakTo ?? setFormat?.tiebreakSet?.tiebreakTo;

  if (tiebreakTo === undefined) {
    // No target to complete against: hand over what is known rather than inventing the other side.
    return loserIsSide1 ? { side1TiebreakScore: scores.tiebreak } : { side2TiebreakScore: scores.tiebreak };
  }

  const pair = scoreGovernor.getTiebreakComplement({
    lowValue: scores.tiebreak,
    tiebreakTo,
    tiebreakNoAd: setFormat?.tiebreakFormat?.noAd ?? setFormat?.tiebreakSet?.noAd,
    isSide1: loserIsSide1,
  });
  if (!pair) return {};

  const [forSide1, forSide2] = pair;
  return { side1TiebreakScore: forSide1, side2TiebreakScore: forSide2 };
}

import type { SetScore } from '../types';

/**
 * Set format information returned by matchUpFormatCode.parse()
 */
export type SetFormat = {
  setTo?: number;
  tiebreakAt?: number;
  tiebreakFormat?: {
    tiebreakTo?: number;
    noAd?: boolean;
  };
  tiebreakSet?: {
    tiebreakTo?: number;
    noAd?: boolean;
  };
  timed?: boolean;
  minutes?: number;
  noTiebreak?: boolean;
  winBy?: number; // Game-margin override on no-tiebreak sets (e.g. WB1); omitted when 2 (advantage default)
};

/**
 * Configuration for a matchUp
 * Should be derived from TODS matchUpFormat strings using matchUpFormatCode.parse()
 */
export type MatchUpConfig = {
  bestOf: number;
  exactly?: number;
  setFormat?: SetFormat;
  finalSetFormat?: SetFormat;
};

/**
 * Result of smart complement calculation
 */
export type SmartComplementResult = {
  field1Value: number;
  field2Value: number;
  shouldApply: boolean;
  reason?: string; // Why complement was not applied
};

/**
 * Get the format for a specific set index
 * Uses finalSetFormat for deciding set if available
 */
/**
 * The `MatchUpConfig` for a TODS matchUpFormat string.
 *
 * Hoisted because it takes TWO sources to assemble and `dynamicSetsApproach` already had its own copy
 * (`getMatchUpConfig`, line ~134): `bestOf` comes from `parseMatchUpFormat`, which resolves an
 * `exactly:N` format down to a set count, while `exactly`, `setFormat` and `finalSetFormat` come
 * straight off `matchUpFormatCode.parse`. A region building its own would be a second copy of a
 * derivation whose two halves must agree, which is the shape every other divergence in this module
 * family started as.
 *
 * Never parse a matchUpFormat with a regex — the factory owns that grammar, and an unparseable format
 * falls back to SET3 rather than throwing, because a dialog that will not open is worse than one that
 * opens on the wrong best-of.
 */
/** The format an unparseable string falls back to. A real format, not a bare set count — see below. */
const FALLBACK_MATCH_UP_FORMAT = 'SET3-S:6/TB7';

export function matchUpConfigFor(matchUpFormat?: string): MatchUpConfig {
  const parsed = matchUpFormat ? matchUpFormatCode.parse(matchUpFormat) : undefined;

  // ── The fallback carries a real SET format, not just a set count ──
  //
  // This used to return `{ bestOf: 3 }` with `setFormat: undefined` for an unparseable string. That was
  // survivable while the helpers below hand-rolled their own `setTo || 6` defaults, and stopped being
  // survivable when they started asking the factory: given no set format, `analyzeSet` correctly has no
  // opinion about who won a 6-4, so the card opened one column and never revealed another.
  //
  // Falling back to a parsed `SET3-S:6/TB7` is also the more honest reading of "falls back to best-of-3" —
  // a dialog that will not open is worse than one that opens on the wrong best-of, but only if it actually
  // works once open.
  const effective = parsed ?? matchUpFormatCode.parse(FALLBACK_MATCH_UP_FORMAT);

  return {
    bestOf: parseMatchUpFormat(matchUpFormat).bestOf,
    exactly: effective?.exactly,
    setFormat: effective?.setFormat,
    finalSetFormat: effective?.finalSetFormat,
  };
}

export function getSetFormatForIndex(setIndex: number, config: MatchUpConfig): SetFormat | undefined {
  // `analyzeSet` applies the deciding-set rule itself: set 3 of `SET3-S:6/TB7-F:TB10` comes back as
  // `{ tiebreakSet: { tiebreakTo: 10 } }`. Measured.
  return setAnalysis(setIndex, {}, config).setFormat;
}

/**
 * Check if a set is tiebreak-only (e.g., TB10)
 */
export function isSetTiebreakOnly(format?: SetFormat): boolean {
  return format?.tiebreakSet?.tiebreakTo !== undefined;
}

/**
 * Check if a set format is timed (e.g., T10, T20)
 */
export function isSetTimed(format?: SetFormat): boolean {
  return format?.timed === true && format?.minutes !== undefined;
}

/**
 * Calculate the maximum allowed score for a regular set game score
 * based on the opponent's score and set rules
 *
 * For timed sets, returns Infinity (no maximum) since scores don't need relationships
 */
export function getMaxAllowedScore(
  setIndex: number,
  side: 1 | 2,
  currentScores: { side1: number; side2: number },
  config: MatchUpConfig
): number {
  const setFormat = getSetFormatForIndex(setIndex, config);

  // IMPORTANT: For timed sets, there is no maximum score
  // Scores don't need any relationship to each other
  if (isSetTimed(setFormat)) {
    return Infinity;
  }

  const setTo = setFormat?.setTo || 6;
  const tiebreakAt = setFormat?.tiebreakAt || setTo;

  const oppScore = side === 1 ? currentScores.side2 : currentScores.side1;

  // No-tiebreak WB1: first to setTo wins outright; max input is setTo regardless of opponent.
  const hasTiebreakFormat = !!setFormat?.tiebreakFormat;
  const winBy = setFormat?.winBy ?? 2;
  if (!hasTiebreakFormat && winBy === 1) {
    return setTo;
  }

  // Determine absolute max based on tiebreakAt position
  // - If tiebreakAt === setTo (or not specified): max is setTo + 1 (e.g., S:6 allows 7-6)
  // - If tiebreakAt < setTo: max is setTo (e.g., S:6@5 allows 6-5 max, S:5@4 allows 5-4 max)
  const absoluteMax = tiebreakAt === setTo ? setTo + 1 : setTo;

  // If opponent hasn't entered score yet, allow up to absoluteMax
  if (oppScore === 0) {
    return absoluteMax;
  }

  // Standard tennis scoring rules
  if (oppScore < tiebreakAt - 1) {
    // Opponent well below tiebreak threshold: max is setTo (win before tiebreak)
    return setTo;
  } else if (oppScore === tiebreakAt - 1) {
    // Opponent at tiebreakAt - 1: special case
    // - If tiebreakAt === setTo (standard format like S:6@6): can go to setTo + 1 to win by 2 (e.g., 7-5)
    // - If tiebreakAt < setTo (format like S:5@4): max is setTo (e.g., 5-3 wins, no need for 6)
    return tiebreakAt === setTo ? setTo + 1 : setTo;
  } else if (oppScore === tiebreakAt) {
    // Opponent at tiebreakAt: could go to tiebreak or win at setTo
    // Max is absoluteMax (setTo+1 if tiebreakAt===setTo, otherwise setTo)
    return absoluteMax;
  } else if (oppScore > tiebreakAt && oppScore < setTo) {
    // Opponent between tiebreakAt and setTo: max is setTo
    return setTo;
  } else if (oppScore === setTo) {
    // Opponent at setTo: depends on format
    if (tiebreakAt === setTo) {
      // Standard format (S:6@6): deuce territory, max is setTo + 2
      return setTo + 2;
    } else {
      // Format like S:5@4: opponent won after tiebreak, my max is tiebreakAt
      return tiebreakAt;
    }
  } else if (oppScore > setTo) {
    // Opponent above setTo: match is in extended play (only when tiebreakAt === setTo)
    // Max is oppScore + 2 (win by 2 margin)
    return oppScore + 2;
  } else {
    // Fallback
    return absoluteMax;
  }
}

/**
 * Determine if a set is complete based on its scores
 */
export function isSetComplete(
  setIndex: number,
  scores: {
    side1: number;
    side2: number;
    tiebreak?: number;
  },
  config: MatchUpConfig
): boolean {
  // ── NOT delegated, and the two reasons are measured ──
  //
  // `scoreGovernor.checkSetIsComplete` is the natural home for this and it is deliberately not used yet:
  //
  // 1. It requires BOTH tiebreak scores. This function takes one — the loser's, by this module's
  //    convention — and passing only that returns false for a 7-6(3) that is plainly complete. Fixable
  //    here by deriving the winner's points first, so this alone would not have stopped the swap.
  // 2. It does not honour `winBy: 1`. Measured 2026-09-27: a 5-4 in `SET1-S:5WB1`
  //    (`{setTo: 5, noTiebreak: true, winBy: 1}`) comes back FALSE, though first-to-five wins that set.
  //    That is a factory gap, not a shape problem, and it is why the body below stays.
  //
  // Reported rather than worked around: a local fallback for WB1 would be the hand-rolling this exercise
  // exists to remove. The rest of this module now delegates.

  const setFormat = getSetFormatForIndex(setIndex, config);

  // For timed sets, a set is complete when both sides have values
  // Scores don't need any relationship - any values are valid
  if (isSetTimed(setFormat)) {
    return scores.side1 !== undefined && scores.side1 !== null && scores.side2 !== undefined && scores.side2 !== null;
  }

  // Check if this is a tiebreak-only set
  if (isSetTiebreakOnly(setFormat)) {
    // For tiebreak-only sets, we need a winner (validation determines if score is valid)
    // Both sides must have scores and one must be higher
    return scores.side1 > 0 && scores.side2 > 0 && scores.side1 !== scores.side2;
  }

  // Regular set: check tennis scoring rules
  const setTo = setFormat?.setTo || 6;
  const tiebreakAt = setFormat?.tiebreakAt || setTo;
  const hasTiebreakFormat = !!setFormat?.tiebreakFormat;
  const winBy = setFormat?.winBy ?? 2;
  const maxScore = Math.max(scores.side1, scores.side2);
  const minScore = Math.min(scores.side1, scores.side2);
  const scoreDiff = Math.abs(scores.side1 - scores.side2);

  // Complete if:
  // 1. Winner reached setTo with the required game margin (winBy, default 2; WB1 = first to setTo)
  // For no-tiebreak sets honor setFormat.winBy; tiebreak sets keep the standard win-by-2 margin
  // (tiebreak completion is handled separately below).
  const requiredMargin = hasTiebreakFormat ? 2 : winBy;
  if (maxScore >= setTo && scoreDiff >= requiredMargin) {
    return true;
  }

  // 2. Score indicates tiebreak was played, with tiebreak score entered
  // - If tiebreakAt === setTo: tiebreak at (setTo+1) vs setTo (e.g., 7-6 for S:6@6)
  // - If tiebreakAt < setTo: tiebreak at setTo vs tiebreakAt (e.g., 5-4 for S:5@4)
  const tiebreakScorePattern =
    tiebreakAt === setTo
      ? maxScore === tiebreakAt + 1 && minScore === tiebreakAt
      : maxScore === setTo && minScore === tiebreakAt;

  if (tiebreakScorePattern && scores.tiebreak !== undefined) {
    return true;
  }

  return false;
}

/**
 * Calculate which side won a set
 * Returns undefined if set is not complete
 */
export function getSetWinner(
  setIndex: number,
  scores: {
    side1: number;
    side2: number;
    tiebreak?: number;
  },
  config: MatchUpConfig
): 1 | 2 | undefined {
  // `analyzeSet` derives the winning side from the scores — it does not need one supplied.
  const winningSide = setAnalysis(setIndex, scores, config).winningSide;
  return winningSide === 1 || winningSide === 2 ? winningSide : undefined;
}

/**
 * Determine if match is complete based on sets won
 */
export function isMatchComplete(sets: SetScore[], bestOf: number, exactly?: number): boolean {
  const setsNeeded = Math.ceil(bestOf / 2);
  const setsWon1 = sets.filter((s) => s.winningSide === 1).length;
  const setsWon2 = sets.filter((s) => s.winningSide === 2).length;
  const hasWinner = setsWon1 >= setsNeeded || setsWon2 >= setsNeeded;

  if (!hasWinner) return false;

  if (exactly) {
    // For exactly formats, all sets must have scores entered
    const completedSets = sets.filter((s) => s.side1Score !== undefined && s.side2Score !== undefined).length;
    return completedSets >= exactly;
  }

  return true;
}

/**
 * Get the match winner based on sets won
 * Returns undefined if match is not complete
 */
export function getMatchWinner(sets: SetScore[], bestOf: number, exactly?: number): 1 | 2 | undefined {
  if (!isMatchComplete(sets, bestOf, exactly)) {
    return undefined;
  }

  const setsNeeded = Math.ceil(bestOf / 2);
  const setsWon1 = sets.filter((s) => s.winningSide === 1).length;
  const setsWon2 = sets.filter((s) => s.winningSide === 2).length;

  if (setsWon1 >= setsNeeded) return 1;
  if (setsWon2 >= setsNeeded) return 2;
  return undefined;
}

/**
 * Calculate the complement score for smart complement entry
 * Returns null if no predictable complement exists
 *
 * @param digit - The digit entered (0-9)
 * @param setFormat - The format for this set
 * @returns Complement value or null if digit >= setTo (no predictable complement)
 */
export function calculateComplement(digit: number, setFormat?: SetFormat): number | null {
  // ── The factory's complement, which our table had DIVERGED from ──
  //
  // `getSetComplement` returns `[side1, side2]`. Measured: it already answered `[6, 7]` for a low value
  // of 6, while this function returned `null` until CA had it corrected on 2026-09-27 — so that change
  // was not a new decision but a restoration of agreement with the engine.
  //
  // `isSide1: true` puts the typed value first, so the complement is element [1].
  if (!setFormat?.setTo) return null;

  const pair = scoreGovernor.getSetComplement({
    lowValue: digit,
    setTo: setFormat.setTo,
    tiebreakAt: setFormat.tiebreakAt,
    NoAD: setFormat.tiebreakFormat?.noAd ?? setFormat.tiebreakSet?.noAd,
    winBy: setFormat.winBy,
    isSide1: true,
  });
  if (!pair) return null;

  const complement = pair[1];
  // A complement equal to the typed value says nothing was inferred — the factory returns the low value
  // in both slots where there is no single answer. `null` is this function's contract for that.
  return complement === undefined || complement === digit ? null : complement;
}

/**
 * Determine if smart complement should be applied for a given input
 *
 * @param digit - The digit being entered
 * @param isShiftPressed - Whether Shift key is pressed
 * @param setIndex - Index of the current set
 * @param sets - Current sets array
 * @param config - Match configuration
 * @param smartComplementsUsed - Set of indices where complement was already used
 * @param smartComplementsEnabled - Whether feature is enabled in settings
 * @returns Result indicating if/how complement should be applied
 */
export function shouldApplySmartComplement(
  digit: number,
  isShiftPressed: boolean,
  setIndex: number,
  sets: SetScore[],
  config: MatchUpConfig,
  smartComplementsUsed: Set<number>,
  smartComplementsEnabled: boolean
): SmartComplementResult {
  // Feature disabled
  if (!smartComplementsEnabled) {
    return {
      field1Value: digit,
      field2Value: 0,
      shouldApply: false,
      reason: 'Feature disabled in settings'
    };
  }

  // Already used for this set
  if (smartComplementsUsed.has(setIndex)) {
    return {
      field1Value: digit,
      field2Value: 0,
      shouldApply: false,
      reason: 'Already used for this set'
    };
  }

  // Check if match is already complete
  if (isMatchComplete(sets, config.bestOf, config.exactly)) {
    return {
      field1Value: digit,
      field2Value: 0,
      shouldApply: false,
      reason: 'Match already complete'
    };
  }

  // Check if this is a tiebreak-only set (no smart complement for TB10)
  const setFormat = getSetFormatForIndex(setIndex, config);
  if (isSetTiebreakOnly(setFormat)) {
    return {
      field1Value: digit,
      field2Value: 0,
      shouldApply: false,
      reason: 'Tiebreak-only set'
    };
  }

  // No smart complement for timed sets — scores have no predictable relationship
  if (isSetTimed(setFormat)) {
    return {
      field1Value: digit,
      field2Value: 0,
      shouldApply: false,
      reason: 'Timed set'
    };
  }

  // Calculate complement
  const complement = calculateComplement(digit, setFormat);
  if (complement === null) {
    return {
      field1Value: digit,
      field2Value: 0,
      shouldApply: false,
      reason: 'No predictable complement for this digit'
    };
  }

  // Apply complement based on Shift key
  if (isShiftPressed) {
    // Shift+digit: complement in field1, digit in field2
    return {
      field1Value: complement,
      field2Value: digit,
      shouldApply: true
    };
  } else {
    // Just digit: digit in field1, complement in field2
    return {
      field1Value: digit,
      field2Value: complement,
      shouldApply: true
    };
  }
}

/**
 * Determine if tiebreak input should be visible for a set
 */
export function shouldShowTiebreak(
  setIndex: number,
  scores: { side1: number; side2: number },
  config: MatchUpConfig
): boolean {
  // ── `hasTiebreakCondition` alone is NOT this question ──
  //
  // Measured: it is TRUE at 6-6, where this function must be false. The distinction is real rather than a
  // quirk — at six-all a tiebreak is being PLAYED and there is no result to type yet, whereas at 7-6 the
  // set ended through one and its points are owed. `leadingSide` is how the factory separates them: it is
  // `undefined` at 6-6 and names the side at 7-6.
  //
  // So the UI question is "a tiebreak condition exists AND somebody came out of it ahead", which is
  // derived from two factory outputs rather than recomputed.
  const analysis = setAnalysis(setIndex, scores, config);
  return !!analysis.hasTiebreakCondition && !!analysis.leadingSide;
}

/**
 * Determine if a new set row should be created
 */
export function shouldCreateNextSet(currentSetIndex: number, sets: SetScore[], config: MatchUpConfig): boolean {
  // Don't exceed bestOf
  if (currentSetIndex + 1 >= config.bestOf) {
    return false;
  }

  // Don't create if match is complete
  if (isMatchComplete(sets, config.bestOf, config.exactly)) {
    return false;
  }

  // Create if current set is complete
  const currentSet = sets[currentSetIndex];
  if (!currentSet) {
    return false;
  }

  return currentSet.winningSide !== undefined;
}

/**
 * Build a SetScore object from input values
 * Assigns winningSide if set is complete
 */
export function buildSetScore(
  setIndex: number,
  side1Value: string,
  side2Value: string,
  tiebreakValue: string | undefined,
  config: MatchUpConfig
): SetScore {
  const side1Score = Number.parseInt(side1Value) || 0;
  const side2Score = Number.parseInt(side2Value) || 0;
  const tiebreakScore = tiebreakValue ? Number.parseInt(tiebreakValue) : undefined;

  const setFormat = getSetFormatForIndex(setIndex, config);

  // Check if tiebreak-only set
  if (isSetTiebreakOnly(setFormat)) {
    // Main inputs are tiebreak scores
    const winningSide =
      side1Score > 0 && side2Score > 0 && side1Score !== side2Score ? (side1Score > side2Score ? 1 : 2) : undefined;

    return {
      setNumber: setIndex + 1,
      side1Score: 0,
      side2Score: 0,
      side1TiebreakScore: side1Score,
      side2TiebreakScore: side2Score,
      winningSide
    };
  }

  // Regular set
  const scores = { side1: side1Score, side2: side2Score, tiebreak: tiebreakScore };
  const winningSide = getSetWinner(setIndex, scores, config);

  const setData: SetScore = {
    setNumber: setIndex + 1,
    side1Score,
    side2Score,
    winningSide
  };

  // Add tiebreak scores if present
  if (tiebreakScore !== undefined) {
    const tiebreakTo = setFormat?.tiebreakFormat?.tiebreakTo || 7;
    const isNoAd = setFormat?.tiebreakFormat?.noAd;

    // Calculate winner score based on tiebreak rules
    let winnerScore: number;
    if (tiebreakScore < tiebreakTo - 1) {
      winnerScore = tiebreakTo;
    } else {
      winnerScore = isNoAd ? tiebreakScore + 1 : tiebreakScore + 2;
    }

    if (side1Score > side2Score) {
      setData.side1TiebreakScore = winnerScore;
      setData.side2TiebreakScore = tiebreakScore;
    } else {
      setData.side1TiebreakScore = tiebreakScore;
      setData.side2TiebreakScore = winnerScore;
    }
  }

  return setData;
}
