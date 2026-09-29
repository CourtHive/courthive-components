/**
 * The Dial Pad region: enter the score by tapping digits.
 *
 * Artboard `07-Desktop-DialPad`. Same rows as Free Score — a read-only readout per side — with a
 * five-across keypad beneath and a narrow column beside it for Tiebreak and Backspace.
 *
 * ── What it no longer carries ──
 *
 * The old Dial Pad approach had a 4x4 grid crammed with digits AND `WO` / `RET` / `DEF` AND a separate
 * row of non-directing endings, because it had to be a whole dialog. The card owns endings now, so this
 * is just a keypad: ten digits, a tiebreak toggle, a backspace. Half the controls went away, which is
 * how you can tell the card seam was drawn in the right place.
 *
 * ── The entry model ──
 *
 * Digits fill the current set alternating sides, **lower row first** — tap `4` then `6` and the first
 * set is 6-4, then the next tap starts the second set. Typing works too, and identically: a plain digit
 * is the lower row, `Shift`+digit the upper.
 *
 * The lower-first order is a change, made 2026-09-28 on CA's *"Dial pad should work the same way with
 * key strokes"*. The keystroke convention it refers to — plain digit lower, shifted upper — cannot be
 * true of the keyboard and false of the keys under the same operator's other hand without the two
 * disagreeing about what a `6` means, so the tap order moved to match rather than the keyboard being
 * bolted on beside it. The cost is real and worth stating: a tap sequence that used to read as `6-4`
 * now reads as `4-6`.
 *
 * Every judgement about what those digits amount to — is the set complete, who won it, is the match
 * complete — comes from `dynamicSetsLogic.ts`. This module decides where a tap lands, nothing else.
 */

import { ENTRY_SIDE, digitFromCode, hasCommandModifier, otherSide } from '../keyboard';
import { completeTiebreakOnly, tiebreakOnlyTarget } from '../logic/tiebreakEntry';
import { createScoreReadouts, READOUT_COLUMN_WIDTH } from './scoreReadout';
import { scoreGovernor } from 'tods-competition-factory';
import { ordinalSetLabel } from './setColumns';
import { scoreLine } from './scoreLine';
import {
  getSetFormatForIndex,
  isSetTiebreakOnly,
  getMaxAllowedScore,
  matchUpConfigFor,
  getMatchWinner,
  isMatchComplete,
  buildSetScore,
} from '../logic/dynamicSetsLogic';

import type { SideNumber } from '../logic/scoreEntryState';
import type { ScoreRegion } from '../scoreEntryCard';
import type { SetScore } from '../types';

export type DialPadRegionParams = {
  matchUpFormat?: string;
  /** Sets already recorded, e.g. from a saved matchUp. */
  sets?: SetScore[];
  onChange?: () => void;
};

export type DialPadRegion = ScoreRegion & {
  getSets: () => SetScore[];
  /** Required here, though optional on `ScoreRegion`: every entry approach can answer it. */
  hasEntry: () => boolean;
};

/** One entry per set: the two sides' games as typed text, plus a tiebreak. */
type Entry = { side1: string; side2: string; tiebreak?: string };

export function createDialPadRegion(params: DialPadRegionParams): DialPadRegion {
  const config = matchUpConfigFor(params.matchUpFormat);
  const setCount = config.exactly ?? config.bestOf;

  const entries: Entry[] = Array.from({ length: setCount }, () => ({ side1: '', side2: '' }));
  /** Whether the next digit is entered as a tiebreak rather than as games. */
  let tiebreakMode = false;
  /**
   * For each tiebreak-only set: the row the operator typed the LOW score on, and the digits they typed.
   *
   * Held apart from `entries` because the cells hold a DERIVED pair — the typed number and its
   * complement — and a second digit has to extend what was typed rather than what was computed from it.
   */
  const tiebreakLows = new Map<number, { side: SideNumber; digits: string }>();
  const readouts = createScoreReadouts();
  /** The live digit keys, so `focusFirst` can reach one without a DOM query. */
  const digitKeys = new Map<number, HTMLButtonElement>();

  seed(params.sets);

  return {
    columns: () => [{ width: READOUT_COLUMN_WIDTH }],
    rowCells: (sideNumber) => [readouts.cell(sideNumber, currentSets())],
    block: () => keypad(),
    scoreString: () => scoreText(),
    isComplete: () => isMatchComplete(currentSets(), config),
    winningSide: () => getMatchWinner(currentSets(), config),
    getSets: () => currentSets(),
    error: () => firstError(),
    // A single digit pressed is entry, and `currentSets()` does not report it.
    hasEntry: () => entries.some((entry) => entry.side1 || entry.side2 || entry.tiebreak),
    clear: () => {
      for (let index = 0; index < setCount; index += 1) entries[index] = { side1: '', side2: '' };
      tiebreakLows.clear();
      tiebreakMode = false;
      changed();
    },
    // The keypad has no text field to put a caret in, so the first digit key is where entry begins.
    focusFirst: () => digitKeys.get(1)?.focus(),
  };

  // ── State ────────────────────────────────────────────────────────────

  function seed(sets?: SetScore[]): void {
    for (const [index, set] of (sets ?? []).entries()) {
      if (index >= setCount) break;

      // ── A tiebreak-only set keeps its score in the TIEBREAK fields ──
      //
      // Its games are 0-0 by construction, so reading `side1Score`/`side2Score` seeded a saved match
      // tiebreak as blank and the keypad opened empty on a match that had been played. The cells ARE
      // the points here, exactly as they are in Dynamic Sets, so the points are what seeds them.
      if (tiebreakOnly(index)) {
        entries[index] = {
          side1: set.side1TiebreakScore === undefined ? '' : String(set.side1TiebreakScore),
          side2: set.side2TiebreakScore === undefined ? '' : String(set.side2TiebreakScore),
        };
        // Which row holds the LOW score, so a digit typed after reopening extends that number rather
        // than starting a new one. Without this a saved 10-8 would take the next digit as a fresh entry.
        const side1Points = set.side1TiebreakScore;
        const side2Points = set.side2TiebreakScore;
        if (side1Points !== undefined && side2Points !== undefined) {
          const lowSide: SideNumber = side1Points <= side2Points ? 1 : 2;
          tiebreakLows.set(index, { side: lowSide, digits: String(Math.min(side1Points, side2Points)) });
        }
        continue;
      }

      entries[index] = {
        // `=== undefined` and not `||`, so a set lost to love seeds as '0' rather than blank.
        side1: set.side1Score === undefined ? '' : String(set.side1Score),
        side2: set.side2Score === undefined ? '' : String(set.side2Score),
        // The LOSER's points, which is the one value `buildSetScore` takes — it derives the winner's
        // from it. This read `side1TiebreakScore ?? side2TiebreakScore`, side 1's whatever side 1 is,
        // so a saved 7-6(3) with both values recorded reopened as **7-6(7)**: side 1 had won the set
        // and therefore held the 7, which was then read back as the loser's points.
        tiebreak: lowerTiebreak(set)?.toString(),
      };
    }
  }

  function currentSets(): SetScore[] {
    return entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.side1 || entry.side2)
      .map(({ entry, index }) => buildSetScore(index, entry.side1, entry.side2, entry.tiebreak, config));
  }

  /** Whether this side of a set has anything in it. */
  function filled(entry: Entry, side: SideNumber): boolean {
    return side === 1 ? !!entry.side1 : !!entry.side2;
  }

  /**
   * Where the next entry lands: the first set that is not yet full, and which side within it.
   *
   * ── The LOWER row first, and Shift for the upper ──
   *
   * CA, 2026-09-28, asked that the Dial Pad take keystrokes *"the same way"* as Dynamic Sets, where a
   * plain `3` is the lower row and `Shift+3` the upper. That convention cannot be true of the keyboard
   * and false of the keys under the same operator's other hand, so the TAP order moved with it: entry
   * starts on the lower row in both. A shifted keystroke simply prefers the opposite side.
   *
   * Preferring a side is not the same as insisting on it. Where the preferred cell is already filled
   * the other one takes the digit, so a shifted press into a set whose upper row is done still lands
   * somewhere sensible rather than silently doing nothing.
   *
   * Returns `undefined` when every set has both sides, which is when the keypad goes quiet rather than
   * silently overwriting the first set — an operator who has finished entering has no way to know a tap
   * went somewhere they cannot see.
   */
  function nextSlot(shifted = false): { index: number; side: SideNumber } | undefined {
    const named: SideNumber = shifted ? otherSide(ENTRY_SIDE) : ENTRY_SIDE;

    for (const [index, entry] of entries.entries()) {
      if (!filled(entry, named)) return { index, side: named };
      // Only an UNSHIFTED press alternates into the other side of the same set. A shifted press NAMES
      // the upper row, so when that row is taken it moves on to the next set rather than landing on the
      // row it explicitly did not name — otherwise `Shift` would sometimes mean "upper" and sometimes
      // mean "wherever there is space", which is not a convention anyone can rely on.
      if (!shifted && !filled(entry, otherSide(named))) return { index, side: otherSide(named) };
    }
    return undefined;
  }

  /** The loser's tiebreak points — the lower of whatever is recorded. */
  function lowerTiebreak(set: SetScore): number | undefined {
    const pair = [set.side1TiebreakScore, set.side2TiebreakScore].filter((points) => points !== undefined);
    return pair.length ? Math.min(...(pair as number[])) : undefined;
  }

  /** The set a tiebreak would attach to: the last one with any games in it. */
  function lastActiveIndex(): number {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (entries[index].side1 || entries[index].side2) return index;
    }
    return 0;
  }

  // ── Input ────────────────────────────────────────────────────────────

  function pressDigit(digit: number, shifted = false): void {
    if (tiebreakMode) {
      const index = lastActiveIndex();
      entries[index].tiebreak = `${entries[index].tiebreak ?? ''}${digit}`;
      changed();
      return;
    }

    // A set that IS a tiebreak takes one number, not two — see `typeTiebreakOnly`.
    const tiebreakSet = openTiebreakOnlySet();
    if (tiebreakSet !== undefined) {
      typeTiebreakOnly(tiebreakSet, digit, shifted);
      return;
    }

    // Extend the side just written to, if a second digit could still be a legal score there. Otherwise
    // start the next empty slot. See `canExtend` — this is the only ambiguity in the whole keypad and
    // it is resolved by asking the format, not by a rule of thumb.
    //
    // A SHIFTED press extends only the row it NAMES. Unshifted follows the entry order and extends
    // whatever was written last, which is what makes `1` then `0` a ten. Shifted extending the last
    // write regardless would let `Shift+0` land on the lower row simply because the lower row was typed
    // more recently.
    const written = lastWritten();
    const last = shifted && written?.side !== otherSide(ENTRY_SIDE) ? undefined : written;
    if (last && canExtend(last, digit)) {
      const entry = entries[last.index];
      if (last.side === 1) entry.side1 = `${entry.side1}${digit}`;
      else entry.side2 = `${entry.side2}${digit}`;
      changed();
      return;
    }

    const slot = nextSlot(shifted);
    if (!slot) return;

    const entry = entries[slot.index];
    if (slot.side === 1) entry.side1 = String(digit);
    else entry.side2 = String(digit);

    changed();
  }

  /**
   * The side most recently written to.
   *
   * Entry fills the lower row first (see `nextSlot`), so within the last set with content the UPPER
   * row is the more recent one where both are present. This order is what makes a second digit extend
   * the value just typed rather than a value entered before it.
   */
  function lastWritten(): { index: number; side: SideNumber } | undefined {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (filled(entry, otherSide(ENTRY_SIDE))) return { index, side: otherSide(ENTRY_SIDE) };
      if (filled(entry, ENTRY_SIDE)) return { index, side: ENTRY_SIDE };
    }
    return undefined;
  }

  /**
   * Whether a second digit belongs to the side just written rather than starting the next one.
   *
   * A games score can exceed 9 — `SET3-S:10/TB7` allows 11 — so two-digit entry has to be possible, but
   * only where the FORMAT allows it. `getMaxAllowedScore` is asked rather than a threshold being
   * guessed: in `S:6/TB7` the maximum is 7, so a `1` followed by a `0` is 1-0 and never 10, while in
   * `S:10/TB7` the same two taps are 10. Measured, not assumed.
   *
   * Capped at two digits regardless, because a timed set reports no maximum at all (`Infinity`) and
   * would otherwise accumulate every subsequent tap into one side forever. No games score needs three.
   */
  function canExtend(last: { index: number; side: SideNumber }, digit: number): boolean {
    const entry = entries[last.index];
    const current = last.side === 1 ? entry.side1 : entry.side2;
    if (!current || current.length >= 2) return false;

    // A tiebreak-only set never reaches here — `pressDigit` routes it to `typeTiebreakOnly`, where the
    // operator types one number and digits simply accumulate into it. Kept as a guard rather than an
    // assumption, since `getMaxAllowedScore` would answer **7** for `SET1-S:TB10`: it reads
    // `setFormat.setTo`, which a tiebreak-only format does not carry.
    if (tiebreakOnly(last.index)) return current.length < 2;

    const max = getMaxAllowedScore(last.index, last.side, {
      side1: Number.parseInt(entry.side1) || 0,
      side2: Number.parseInt(entry.side2) || 0,
    }, config);

    return Number(`${current}${digit}`) <= max;
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
    readouts.update(currentSets());
    params.onChange?.();
  }

  /**
   * Remove the last thing entered.
   *
   * Walks the entries backwards so a backspace always undoes the most recent tap, whatever it was —
   * a tiebreak digit before the games it belongs to, and side 2 before side 1. Without that ordering,
   * backspace after a tiebreak would eat the set score instead and leave the tiebreak orphaned.
   */
  function backspace(): void {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      // A tiebreak-only set is one typed number plus a derived one, so a backspace takes a digit off
      // what was TYPED and recomputes the other cell. Deleting from the derived cell would leave a pair
      // the operator never entered and could not correct.
      const low = tiebreakLows.get(index);
      if (low) {
        const digits = low.digits.slice(0, -1);
        if (digits) tiebreakLows.set(index, { ...low, digits });
        else tiebreakLows.delete(index);
        entries[index] = { side1: '', side2: '' };
        writeTiebreakOnly(index);
        changed();
        return;
      }

      const entry = entries[index];
      if (entry.tiebreak) {
        entry.tiebreak = entry.tiebreak.slice(0, -1) || undefined;
        changed();
        return;
      }
      // Upper row before lower, mirroring the fill order: entry starts on the LOWER row, so the upper
      // one holds the more recent digit and is what a backspace must take first. Reversed from the
      // original, and reversed for the same reason the fill order moved.
      if (entry.side1) {
        entry.side1 = entry.side1.slice(0, -1);
        changed();
        return;
      }
      if (entry.side2) {
        entry.side2 = entry.side2.slice(0, -1);
        changed();
        return;
      }
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────

  /**
   * The keypad takes keystrokes as well as taps.
   *
   * CA, 2026-09-28: *"Dial pad should work the same way with key strokes."* It had none at all — every
   * digit was a click handler and nothing else — so an operator who opened the Dial Pad and typed got
   * nothing.
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

    const tiebreak = document.createElement('button');
    tiebreak.type = 'button';
    tiebreak.className = 'chc-sec-btn';
    tiebreak.dataset.action = 'tiebreak';
    tiebreak.textContent = 'Tiebreak';
    tiebreak.setAttribute('aria-pressed', String(tiebreakMode));
    // Offered only when the format has a tiebreak at all. A disabled control the operator cannot
    // explain is worse than one that is not there.
    tiebreak.disabled = !formatHasTiebreak();
    tiebreak.addEventListener('click', () => {
      tiebreakMode = !tiebreakMode;
      tiebreak.setAttribute('aria-pressed', String(tiebreakMode));
      changed();
    });

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'chc-sec-btn chc-sec-key-back';
    back.dataset.action = 'backspace';
    back.textContent = 'Backspace';
    back.addEventListener('click', () => backspace());

    side.append(tiebreak, back);
    wrapper.append(digits, side);
    return wrapper;
  }

  /** Whether this set is played ENTIRELY as a tiebreak — a match tiebreak. */
  function tiebreakOnly(index: number): boolean {
    return isSetTiebreakOnly(getSetFormatForIndex(index, config));
  }

  /**
   * The tiebreak-only set a digit belongs to, if the keypad is in one.
   *
   * The first tiebreak-only set whose low score is still being typed — which means: not yet started, or
   * started and still under two digits. Anything earlier that is NOT tiebreak-only must be complete
   * first, so a mixed format (`SET3-S:6/TB7-F:TB10`) keeps its ordinary sets on the ordinary path and
   * only the deciding set comes here.
   */
  function openTiebreakOnlySet(): number | undefined {
    for (let index = 0; index < setCount; index += 1) {
      if (!tiebreakOnly(index)) {
        if (!entries[index].side1 || !entries[index].side2) return undefined;
        continue;
      }

      const low = tiebreakLows.get(index);
      if (!low || low.digits.length < 2) return index;
    }
    return undefined;
  }

  /**
   * A digit typed into a set that IS a tiebreak.
   *
   * CA, 2026-09-28: *"For tiebreaks the lower score should always be entered first. that could be 1
   * then 1 or shift+1 then shift+1."* So the operator types ONE number — the loser's points — and the
   * winner's is derived by `completeTiebreakOnly`. Digits accumulate into it because nothing else could
   * be meant by a second one, which is what finally makes `1` then `1` an unambiguous eleven.
   *
   * `Shift` chooses WHICH ROW the low score belongs to, not which row the next digit lands in. Shifting
   * mid-number therefore starts the number again on the other row, rather than splitting it across two.
   */
  function typeTiebreakOnly(index: number, digit: number, shifted: boolean): void {
    const side: SideNumber = shifted ? otherSide(ENTRY_SIDE) : ENTRY_SIDE;
    const current = tiebreakLows.get(index);
    const digits = current?.side === side ? `${current.digits}${digit}`.slice(0, 2) : String(digit);

    tiebreakLows.set(index, { side, digits });
    writeTiebreakOnly(index);
    changed();
  }

  /**
   * Put the typed low score and its complement into the set's two cells.
   *
   * Where the factory declines to complete the pair, the typed value stands alone rather than a number
   * being invented beside it — `validateSetScore` then reports the set as unfinished, which is true.
   */
  function writeTiebreakOnly(index: number): void {
    const low = tiebreakLows.get(index);
    if (!low) return;

    const entry = entries[index];
    const completed = completeTiebreakOnly(Number.parseInt(low.digits), low.side, getSetFormatForIndex(index, config));
    if (!completed) {
      if (low.side === 1) entry.side1 = low.digits;
      else entry.side2 = low.digits;
      return;
    }

    entry.side1 = String(completed.side1);
    entry.side2 = String(completed.side2);
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

  function scoreText(): string | undefined {
    return scoreLine(currentSets(), params.matchUpFormat);
  }

  /**
   * The first set that is not a legal score in this format, per the factory.
   *
   * The keypad had NO integrity check. What it had instead was a display rule: a tiebreak on a 6-2 was
   * silently not rendered, so the operator saw `6-2` while a stray 3 sat in the state and would have
   * been submitted. Once the score line comes from the factory (`scoreLine`) that suppression is gone —
   * `6-2(3)` is now shown — so the honest replacement is to SAY it is wrong rather than to hide it.
   * `scoreGovernor.validateSetScore` answers exactly that: *"Tiebreak set winner must have 7 games,
   * got 6"*.
   *
   * `allowIncomplete` because the keypad is read between taps and a 3-2 is an ordinary state, not a
   * breach. Dynamic Sets asks the same question the same way.
   */
  function firstError(): string | undefined {
    const sets = currentSets();
    for (const [index, set] of sets.entries()) {
      const { isValid, error } = scoreGovernor.validateSetScore(
        set,
        params.matchUpFormat,
        index === setCount - 1,
        true,
      );
      if (!isValid && error) return `${ordinalSetLabel(index + 1)} set: ${error}`;
    }
    return undefined;
  }
}
