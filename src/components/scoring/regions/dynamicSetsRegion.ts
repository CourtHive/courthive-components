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
 * It decides WHERE a column goes and WHEN it is visible. Everything else it asks `dynamicSetsLogic.ts`:
 * `shouldShowTiebreak`, `isSetComplete`, `shouldCreateNextSet`, `shouldApplySmartComplement`.
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

import { validateSetScores } from '../utils/scoreValidator';
import { ordinalSetLabel } from './setColumns';
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

  /** Where focus goes after the next structural render. */
  let pendingFocus: { kind: Slot['kind']; setIndex: number } | undefined;
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
    error: () => firstError(),
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

  /**
   * Whether this ONE set is a legal score in this format.
   *
   * Validated a set at a time, on purpose. `validateSetScores` always reports match-level completeness
   * too — "Incomplete match - need 2 sets to win" for one set of three, whatever `allowIncomplete` says —
   * so handing it the whole match would drown a real violation in a benign one. Given a single set, a
   * per-set breach comes back prefixed `Set 1:` and a legal set comes back with only the completeness
   * complaint, which is exactly the discrimination needed.
   */
  function setError(index: number): string | undefined {
    // A tiebreak-only set is skipped. `validateSetScores` wants its score in bracket form (`[10-8]`) and a
    // one-set array of plain games cannot express that, so it rejects a perfectly good match tiebreak with
    // "Format expects tiebreak-only set (e.g., [10-8]), but got regular set 10-8". Measured. Validating it
    // would mean reconstructing the validator's own string format here, which is its job and not ours.
    if (isSetTiebreakOnly(getSetFormatForIndex(index, config))) return undefined;

    // ── Only a set that LOOKS finished is judged ──
    //
    // `isSetComplete` is the discriminator between a score that is impossible and one that is merely
    // unfinished, and it is exact: `2-1` false, `3-7` true, `7-6` false, `44-3` true. Without this gate the
    // validator rejected every in-progress set with "Set winner must reach 6 games" — a 6-4 2-1 suspended
    // match is perfectly legitimate, and flagging it would make the band cry wolf on the commonest state
    // there is. A 7-6 is also false here, so its tiebreak is judged by `tiebreakError` instead.
    if (!isSetComplete(index, gamesOf(index), config)) return undefined;

    const entry = entries[index];
    const outcome = validateSetScores(
      [
        {
          side1: Number.parseInt(entry.side1) || 0,
          side2: Number.parseInt(entry.side2) || 0,
          side1TiebreakScore: entry.tiebreak1 ? Number.parseInt(entry.tiebreak1) : undefined,
          side2TiebreakScore: entry.tiebreak2 ? Number.parseInt(entry.tiebreak2) : undefined,
        },
      ],
      params.matchUpFormat,
      true,
    );

    const error = outcome.error;
    if (!error || !/^Set \d+:/.test(error)) return undefined;
    // Re-labelled: the validator saw a one-set match, so its "Set 1" is this set whatever its real index.
    return error.replace(/^Set \d+:/, setLabel(index));
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
    if (points1 === points2) {
      return `${setLabel(index)} a tiebreak cannot be tied`;
    }

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
          if (!settled(previous) || !shouldCreateNextSet(previous, currentSets(), config)) break;
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
    // Entering a set reopens its tiebreak column. Focus rather than click, so it works from the keyboard
    // too — an operator tabbing back to correct a score gets the same affordance as one who clicks.
    input.addEventListener('focus', () => enterSet(setIndex));
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

  function digitsOnly(input: HTMLInputElement): string {
    const cleaned = input.value.replace(/\D/g, '');
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
    if (target === undefined || points >= target) return;

    const otherSide: SideNumber = sideNumber === 1 ? 2 : 1;
    const value = String(target);
    if (otherSide === 1) entries[setIndex].tiebreak1 = value;
    else entries[setIndex].tiebreak2 = value;

    const sibling = cells.get(key('tiebreak', otherSide, setIndex));
    if (sibling) sibling.value = value;
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

    pendingFocus = focus;
    params.onStructureChange?.();
    params.onChange?.();
    applyPendingFocus();
  }

  function applyPendingFocus(): void {
    const target = pendingFocus;
    pendingFocus = undefined;
    if (!target || target.setIndex >= setCount) return;

    // Side 1 by convention: entry runs down the card, and the operator can Tab to side 2.
    cells.get(key(target.kind, 1, target.setIndex))?.focus();
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
    const sets = currentSets();
    if (!sets.length) return undefined;

    return sets
      .map((set, index) => {
        // A tiebreak-only set (a match tiebreak) carries its points in the TIEBREAK fields —
        // `buildSetScore` zeroes the games for one — so reading the games would report every match
        // tiebreak as `0-0`. Measured after the band did exactly that for a 10-8.
        if (isSetTiebreakOnly(getSetFormatForIndex(index, config))) {
          return `${set.side1TiebreakScore ?? 0}-${set.side2TiebreakScore ?? 0}`;
        }

        const base = `${set.side1Score ?? 0}-${set.side2Score ?? 0}`;

        const entry = entries[index];
        const pair = [entry.tiebreak1, entry.tiebreak2].filter(Boolean).map(Number);
        if (!pair.length) return base;

        // The LOWER of the two points is what a score line shows — `7-6(3)`.
        return `${base}(${Math.min(...pair)})`;
      })
      .join(' ');
  }
}
