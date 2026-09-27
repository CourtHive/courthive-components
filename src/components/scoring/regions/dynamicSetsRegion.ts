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

import {
  shouldApplySmartComplement,
  getSetFormatForIndex,
  shouldCreateNextSet,
  shouldShowTiebreak,
  isSetTiebreakOnly,
  matchUpConfigFor,
  isMatchComplete,
  getMatchWinner,
  isSetComplete,
  buildSetScore,
} from '../logic/dynamicSetsLogic';
import { ordinalSetLabel } from './setColumns';

import type { ScoreColumn, ScoreRegion } from '../scoreEntryCard';
import type { SideNumber } from '../logic/scoreEntryState';
import type { SetScore } from '../types';

/** The tiebreak column's track — narrower than a games column, since it holds at most two digits. */
const TIEBREAK_COLUMN_WIDTH = '54px';

export type DynamicSetsRegionParams = {
  matchUpFormat?: string;
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
  /** The parenthetical beside a loser's games cell, e.g. `(3)`. */
  const parentheticals = new Map<string, HTMLElement>();

  return {
    columns: () => layout().map(toColumn),
    rowCells: (sideNumber) => layout().map((slot) => cellFor(sideNumber, slot)),
    block: () => smartComplementsToggle(),
    scoreString: () => formatScore(),
    isComplete: () => isMatchComplete(currentSets(), config.bestOf, config.exactly),
    winningSide: () => getMatchWinner(currentSets(), config.bestOf, config.exactly),
    getSets: () => currentSets(),
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
    input.setAttribute('aria-label', `${ordinalSetLabel(setIndex + 1)} set, side ${sideNumber} games`);
    input.addEventListener('input', () => onGamesTyped(sideNumber, setIndex, input));
    // Entering a set reopens its tiebreak column. Focus rather than click, so it works from the keyboard
    // too — an operator tabbing back to correct a score gets the same affordance as one who clicks.
    input.addEventListener('focus', () => enterSet(setIndex));
    cells.set(cellKey, input);

    const parenthetical = document.createElement('span');
    parenthetical.className = 'chc-sec-tb-paren';
    parentheticals.set(cellKey, parenthetical);

    wrapper.append(input, parenthetical);
    writeParenthetical(sideNumber, setIndex);
    return wrapper;
  }

  function tiebreakCell(sideNumber: SideNumber, setIndex: number): HTMLElement {
    const input = numericInput();
    input.classList.add('chc-sec-tb-input');
    input.value = sideNumber === 1 ? entries[setIndex].tiebreak1 : entries[setIndex].tiebreak2;
    input.dataset.tiebreakSide = String(sideNumber);
    input.dataset.tiebreakSet = String(setIndex + 1);
    input.setAttribute('aria-label', `${ordinalSetLabel(setIndex + 1)} set tiebreak, side ${sideNumber} points`);
    input.addEventListener('input', () => onTiebreakTyped(sideNumber, setIndex, input));
    cells.set(key('tiebreak', sideNumber, setIndex), input);
    return input;
  }

  /**
   * The `(3)` beside a loser's games.
   *
   * Shown on the side that LOST the tiebreak, the convention every score line in the ecosystem uses —
   * `7-6(3)` means the loser took three points. Nothing on the winner's cell.
   */
  function writeParenthetical(sideNumber: SideNumber, setIndex: number): void {
    const element = parentheticals.get(key('games', sideNumber, setIndex));
    if (!element) return;

    const entry = entries[setIndex];
    const mine = sideNumber === 1 ? entry.tiebreak1 : entry.tiebreak2;
    const theirs = sideNumber === 1 ? entry.tiebreak2 : entry.tiebreak1;

    // Only the lower of the two shows. When only one was entered it IS the loser's, because that is
    // what the operator was asked for.
    const show = !!mine && (!theirs || Number(mine) < Number(theirs));
    element.textContent = show ? `(${mine})` : '';
  }

  function refreshParentheticals(): void {
    for (let index = 0; index < setCount; index += 1) {
      for (const sideNumber of [1, 2] as SideNumber[]) writeParenthetical(sideNumber, index);
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
    const cleaned = digitsOnly(input);

    if (sideNumber === 1) entries[setIndex].side1 = cleaned;
    else entries[setIndex].side2 = cleaned;

    if (cleaned.length) applyGamesComplement(sideNumber, setIndex, Number(cleaned));

    // If these games now call for a tiebreak, that is where the operator goes.
    settle(before, tiebreakOutstanding(setIndex) ? { kind: 'tiebreak', setIndex } : undefined);
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

  function smartComplementsToggle(): HTMLElement {
    const label = document.createElement('label');
    label.className = 'chc-sec-smart';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = smartComplements;
    box.dataset.action = 'smartComplements';
    box.addEventListener('change', () => {
      smartComplements = box.checked;
      // Cleared rather than preserved: the next digit typed in a set is the one that gets a complement,
      // which is what an operator re-enabling it is asking for.
      complementsUsed.clear();
      params.onChange?.();
    });

    const text = document.createElement('span');
    // No sub-text explaining the mechanic (CA, 2026-09-27) — clutter, and the draft had it backwards.
    text.textContent = params.smartComplementsLabel ?? 'Smart complements';

    label.append(box, text);
    return label;
  }

  // ── The score as text, for the result band ───────────────────────────

  function formatScore(): string | undefined {
    const sets = currentSets();
    if (!sets.length) return undefined;

    return sets
      .map((set, index) => {
        const base = `${set.side1Score ?? 0}-${set.side2Score ?? 0}`;
        if (isSetTiebreakOnly(getSetFormatForIndex(index, config))) return base;

        const entry = entries[index];
        const pair = [entry.tiebreak1, entry.tiebreak2].filter(Boolean).map(Number);
        if (!pair.length) return base;

        // The LOWER of the two points is what a score line shows — `7-6(3)`.
        return `${base}(${Math.min(...pair)})`;
      })
      .join(' ');
  }
}
