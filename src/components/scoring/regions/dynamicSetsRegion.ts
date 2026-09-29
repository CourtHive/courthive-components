/**
 * The Dynamic Sets score region: per-set entry, revealed one set at a time.
 *
 * ── The flow CA specified (2026-09-27) ──
 *
 * Only the set in progress is open for entry, plus every set already finished. Enter the first set's
 * games and, when they call for one, a TIEBREAK COLUMN appears beside that set with a field per side.
 * Fill it and the column DISAPPEARS: the finished set now reads `7` over `6(3)`, and the second set's
 * fields take its place. Each set can carry a tiebreak, so this repeats per set.
 *
 * CA contrasted it with the existing modal, where the tiebreak input is a permanent `( _ )` beside
 * every set and never folds away — "the low score entry cell persists". Here it is transient: present
 * exactly while it has something to collect.
 *
 * ── What the region decides, and what it asks ──
 *
 * It decides WHERE a column goes and WHEN it is visible. Everything else it asks:
 *
 *   `dynamicSetsLogic.ts`  — `shouldShowTiebreak`, `isSetComplete`, `shouldCreateNextSet`,
 *                            `shouldApplySmartComplement`, `getMaxAllowedScore`
 *   the FACTORY            — `scoreGovernor.validateSetScore` for whether a set is legal, and
 *                            `scoreGovernor.getTiebreakComplement` for what a typed tiebreak implies
 *
 * CA, 2026-09-27: *"If validateSetScores is only for text, isn't there a structural (object) score
 * validator that can be used in the factory?"* There is, and it replaced a string round-trip here. Note
 * what that leaves behind: `getMaxAllowedScore`, `calculateComplement` and `isSetComplete` in
 * `dynamicSetsLogic.ts` are all hand-rolled, and the factory exports `getSetComplement`,
 * `checkSetIsComplete` and `validateMatchUpScore` besides. Adopting those is real work with a blast radius
 * — the shipping approach shares that module — so it is reported rather than smuggled in here.
 *
 * Measured, because two of these are counter-intuitive and the code leans on both:
 * `shouldShowTiebreak(0, 7-6)` is TRUE while `isSetComplete(0, 7-6)` is FALSE — a 7-6 is not a finished
 * set until its tiebreak is known, which is exactly what makes the transient column correct rather than
 * decorative. And `calculateComplement` gives 6 for 0-4, **7 for 5**, and **null for 6 and 7**, because
 * a 6 could end 6-0 through 6-4 or 6-7 and a 7 could be 7-5 or 7-6.
 *
 * ── Why a structural change is a full re-render ──
 *
 * A column appearing or disappearing changes the row grid, which only the card can rebuild. That costs
 * the caret — and here that is the DESIRED behaviour, because a column appearing is exactly when focus
 * should move on. So the region asks for `rerender()` and then focuses the field the operator should be
 * in next, which is what makes this feel like one continuous entry rather than a form.
 */

import { ENTRY_SIDE, digitFromCode, hasCommandModifier, otherSide } from '../keyboard';
import { completeTiebreakOnly, tiebreakOnlyTarget } from '../logic/tiebreakEntry';
import { scoreGovernor } from 'tods-competition-factory';
import { ordinalSetLabel } from './setColumns';
import { scoreLine } from './scoreLine';
import {
  shouldApplySmartComplement,
  getSetFormatForIndex,
  shouldCreateNextSet,
  getMaxAllowedScore,
  shouldShowTiebreak,
  isSetTiebreakOnly,
  matchUpConfigFor,
  isMatchComplete,
  getMatchWinner,
  isSetComplete,
  buildSetScore,
  isSetTimed,
} from '../logic/dynamicSetsLogic';

import type { ScoreColumn, ScoreRegion } from '../scoreEntryCard';
import type { SideNumber } from '../logic/scoreEntryState';
import type { SetScore } from '../types';

/** The tiebreak column's track — narrower than a games column, since it holds at most two digits. */
const TIEBREAK_COLUMN_WIDTH = '54px';

/** Prefix for an integrity message, so every one reads the same way. */
const setLabel = (index: number) => `${ordinalSetLabel(index + 1)} set:`;
const ARIA_LABEL = 'aria-label';

export type DynamicSetsRegionParams = {
  matchUpFormat?: string;
  /** Participant names, so an integrity message can say who rather than "side 1". */
  sideNames?: [string, string];
  /** Sets already recorded, e.g. from a saved matchUp. */
  sets?: SetScore[];
  /** Whether smart complements starts enabled. Defaults to on. */
  smartComplements?: boolean;
  smartComplementsLabel?: string;
  /** Called after a change affecting only the score. Wire to the card's `refresh`. */
  onChange?: () => void;
  /** Called when the COLUMNS change. Wire to the card's `rerender`. */
  onStructureChange?: () => void;
};

export type DynamicSetsRegion = ScoreRegion & {
  getSets: () => SetScore[];
  /** Required here, though optional on `ScoreRegion`: every entry approach can answer it. */
  hasEntry: () => boolean;
  smartComplementsEnabled: () => boolean;
};

// `error` comes from `ScoreRegion`; the readouts import is not needed here since this region fills the
// participant rows with its own cells rather than a shared readout.

/** One set's entry state, as typed text. */
type Entry = { side1: string; side2: string; tiebreak1: string; tiebreak2: string };

type Slot = { kind: 'games' | 'tiebreak'; setIndex: number };

export function createDynamicSetsRegion(params: DynamicSetsRegionParams): DynamicSetsRegion {
  const config = matchUpConfigFor(params.matchUpFormat);
  const setCount = config.exactly ?? config.bestOf;

  const entries: Entry[] = Array.from({ length: setCount }, () => blank());
  const complementsUsed = new Set<number>();
  let smartComplements = params.smartComplements !== false;

  /**
   * Where focus goes after the next structural render.
   *
   * `sideNumber` is set only when RESTORING the operator to a cell they were already in — see
   * `settle`. Left undefined, the slot's own entry side is used and the cell's contents are selected,
   * which is right when focus is MOVING to a new cell and wrong when it is coming back to one being
   * typed into.
   */
  let pendingFocus: { kind: Slot['kind']; setIndex: number; sideNumber?: SideNumber } | undefined;
  /**
   * The set the operator is currently in, if any.
   *
   * Its tiebreak column stays open even when already filled. CA, 2026-09-27, describing USTA Tournament
   * Desk: *"clicking on the set one scores creates a state where set 1, tb, and set 2 (empty) are all
   * visible at once"*. Without this the column vanished for good on completion and a tiebreak could
   * never be corrected — the score would be editable and the points that qualify it would not.
   */
  let editingSet: number | undefined;

  seed(params.sets);

  /** Live cells, so a complement can write into a sibling without a re-render. */
  const cells = new Map<string, HTMLInputElement>();
  /** The raised tiebreak mark beside a loser's games cell — the `3` in `6³`. */
  const parentheticals = new Map<string, HTMLElement>();
  /** Its visually-hidden twin, carrying the words a screen reader needs. */
  const spokenMarks = new Map<string, HTMLElement>();

  return {
    columns: () => layout().map(toColumn),
    rowCells: (sideNumber) => layout().map((slot) => cellFor(sideNumber, slot)),
    bandControl: () => smartComplementsToggle(),
    scoreString: () => formatScore(),
    isComplete: () => isMatchComplete(currentSets(), config),
    winningSide: () => getMatchWinner(currentSets(), config),
    getSets: () => currentSets(),
    // Read from the raw entry strings, not from `currentSets()`, which drops a half-entered set.
    hasEntry: () => entries.some((entry) => entry.side1 || entry.side2 || entry.tiebreak1 || entry.tiebreak2),
    error: () => firstError(),
    clear: () => clearAll(),
    focusFirst: () => focusSlotSide({ kind: 'games', setIndex: 0 }, ENTRY_SIDE),
    smartComplementsEnabled: () => smartComplements,
  };

  // ── State ────────────────────────────────────────────────────────────

  function blank(): Entry {
    return { side1: '', side2: '', tiebreak1: '', tiebreak2: '' };
  }

  function seed(sets?: SetScore[]): void {
    for (const [index, set] of (sets ?? []).entries()) {
      if (index >= setCount) break;
      entries[index] = {
        // `=== undefined` and not `||`, so a set lost to love seeds as '0' rather than blank.
        side1: set.side1Score === undefined ? '' : String(set.side1Score),
        side2: set.side2Score === undefined ? '' : String(set.side2Score),
        tiebreak1: set.side1TiebreakScore === undefined ? '' : String(set.side1TiebreakScore),
        tiebreak2: set.side2TiebreakScore === undefined ? '' : String(set.side2TiebreakScore),
      };
    }
  }

  function gamesOf(index: number): { side1: number; side2: number } {
    return {
      side1: Number.parseInt(entries[index].side1) || 0,
      side2: Number.parseInt(entries[index].side2) || 0,
    };
  }

  function hasGames(index: number): boolean {
    return !!(entries[index].side1 || entries[index].side2);
  }

  /**
   * Whether BOTH sides of this set have been entered.
   *
   * The distinction matters more than it looks. `buildSetScore` turns an empty field into 0, so a set
   * with only one side typed reads as `6-0` — which `isSetComplete` accepts, which revealed the next
   * set's fields the instant a single digit was typed, and which made the result band announce `6-0` for
   * a score nobody had entered. Both were found by driving the real DOM, not by reading the code.
   */
  function bothEntered(index: number): boolean {
    return !!(entries[index].side1 && entries[index].side2);
  }

  /**
   * The LOSER's tiebreak points — which is what `buildSetScore` takes.
   *
   * Measured: `buildSetScore` derives the winner's score FROM this one (`tiebreakTo`, or loser + 2 when
   * the tiebreak went long). Handing it the winner's 7 produced a 7-9 tiebreak, because it added two to
   * a number that was already the top. So the lower of the two entered values is passed, never whichever
   * field happens to be filled first.
   */
  function tiebreakOf(index: number): string {
    const entry = entries[index];
    const pair = [entry.tiebreak1, entry.tiebreak2].filter(Boolean).map(Number);
    return pair.length ? String(Math.min(...pair)) : '';
  }

  /**
   * Whether BOTH tiebreak fields are filled.
   *
   * The column stays open until they are, and not merely until one is. Typing the WINNER's score
   * autocompletes nothing — a 7 in a TB7 could face any loser score — so folding on the first entry left
   * the qualifying points unknown with no way back to them. USTA Tournament Desk shows both fields
   * populated for a 7-6(3): side 1 with 7, side 2 with 3.
   */
  function tiebreakComplete(index: number): boolean {
    const entry = entries[index];
    return !!(entry.tiebreak1 && entry.tiebreak2);
  }

  /**
   * The sets as entered — only those with BOTH sides filled.
   *
   * A half-entered set is excluded rather than completed with a zero. Including it made the band claim a
   * `6-0` the operator never typed, and made the match look decided one keystroke early.
   */
  function currentSets(): SetScore[] {
    const built: SetScore[] = [];
    for (let index = 0; index < setCount; index += 1) {
      if (!bothEntered(index)) continue;
      const entry = entries[index];
      // `buildSetScore` takes ONE tiebreak value, the loser's points by convention. Both are held in
      // state so the operator may type into either field.
      built.push(buildSetScore(index, entry.side1, entry.side2, tiebreakOf(index) || undefined, config));
    }
    return built;
  }

  // ── Integrity ────────────────────────────────────────────────────────
  //
  // CA, 2026-09-27: "It's possible to enter invalid set scores which wasn't possible in our previous
  // dynamic sets modal, e.g. ... 3-7 is not a valid score ... so, there is integrity checking missing
  // somewhere that we have in the previous iterations."
  //
  // Correct, and the tell was that `validateSetScores` ALREADY knew: it reports "With tiebreak format, if
  // side 2 has 7 games, side 1 must be at least 5, got 3". The region simply never asked it. Three checks
  // now run, and each catches a case the others do not.

  /**
   * The first thing wrong with what has been entered, or `undefined`.
   *
   * Reported to the card, which refuses to submit while it is set and shows it in the result band. A
   * score that cannot be right must not reach the factory, and it must say so while the operator is
   * still looking at the field they typed it in.
   */
  function firstError(): string | undefined {
    for (let index = 0; index < setCount; index += 1) {
      if (!bothEntered(index)) continue;
      const problem = setError(index) ?? tiebreakError(index);
      if (problem) return problem;
    }
    return undefined;
  }

  /** Whether this ONE set is a legal score in this format, per the factory. */
  function setError(index: number): string | undefined {
    // ── The FACTORY validates the set object ──
    //
    // CA, 2026-09-27: "If validateSetScores is only for text, isn't there a structural (object) score
    // validator that can be used in the factory?" There is:
    // `scoreGovernor.validateSetScore(set, matchUpFormat, isDecidingSet, allowIncomplete)`.
    //
    // It replaces a string round-trip AND a gate. The previous version built a one-set array for this
    // repo's `validateSetScores`, which formats a scoreString and hands it to
    // `generateOutcomeFromScoreString` — so a structural question was asked in prose and the answer came
    // back needing a `/^Set \d+:/` prefix match to tell a real breach from match-level incompleteness. It
    // also needed an `isSetComplete` gate, because it flagged every in-progress set.
    //
    // `allowIncomplete: true` does that natively. Measured: `2-1` valid, `3-7` invalid, `44-3` invalid,
    // `7-6(3)` valid. No prefix parsing and no string in the middle.
    //
    // ── One gate survives, and it is a different one ──
    //
    // `allowIncomplete` forgives unfinished GAMES but not a missing TIEBREAK: a 7-6 whose points are not in
    // yet comes back "Tiebreak winner must reach 7". That is the transient state the card deliberately
    // creates — the column is open and the operator is being asked — so validating it would fire an error
    // at the exact moment the question was posed. `tiebreakOutstanding` is the honest predicate for it,
    // covering both "none entered" and "one of two entered".
    if (tiebreakOutstanding(index)) return undefined;

    const entry = entries[index];
    const { isValid, error } = scoreGovernor.validateSetScore(
      {
        side1Score: Number.parseInt(entry.side1) || 0,
        side2Score: Number.parseInt(entry.side2) || 0,
        side1TiebreakScore: entry.tiebreak1 ? Number.parseInt(entry.tiebreak1) : undefined,
        side2TiebreakScore: entry.tiebreak2 ? Number.parseInt(entry.tiebreak2) : undefined,
      },
      params.matchUpFormat,
      isDecidingSet(index),
      true,
    );

    if (isValid || !error) return undefined;
    return `${setLabel(index)} ${error}`;
  }

  /** Whether this is the set a deciding-set format treats differently. */
  function isDecidingSet(index: number): boolean {
    return index === (config.exactly ?? config.bestOf) - 1;
  }

  /**
   * Whether the tiebreak agrees with who won the set.
   *
   * CA, 2026-09-27: "I was also able to edit a tiebreak score to be 7-6 with the winning side having 3 and
   * the losing side having tiebreak 7". `validateSetScores` does NOT catch that — measured — and the old
   * silent behaviour was worse than letting it through: `buildSetScore` takes the LOWER value as the
   * loser's points and derives the winner's from it, so the card displayed 3 against the winner while
   * submitting 7. Showing one thing and recording another is the one outcome worth failing loudly for.
   */
  function tiebreakError(index: number): string | undefined {
    const entry = entries[index];
    if (!entry.tiebreak1 || !entry.tiebreak2) return undefined;

    const games = gamesOf(index);
    if (games.side1 === games.side2) return undefined;

    const gamesWinner = games.side1 > games.side2 ? 1 : 2;
    const points1 = Number.parseInt(entry.tiebreak1);
    const points2 = Number.parseInt(entry.tiebreak2);
    // A TIE is left to the factory, which rejects it as "Tiebreak must be won by 2 points" — a better
    // message than any this could write, and one check fewer here. This function exists only for the case
    // the factory misses.
    if (points1 === points2) return undefined;

    const pointsWinner = points1 > points2 ? 1 : 2;
    if (pointsWinner === gamesWinner) return undefined;

    const name = params.sideNames?.[gamesWinner - 1] ?? `side ${gamesWinner}`;
    return `${setLabel(index)} ${name} won it, so they must win the tiebreak`;
  }

  /**
   * Forget a tiebreak whose games no longer call for one.
   *
   * CA, 2026-09-27, on all cells staying editable: "the tiebreak score floats between entry cells".
   * Editing a 7-6(3) down to 6-3 left the points attached and the band read `6-3(3)` — a tiebreak on a set
   * that never had one. Cleared where `shouldShowTiebreak` has stopped holding, so the data cannot outlive
   * the score that justified it.
   */
  function dropStaleTiebreak(index: number): void {
    if (!bothEntered(index)) return;
    if (shouldShowTiebreak(index, gamesOf(index), config)) return;
    entries[index].tiebreak1 = '';
    entries[index].tiebreak2 = '';
  }

  // ── Layout: which columns exist right now ─────────────────────────────

  /**
   * The visible columns, left to right.
   *
   * Every finished set, then the set in progress, and a tiebreak column beside whichever set is asking
   * for one. A set whose tiebreak is already known shows no tiebreak column — that is the disappearance
   * CA asked for, and it falls out of `tiebreakOutstanding` rather than being timed or animated.
   */
  function layout(): Slot[] {
    const slots: Slot[] = [];

    for (let index = 0; index < setCount; index += 1) {
      if (!hasGames(index)) {
        // An EMPTY set opens only when it is the first, or the one before it is finished and the match
        // still wants another. `shouldCreateNextSet` knows two sets to the same side ends a best-of-3.
        if (index > 0) {
          const previous = index - 1;
          if (!settled(previous) || !opensNextSet(previous)) break;
        }
        slots.push({ kind: 'games', setIndex: index });
        // Nothing opens beyond the set awaiting entry.
        break;
      }

      // A set that HOLDS SOMETHING is always shown. An earlier version decided visibility from
      // `shouldCreateNextSet` alone, which hid a set the operator had already typed into the moment the
      // match read as decided — the column vanished with the score still in it.
      slots.push({ kind: 'games', setIndex: index });
      if (tiebreakVisible(index)) slots.push({ kind: 'tiebreak', setIndex: index });
    }

    return slots;
  }

  /**
   * Whether the set AFTER this one may be revealed.
   *
   * ── A timed format plays every bolt, so the only question is whether one is left ──
   *
   * CA, 2026-09-28: *"bolts can indeed be tied, so if there are still bolts left <enter> should advance
   * to the next Bolt."* Two separate things in `shouldCreateNextSet` get in the way of that, and both
   * are questions about a set won by GAMES rather than one ended by a CLOCK:
   *
   *   - it requires a `winningSide`, and a tied bolt has none. Measured against `SET9X-S:T10`: 22-21
   *     resolves `winningSide: 1` and **21-21 resolves `undefined`**, so a draw revealed no successor
   *     and entry stopped dead with eight bolts still to record;
   *   - it refuses once the match reads as decided, which for nine bolts happens at **exactly five**
   *     won — measured, and not at six, where `calculatedWinningSide` is `undefined` again. So bolts
   *     would have stopped being revealed at 5 and started again at 6, which is nobody's rule.
   *
   * A nine-bolt format plays nine bolts. The loop that calls this already stops at `setCount`, so
   * "there are still bolts left" is the whole condition and `true` is the honest answer.
   *
   * Handled here rather than in `shouldCreateNextSet`, which `approaches/dynamicSetsApproach.ts` also
   * calls: the shipping dialog has the same gap and correcting it there is a change to a surface this
   * workstream does not own. Recorded rather than smuggled in.
   */
  function opensNextSet(index: number): boolean {
    if (isSetTimed(getSetFormatForIndex(index, config))) return true;
    return shouldCreateNextSet(index, currentSets(), config);
  }

  /**
   * Whether this set's games CALL for a tiebreak at all.
   *
   * Measured: `shouldShowTiebreak(0, 7-6)` is true, `(0, 7-5)` is false. So clicking into a 6-4 never
   * opens a tiebreak column, which is what keeps the reveal from being a general-purpose extra field.
   */
  function tiebreakApplies(index: number): boolean {
    // Both sides, because a tiebreak is implied by the PAIR of games scores — a lone 7 says nothing.
    return bothEntered(index) && shouldShowTiebreak(index, gamesOf(index), config);
  }

  /** Whether this set needs tiebreak points the operator has not supplied yet. */
  function tiebreakOutstanding(index: number): boolean {
    return tiebreakApplies(index) && !tiebreakComplete(index);
  }

  /**
   * Whether the tiebreak column shows for this set.
   *
   * Outstanding, or being edited. The second half is the reopen CA described: a finished 7-6(3) folds its
   * column away, and clicking back into that set brings it out again.
   */
  function tiebreakVisible(index: number): boolean {
    return tiebreakApplies(index) && (!tiebreakComplete(index) || editingSet === index);
  }

  /**
   * Whether this set is finished, so the next may be revealed.
   *
   * A 7-6 whose tiebreak is unknown is NOT settled — `isSetComplete(0, 7-6)` is false, measured — which
   * keeps the second set's fields from appearing while the first is still mid-tiebreak.
   */
  function settled(index: number): boolean {
    if (!bothEntered(index) || tiebreakOutstanding(index)) return false;

    const tiebreak = tiebreakOf(index);
    return isSetComplete(
      index,
      { ...gamesOf(index), tiebreak: tiebreak ? Number.parseInt(tiebreak) : undefined },
      config,
    );
  }

  function toColumn(slot: Slot): ScoreColumn {
    if (slot.kind === 'tiebreak') return { heading: 'TB', width: TIEBREAK_COLUMN_WIDTH };
    return { heading: ordinalSetLabel(slot.setIndex + 1) };
  }

  // ── Cells ────────────────────────────────────────────────────────────

  function key(kind: Slot['kind'], sideNumber: SideNumber, setIndex: number): string {
    return `${kind}:${setIndex}:${sideNumber}`;
  }

  function cellFor(sideNumber: SideNumber, slot: Slot): HTMLElement {
    return slot.kind === 'tiebreak' ? tiebreakCell(sideNumber, slot.setIndex) : gamesCell(sideNumber, slot.setIndex);
  }

  function numericInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    // `inputMode` rather than `type="number"`: a number input shows spinners and silently accepts `1e3`
    // and `-`, which a games column has no meaning for.
    input.inputMode = 'numeric';
    input.className = 'chc-sec-set-input';
    return input;
  }

  /**
   * A games cell: an input, plus the parenthetical that appears once a tiebreak is known.
   *
   * A composite rather than putting `6(3)` in the input's value, because the field must stay
   * digits-only and editable — an operator has to be able to correct a finished set, and a value of
   * `6(3)` would parse as nothing. The cell READS `6(3)`; the field holds `6`.
   */
  function gamesCell(sideNumber: SideNumber, setIndex: number): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'chc-sec-games-cell';

    const cellKey = key('games', sideNumber, setIndex);
    const input = numericInput();
    input.value = sideNumber === 1 ? entries[setIndex].side1 : entries[setIndex].side2;
    input.dataset.side = String(sideNumber);
    input.dataset.set = String(setIndex + 1);
    input.setAttribute(ARIA_LABEL, `${ordinalSetLabel(setIndex + 1)} set, side ${sideNumber} games`);
    input.addEventListener('input', () => onGamesTyped(sideNumber, setIndex, input));
    input.addEventListener('keydown', (event) => onCellKeydown(event, { kind: 'games', setIndex }, sideNumber, input));
    // Entering a set reopens its tiebreak column. Focus rather than click, so it works from the keyboard
    // too — an operator tabbing back to correct a score gets the same affordance as one who clicks.
    // Selecting what is there is the old dialog's `focusAndSelect`: typing REPLACES a score rather than
    // appending to it, so a cell holding `0` does not become `06`.
    input.addEventListener('focus', () => {
      enterSet(setIndex);
      input.select();
    });
    cells.set(cellKey, input);

    // A real `<sup>`, so `7-6` reads as `6` with a raised `3` — the tennis convention CA asked for. The
    // mark is `aria-hidden` and a visually-hidden sibling carries the words, because a screen reader
    // meeting "6" then "3" would announce an ambiguous pair of numbers.
    const mark = document.createElement('sup');
    mark.className = 'chc-sec-tb-mark';
    mark.setAttribute('aria-hidden', 'true');

    const spoken = document.createElement('span');
    spoken.className = 'chc-sec-sr-only';

    parentheticals.set(cellKey, mark);
    spokenMarks.set(cellKey, spoken);

    wrapper.append(input, mark, spoken);
    writeTiebreakMark(sideNumber, setIndex);
    return wrapper;
  }

  function tiebreakCell(sideNumber: SideNumber, setIndex: number): HTMLElement {
    const input = numericInput();
    input.classList.add('chc-sec-tb-input');
    input.value = sideNumber === 1 ? entries[setIndex].tiebreak1 : entries[setIndex].tiebreak2;
    input.dataset.tiebreakSide = String(sideNumber);
    input.dataset.tiebreakSet = String(setIndex + 1);
    input.setAttribute(ARIA_LABEL, `${ordinalSetLabel(setIndex + 1)} set tiebreak, side ${sideNumber} points`);
    input.addEventListener('input', () => onTiebreakTyped(sideNumber, setIndex, input));
    input.addEventListener('keydown', (event) =>
      onCellKeydown(event, { kind: 'tiebreak', setIndex }, sideNumber, input),
    );
    input.addEventListener('focus', () => input.select());
    cells.set(key('tiebreak', sideNumber, setIndex), input);
    return input;
  }

  /**
   * The raised tiebreak points beside a loser's games — the `3` of `6³`.
   *
   * CA, 2026-09-27, asked for a superscript rather than `6(3)`, which is the form a printed draw sheet
   * uses. Shown on the side that LOST the tiebreak: `7-6³` means the loser took three points. Nothing on
   * the winner's cell.
   *
   * A `<sup>` rather than a Unicode superscript digit: `³` exists but `¹⁰` has to be composed from two
   * glyphs, and a match tiebreak to 10 or a long set can easily produce two digits. The element handles
   * any number and inherits the cell's font.
   */
  function writeTiebreakMark(sideNumber: SideNumber, setIndex: number): void {
    const cellKey = key('games', sideNumber, setIndex);
    const mark = parentheticals.get(cellKey);
    const spoken = spokenMarks.get(cellKey);
    if (!mark) return;

    const entry = entries[setIndex];
    const mine = sideNumber === 1 ? entry.tiebreak1 : entry.tiebreak2;
    const theirs = sideNumber === 1 ? entry.tiebreak2 : entry.tiebreak1;

    // Only the lower of the two shows. When only one was entered it IS the loser's, because that is what
    // the operator was asked for.
    const show = !!mine && (!theirs || Number(mine) < Number(theirs));
    mark.textContent = show ? mine : '';
    // The words, for anyone who cannot see the raised digit. Without this a screen reader announces "6"
    // then "3" — two numbers with no stated relationship.
    if (spoken) spoken.textContent = show ? ` tiebreak ${mine}` : '';
  }

  function refreshParentheticals(): void {
    for (let index = 0; index < setCount; index += 1) {
      for (const sideNumber of [1, 2] as SideNumber[]) writeTiebreakMark(sideNumber, index);
    }
  }

  // ── Entering a set ───────────────────────────────────────────────────

  /**
   * Mark a set as the one being edited, reopening its tiebreak column if it has one.
   *
   * The re-render replaces this very input, so focus is restored to it afterwards — otherwise merely
   * clicking a finished set would throw the operator out of the field they just clicked.
   */
  function enterSet(setIndex: number): void {
    if (editingSet === setIndex) return;

    const before = layoutSignature();
    editingSet = setIndex;
    if (layoutSignature() === before) return;

    pendingFocus = { kind: 'games', setIndex };
    params.onStructureChange?.();
    applyPendingFocus();
  }

  // ── Input ────────────────────────────────────────────────────────────

  /**
   * Digits, and no leading zero in front of one.
   *
   * CA, 2026-09-28: *"if I click into an entry field that has '0' and enter a value, I should not get e.g.
   * '06'... it should resolve to '6'."* Selecting on focus covers the keyboard path, but a mouse click
   * places a caret rather than a selection, so the value itself is normalised too — the guarantee has to
   * hold however the caret got there.
   *
   * A LONE zero survives, because a set lost to love is a real score. `10` survives for the same reason:
   * only zeros with a digit after them go.
   */
  function digitsOnly(input: HTMLInputElement): string {
    const cleaned = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    // Written back immediately: a rejected character left sitting in the field reads as accepted.
    if (cleaned !== input.value) input.value = cleaned;
    return cleaned;
  }

  function onGamesTyped(sideNumber: SideNumber, setIndex: number, input: HTMLInputElement): void {
    const before = layoutSignature();
    editingSet = setIndex;
    const cleaned = clampGames(digitsOnly(input), sideNumber, setIndex, input);

    if (sideNumber === 1) entries[setIndex].side1 = cleaned;
    else entries[setIndex].side2 = cleaned;

    if (cleaned.length) applyGamesComplement(sideNumber, setIndex, Number(cleaned));
    dropStaleTiebreak(setIndex);

    // If these games now call for a tiebreak, that is where the operator goes.
    settle(before, tiebreakOutstanding(setIndex) ? { kind: 'tiebreak', setIndex } : undefined);
  }

  /**
   * Refuse a games value the format cannot produce.
   *
   * CA's `3-44` case. `getMaxAllowedScore` is 7 for `S:6/TB7`, so a second `4` is not a score and the
   * keystroke is declined rather than accepted and then complained about — which is how the previous
   * modal behaved, and the reason CA noticed the difference.
   *
   * The keystroke is DECLINED rather than substituted. The old Dial Pad replaced an out-of-range digit
   * with `setTo`, so typing 8 silently became 6 — a number the operator never typed, in a field they were
   * looking at. Refusing it leaves what they did type and nothing else.
   */
  function clampGames(value: string, sideNumber: SideNumber, setIndex: number, input: HTMLInputElement): string {
    if (!value) return value;

    // ── Not clamped for a tiebreak-only set, because the shared helper cannot size one ──
    //
    // Measured 2026-09-27: `getMaxAllowedScore(0, 1, …, matchUpConfigFor('SET1-S:TB10'))` returns **7**. It
    // reads `setFormat.setTo`, which a tiebreak-only format does not carry — its target lives on
    // `tiebreakSet.tiebreakTo` — so it falls back to a set-to-6 and caps a match tiebreak to 10 at seven
    // games. Clamping against it would make a legitimate 10-8 unenterable.
    //
    // No number is invented in its place: a match tiebreak can genuinely run long (12-10, 15-13), so there
    // is no honest cap to apply here and `validateSetScores` remains the check. The upstream gap is
    // reported rather than patched, since `getMaxAllowedScore` is shared with the shipping approach.
    if (isSetTiebreakOnly(getSetFormatForIndex(setIndex, config))) return value;

    const max = getMaxAllowedScore(setIndex, sideNumber, gamesOf(setIndex), config);
    if (Number(value) <= max) return value;

    // Keep the longest leading run that is still legal, which for a single over-range digit is nothing and
    // for `44` is `4`.
    const kept = value.slice(0, -1);
    input.value = kept;
    return kept;
  }

  /**
   * Fill the opposing GAMES cell from a typed digit, where the format makes it unambiguous.
   *
   * Delegated to `shouldApplySmartComplement`, which refuses an ambiguous digit. Measured for
   * `S:6/TB7`: 0-4 complement to 6, a **5 completes to 7** (7-5), and **6 and 7 complement to nothing**.
   * So entering a 7-6 takes two taps by design; guessing would put a set in front of the operator that
   * they never entered.
   */
  function applyGamesComplement(sideNumber: SideNumber, setIndex: number, digit: number): void {
    if (!smartComplements) return;
    if (applyTiebreakOnlyComplement(sideNumber, setIndex, digit)) return;

    const result = shouldApplySmartComplement(
      digit,
      false,
      setIndex,
      currentSets(),
      config,
      complementsUsed,
      smartComplements,
    );
    if (!result.shouldApply) return;

    const otherSide: SideNumber = sideNumber === 1 ? 2 : 1;
    const value = String(result.field2Value);
    if (otherSide === 1) entries[setIndex].side1 = value;
    else entries[setIndex].side2 = value;

    const sibling = cells.get(key('games', otherSide, setIndex));
    if (sibling) sibling.value = value;

    complementsUsed.add(setIndex);
  }

  /**
   * A set that IS a tiebreak completes from the ONE number the operator types.
   *
   * CA, 2026-09-28: *"For tiebreaks the lower score should always be entered first ... if the lower
   * score is equal to or greater than the tiebreakTo value, the complement is +2."* So the typed value
   * is the loser's points and the winner's is derived — the same rule the Dial Pad follows, through the
   * same `completeTiebreakOnly`, so the two cannot disagree about what a match tiebreak means.
   *
   * `shouldApplySmartComplement` refuses these sets outright (`reason: 'Tiebreak-only set'`), which was
   * right while nothing knew how to complete one and is why this is a separate path rather than a change
   * to the shared helper the shipping approach also calls.
   *
   * Returns whether it handled the set, so the games complement is not also consulted.
   */
  function applyTiebreakOnlyComplement(sideNumber: SideNumber, setIndex: number, digit: number): boolean {
    const setFormat = getSetFormatForIndex(setIndex, config);
    if (tiebreakOnlyTarget(setFormat) === undefined) return false;

    const completed = completeTiebreakOnly(digit, sideNumber, setFormat);
    // Handled either way: a set that is a tiebreak never wants the GAMES complement, which would read
    // its points as though they were games and answer with a six.
    if (!completed) return true;

    const other: SideNumber = otherSide(sideNumber);
    const value = String(sideNumber === 1 ? completed.side2 : completed.side1);
    if (other === 1) entries[setIndex].side1 = value;
    else entries[setIndex].side2 = value;

    const sibling = cells.get(key('games', other, setIndex));
    if (sibling) sibling.value = value;

    return true;
  }

  // ── The keyboard ─────────────────────────────────────────────────────
  //
  // CA, 2026-09-28: *"Shift-3 should enter the '3' on the other side! Like the existing dynamic sets
  // modal... there's lots here that is incomplete!"* Correct — this region listened for `input` and
  // nothing else, so none of the keyboard model in `approaches/dynamicSetsApproach.ts` existed here.
  //
  // Shift in particular CANNOT be handled on `input`: in a text field Shift+3 produces `#`, not `3`, so
  // by the time an input event arrives the digit is gone. The old dialog matches `event.code` on
  // `keydown` and calls `preventDefault` for exactly that reason, and so does this.

  function onCellKeydown(event: KeyboardEvent, slot: Slot, sideNumber: SideNumber, input: HTMLInputElement): void {
    if (hasCommandModifier(event)) return;

    // ── Enter is the advance in a TIMED format, and nothing else is ──
    //
    // CA, 2026-09-28: *"when I'm in a timed format the enter key in an entry cell should advance to the
    // next 'set/bolt', not a numeric key."* A timed score is multi-digit and has no complement to
    // complete it, so there is no keystroke at which the bolt is finished — which is why `advanceTarget`
    // declines to move on its own here and this takes over.
    //
    // `stopPropagation` because the CARD listens for Enter and would submit: the same key cannot both
    // move to the next bolt and end the match. Where there is no next bolt it is left alone and Submit
    // is what Enter does, which is the right end to the sequence.
    if (event.key === 'Enter') {
      const bolt = nextTimedTarget(slot.setIndex);
      if (!bolt) return;
      event.preventDefault();
      event.stopPropagation();
      focusSlotSide(bolt, entrySideFor(bolt));
      return;
    }

    const digit = digitFromCode(event.code);
    if (digit !== undefined && slot.kind === 'games' && !input.value && typedDigit(slot, sideNumber, digit, event.shiftKey)) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Tab') {
      // Taken over from the browser because the DOM order is wrong for this grid: the cells of one SIDE
      // are siblings, so a native Tab runs across the row from set 1 to set 2 rather than down to the
      // opposing score. The old dialog manages Tab for the same reason.
      const target = step(slot, sideNumber, event.shiftKey ? -1 : 1);
      if (!target) return;
      event.preventDefault();
      focusSlotSide(target.slot, target.sideNumber);
      return;
    }

    // Backspace in an EMPTY cell steps back, so a correction does not need the mouse. Where the cell has
    // something in it, Backspace does what it always does.
    if (event.key === 'Backspace' && !input.value) {
      const target = step(slot, sideNumber, -1);
      if (!target) return;
      event.preventDefault();
      focusSlotSide(target.slot, target.sideNumber);
    }

    // `Enter` is deliberately not handled here: the CARD owns it, because Submit's gate lives there and
    // the same key should work from the endings row too.
  }

  /**
   * A digit typed into an empty GAMES cell, which is where the complement decides both sides at once.
   *
   * Returns whether it was handled — `false` lets the keystroke through as an ordinary character.
   *
   * Shift reverses which side receives the typed number, which is the whole point of it:
   * `shouldApplySmartComplement` already returns `{ field1Value: complement, field2Value: digit }` under
   * shift, so this is a wiring gap rather than new logic. Where the format offers no complement for the
   * digit, a SHIFTED press still writes to the other side — CA's rule read literally — rather than
   * falling through, which in the old dialog let the browser insert a `#` that the input filter then
   * silently ate.
   */
  function typedDigit(slot: Slot, sideNumber: SideNumber, digit: number, shifted: boolean): boolean {
    const setIndex = slot.setIndex;
    const before = layoutSignature();
    editingSet = setIndex;

    const result = smartComplements
      ? shouldApplySmartComplement(digit, shifted, setIndex, currentSets(), config, complementsUsed, smartComplements)
      : undefined;

    const other: SideNumber = sideNumber === 1 ? 2 : 1;

    // ── An out-of-range digit is refused, exactly as `clampGames` refuses one typed ──
    //
    // This path writes straight into the entries, so it does not pass through `clampGames` — and without
    // this it wrote scores the format cannot produce. Measured on `S:6/TB7`: an `8` complemented to a 7
    // and stood as **8-7**, with focus sent into the tiebreak, where the same keystroke on the input path
    // was declined. `true` rather than `false`, so the caller still calls `preventDefault` and nothing is
    // written: falling through would let the character land and then be stripped, which flickers.
    // Shift sends the typed number to the other side, so that is the side whose ceiling applies.
    const typedInto: SideNumber = shifted ? other : sideNumber;
    const capped = !isSetTiebreakOnly(getSetFormatForIndex(setIndex, config));
    if (capped && digit > getMaxAllowedScore(setIndex, typedInto, gamesOf(setIndex), config)) return true;

    if (result?.shouldApply) {
      // `field1Value` belongs to the side that was TYPED IN, whichever that is, and `field2Value` to the
      // other. The helper names them for side 1 and side 2 because the old dialog only ever complemented
      // from side 1; the values are the typed one and its complement, in that order.
      write(setIndex, sideNumber, String(result.field1Value));
      write(setIndex, other, String(result.field2Value));
      complementsUsed.add(setIndex);
    } else if (shifted) {
      write(setIndex, other, String(digit));
    } else {
      return false;
    }

    dropStaleTiebreak(setIndex);

    // Where the set now calls for a tiebreak, that is where the operator goes. Otherwise on to the next
    // set — CA: *"when I enter '3' and the other side smart auto complete's to '6' the focus should then
    // shift to the 2nd set score entry"*. Not past the last set, and not when the match is decided.
    const next = tiebreakOutstanding(setIndex)
      ? ({ kind: 'tiebreak', setIndex } as Slot)
      : advanceTarget(setIndex);

    settle(before, next ? { kind: next.kind, setIndex: next.setIndex } : undefined);
    // Also focused HERE, and not only through `settle`, because `settle` moves focus only when the layout
    // changed — and correcting a set whose successor is already on screen changes no layout at all.
    if (next) focusSlotSide(next, entrySideFor(next));
    return true;
  }

  /**
   * The set to move on to once this one is complete, or nothing if the match is decided.
   *
   * ── No timed-set guard here, and that is measured rather than an oversight ──
   *
   * One was written, on the reasoning that a timed bolt has no complement to finish it and so should
   * never advance on a digit. Planting it back changed no test, and the reason is structural: for a
   * timed set `shouldApplySmartComplement` always returns `shouldApply: false` (`reason: 'Timed set'`),
   * so this is reached only through the SHIFTED branch — and `typedDigit` runs only on an EMPTY cell,
   * where a shifted press writes to the other side and therefore cannot complete the bolt. Every target
   * it could return names a column that is not on screen.
   *
   * What actually made `22/21` unenterable was the re-render destroying the focused cell, which `settle`
   * now repairs, and Enter is what advances a bolt — `nextTimedTarget`. Both of those fail when reverted.
   * A guard whose removal nothing notices is not a safeguard, it is an untested claim.
   */
  function advanceTarget(setIndex: number): Slot | undefined {
    if (setIndex + 1 >= setCount) return undefined;
    if (isMatchComplete(currentSets(), config)) return undefined;
    return { kind: 'games', setIndex: setIndex + 1 };
  }

  /**
   * The next bolt's games column in a TIMED format, when one is on screen.
   *
   * `undefined` for an untimed set (Enter keeps meaning Submit there), past the last bolt, and while
   * the next column has not been revealed — which is the honest answer when the current bolt is still
   * half entered, since there is nothing yet to advance to.
   */
  function nextTimedTarget(setIndex: number): Slot | undefined {
    if (!isSetTimed(getSetFormatForIndex(setIndex, config))) return undefined;

    const next = setIndex + 1;
    if (next >= setCount) return undefined;
    if (!layout().some((slot) => slot.kind === 'games' && slot.setIndex === next)) return undefined;

    return { kind: 'games', setIndex: next };
  }

  function write(setIndex: number, sideNumber: SideNumber, value: string): void {
    if (sideNumber === 1) entries[setIndex].side1 = value;
    else entries[setIndex].side2 = value;

    const cell = cells.get(key('games', sideNumber, setIndex));
    if (cell) cell.value = value;
  }

  /**
   * One cell forward or back, in the order the operator reads them.
   *
   * Built from `layout()` rather than from the DOM, so it stays correct as a tiebreak column appears and
   * folds away: the visible slots ARE the order, and each carries both sides.
   */
  function step(slot: Slot, sideNumber: SideNumber, direction: 1 | -1): { slot: Slot; sideNumber: SideNumber } | undefined {
    // Bottom cell first within every column, so Tab out of the last cell of one column lands on the
    // BOTTOM of the next — the order CA asked for, applied to the keyboard walk as well as to where
    // focus is placed. Positional rather than `entrySideFor`, because a Tab order that reordered
    // itself as the score changed would be the one thing worse than the wrong order.
    const order = layout().flatMap((current) =>
      ([ENTRY_SIDE, otherSide(ENTRY_SIDE)] as SideNumber[]).map((side) => ({ slot: current, sideNumber: side })),
    );
    const at = order.findIndex(
      (candidate) =>
        candidate.slot.kind === slot.kind &&
        candidate.slot.setIndex === slot.setIndex &&
        candidate.sideNumber === sideNumber,
    );
    if (at < 0) return undefined;

    return order[at + direction];
  }

  function focusSlotSide(slot: Slot, sideNumber: SideNumber): void {
    const cell = cells.get(key(slot.kind, sideNumber, slot.setIndex));
    cell?.focus();
    cell?.select();
  }

  /**
   * Which cell of a column entry begins in.
   *
   * GAMES columns: the lower row, always — CA's rule, and what makes a plain `3` the lower score and
   * `Shift+3` the upper one.
   *
   * TIEBREAK columns: the cell of the side that LOST the set, which is not always the lower row. That
   * is not a departure from the rule for its own sake — it is the only cell a tiebreak can be entered
   * from. `applyTiebreakComplement` fires from the games loser only, because typing the WINNER's
   * points implies nothing about the loser's (a 7 in a TB7 could have beaten anything from 0 to 5), so
   * opening on the winner's cell would put the caret in the one field that cannot complete the pair.
   * On the common 7-6 it IS the lower row, so the two rules agree wherever they can.
   */
  function entrySideFor(slot: { kind: Slot['kind']; setIndex: number }): SideNumber {
    if (slot.kind !== 'tiebreak') return ENTRY_SIDE;

    const games = gamesOf(slot.setIndex);
    if (games.side1 === games.side2) return ENTRY_SIDE;
    return games.side1 > games.side2 ? 2 : 1;
  }

  /**
   * Discard every score, and the complements that were applied.
   *
   * `complementsUsed` has to go with it: it exists so a complement fires once per set, and a set the
   * operator has just cleared has to be able to complement again — otherwise Clear leaves the keypad
   * subtly different from a dialog that was never typed into.
   */
  function clearAll(): void {
    const before = layoutSignature();
    for (let index = 0; index < setCount; index += 1) entries[index] = blank();
    complementsUsed.clear();
    editingSet = undefined;
    settle(before);
  }

  function onTiebreakTyped(sideNumber: SideNumber, setIndex: number, input: HTMLInputElement): void {
    const before = layoutSignature();
    const cleaned = digitsOnly(input);

    if (sideNumber === 1) entries[setIndex].tiebreak1 = cleaned;
    else entries[setIndex].tiebreak2 = cleaned;

    if (cleaned.length) applyTiebreakComplement(sideNumber, setIndex, Number(cleaned));

    // Once the tiebreak is known the set is finished, so it stops being the one under edit — which is
    // what folds the column away — and the next set's games field is where the operator goes.
    if (tiebreakComplete(setIndex)) editingSet = undefined;
    settle(before, { kind: 'games', setIndex: setIndex + 1 });
  }

  /**
   * Fill the opposing TIEBREAK cell.
   *
   * CA, 2026-09-27: "if TB7 then entering a 3 in one autocompletes the other to 7". The target comes
   * from the set FORMAT rather than being assumed — a match tiebreak is to 10, and a deciding set's may
   * differ from the others'.
   *
   * Applied only when the typed value is BELOW the target: entering the winning score says nothing about
   * the loser's, so a `7` in a TB7 completes nothing. Same principle as 6 and 7 completing nothing in
   * the games row — never infer from a value with more than one reading.
   */
  function applyTiebreakComplement(sideNumber: SideNumber, setIndex: number, points: number): void {
    if (!smartComplements) return;

    const target = tiebreakTarget(setIndex);
    if (target === undefined) return;

    // ── The factory computes it, because mine was wrong ──
    //
    // My version returned the target and refused anything at or above it, so a 6 in a TB7 completed to
    // nothing — but a tiebreak to seven legitimately ends 8-6 or 9-7, and the factory knows that. Refusing
    // was not conservative, it was wrong. Measured for TB7: 3 -> [3, 7], **6 -> [6, 8]**, 7 -> [7, 9].
    //
    // The pair comes back ORDERED BY SIDE, which `isSide1` controls: `{ lowValue: 3, isSide1: true }` gives
    // `[3, 7]` and `isSide1: false` gives `[7, 3]`. Omitting it defaults to side 2 holding the low value, so
    // a first attempt that dropped the flag and took element [1] wrote the typed 3 straight back over
    // itself and produced a tied 3-3 tiebreak. Both sides are assigned from the pair rather than one being
    // picked out, so the ordering cannot be misread again.
    // ── Only the games LOSER's cell determines the pair ──
    //
    // A tiebreak's low value belongs to whoever lost the SET. Typing into the winner's cell states the
    // winner's points, from which the loser's cannot be derived — a 7 could have beaten anything from 0 to
    // 5. Completing from it anyway produced a contradiction the integrity check then had to reject: type 7
    // for the side that won 7-6 and the factory answers `[7, 9]`, handing the set's winner fewer points than
    // its loser.
    //
    // So the complement fires from the losing side only. Nothing is lost: the losing side's points are what
    // a score line records, and it is the cell the card opens on.
    const games = gamesOf(setIndex);
    if (games.side1 === games.side2) return;
    const gamesLoser: SideNumber = games.side1 > games.side2 ? 2 : 1;
    if (sideNumber !== gamesLoser) return;

    const setFormat = getSetFormatForIndex(setIndex, config);
    const pair = scoreGovernor.getTiebreakComplement({
      lowValue: points,
      tiebreakTo: target,
      // Never passed at all until 2026-09-28, so a no-advantage tiebreak completed as though it needed
      // two points: a 6 in a `TB7NOAD` answered 8 where no-ad says 7. `NoAD` is the field the factory
      // emits and `tiebreakNoAd` the parameter it reads — see `logic/tiebreakEntry.ts`.
      tiebreakNoAd: setFormat?.tiebreakFormat?.NoAD ?? setFormat?.tiebreakSet?.NoAD,
      isSide1: sideNumber === 1,
    });
    if (!pair) return;

    const [forSide1, forSide2] = pair;
    if (forSide1 === undefined || forSide2 === undefined) return;

    entries[setIndex].tiebreak1 = String(forSide1);
    entries[setIndex].tiebreak2 = String(forSide2);

    for (const side of [1, 2] as SideNumber[]) {
      const cell = cells.get(key('tiebreak', side, setIndex));
      if (cell) cell.value = side === 1 ? String(forSide1) : String(forSide2);
    }
  }

  /** The points a tiebreak in this set is played to, from the format. */
  function tiebreakTarget(setIndex: number): number | undefined {
    const setFormat = getSetFormatForIndex(setIndex, config);
    if (!setFormat) return undefined;
    // A tiebreak-only set carries its target on `tiebreakSet`; an ordinary set on `tiebreakFormat`.
    return isSetTiebreakOnly(setFormat) ? setFormat.tiebreakSet?.tiebreakTo : setFormat.tiebreakFormat?.tiebreakTo;
  }

  // ── Settling: a derived refresh, or a structural one ───────────────────

  /** A cheap identity for the current column layout, to detect a structural change. */
  function layoutSignature(): string {
    return layout()
      .map((slot) => `${slot.kind}${slot.setIndex}`)
      .join('|');
  }

  /**
   * Tell the card what changed, and move focus if the structure did.
   *
   * A layout change means a column appeared or vanished, which only a full re-render can do — and that
   * replaces the cells, so focus is placed deliberately afterwards. Not a workaround: a tiebreak column
   * appearing IS the moment the operator should be in it, and the next set's field IS where they go when
   * it closes.
   */
  function settle(previousSignature: string, focus?: { kind: Slot['kind']; setIndex: number }): void {
    refreshParentheticals();

    if (layoutSignature() === previousSignature) {
      params.onChange?.();
      return;
    }

    // ── With no target, the operator STAYS where they were ──
    //
    // The re-render replaces every cell, so the focused element is destroyed and focus falls to the
    // body. CA, 2026-09-28, on a timed format: *"I can enter 33 in the top and then only 3 in the
    // bottom because the entry in the bottom is the trigger, regardless of if it's a number."* That is
    // this, exactly: completing the pair reveals the next bolt, the row grid changes, and the cell
    // being typed into vanishes after one digit. Restoring the active cell makes a structural change
    // invisible to whoever is mid-number, and it costs nothing where focus was moving anyway.
    pendingFocus = focus ?? activeCell();
    params.onStructureChange?.();
    params.onChange?.();
    applyPendingFocus();
  }

  function applyPendingFocus(): void {
    const target = pendingFocus;
    pendingFocus = undefined;
    if (!target || target.setIndex >= setCount) return;

    const cell = cells.get(key(target.kind, target.sideNumber ?? entrySideFor(target), target.setIndex));
    if (!cell) return;
    cell.focus();

    // ── Selecting is for MOVING, never for returning ──
    //
    // Focus arriving at a new cell selects what is there, so typing replaces rather than appends — the
    // old dialog's `focusAndSelect`. Focus RESTORED to the cell the operator is mid-number in must do
    // the opposite and leave the caret at the end, or the second digit of a timed `21` would wipe the
    // first. `sideNumber` is set only on a restore, which is what distinguishes the two.
    if (target.sideNumber === undefined) cell.select();
    else cell.setSelectionRange(cell.value.length, cell.value.length);
  }

  /**
   * The cell the operator is in right now, if it is one of ours.
   *
   * Read from the live `cells` registry rather than from a `data-` attribute, so it cannot disagree
   * with the map the re-render repopulates.
   */
  function activeCell(): { kind: Slot['kind']; setIndex: number; sideNumber: SideNumber } | undefined {
    const active = document.activeElement;
    if (!active) return undefined;

    for (const [cellKey, input] of cells) {
      if (input !== active) continue;
      const [kind, setIndex, sideNumber] = cellKey.split(':');
      return {
        kind: kind as Slot['kind'],
        setIndex: Number(setIndex),
        sideNumber: Number(sideNumber) as SideNumber,
      };
    }
    return undefined;
  }

  // ── The smart-complements toggle ──────────────────────────────────────

  /**
   * The smart-complements toggle, compact, for the result band's right edge.
   *
   * CA, 2026-09-27: *"I don't think '[] Smart Complements' should take up a whole row of the modal ... Just
   * (Smart) maybe, something compact that toggles."* So it is a single small toggle button reading `Smart`
   * rather than a checkbox and a full label occupying its own row.
   *
   * A `<button aria-pressed>` rather than a checkbox: it is one word in a status bar, and `aria-pressed`
   * carries on/off without needing a visible label beside it the way a checkbox does. The `title` and
   * `aria-label` say the whole thing, since `Smart` alone would not tell anyone what it does.
   */
  function smartComplementsToggle(): HTMLElement {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chc-sec-smart';
    toggle.dataset.action = 'smartComplements';
    toggle.textContent = params.smartComplementsLabel ?? 'Smart';
    toggle.setAttribute('aria-pressed', String(smartComplements));
    const explain = 'Smart complements — fill the opposing score from the one you type';
    toggle.title = explain;
    toggle.setAttribute(ARIA_LABEL, explain);

    toggle.addEventListener('click', () => {
      smartComplements = !smartComplements;
      // Cleared rather than preserved: the next digit typed in a set is the one that gets a complement,
      // which is what an operator re-enabling it is asking for.
      complementsUsed.clear();
      params.onChange?.();
    });

    return toggle;
  }

  // ── The score as text, for the result band ───────────────────────────

  function formatScore(): string | undefined {
    return scoreLine(currentSets(), params.matchUpFormat);
  }
}
