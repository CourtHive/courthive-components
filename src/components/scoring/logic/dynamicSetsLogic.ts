/**
 * Pure logic functions for Dynamic Sets score entry
 * These functions are extracted from dynamicSetsApproach.ts to be independently testable
 * No DOM dependencies, no side effects - pure business logic only
 */

import { matchUpFormatCode, matchUpGovernor, scoreGovernor } from 'tods-competition-factory';
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
  config: MatchUpConfig
): Record<string, any> {
  const analyze = (extra: Record<string, number>) =>
    scoreGovernor.analyzeSet({
      setObject: { setNumber: setIndex + 1, side1Score: scores.side1, side2Score: scores.side2, ...extra },
      matchUpScoringFormat: config
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
  setFormat?: SetFormat
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
    tiebreakNoAd: setFormat?.tiebreakFormat?.NoAD ?? setFormat?.tiebreakSet?.NoAD,
    isSide1: loserIsSide1
  });
  if (!pair) return {};

  const [forSide1, forSide2] = pair;
  return { side1TiebreakScore: forSide1, side2TiebreakScore: forSide2 };
}

import type { SetScore } from '../types';

/**
 * Set format information returned by matchUpFormatCode.parse()
 *
 * ── `NoAD`, and why the casing is load-bearing ──
 *
 * This type is a hand-written MIRROR of what `matchUpFormatCode.parse` emits, and it named the
 * no-advantage flag `noAd` while the factory emits **`NoAD`**. Measured 2026-09-28:
 * `parse('SET1-S:TB10NOAD').setFormat.tiebreakSet` is `{ tiebreakTo: 10, NoAD: true }`, so every read
 * of `.noAd` in this module answered `undefined` for every format — and the TYPE is what made those
 * reads look correct.
 *
 * Nothing threw and nothing logged; no-advantage scoring was simply ignored. Two measured
 * consequences, both live in the shipping dialog: a low of 6 in a `TB7NOAD` completed to **8** instead
 * of 7, and a low of 5 in `S:6NOAD` completed to **7** instead of 6 — a 7-5 in a format where first to
 * six wins.
 *
 * Every OTHER reader of this flag in the package had it right — `freeScore.ts`, `matchUpFormat.ts`,
 * `matchUpFormatLogic.ts` and the format picker all read `.NoAD`. This one type was the outlier, which
 * is the shape the architectural standards call mock divergence: a hand-written mirror that renames a
 * field and then certifies the rename.
 */
export type SetFormat = {
  setTo?: number;
  tiebreakAt?: number;
  /** No-advantage on the SET — with no tiebreak, the set ends at `setTo` without a two-game margin. */
  NoAD?: boolean;
  tiebreakFormat?: {
    tiebreakTo?: number;
    NoAD?: boolean;
  };
  tiebreakSet?: {
    tiebreakTo?: number;
    NoAD?: boolean;
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
  // Aggregate scoring: the factory places an aggregate format's -F: decider at set N + 1 only when it
  // can see this flag (factory #5166), so a config without it reads the decider as set N
  aggregate?: boolean;
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
    aggregate: effective?.aggregate,
    setFormat: effective?.setFormat,
    finalSetFormat: effective?.finalSetFormat
  };
}

/**
 * The factory's winner of a tiebreak-only set, given its POINTS as points.
 *
 * `setAnalysis` hands this module's `side1` / `side2` over as GAMES, which a tiebreak-only format has no
 * rule for — `getSetWinner` on a `10-8` match tiebreak answers nothing. The points go in the tiebreak
 * fields here, which is what `analyzeSet` reads for a set whose format is a tiebreak.
 */
function tiebreakOnlyWinner(
  setIndex: number,
  scores: { side1?: number; side2?: number },
  config: MatchUpConfig
): 1 | 2 | undefined {
  if (scores.side1 === undefined || scores.side2 === undefined) return undefined;
  const { winningSide } = scoreGovernor.analyzeSet({
    setObject: { setNumber: setIndex + 1, side1TiebreakScore: scores.side1, side2TiebreakScore: scores.side2 },
    matchUpScoringFormat: config
  });
  return winningSide === 1 || winningSide === 2 ? winningSide : undefined;
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
 * The highest game (or tiebreak-point) score one side may enter, given the opponent's.
 *
 * ── Delegated to the factory ──
 *
 * `scoreGovernor.getMaxSetScore` answers for a games set from the format alone: the tiebreak games,
 * `tiebreakAt` above or below `setTo`, a declared `winBy`. It answers `undefined` where the format has no
 * ceiling — a timed set, an advantage set past the tiebreak-less `setTo`, or a tiebreak-only set, whose
 * points are not games — and each of those is handled here by the factory's own tiebreak complement or
 * by the set's margin, not by recomputing tennis.
 *
 * The hand-rolled body this replaced read a tiebreak-only set as a six-game set: `SET1-S:TB10` with no
 * opponent score was capped at **7** — a match tiebreak to ten that could not be entered (measured
 * 2026-10-08, live in the shipping dialog). It now caps at the complement of the opponent's points: 10,
 * then 12 against 10, and `NoAD` ends it at the target.
 *
 * One convention of the calling dialog is kept: an opponent score of 0 means "not entered yet" and allows
 * the format's ceiling. Where the opponent's games already hold the set, the answer is the factory's
 * ceiling (CA, 2026-10-08: "follow the factory") — 7 under `S:6/TB7`, 5 under `S:5/TB9@4` — and the old
 * "extended play" read of 9, a tiebreak set running on like an advantage set, is gone.
 */
export function getMaxAllowedScore(
  setIndex: number,
  side: 1 | 2,
  currentScores: { side1: number; side2: number },
  config: MatchUpConfig
): number {
  const setFormat = getSetFormatForIndex(setIndex, config);

  // For timed sets, there is no maximum score: scores need no relationship to each other
  if (isSetTimed(setFormat)) return Infinity;

  const oppScore = side === 1 ? currentScores.side2 : currentScores.side1;
  const opponentEntered = oppScore > 0;

  // A tiebreak-only set is scored in points: the winner's points are the complement of the loser's
  if (isSetTiebreakOnly(setFormat)) {
    const tiebreakTo = setFormat?.tiebreakSet?.tiebreakTo as number;
    const tiebreakNoAd = setFormat?.tiebreakSet?.NoAD;
    const pair = scoreGovernor.getTiebreakComplement({
      lowValue: opponentEntered ? oppScore : 0,
      tiebreakTo,
      tiebreakNoAd
    });
    return pair ? Math.max(...pair) : tiebreakTo;
  }

  const setTo = setFormat?.setTo ?? 6;
  const max = scoreGovernor.getMaxSetScore({
    opponentScore: opponentEntered ? oppScore : undefined,
    tiebreakAt: setFormat?.tiebreakAt,
    winBy: setFormat?.winBy,
    NoAD: setFormat?.NoAD,
    setTo
  });
  if (max !== undefined) return max;

  // No ceiling from the format (an advantage set): the set's margin decides
  if (!opponentEntered) return setTo + 1;
  return oppScore >= setTo - 1 ? oppScore + 2 : setTo;
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
  // ── Delegated to the factory (2026-10-08) ──
  //
  // Two measured reasons kept this hand-rolled until now, both gone: `checkSetIsComplete` needs both
  // tiebreak scores, and `tiebreakSides` derives the winner's from the loser's exactly as `setAnalysis`
  // does; and it did not honour `winBy: 1` — a 5-4 in `SET1-S:5WB1` read FALSE in 7.4 and reads TRUE in
  // 7.5+ (factory handles WB1). The timed and tiebreak-only branches below keep their own reads because
  // the factory's rule for them is the one this module already delegates to.
  const setFormat = getSetFormatForIndex(setIndex, config);

  // For timed sets, a set is complete when both sides have values
  // Scores don't need any relationship - any values are valid
  if (isSetTimed(setFormat)) {
    return scores.side1 !== undefined && scores.side1 !== null && scores.side2 !== undefined && scores.side2 !== null;
  }

  // ── A tiebreak-only set asks the FACTORY, as of 2026-10-01 ──
  //
  // This read `side1 > 0 && side2 > 0 && side1 !== side2`: a hand-rolled rule under which a `3-1` in a
  // match tiebreak to ten was complete and a `10-0` was not. The factory's `analyzeSet` names a winner
  // only once the target is reached by the margin — since `#5049(factory)`, in 7.4.0 — so this delegates
  // like the rest of the module. The shipping dialog still calls here; CA, 2026-10-01: *"We are not yet
  // ready to retire the old modal."*
  if (isSetTiebreakOnly(setFormat)) {
    return tiebreakOnlyWinner(setIndex, scores, config) !== undefined;
  }

  // Regular set: the factory's rule — the margin, a declared winBy, the tiebreak at the games the format
  // says — with the winner's tiebreak points derived from the loser's, as this module carries them
  const complete = scoreGovernor.checkSetIsComplete({
    set: {
      setNumber: setIndex + 1,
      side1Score: scores.side1,
      side2Score: scores.side2,
      ...tiebreakSides(scores, setFormat)
    },
    matchUpScoringFormat: { setFormat }
  });
  return complete === true;
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
 * The factory's analysis of a whole matchUp, from a sets array and a config.
 *
 * ── Why the config has to become a format STRING ──
 *
 * `analyzeMatchUp` takes a matchUp, and reads its `matchUpFormat` as a TODS string. A `MatchUpConfig` is
 * the parsed form, so it is stringified back — and that round-trips faithfully, measured across
 * `SET3-S:6/TB7`, `SET3-S:6/TB7-F:TB10`, `SET1-S:TB10`, `SET5-S:6/TB7` and `SET1-S:5WB1`.
 *
 * The alternative was synthesising a plausible-looking format and reading only the one field that does not
 * depend on the parts that were invented. That works today and breaks silently the first time another
 * field is read, which is why it was not done.
 *
 * `analyzeMatchUp` lives on `matchUpGovernor`, not `scoreGovernor` — which is why a first pass through the
 * factory's scoring surface concluded, wrongly, that match completeness was missing from it.
 */
function matchAnalysis(sets: SetScore[], config: MatchUpConfig): Record<string, any> {
  return matchUpGovernor.analyzeMatchUp({
    matchUp: { score: { sets }, matchUpFormat: scoreGovernor.stringifyMatchUpFormat(config as any) }
  });
}

/**
 * Determine if match is complete based on sets won
 */
export function isMatchComplete(sets: SetScore[], config: MatchUpConfig): boolean {
  // `calculatedWinningSide` is set only when one side has reached `setsToWin` under this format —
  // measured: 6-4 alone undefined, 6-4 3-6 undefined, 6-4 6-3 side 1, and an `exactly:1` format decided
  // by its single set.
  return !!matchAnalysis(sets, config).calculatedWinningSide;
}

/**
 * Get the match winner based on sets won
 * Returns undefined if match is not complete
 */
export function getMatchWinner(sets: SetScore[], config: MatchUpConfig): 1 | 2 | undefined {
  const winningSide = matchAnalysis(sets, config).calculatedWinningSide;
  return winningSide === 1 || winningSide === 2 ? winningSide : undefined;
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
    // The SET's own no-advantage flag, and not the tiebreak's. `getSetComplement` consults `NoAD` only
    // where there is no tiebreak at all, so the nested tiebreak flags are the wrong concept here as
    // well as the wrong casing — this read was wrong twice.
    NoAD: setFormat.NoAD,
    winBy: setFormat.winBy,
    isSide1: true
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
  if (isMatchComplete(sets, config)) {
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
  if (isMatchComplete(sets, config)) {
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
    // Main inputs are tiebreak scores. The winner is the factory's answer, not "whoever is ahead" — see
    // `isSetComplete`, which asks the same question of the same function.
    const winningSide = tiebreakOnlyWinner(setIndex, { side1: side1Score, side2: side2Score }, config);

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
    const isNoAd = setFormat?.tiebreakFormat?.NoAD;

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
