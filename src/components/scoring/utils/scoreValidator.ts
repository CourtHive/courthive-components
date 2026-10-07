/**
 * Score validation utilities using tournamentEngine
 */
import { tournamentEngine, matchUpFormatCode, matchUpStatusConstants, governors } from 'tods-competition-factory';
import type { ScoreOutcome } from '../types';

const { COMPLETED } = matchUpStatusConstants;
const { validateMatchUpScore, validateSetScore } = governors.scoreGovernor;

/**
 * Helper: Validate bracket notation for set strings
 */
function validateSetNotation(
  setStrings: string[],
  bestOfSets: number,
  parsed: any,
  sets: any[],
  scoreObject: any
): ScoreOutcome | null {
  const finalSetIsTiebreakOnly = parsed?.finalSetFormat?.tiebreakSet?.tiebreakTo && !parsed?.finalSetFormat?.setTo;
  const allSetsAreTiebreakOnly = parsed?.setFormat?.tiebreakSet?.tiebreakTo && !parsed?.setFormat?.setTo;
  const finalSetIsTB1 = parsed?.finalSetFormat?.tiebreakSet?.tiebreakTo === 1;
  const allSetsAreTB1 = parsed?.setFormat?.tiebreakSet?.tiebreakTo === 1;

  for (let i = 0; i < setStrings.length; i++) {
    const setString = setStrings[i];
    const setNumber = i + 1;
    // An aggregate format's decider is set N + 1, never one of the N (factory #5166)
    const isDecidingSet = matchUpFormatCode.finalSetGoverns(parsed, setNumber, setNumber === bestOfSets);
    const hasBrackets = setString.startsWith('[') && setString.endsWith(']');

    const isTB1Score =
      (setString === '1-0' || setString === '0-1') && ((isDecidingSet && finalSetIsTB1) || allSetsAreTB1);

    const shouldBeTiebreakOnly = allSetsAreTiebreakOnly || (isDecidingSet && finalSetIsTiebreakOnly);
    const shouldBeRegular = !shouldBeTiebreakOnly;

    if (shouldBeRegular && hasBrackets) {
      return {
        isValid: false,
        sets,
        scoreObject,
        error: `Set ${setNumber}: Format expects regular set (e.g., 6-4), but got tiebreak-only set ${setString}`
      };
    }

    if (shouldBeTiebreakOnly && !hasBrackets && !isTB1Score) {
      return {
        isValid: false,
        sets,
        scoreObject,
        error: `Set ${setNumber}: Format expects tiebreak-only set (e.g., [10-8]), but got regular set ${setString}`
      };
    }
  }

  return null;
}

/**
 * Helper: an aggregate exactly format is complete when all N sets are played and, only when their
 * total is level, the decider (set N + 1) is played as well
 */
function aggregateDeciderComplete(
  validatedSets: any[],
  deciderSetNumber: number,
  isPlayed: (set: any) => boolean
): boolean {
  const setCount = deciderSetNumber - 1;
  const counted = validatedSets.slice(0, setCount);
  if (counted.length < setCount || !counted.every(isPlayed)) return false;
  if (validatedSets.length > deciderSetNumber) return false;

  const decider = validatedSets[deciderSetNumber - 1];
  if (!decider) return true;

  const total = (side: 'side1Score' | 'side2Score') => counted.reduce((sum, set) => sum + (set[side] ?? 0), 0);
  return total('side1Score') === total('side2Score') && isPlayed(decider);
}

/**
 * Helper: Check if match is complete
 */
function checkMatchComplete(
  anySetInvalidated: boolean,
  winningSide: number | undefined,
  validatedSets: any[],
  bestOfSets: number,
  parsed: any
): boolean {
  if (anySetInvalidated || winningSide === undefined) {
    return false;
  }

  const isAggregateScoring = !!parsed?.aggregate;

  const isExactlyFormat = !!parsed?.exactly;

  if (isAggregateScoring) {
    // A set is played when EITHER pair holds both sides. A tiebreak-only decider — the TB1 point that
    // settles a tied aggregate — carries its points in the tiebreak fields since factory #5094, where
    // they used to sit in the game fields. Counting the game fields alone read every finished tied
    // aggregate as incomplete. Either pair keeps it right under both factory versions.
    const bothSides = (a: unknown, b: unknown) => a !== undefined && a !== null && b !== undefined && b !== null;
    const isPlayed = (s: any) =>
      bothSides(s.side1Score, s.side2Score) || bothSides(s.side1TiebreakScore, s.side2TiebreakScore);

    // An aggregate exactly format plays all N sets; its sudden-death decider is set N + 1, never one
    // of the N, and is played only on a level total (factory #5166; CA, 2026-10-04).
    const deciderSetNumber = matchUpFormatCode.aggregateDeciderSetNumber(parsed);
    if (deciderSetNumber) return aggregateDeciderComplete(validatedSets, deciderSetNumber, isPlayed);

    const completeSets = validatedSets.filter(isPlayed).length;
    return completeSets >= bestOfSets;
  } else {
    const setsToWin = Math.ceil(bestOfSets / 2);
    const setsWon = { side1: 0, side2: 0 };
    validatedSets.forEach((set: any) => {
      if (set.winningSide === 1) setsWon.side1++;
      else if (set.winningSide === 2) setsWon.side2++;
    });
    const hasWinner = setsWon.side1 >= setsToWin || setsWon.side2 >= setsToWin;
    if (!hasWinner) return false;

    // For exactly formats, all sets must be played
    if (isExactlyFormat && validatedSets.length < bestOfSets) return false;

    return true;
  }
}

/**
 * Validate a score string using generateOutcomeFromScoreString with preserveSideOrder
 */
export function validateScore(scoreString: string, matchUpFormat?: string, matchUpStatus?: string): ScoreOutcome {
  const { WALKOVER, CANCELLED, DEAD_RUBBER } = matchUpStatusConstants;
  const scoresRemovedStatuses: string[] = [WALKOVER, CANCELLED, DEAD_RUBBER];

  if (!scoreString?.trim()) {
    if (matchUpStatus && scoresRemovedStatuses.includes(matchUpStatus)) {
      return {
        isValid: true,
        sets: [],
        matchUpStatus,
        scoreObject: undefined
      };
    }
    return {
      isValid: false,
      sets: [],
      error: 'Score is required'
    };
  }

  try {
    const { outcome, error: generateError } = tournamentEngine.generateOutcomeFromScoreString({
      scoreString: scoreString.trim(),
      matchUpFormat,
      preserveSideOrder: true
    });

    if (generateError || !outcome?.score?.sets) {
      return {
        isValid: false,
        sets: [],
        error: generateError || 'Invalid score format'
      };
    }

    const sets = outcome.score.sets;
    const scoreObject = outcome.score;

    const setStrings = scoreString
      .trim()
      .split(/\s+/)
      .filter((s) => s.length > 0);
    const parsed = matchUpFormatCode.parse(matchUpFormat);
    const bestOfSets = parsed?.exactly || parsed?.bestOf || 3;

    const notationError = validateSetNotation(setStrings, bestOfSets, parsed, sets, scoreObject);
    if (notationError) {
      return notationError;
    }

    let anySetInvalidated = false;
    const validatedSets = sets.map((set: any, index: number) => {
      const isDecidingSet = matchUpFormatCode.finalSetGoverns(parsed, index + 1, index + 1 === bestOfSets);
      const validation = validateSetScore(set, matchUpFormat, isDecidingSet, false);

      if (!validation.isValid) {
        anySetInvalidated = true;
        const { ...setWithoutWinner } = set;
        return setWithoutWinner;
      }

      return set;
    });

    const validatedScoreObject = {
      ...scoreObject,
      sets: validatedSets
    };

    const matchUpScoreValidation = validateMatchUpScore(validatedSets, matchUpFormat, matchUpStatus);
    if (!matchUpScoreValidation.isValid) {
      return {
        isValid: false,
        sets: validatedSets,
        scoreObject: validatedScoreObject,
        error: matchUpScoreValidation.error
      };
    }

    const setsToWin = Math.ceil(bestOfSets / 2);
    const winningSide: number | undefined = anySetInvalidated ? undefined : outcome.winningSide;

    const isComplete = checkMatchComplete(anySetInvalidated, winningSide, validatedSets, bestOfSets, parsed);

    if (!isComplete) {
      return {
        isValid: false,
        sets: validatedSets,
        scoreObject: validatedScoreObject,
        error: `Incomplete match - need ${setsToWin} sets to win`
      };
    }

    return {
      isValid: true,
      sets: validatedSets,
      scoreObject: validatedScoreObject,
      winningSide,
      matchUpStatus: COMPLETED,
      matchUpFormat,
      score: scoreString.trim()
    };
  } catch (error) {
    return {
      isValid: false,
      sets: [],
      error: error instanceof Error ? error.message : 'Invalid score format'
    };
  }
}

/**
 * Validate individual set scores (for Dynamic Sets approach)
 * Builds a scoreString from the sets and uses validateScore for consistent validation
 */
export function validateSetScores(
  sets: Array<{
    side1?: number;
    side2?: number;
    side1TiebreakScore?: number;
    side2TiebreakScore?: number;
    winningSide?: number;
  }>,
  matchUpFormat?: string,
  allowIncomplete?: boolean
): ScoreOutcome {
  if (!sets || sets.length === 0) {
    return {
      isValid: false,
      sets: [],
      error: 'At least one set is required'
    };
  }

  // Build a scoreString from the sets and use validateScore for consistent validation
  // This ensures dynamicSets uses the same factory logic as freeScore
  const scoreString = sets
    .map((set) => {
      const side1 = set.side1 ?? '';
      const side2 = set.side2 ?? '';

      // Handle tiebreak-only sets (bracket notation)
      // CRITICAL: Check if this is truly a tiebreak-only set (no game scores or both are 0)
      const isTiebreakOnlySet = (!side1 || side1 === 0) && (!side2 || side2 === 0);
      if (isTiebreakOnlySet && set.side1TiebreakScore !== undefined && set.side2TiebreakScore !== undefined) {
        return `[${set.side1TiebreakScore}-${set.side2TiebreakScore}]`;
      }

      // Regular set scores
      if (side1 === '' || side2 === '') {
        return ''; // Incomplete set
      }

      // Check if tiebreak scores should be added (set with tiebreak)
      if (set.side1TiebreakScore !== undefined || set.side2TiebreakScore !== undefined) {
        const tb1 = set.side1TiebreakScore ?? 0;
        const tb2 = set.side2TiebreakScore ?? 0;
        // Tennis notation shows the LOSER's tiebreak score
        // Determine which side won the set (by game score)
        const side1WonSet = Number(side1) > Number(side2);
        const loserTiebreakScore = side1WonSet ? tb2 : tb1;
        return `${side1}-${side2}(${loserTiebreakScore})`;
      }

      return `${side1}-${side2}`;
    })
    .filter((s) => s !== '') // Remove incomplete sets
    .join(' ');

  if (!scoreString) {
    return {
      isValid: false,
      sets: [],
      error: 'At least one complete set is required'
    };
  }

  // Use validateScore for consistent factory-based validation
  return validateScore(scoreString, matchUpFormat, allowIncomplete ? undefined : COMPLETED);
}
