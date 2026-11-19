import { MatchUpConfig } from 'tods-competition-factory/score-entry-state';
import { SetScore } from '../types';
export { matchUpConfigFor, getSetFormatForIndex, isSetTiebreakOnly, isSetTimed, getMaxAllowedScore, isSetComplete, getSetWinner, isMatchComplete, getMatchWinner, calculateComplement, shouldShowTiebreak, buildSetScore } from 'tods-competition-factory/score-entry-state';
export type { SetFormat, MatchUpConfig } from 'tods-competition-factory/score-entry-state';
/**
 * Result of smart complement calculation
 */
export type SmartComplementResult = {
    field1Value: number;
    field2Value: number;
    shouldApply: boolean;
    reason?: string;
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
export declare function shouldApplySmartComplement(digit: number, isShiftPressed: boolean, setIndex: number, sets: SetScore[], config: MatchUpConfig, smartComplementsUsed: Set<number>, smartComplementsEnabled: boolean): SmartComplementResult;
/**
 * Determine if a new set row should be created
 */
export declare function shouldCreateNextSet(currentSetIndex: number, sets: SetScore[], config: MatchUpConfig): boolean;
