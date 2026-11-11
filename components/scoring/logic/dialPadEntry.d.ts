import { CellRef, ScoreEntryModel } from './scoreEntryModel';
import { SetScore } from '../types';
export type DialPadPress = {
    digit: number;
    /** `Shift` held: the digit names the UPPER row. */
    shifted?: boolean;
    /** The Tiebreak key is on: the digit is the games loser's tiebreak POINTS. */
    tiebreakMode?: boolean;
};
/**
 * The model after one digit, or the same model when the tap goes nowhere.
 *
 * Order of questions: Tiebreak mode first; then a match-tiebreak set still being typed; then "extend the
 * value just written, if a second digit can still be a score there"; then the next empty slot.
 */
export declare function dialPadDigit(model: ScoreEntryModel, press: DialPadPress): ScoreEntryModel;
/**
 * The model with the most recent entry removed, or the same model when there is nothing to remove.
 *
 * Walks the sets backwards: a tiebreak digit before the games it belongs to, and the upper row before
 * the lower, mirroring the fill order. A cell is re-typed rather than truncated — clearing it and typing
 * the digits that remain re-derives whatever the model derives (a tiebreak-only complement, a tiebreak
 * pair) on the way.
 */
export declare function dialPadBackspace(model: ScoreEntryModel): ScoreEntryModel;
/**
 * Whether the Tiebreak key does anything RIGHT NOW: the format has one, and the set being entered has
 * games that carry one — 7-6, or 5-4 under `S:5/TB9@4`. At 6-6 the tiebreak is still being played; after
 * 6-4 there was none. `shouldShowTiebreak` is the Dynamic Sets rule for the same question, so the two
 * approaches offer the control in the same states.
 */
export declare function tiebreakKeyOffered(model: ScoreEntryModel): boolean;
/**
 * What the readouts SHOW: every set holding anything, a missing side read as 0.
 *
 * Distinct from `enteredSets`, which the band and `getSets()` use and which leaves a half-entered set
 * out. The 0 opposite a lone digit tells the operator which row their tap landed on.
 */
export declare function dialPadReadout(model: ScoreEntryModel): SetScore[];
/**
 * Where the next games digit lands: the first set not yet full, and which side within it.
 *
 * A shifted press NAMES the upper row, so where that row is taken it moves on to the next set rather
 * than landing on the row it did not name. `undefined` when every set is full, or when an unfinished set
 * holds the keypad (see the header) — the keypad goes quiet rather than overwrite a set.
 */
export declare function nextSlot(model: ScoreEntryModel, shifted?: boolean): CellRef | undefined;
/**
 * The games cell most recently written to. Entry fills the lower row first, so within the last set with
 * content the UPPER row is the more recent where both are present.
 */
export declare function lastWritten(model: ScoreEntryModel): CellRef | undefined;
