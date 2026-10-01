/**
 * The Dial Pad region: enter the score by tapping digits.
 *
 * Artboard `07-Desktop-DialPad`. Same rows as Free Score — a read-only readout per side — with a
 * five-across keypad beneath and a narrow column beside it for Tiebreak and Backspace.
 *
 * ── The first region to RENDER the model ──
 *
 * S2 of `Mentat/planning/SCORE_ENTRY_STATE_ENGINE.md`. This region no longer holds a score of its own:
 * no `entries` array, no `tiebreakLows` map. It holds ONE `ScoreEntryModel`, replaces it through the
 * model's transitions, and answers every question the card asks through the model's selectors. What
 * is left here is exactly two jobs — decide WHERE a tap lands, and draw the keypad and readouts.
 *
 * It was chosen first because it read the DOM for a score value in zero places, so its private array
 * was already its only truth; that made it the cheapest honest proof that the model can drive a real
 * region. Every behavioural test in `freeScoreAndDialPadRegions.test.ts` describes this region and
 * none of its assertions changed.
 *
 * ── What stays here, deliberately ──
 *
 * `tiebreakMode` — whether the next digit means POINTS rather than games. That is the meaning of a
 * tap, not a fact about the score: the model has no idea a keypad exists. A model that owned it would
 * be a store, not an engine.
 *
 * The keypad's navigation — "extend the number just typed if it can still be a score, else start the
 * next empty cell" — is also here, because it is about where a tap goes. But it decides nothing about
 * tennis: it asks the model, and a refused `typeDigit` (the same model back) is what tells it to move
 * on. The ceiling behind that refusal is the factory's.
 *
 * ── The entry order ──
 *
 * Digits fill the current set alternating sides, **lower row first** — tap `4` then `6` and the first
 * set is 6-4, then the next tap starts the second set. Typing works too, and identically: a plain digit
 * is the lower row, `Shift`+digit the upper. The lower-first order is CA's (2026-09-28, *"Dial pad
 * should work the same way with key strokes"*): the keystroke convention cannot be true of the keyboard
 * and false of the keys under the same operator's other hand.
 *
 * ── The readout shows a half-entered set; the band does not ──
 *
 * A lone `4` on the lower row reads as `4` with `0` opposite, because a set with one side entered is
 * still a set the operator is in the middle of. The BAND and `getSets()` report only sets with both
 * sides in, through `enteredSets`, because a `0-4` nobody typed is not a score. Both come from the same
 * model; they differ only in which selector they ask.
 */

import { getSetFormatForIndex, isSetTiebreakOnly, matchUpConfigFor } from '../logic/dynamicSetsLogic';
import { clearCell, gamesLoser, isEmptyEntry, readCell, typeDigit } from '../logic/scoreEntryModel';
import { ENTRY_SIDE, digitFromCode, hasCommandModifier, otherSide } from '../keyboard';
import { createScoreReadouts, READOUT_COLUMN_WIDTH } from './scoreReadout';
import { createScoreEntryStore } from '../logic/scoreEntryStore';
import { tiebreakOnlyTarget } from '../logic/tiebreakEntry';
import { enteredSets } from '../logic/scoreEntrySelectors';

import type { CellRef, ScoreEntryModel, SetEntry } from '../logic/scoreEntryModel';
import type { ScoreEntryStore } from '../logic/scoreEntryStore';
import type { SideNumber } from '../logic/scoreEntryState';
import type { ScoreRegion } from '../scoreEntryCard';
import type { SetScore } from '../types';

export type DialPadRegionParams = {
  /** The model the card holds. Omit it and the region makes its own from the params below. */
  store?: ScoreEntryStore;
  matchUpFormat?: string;
  /** Sets already recorded, e.g. from a saved matchUp. Read only when no `store` is given. */
  sets?: SetScore[];
  onChange?: () => void;
};

export type DialPadRegion = ScoreRegion & {
  store: ScoreEntryStore;
  /** The entered sets, for a host or a test reading the region directly. The card reads the model. */
  getSets: () => SetScore[];
};

export function createDialPadRegion(params: DialPadRegionParams): DialPadRegion {
  /** The one truth, shared with the card. Replaced through `store.set`, never mutated. */
  const store =
    params.store ??
    createScoreEntryStore({ matchUpFormat: params.matchUpFormat, approach: 'dialPad', sets: params.sets });
  const config = matchUpConfigFor(store.get().matchUpFormat);
  const setCount = store.get().sets.length;
  /** Whether the next digit is entered as a tiebreak rather than as games. Presentation: see the header. */
  let tiebreakMode = false;
  const readouts = createScoreReadouts();
  /** The live digit keys, so `focusFirst` can reach one without a DOM query. */
  const digitKeys = new Map<number, HTMLButtonElement>();

  return {
    store,
    columns: () => [{ width: READOUT_COLUMN_WIDTH }],
    rowCells: (sideNumber) => [readouts.cell(sideNumber, readoutSets())],
    block: () => keypad(),
    getSets: () => enteredSets(model()),
    // The card has already emptied the model; this resets what is the keypad's own.
    clear: () => {
      tiebreakMode = false;
      changed();
    },
    // The keypad has no text field to put a caret in, so the first digit key is where entry begins.
    focusFirst: () => digitKeys.get(1)?.focus()
  };

  // ── Reading the model ─────────────────────────────────────────────────

  function model(): ScoreEntryModel {
    return store.get();
  }

  /**
   * What the rows SHOW: every set holding anything, a missing side read as 0.
   *
   * Distinct from `enteredSets`, which the band and `getSets()` use and which leaves a half-entered set
   * out. The readout is the one place a partial set is visible, and the 0 opposite a lone digit is
   * asserted: it tells the operator which row their tap landed on.
   */
  function readoutSets(): SetScore[] {
    return model().sets.flatMap((entry, index) => {
      if (isEmptyEntry(entry)) return [];
      if (tiebreakOnly(index)) {
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

  function games(setIndex: number, side: SideNumber): CellRef {
    return { setIndex, side, kind: 'games' };
  }

  function tiebreak(setIndex: number, side: SideNumber): CellRef {
    return { setIndex, side, kind: 'tiebreak' };
  }

  /** Whether this side of a set has a games value. */
  function filled(entry: SetEntry, side: SideNumber): boolean {
    return (side === 1 ? entry.side1 : entry.side2) !== undefined;
  }

  /** Whether this set is played ENTIRELY as a tiebreak — a match tiebreak. */
  function tiebreakOnly(index: number): boolean {
    return isSetTiebreakOnly(getSetFormatForIndex(index, config));
  }

  /**
   * Where the next entry lands: the first set that is not yet full, and which side within it.
   *
   * ── The LOWER row first, and Shift for the upper ──
   *
   * A shifted keystroke prefers the opposite side. Preferring a side is not the same as insisting on
   * it: where the preferred cell is already filled the other one takes the digit, so a shifted press
   * into a set whose upper row is done still lands somewhere sensible rather than silently doing
   * nothing.
   *
   * Returns `undefined` when every set has both sides, which is when the keypad goes quiet rather than
   * silently overwriting the first set — an operator who has finished entering has no way to know a tap
   * went somewhere they cannot see.
   */
  function nextSlot(shifted = false): CellRef | undefined {
    const named: SideNumber = shifted ? otherSide(ENTRY_SIDE) : ENTRY_SIDE;

    for (const [index, entry] of model().sets.entries()) {
      if (!filled(entry, named)) return games(index, named);
      // Only an UNSHIFTED press alternates into the other side of the same set. A shifted press NAMES
      // the upper row, so when that row is taken it moves on to the next set rather than landing on the
      // row it explicitly did not name — otherwise `Shift` would sometimes mean "upper" and sometimes
      // mean "wherever there is space", which is not a convention anyone can rely on.
      if (!shifted && !filled(entry, otherSide(named))) return games(index, otherSide(named));
    }
    return undefined;
  }

  /**
   * The side most recently written to.
   *
   * Entry fills the lower row first (see `nextSlot`), so within the last set with content the UPPER
   * row is the more recent one where both are present. This order is what makes a second digit extend
   * the value just typed rather than a value entered before it.
   */
  function lastWritten(): CellRef | undefined {
    for (let index = model().sets.length - 1; index >= 0; index -= 1) {
      const entry = model().sets[index];
      if (filled(entry, otherSide(ENTRY_SIDE))) return games(index, otherSide(ENTRY_SIDE));
      if (filled(entry, ENTRY_SIDE)) return games(index, ENTRY_SIDE);
    }
    return undefined;
  }

  /** The set a tiebreak would attach to: the last one with any games in it. */
  function lastActiveIndex(): number {
    for (let index = model().sets.length - 1; index >= 0; index -= 1) {
      if (!isEmptyEntry(model().sets[index])) return index;
    }
    return 0;
  }

  /**
   * The tiebreak-only set a digit belongs to, if the keypad is in one.
   *
   * The first tiebreak-only set whose low score is still being typed — not yet started, or one digit
   * so far. Anything earlier that is NOT tiebreak-only must be complete first, so a mixed format
   * (`SET3-S:6/TB7-F:TB10`) keeps its ordinary sets on the ordinary path and only the deciding set
   * comes here. The low score is the LOWER of the two cells, because the model always derives the other
   * one ahead of it.
   */
  function openTiebreakOnlySet(): number | undefined {
    for (let index = 0; index < setCount; index += 1) {
      const entry = model().sets[index];
      if (!tiebreakOnly(index)) {
        if (!filled(entry, 1) || !filled(entry, 2)) return undefined;
        continue;
      }

      const low = lowTiebreakOnly(entry);
      if (low === undefined || low < 10) return index;
    }
    return undefined;
  }

  /** The typed (lower) points of a tiebreak-only set, and the row they are on. */
  function lowTiebreakOnly(entry: SetEntry): number | undefined {
    const values = [entry.side1, entry.side2].filter((value): value is number => value !== undefined);
    return values.length ? Math.min(...values) : undefined;
  }

  function lowTiebreakOnlySide(entry: SetEntry): SideNumber | undefined {
    const low = lowTiebreakOnly(entry);
    if (low === undefined) return undefined;
    return entry.side2 === low ? 2 : 1;
  }

  // ── Input ────────────────────────────────────────────────────────────

  /** Replace the model, and refuse nothing silently: an unchanged model means the tap went nowhere. */
  function apply(next: ScoreEntryModel): boolean {
    if (next === model()) return false;
    store.set(next);
    changed();
    return true;
  }

  function pressDigit(digit: number, shifted = false): void {
    if (tiebreakMode) {
      pressTiebreakDigit(digit);
      return;
    }

    // A set that IS a tiebreak takes one number, not two: the row names the loser, and the model
    // derives the winner's points — the derivation is a transition, not something this region does.
    const tiebreakSet = openTiebreakOnlySet();
    if (tiebreakSet !== undefined) {
      apply(
        typeDigit(model(), {
          cell: games(tiebreakSet, shifted ? otherSide(ENTRY_SIDE) : ENTRY_SIDE),
          digit,
          complement: true
        })
      );
      return;
    }

    // Extend the side just written to, if a second digit could still be a legal score there. The model
    // refuses — hands the same object back — when it could not, and that refusal is the cue to start
    // the next empty slot. The ceiling behind it is the factory's, asked with the opponent's games.
    //
    // A SHIFTED press extends only the row it NAMES. Unshifted follows the entry order and extends
    // whatever was written last, which is what makes `1` then `0` a ten. Shifted extending the last
    // write regardless would let `Shift+0` land on the lower row simply because the lower row was typed
    // more recently.
    const written = lastWritten();
    const last = shifted && written?.side !== otherSide(ENTRY_SIDE) ? undefined : written;
    if (last && apply(typeDigit(model(), { cell: last, digit }))) return;

    const slot = nextSlot(shifted);
    if (!slot) return;
    apply(typeDigit(model(), { cell: slot, digit }));
  }

  /**
   * A digit in tiebreak mode: the LOSER's points, with the winner's derived by the model.
   *
   * Attached to the last set with games in it, on the cell of the side that lost it — the only side a
   * complement can be derived from. Where the games are level nothing has been lost yet, so the digit
   * goes on the entry row undecorated and the factory's validation says what is wrong with that.
   */
  function pressTiebreakDigit(digit: number): void {
    const index = lastActiveIndex();
    const loser = gamesLoser(model().sets[index]);
    apply(typeDigit(model(), { cell: tiebreak(index, loser ?? ENTRY_SIDE), digit, complement: loser !== undefined }));
  }

  /**
   * Remove the last thing entered.
   *
   * Walks the sets backwards so a backspace always undoes the most recent tap, whatever it was — a
   * tiebreak digit before the games it belongs to, and the upper row before the lower, mirroring the
   * fill order. Without that ordering, backspace after a tiebreak would eat the set score instead and
   * leave the tiebreak orphaned.
   *
   * A cell is re-typed rather than truncated: the model has no "drop a digit" transition, and it needs
   * none — clearing the cell and typing the digits that remain is the same keystrokes in reverse, and
   * it re-derives whatever the model derives (a tiebreak-only complement, a tiebreak pair) on the way.
   */
  function backspace(): void {
    for (let index = model().sets.length - 1; index >= 0; index -= 1) {
      const entry = model().sets[index];
      if (isEmptyEntry(entry)) continue;

      if (tiebreakOnly(index)) {
        // One typed number plus a derived one: take a digit off what was TYPED and let the model
        // recompute the other. Deleting from the derived cell would leave a pair the operator never
        // entered and could not correct.
        const side = lowTiebreakOnlySide(entry) ?? ENTRY_SIDE;
        retype(games(index, side), shorten(lowTiebreakOnly(entry)), [games(index, 1), games(index, 2)], true);
        return;
      }

      if (entry.tiebreak1 !== undefined || entry.tiebreak2 !== undefined) {
        const loser = gamesLoser(entry) ?? ENTRY_SIDE;
        const points = loser === 1 ? entry.tiebreak1 : entry.tiebreak2;
        retype(tiebreak(index, loser), shorten(points), [tiebreak(index, 1), tiebreak(index, 2)], loser !== undefined);
        return;
      }

      // Upper row before lower, mirroring the fill order.
      for (const side of [otherSide(ENTRY_SIDE), ENTRY_SIDE]) {
        const value = readCell(entry, games(index, side));
        if (value === undefined) continue;
        retype(games(index, side), shorten(value), [games(index, side)]);
        return;
      }
    }
  }

  /** A number with its last digit removed, or nothing when there is none left. */
  function shorten(value: number | undefined): string {
    return value === undefined ? '' : String(value).slice(0, -1);
  }

  /** Clear the given cells, then type `digits` back into `cell` one keystroke at a time. */
  function retype(cell: CellRef, digits: string, toClear: CellRef[], complement = false): void {
    let next = model();
    for (const target of toClear) next = clearCell(next, target);
    for (const digit of digits) next = typeDigit(next, { cell, digit: Number(digit), complement });
    apply(next);
  }

  /**
   * The single exit from every mutation.
   *
   * It updates the readout FIRST and then tells the card. The readout lives in the participant rows,
   * which the card's `refresh` deliberately does not re-render — so a region with anything live in the
   * rows has to write it itself, and funnelling every path through one function is what stops a new
   * control being added later that changes the score without the rows following.
   */
  function changed(): void {
    readouts.update(readoutSets());
    params.onChange?.();
  }

  // ── Rendering ────────────────────────────────────────────────────────

  /**
   * The keypad takes keystrokes as well as taps.
   *
   * Listened for on the keypad WRAPPER rather than on the document: `focusFirst` puts focus on a digit
   * key, so the events bubble here, and scoping it this way means the digits cannot fire while the
   * operator is somewhere else in the card entirely. `event.code` and not `event.key`, so `Shift+3`
   * is still a 3 — see `keyboard.ts`.
   */
  function onKeypadKeydown(event: KeyboardEvent): void {
    if (hasCommandModifier(event)) return;

    const digit = digitFromCode(event.code);
    if (digit !== undefined) {
      // Declined rather than allowed through: a digit key press on a focused BUTTON does nothing by
      // default, but Space and Enter would activate it, and preventing the digit keeps the two paths
      // from both firing if that ever changes.
      event.preventDefault();
      pressDigit(digit, event.shiftKey);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
    }
  }

  function keypad(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'chc-sec-dialpad';
    wrapper.addEventListener('keydown', onKeypadKeydown);

    const digits = document.createElement('div');
    digits.className = 'chc-sec-dialpad-digits';
    for (let digit = 0; digit <= 9; digit += 1) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'chc-sec-btn chc-sec-key';
      key.dataset.digit = String(digit);
      key.textContent = String(digit);
      key.addEventListener('click', () => pressDigit(digit));
      digitKeys.set(digit, key);
      digits.append(key);
    }

    const side = document.createElement('div');
    side.className = 'chc-sec-dialpad-side';

    const tiebreakKey = document.createElement('button');
    tiebreakKey.type = 'button';
    tiebreakKey.className = 'chc-sec-btn';
    tiebreakKey.dataset.action = 'tiebreak';
    tiebreakKey.textContent = 'Tiebreak';
    tiebreakKey.setAttribute('aria-pressed', String(tiebreakMode));
    // Offered only when the format has a tiebreak at all. A disabled control the operator cannot
    // explain is worse than one that is not there.
    tiebreakKey.disabled = !formatHasTiebreak();
    tiebreakKey.addEventListener('click', () => {
      tiebreakMode = !tiebreakMode;
      tiebreakKey.setAttribute('aria-pressed', String(tiebreakMode));
      changed();
    });

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'chc-sec-btn chc-sec-key-back';
    back.dataset.action = 'backspace';
    back.textContent = 'Backspace';
    back.addEventListener('click', () => backspace());

    side.append(tiebreakKey, back);
    wrapper.append(digits, side);
    return wrapper;
  }

  /**
   * Whether the Tiebreak key does anything in this format.
   *
   * A set that is ITSELF a tiebreak has nothing to attach one to: its own cells are the points, so the
   * key would be a second place to enter the same number — which is the reason Dynamic Sets renders no
   * separate tiebreak column for these sets either. So a format whose every set is tiebreak-only
   * (`SET1-S:TB10`, `SET3-S:TB10`) disables the key rather than offering a control that can only
   * produce a contradiction. A MIXED format keeps it, because sets 1 and 2 of `SET3-S:6/TB7-F:TB10`
   * genuinely need it.
   */
  function formatHasTiebreak(): boolean {
    let anyAttachable = false;
    for (let index = 0; index < setCount; index += 1) {
      if (tiebreakOnly(index)) continue;
      const setFormat = getSetFormatForIndex(index, config);
      if (setFormat?.tiebreakFormat || tiebreakOnlyTarget(setFormat)) anyAttachable = true;
    }
    return anyAttachable;
  }
}
