/**
 * The Dial Pad's entry rules: where a tap lands, when the keypad holds, and what Backspace undoes.
 *
 * Lifted out of the `createDialPadRegion` closure so the rules are tested without a DOM. The region
 * keeps only what a keypad has and a model does not — whether Tiebreak mode is on, and the keys — and
 * asks this module everything else. Nothing here decides tennis: every refusal is `typeDigit` handing
 * the same model back, and the ceiling behind it is the factory's.
 *
 * ── The entry order ──
 *
 * Digits fill the current set alternating sides, **lower row first** — tap `4` then `6` and the first
 * set is 6-4, then the next tap starts the second set. A plain digit is the lower row, `Shift`+digit the
 * upper (CA, 2026-09-28: *"Dial pad should work the same way with key strokes"*).
 *
 * ── A finished set is the condition for starting the next one (CA, 2026-10-08) ──
 *
 * `5-1 1-4 3-3` under `SET3-S:6/TB7` was accepted tap by tap and refused only at Submit. A set whose two
 * cells hold games that do not finish it — 5-1, or 6-6 — stops the keypad there. A 6-7 is finished: the
 * Tiebreak key adds its points, or the next set simply starts and the points go unrecorded (CA,
 * 2026-11-07; the factory's ruling V11).
 */

import { clearCell, gamesLoser, isEmptyEntry, readCell, typeDigit } from './scoreEntryModel';
import { ENTRY_SIDE, otherSide } from '../keyboard';
import { tiebreakOnlyTarget } from './tiebreakEntry';
import {
  getSetFormatForIndex,
  shouldShowTiebreak,
  isSetTiebreakOnly,
  matchUpConfigFor,
  isSetComplete
} from './dynamicSetsLogic';

import type { CellRef, ScoreEntryModel, SetEntry } from './scoreEntryModel';
import type { MatchUpConfig } from './dynamicSetsLogic';
import type { SideNumber } from './scoreEntryState';
import type { SetScore } from '../types';

export type DialPadPress = {
  digit: number;
  /** `Shift` held: the digit names the UPPER row. */
  shifted?: boolean;
  /** The Tiebreak key is on: the digit is the games loser's tiebreak POINTS. */
  tiebreakMode?: boolean;
};

const SHIFTED = otherSide(ENTRY_SIDE);

/**
 * The model after one digit, or the same model when the tap goes nowhere.
 *
 * Order of questions: Tiebreak mode first; then a match-tiebreak set still being typed; then "extend the
 * value just written, if a second digit can still be a score there"; then the next empty slot.
 */
export function dialPadDigit(model: ScoreEntryModel, press: DialPadPress): ScoreEntryModel {
  const { digit, shifted = false } = press;
  if (press.tiebreakMode) return tiebreakDigit(model, digit);

  // A set that IS a tiebreak takes one number, not two: the row names the loser, and the model derives
  // the winner's points.
  const tiebreakSet = openTiebreakOnlySet(model);
  if (tiebreakSet !== undefined) {
    return typeDigit(model, { cell: games(tiebreakSet, shifted ? SHIFTED : ENTRY_SIDE), digit, complement: true });
  }

  // A SHIFTED press extends only the row it NAMES. Unshifted extends whatever was written last, which is
  // what makes `1` then `0` a ten; shifted extending the last write regardless would let `Shift+0` land
  // on the lower row simply because the lower row was typed more recently.
  const written = lastWritten(model);
  const last = shifted && written?.side !== SHIFTED ? undefined : written;
  if (last) {
    const extended = typeDigit(model, { cell: last, digit });
    if (extended !== model) return extended;
  }

  const slot = nextSlot(model, shifted);
  return slot ? typeDigit(model, { cell: slot, digit }) : model;
}

/**
 * The model with the most recent entry removed, or the same model when there is nothing to remove.
 *
 * Walks the sets backwards: a tiebreak digit before the games it belongs to, and the upper row before
 * the lower, mirroring the fill order. A cell is re-typed rather than truncated — clearing it and typing
 * the digits that remain re-derives whatever the model derives (a tiebreak-only complement, a tiebreak
 * pair) on the way.
 */
export function dialPadBackspace(model: ScoreEntryModel): ScoreEntryModel {
  for (let index = model.sets.length - 1; index >= 0; index -= 1) {
    const entry = model.sets[index];
    if (isEmptyEntry(entry)) continue;

    if (tiebreakOnly(model, index)) {
      // One typed number plus a derived one: take a digit off what was TYPED and let the model recompute
      // the other. Deleting from the derived cell would leave a pair the operator never entered.
      const side = lowTiebreakOnlySide(entry) ?? ENTRY_SIDE;
      return retype(
        model,
        games(index, side),
        shorten(lowTiebreakOnly(entry)),
        [games(index, 1), games(index, 2)],
        true
      );
    }

    if (entry.tiebreak1 !== undefined || entry.tiebreak2 !== undefined) {
      const loser = gamesLoser(entry);
      const side = loser ?? ENTRY_SIDE;
      const points = side === 1 ? entry.tiebreak1 : entry.tiebreak2;
      return retype(model, tiebreak(index, side), shorten(points), [tiebreak(index, 1), tiebreak(index, 2)], !!loser);
    }

    for (const side of [SHIFTED, ENTRY_SIDE]) {
      const value = readCell(entry, games(index, side));
      if (value === undefined) continue;
      return retype(model, games(index, side), shorten(value), [games(index, side)]);
    }
  }
  return model;
}

/**
 * Whether the Tiebreak key does anything RIGHT NOW: the format has one, and the set being entered has
 * games that carry one — 7-6, or 5-4 under `S:5/TB9@4`. At 6-6 the tiebreak is still being played; after
 * 6-4 there was none. `shouldShowTiebreak` is the Dynamic Sets rule for the same question, so the two
 * approaches offer the control in the same states.
 */
export function tiebreakKeyOffered(model: ScoreEntryModel): boolean {
  if (!formatHasTiebreak(model)) return false;
  const index = lastActiveIndex(model);
  const entry = model.sets[index];
  if (tiebreakOnly(model, index) || !filled(entry, 1) || !filled(entry, 2)) return false;
  return shouldShowTiebreak(index, { side1: entry.side1 as number, side2: entry.side2 as number }, configOf(model));
}

/**
 * What the readouts SHOW: every set holding anything, a missing side read as 0.
 *
 * Distinct from `enteredSets`, which the band and `getSets()` use and which leaves a half-entered set
 * out. The 0 opposite a lone digit tells the operator which row their tap landed on.
 */
export function dialPadReadout(model: ScoreEntryModel): SetScore[] {
  return model.sets.flatMap((entry, index) => {
    if (isEmptyEntry(entry)) return [];
    if (tiebreakOnly(model, index)) {
      return [
        {
          setNumber: index + 1,
          side1Score: 0,
          side2Score: 0,
          side1TiebreakScore: entry.side1,
          side2TiebreakScore: entry.side2
        }
      ];
    }
    return [
      {
        setNumber: index + 1,
        side1Score: entry.side1 ?? 0,
        side2Score: entry.side2 ?? 0,
        side1TiebreakScore: entry.tiebreak1,
        side2TiebreakScore: entry.tiebreak2
      }
    ];
  });
}

/**
 * Where the next games digit lands: the first set not yet full, and which side within it.
 *
 * A shifted press NAMES the upper row, so where that row is taken it moves on to the next set rather
 * than landing on the row it did not name. `undefined` when every set is full, or when an unfinished set
 * holds the keypad (see the header) — the keypad goes quiet rather than overwrite a set.
 */
export function nextSlot(model: ScoreEntryModel, shifted = false): CellRef | undefined {
  const named: SideNumber = shifted ? SHIFTED : ENTRY_SIDE;

  for (const [index, entry] of model.sets.entries()) {
    if (!filled(entry, named)) return games(index, named);
    if (!shifted && !filled(entry, otherSide(named))) return games(index, otherSide(named));
    if (!holds(model, index)) return undefined;
  }
  return undefined;
}

/**
 * The games cell most recently written to. Entry fills the lower row first, so within the last set with
 * content the UPPER row is the more recent where both are present.
 */
export function lastWritten(model: ScoreEntryModel): CellRef | undefined {
  for (let index = model.sets.length - 1; index >= 0; index -= 1) {
    const entry = model.sets[index];
    if (filled(entry, SHIFTED)) return games(index, SHIFTED);
    if (filled(entry, ENTRY_SIDE)) return games(index, ENTRY_SIDE);
  }
  return undefined;
}

// ── Internals ────────────────────────────────────────────────────────

function configOf(model: ScoreEntryModel): MatchUpConfig {
  return matchUpConfigFor(model.matchUpFormat);
}

function games(setIndex: number, side: SideNumber): CellRef {
  return { setIndex, side, kind: 'games' };
}

function tiebreak(setIndex: number, side: SideNumber): CellRef {
  return { setIndex, side, kind: 'tiebreak' };
}

function filled(entry: SetEntry, side: SideNumber): boolean {
  return (side === 1 ? entry.side1 : entry.side2) !== undefined;
}

/** Whether this set is played ENTIRELY as a tiebreak — a match tiebreak. */
function tiebreakOnly(model: ScoreEntryModel, index: number): boolean {
  return isSetTiebreakOnly(getSetFormatForIndex(index, configOf(model)));
}

/** Whether a set with both cells filled is finished, by the factory's rule, tiebreak points included. */
function holds(model: ScoreEntryModel, index: number): boolean {
  const entry = model.sets[index];
  if (!filled(entry, 1) || !filled(entry, 2)) return false;
  return isSetComplete(
    index,
    { side1: entry.side1 as number, side2: entry.side2 as number, tiebreak: lowTiebreak(entry) },
    configOf(model)
  );
}

/** The LOSER's tiebreak points on a set, which is the single value `isSetComplete` carries. */
function lowTiebreak(entry: SetEntry): number | undefined {
  const points = [entry.tiebreak1, entry.tiebreak2].filter((p): p is number => p !== undefined);
  return points.length ? Math.min(...points) : undefined;
}

/** The set a tiebreak would attach to: the last one with anything in it. */
function lastActiveIndex(model: ScoreEntryModel): number {
  for (let index = model.sets.length - 1; index >= 0; index -= 1) {
    if (!isEmptyEntry(model.sets[index])) return index;
  }
  return 0;
}

/**
 * The tiebreak-only set a digit belongs to, if the keypad is in one: the first whose low score is still
 * being typed. Anything earlier that is NOT tiebreak-only must have both cells first, so a mixed format
 * (`SET3-S:6/TB7-F:TB10`) keeps its ordinary sets on the ordinary path.
 */
function openTiebreakOnlySet(model: ScoreEntryModel): number | undefined {
  for (let index = 0; index < model.sets.length; index += 1) {
    const entry = model.sets[index];
    if (!tiebreakOnly(model, index)) {
      if (!filled(entry, 1) || !filled(entry, 2)) return undefined;
      continue;
    }
    const low = lowTiebreakOnly(entry);
    if (low === undefined || low < 10) return index;
  }
  return undefined;
}

/** The typed (lower) points of a tiebreak-only set. */
function lowTiebreakOnly(entry: SetEntry): number | undefined {
  const values = [entry.side1, entry.side2].filter((value): value is number => value !== undefined);
  return values.length ? Math.min(...values) : undefined;
}

function lowTiebreakOnlySide(entry: SetEntry): SideNumber | undefined {
  const low = lowTiebreakOnly(entry);
  if (low === undefined) return undefined;
  return entry.side2 === low ? 2 : 1;
}

/**
 * A digit in Tiebreak mode: the LOSER's points, attached to the last set with games in it. Where the
 * games are level nothing has been lost yet, so the digit goes on the entry row undecorated and the
 * factory's validation says what is wrong with that.
 */
function tiebreakDigit(model: ScoreEntryModel, digit: number): ScoreEntryModel {
  const index = lastActiveIndex(model);
  const loser = gamesLoser(model.sets[index]);
  return typeDigit(model, { cell: tiebreak(index, loser ?? ENTRY_SIDE), digit, complement: loser !== undefined });
}

/** A number with its last digit removed, or nothing when there is none left. */
function shorten(value: number | undefined): string {
  return value === undefined ? '' : String(value).slice(0, -1);
}

/** Clear the given cells, then type `digits` back into `cell` one keystroke at a time. */
function retype(
  model: ScoreEntryModel,
  cell: CellRef,
  digits: string,
  toClear: CellRef[],
  complement = false
): ScoreEntryModel {
  let next = model;
  for (const target of toClear) next = clearCell(next, target);
  for (const digit of digits) next = typeDigit(next, { cell, digit: Number(digit), complement });
  return next;
}

/**
 * Whether the Tiebreak key does anything in this format. A set that is ITSELF a tiebreak has nothing to
 * attach one to, so a format whose every set is tiebreak-only (`SET1-S:TB10`) never offers it; a MIXED
 * format keeps it, because sets 1 and 2 of `SET3-S:6/TB7-F:TB10` need it.
 */
function formatHasTiebreak(model: ScoreEntryModel): boolean {
  const config = configOf(model);
  for (let index = 0; index < model.sets.length; index += 1) {
    if (tiebreakOnly(model, index)) continue;
    const setFormat = getSetFormatForIndex(index, config);
    if (setFormat?.tiebreakFormat || tiebreakOnlyTarget(setFormat)) return true;
  }
  return false;
}
