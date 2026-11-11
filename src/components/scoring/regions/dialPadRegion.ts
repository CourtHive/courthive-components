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
 * model's transitions, and answers every question the card asks through the model's selectors. WHERE a
 * tap lands — and when the keypad holds, and what Backspace undoes — is `logic/dialPadEntry.ts`, pure
 * and tested in node; what is left here is Tiebreak mode and drawing the keypad and readouts.
 *
 * It was chosen first because it read the DOM for a score value in zero places, so its private array
 * was already its only truth; that made it the cheapest honest proof that the model can drive a real
 * region. Its rules are tested in `freeScoreAndDialPadRegions.test.ts` and
 * `dialPadHoldsOnUnfinishedSet.test.ts` (node), its keys and keystrokes in `DialPadEntryTests.stories.ts`.
 *
 * ── What stays here, deliberately ──
 *
 * `tiebreakMode` — whether the next digit means POINTS rather than games. That is the meaning of a
 * tap, not a fact about the score: the model has no idea a keypad exists. A model that owned it would
 * be a store, not an engine.
 *
 * The keypad's navigation — "extend the number just typed if it can still be a score, else start the
 * next empty cell" — is `dialPadDigit`. It decides nothing about tennis: it asks the model, and a
 * refused `typeDigit` (the same model back) is what tells it to move on. The ceiling behind that
 * refusal is the factory's.
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

import { dialPadBackspace, dialPadDigit, dialPadReadout, tiebreakKeyOffered } from '../logic/dialPadEntry';
import { createScoreReadouts, READOUT_COLUMN_WIDTH } from './scoreReadout';
import { createScoreEntryStore } from '../logic/scoreEntryStore';
import { digitFromCode, hasCommandModifier } from '../keyboard';
import { enteredSets } from '../logic/scoreEntrySelectors';
import { scoreEntryText } from '../logic/scoreEntryText';

import type { ScoreEntryModel } from '../logic/scoreEntryModel';
import type { ScoreEntryStore } from '../logic/scoreEntryStore';
import type { ScoreRegion } from '../scoreEntryCard';
import type { SetScore } from '../types';

const ARIA_PRESSED = 'aria-pressed';

export type DialPadRegionParams = {
  /** The model the card holds. Omit it and the region makes its own from the params below. */
  store?: ScoreEntryStore;
  matchUpFormat?: string;
  /** Sets already recorded, e.g. from a saved matchUp. Read only when no `store` is given. */
  sets?: SetScore[];
  /** The host's translations (see `SCORE_ENTRY_TEXT`); anything left out reads English. */
  labels?: Record<string, string | undefined>;
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
  /** Whether the next digit is entered as a tiebreak rather than as games. Presentation: see the header. */
  let tiebreakMode = false;
  /** The Tiebreak key, so `changed` can offer or withdraw it as the games change. */
  let tiebreakKey: HTMLButtonElement | undefined;
  const readouts = createScoreReadouts(params.labels);
  /** The live digit keys, so `focusFirst` can reach one without a DOM query. */
  const digitKeys = new Map<number, HTMLButtonElement>();

  return {
    store,
    columns: () => [{ width: READOUT_COLUMN_WIDTH }],
    rowCells: (sideNumber) => [readouts.cell(sideNumber, dialPadReadout(model()))],
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

  // ── Input ────────────────────────────────────────────────────────────
  //
  // Where a tap lands, when the keypad holds, and what Backspace undoes are `logic/dialPadEntry.ts`.
  // This region holds only Tiebreak mode and the keys.

  /** Replace the model; an unchanged model means the tap went nowhere, and nothing is redrawn. */
  function apply(next: ScoreEntryModel): void {
    if (next === model()) return;
    store.set(next);
    changed();
  }

  function pressDigit(digit: number, shifted = false): void {
    apply(dialPadDigit(model(), { digit, shifted, tiebreakMode }));
  }

  function backspace(): void {
    apply(dialPadBackspace(model()));
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
    readouts.update(dialPadReadout(model()));
    syncTiebreakKey();
    params.onChange?.();
  }

  /** Offer or withdraw the Tiebreak key for the games now entered; leaving tiebreak mode when withdrawn. */
  function syncTiebreakKey(): void {
    if (!tiebreakKey) return;
    const offered = tiebreakKeyOffered(model());
    tiebreakKey.disabled = !offered;
    if (!offered && tiebreakMode) {
      tiebreakMode = false;
      tiebreakKey.setAttribute(ARIA_PRESSED, 'false');
    }
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

    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'chc-sec-btn';
    key.dataset.action = 'tiebreak';
    key.textContent = scoreEntryText(params.labels, 'tiebreak');
    key.setAttribute(ARIA_PRESSED, String(tiebreakMode));
    // Offered only while the games just entered can carry a tiebreak (see `tiebreakKeyOffered`), and never
    // in a format without one. A disabled control the operator cannot explain is worse than one that is
    // not there — and a key that opens tiebreak mode over a 5-1 produced a score nothing could accept.
    key.disabled = !tiebreakKeyOffered(model());
    key.addEventListener('click', () => {
      tiebreakMode = !tiebreakMode;
      key.setAttribute(ARIA_PRESSED, String(tiebreakMode));
      changed();
    });
    tiebreakKey = key;

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'chc-sec-btn chc-sec-key-back';
    back.dataset.action = 'backspace';
    back.textContent = scoreEntryText(params.labels, 'backspace');
    back.addEventListener('click', () => backspace());

    side.append(key, back);
    wrapper.append(digits, side);
    return wrapper;
  }
}
