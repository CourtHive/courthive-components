/**
 * The Dynamic Sets region's entry rules, lifted out of its closure so they are tested without a DOM.
 *
 * The region keeps the inputs, focus and the Smart toggle's state; these answer what a field's text
 * means for the model. Every refusal is `typeDigit` handing the same model back, so the ceiling behind
 * "a set to six cannot hold a 44" is the factory's.
 */

import { getSetFormatForIndex, isSetTiebreakOnly, matchUpConfigFor } from './dynamicSetsLogic';
import { clearCell, typeDigit } from './scoreEntryModel';
import { lowerTiebreakPoints } from './tiebreakPoints';
import { cellValue } from './scoreEntrySelectors';
import { otherSide } from '../keyboard';

import type { CellRef, ScoreEntryModel } from './scoreEntryModel';
import type { SideNumber } from './scoreEntryState';

/**
 * A field's text as digits only, without leading zeros on a longer number: `6a` and `a6` are `6`, `07`
 * is `7`, and a lone `0` stays — a set lost to love is a score.
 */
export function cleanDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

/**
 * The model with `cell` cleared and `digits` typed back into it one keystroke at a time.
 *
 * The first refused digit stops the replay rather than being skipped, so `44` in a set to six is `4`
 * (the second 4 is past the ceiling) and an `8` there is nothing at all.
 */
export function replayDigits(
  model: ScoreEntryModel,
  cell: CellRef,
  digits: string,
  complement: boolean
): ScoreEntryModel {
  let next = clearCell(model, cell);
  for (const character of digits) {
    const after = typeDigit(next, { cell, digit: Number(character), complement });
    if (after === next) break;
    next = after;
  }
  return next;
}

export type ComplementPolicy = {
  /** The Smart toggle. */
  smart: boolean;
  /** The sets whose games complement has already fired once. */
  used: ReadonlySet<number>;
};

/**
 * Whether a keystroke into `cell` may derive the opposite cell.
 *
 * Never with Smart off. A tiebreak cell and a tiebreak-only set always may — their complement is the
 * points the format implies, which a correction re-derives. A games cell may only ONCE per set, so a
 * correction by hand is not complemented in turn.
 */
export function offersComplement(model: ScoreEntryModel, cell: CellRef, policy: ComplementPolicy): boolean {
  if (!policy.smart) return false;
  if (cell.kind === 'tiebreak') return true;
  const setFormat = getSetFormatForIndex(cell.setIndex, matchUpConfigFor(model.matchUpFormat));
  return isSetTiebreakOnly(setFormat) || !policy.used.has(cell.setIndex);
}

/** Whether a games keystroke moved the OPPOSITE games cell — that is, whether the complement fired. */
export function complementFired(before: ScoreEntryModel, after: ScoreEntryModel, cell: CellRef): boolean {
  if (cell.kind !== 'games') return false;
  const other = otherSide(cell.side);
  return cellValue(after, cell.setIndex, other, 'games') !== cellValue(before, cell.setIndex, other, 'games');
}

/**
 * The tiebreak points to raise beside a side's games, or `undefined`.
 *
 * Only the LOWER of the two shows — `7-6³` means the loser took three — and when only one side's points
 * are in, they show on that side, so what was just typed stays in view. The rule is `lowerTiebreakPoints`;
 * the draw cell raises by the same rule but only once both values are in (`settledTiebreakPoints`).
 */
export function raisedTiebreakPoints(model: ScoreEntryModel, setIndex: number, side: SideNumber): number | undefined {
  const mine = cellValue(model, setIndex, side, 'tiebreak');
  const theirs = cellValue(model, setIndex, otherSide(side), 'tiebreak');
  return lowerTiebreakPoints(mine, theirs);
}
