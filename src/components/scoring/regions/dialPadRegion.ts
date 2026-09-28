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
 * Digits fill the current set alternating sides — tap `6` then `4` and the first set is 6-4, then the
 * next tap starts the second set. That is the existing approach's model and it is kept deliberately:
 * the operators who use the Dial Pad use it at speed, from muscle memory, and a redesign that changed
 * what a keystroke means would cost more than the layout gains.
 *
 * Every judgement about what those digits amount to — is the set complete, who won it, is the match
 * complete — comes from `dynamicSetsLogic.ts`. This module decides where a tap lands, nothing else.
 */

import { createScoreReadouts, READOUT_COLUMN_WIDTH } from './scoreReadout';
import { scoreGovernor } from 'tods-competition-factory';
import { ordinalSetLabel } from './setColumns';
import { scoreLine } from './scoreLine';
import {
  getSetFormatForIndex,
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
  const readouts = createScoreReadouts();

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
  };

  // ── State ────────────────────────────────────────────────────────────

  function seed(sets?: SetScore[]): void {
    for (const [index, set] of (sets ?? []).entries()) {
      if (index >= setCount) break;
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

  /**
   * Where the next tap lands: the first set that is not yet full, and which side within it.
   *
   * Returns `undefined` when every set has both sides, which is when the keypad goes quiet rather than
   * silently overwriting the first set — an operator who has finished entering has no way to know a tap
   * went somewhere they cannot see.
   */
  function nextSlot(): { index: number; side: SideNumber } | undefined {
    for (const [index, entry] of entries.entries()) {
      if (!entry.side1) return { index, side: 1 };
      if (!entry.side2) return { index, side: 2 };
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

  function pressDigit(digit: number): void {
    if (tiebreakMode) {
      const index = lastActiveIndex();
      entries[index].tiebreak = `${entries[index].tiebreak ?? ''}${digit}`;
      changed();
      return;
    }

    // Extend the side just written to, if a second digit could still be a legal score there. Otherwise
    // start the next empty slot. See `canExtend` — this is the only ambiguity in the whole keypad and
    // it is resolved by asking the format, not by a rule of thumb.
    const last = lastWritten();
    if (last && canExtend(last, digit)) {
      const entry = entries[last.index];
      if (last.side === 1) entry.side1 = `${entry.side1}${digit}`;
      else entry.side2 = `${entry.side2}${digit}`;
      changed();
      return;
    }

    const slot = nextSlot();
    if (!slot) return;

    const entry = entries[slot.index];
    if (slot.side === 1) entry.side1 = String(digit);
    else entry.side2 = String(digit);

    changed();
  }

  /** The side most recently written to: the last set with content, side 2 if it has any, else side 1. */
  function lastWritten(): { index: number; side: SideNumber } | undefined {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry.side2) return { index, side: 2 };
      if (entry.side1) return { index, side: 1 };
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
      const entry = entries[index];
      if (entry.tiebreak) {
        entry.tiebreak = entry.tiebreak.slice(0, -1) || undefined;
        changed();
        return;
      }
      if (entry.side2) {
        entry.side2 = entry.side2.slice(0, -1);
        changed();
        return;
      }
      if (entry.side1) {
        entry.side1 = entry.side1.slice(0, -1);
        changed();
        return;
      }
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────

  function keypad(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'chc-sec-dialpad';

    const digits = document.createElement('div');
    digits.className = 'chc-sec-dialpad-digits';
    for (let digit = 0; digit <= 9; digit += 1) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'chc-sec-btn chc-sec-key';
      key.dataset.digit = String(digit);
      key.textContent = String(digit);
      key.addEventListener('click', () => pressDigit(digit));
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

  /** Whether any set in this format can go to a tiebreak. */
  function formatHasTiebreak(): boolean {
    for (let index = 0; index < setCount; index += 1) {
      const setFormat = getSetFormatForIndex(index, config);
      if (setFormat?.tiebreakFormat || setFormat?.tiebreakSet) return true;
    }
    return false;
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
