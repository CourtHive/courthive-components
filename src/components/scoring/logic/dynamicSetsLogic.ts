/**
 * Pure logic for Dynamic Sets score entry.
 *
 * The format rules — set formats, completeness, winners, complements, ceilings, the tiebreak question — are owned by
 * the factory (`tods-competition-factory/score-entry-state`), where a score state is judged by them, and are
 * re-exported here under the names this package has always exported. Every one of them delegates to the factory's
 * scoring rules (CA, 2026-09-27: *"why would we hand roll something?"*). What stays is the shipping approach's own
 * keystroke policy: when a smart complement fires, and when a new set row opens.
 */
import {
  getSetFormatForIndex,
  isMatchComplete,
  isSetTiebreakOnly,
  isSetTimed,
  calculateComplement
} from 'tods-competition-factory/score-entry-state';

import type { MatchUpConfig } from 'tods-competition-factory/score-entry-state';
import type { SetScore } from '../types';

export {
  matchUpConfigFor,
  getSetFormatForIndex,
  isSetTiebreakOnly,
  isSetTimed,
  getMaxAllowedScore,
  isSetComplete,
  getSetWinner,
  isMatchComplete,
  getMatchWinner,
  calculateComplement,
  shouldShowTiebreak,
  buildSetScore
} from 'tods-competition-factory/score-entry-state';
export type { SetFormat, MatchUpConfig } from 'tods-competition-factory/score-entry-state';

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
