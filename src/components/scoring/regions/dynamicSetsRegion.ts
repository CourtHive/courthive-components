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
 * ── It RENDERS the model (S3 of the state-engine extraction) ──
 *
 * This region holds no score. It holds ONE `ScoreEntryModel`, replaces it through the model's
 * transitions, and answers everything the card asks through the selectors. What is left here is
 * presentation, and only presentation:
 *
 *   - which set the operator is in (`editingSet`), which keeps a finished set's tiebreak column open
 *     while they correct it;
 *   - where focus goes after a structural re-render (`pendingFocus`), and the caret rules;
 *   - the Smart toggle;
 *   - the live cell registry, and the raised tiebreak marks beside the games.
 *
 * Measured before this phase, the region read a score value back out of the DOM in two places, both
 * "is this cell empty" decisions — and two representations of one score is what produced note 9's
 * ghost set. Both now ask the model. The remaining DOM reads are the text an `input` event delivered
 * (the keystroke itself) and the caret position, which are the DOM's to know.
 *
 * ── Where the rules went ──
 *
 *   the ceiling on a games value       `typeDigit` refuses a digit the format cannot reach
 *   the smart complement               `typeDigit({ complement })`, from the model's own rule
 *   a tiebreak's other side            the same, from the games loser's cell only
 *   a tiebreak the games stop needing  forgotten by the model when the GAMES change
 *   which columns exist                `columns(model(), { editingSet })`
 *   what is wrong with the score       `error(model, { sideNames })`
 *
 * Nothing here decides anything about tennis. An `input` event is replayed into the model one digit at
 * a time — clear the cell, type what the field now holds — so a pasted `44` and a typed `4` then `4`
 * are the same keystrokes and get the same answer, and the field is written back with whatever the
 * model accepted.
 *
 * ── Why a structural change is a full re-render ──
 *
 * A column appearing or disappearing changes the row grid, which only the card can rebuild. That costs
 * the caret — and here that is the DESIRED behaviour, because a column appearing is exactly when focus
 * should move on. So the region asks for `rerender()` and then focuses the field the operator should be
 * in next. Within a set nothing is rebuilt: the `onChange` seam keeps the input being typed into.
 */

import { tiebreakOutstanding, enteredSets, cellValue, isSettled, columns, error } from '../logic/scoreEntrySelectors';
import { getSetFormatForIndex, matchUpConfigFor, isSetTimed } from '../logic/dynamicSetsLogic';
import { ENTRY_SIDE, digitFromCode, hasCommandModifier, otherSide } from '../keyboard';
import { gamesLoser, clearCell, typeDigit } from '../logic/scoreEntryModel';
import { createScoreEntryStore } from '../logic/scoreEntryStore';
import { ordinalSetLabel } from './setColumns';

import type { CellRef, ScoreEntryModel } from '../logic/scoreEntryModel';
import type { ScoreColumn, ScoreRegion } from '../scoreEntryCard';
import type { ScoreEntryStore } from '../logic/scoreEntryStore';
import type { ScoreSlot } from '../logic/scoreEntrySelectors';
import type { SideNumber } from '../logic/scoreEntryState';
import type { SetScore } from '../types';

/** The tiebreak column's track — narrower than a games column, since it holds at most two digits. */
const TIEBREAK_COLUMN_WIDTH = '54px';
const ARIA_LABEL = 'aria-label';

export type DynamicSetsRegionParams = {
  /** The model the card holds. Omit it and the region makes its own from the params below. */
  store?: ScoreEntryStore;
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
  store: ScoreEntryStore;
  /** The entered sets, for a host or a test reading the region directly. The card reads the model. */
  getSets: () => SetScore[];
  /** The model's integrity message, named with this region's `sideNames`. The card computes its own. */
  error: () => string | undefined;
  smartComplementsEnabled: () => boolean;
};

type Slot = ScoreSlot;

export function createDynamicSetsRegion(params: DynamicSetsRegionParams): DynamicSetsRegion {
  /** The one truth, shared with the card. Replaced through `store.set`, never mutated. */
  const store =
    params.store ??
    createScoreEntryStore({ matchUpFormat: params.matchUpFormat, approach: 'dynamicSets', sets: params.sets });
  const config = matchUpConfigFor(store.get().matchUpFormat);
  const setCount = store.get().sets.length;
  let smartComplements = params.smartComplements !== false;
  /**
   * The sets whose games complement has fired. Policy, not score: the model infers the pair from the
   * first digit into an empty cell, and this is what makes it do so ONCE per set, so a correction by hand
   * stands. Cleared by `[Clear]` and by toggling Smart, exactly as before.
   */
  const complementsUsed = new Set<number>();

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

  /** Live cells, so a complement can be written into a sibling without a re-render. */
  const cells = new Map<string, HTMLInputElement>();
  /** The completed representation of a folded set, per side — the way back into it. */
  const folded = new Map<string, HTMLButtonElement>();
  /** The raised tiebreak mark beside a loser's games cell — the `3` in `6³`. */
  const parentheticals = new Map<string, HTMLElement>();
  /** Its visually-hidden twin, carrying the words a screen reader needs. */
  const spokenMarks = new Map<string, HTMLElement>();

  return {
    store,
    columns: () => layout().map(toColumn),
    rowCells: (sideNumber) => layout().map((slot) => cellFor(sideNumber, slot)),
    getSets: () => enteredSets(model()),
    bandControl: () => smartComplementsToggle(),
    error: () => error(model(), { sideNames: params.sideNames }),
    clear: () => clearAll(),
    focusFirst: () => focusSlotSide({ kind: 'games', setIndex: 0 }, ENTRY_SIDE),
    smartComplementsEnabled: () => smartComplements
  };

  // ── Reading the model ─────────────────────────────────────────────────

  function model(): ScoreEntryModel {
    return store.get();
  }

  function games(setIndex: number, side: SideNumber): CellRef {
    return { setIndex, side, kind: 'games' };
  }

  function tiebreak(setIndex: number, side: SideNumber): CellRef {
    return { setIndex, side, kind: 'tiebreak' };
  }

  function valueOf(cell: CellRef): number | undefined {
    return cellValue(model(), cell.setIndex, cell.side, cell.kind);
  }

  /** A cell's value as the field shows it: digits, or nothing. */
  function textOf(cell: CellRef): string {
    const value = valueOf(cell);
    return value === undefined ? '' : String(value);
  }

  function tiebreakComplete(setIndex: number): boolean {
    return valueOf(tiebreak(setIndex, 1)) !== undefined && valueOf(tiebreak(setIndex, 2)) !== undefined;
  }

  // ── Layout: which columns exist right now ─────────────────────────────

  /**
   * The visible columns, left to right — the model's answer, with the set under edit passed in so its
   * tiebreak column stays open. Every set that holds anything is shown, whatever came before it, which
   * is what keeps a cleared set 1 from hiding a typed set 2.
   */
  function layout(): Slot[] {
    return columns(model(), { editingSet });
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
    input.value = textOf(games(setIndex, sideNumber));
    input.dataset.side = String(sideNumber);
    input.dataset.set = String(setIndex + 1);
    input.setAttribute(ARIA_LABEL, `${ordinalSetLabel(setIndex + 1)} set, side ${sideNumber} games`);
    input.addEventListener('input', () => onGamesTyped(sideNumber, setIndex, input));
    input.addEventListener('keydown', (event) => onCellKeydown(event, { kind: 'games', setIndex }, sideNumber));
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

    // ── A finished set shows its RESULT, not its fields — note 11/12 ──
    //
    // CA, 2026-09-30: *"when a set is complete ... not show the entry fields and show the tiebreak score
    // 7-6(3) on the low score side as 6^3 ... This is how the Tournament Desk score entry modal behaves"*,
    // and on the way back in: *"the way back in is simply clicking the completed representation of the
    // set."* So a settled set that is not the one under edit hides its input behind a button reading `6`
    // with a raised `3`, and clicking it — or reaching it with Tab and pressing it — reopens the fields.
    //
    // Both are always in the DOM and a fold is a change of VISIBILITY, not a rebuild: the input's value is
    // the model's and `syncCells` keeps it so, the representation is rewritten by `syncFolds`, and
    // reopening touches no element identity — which is what keeps the caret and every reference a test
    // holds. `[Clear]`, a correction and a tab into a folded set all pass through here.
    wrapper.append(completedRepresentation(sideNumber, setIndex));
    syncFold(setIndex);
    return wrapper;
  }

  /** Show each side of a set as its result or its fields, whichever the model and `editingSet` say. */
  function syncFold(setIndex: number): void {
    const fold = isFolded(setIndex);
    for (const sideNumber of [1, 2] as SideNumber[]) {
      const cellKey = key('games', sideNumber, setIndex);
      const input = cells.get(cellKey);
      if (input) input.hidden = fold;
      const mark = parentheticals.get(cellKey);
      if (mark) mark.hidden = fold;
      const spoken = spokenMarks.get(cellKey);
      if (spoken) spoken.hidden = fold;
      const done = folded.get(cellKey);
      if (done) {
        done.hidden = !fold;
        if (fold) writeCompleted(done, sideNumber, setIndex);
      }
    }
  }

  function syncFolds(): void {
    for (let index = 0; index < setCount; index += 1) syncFold(index);
  }

  /** Whether a set shows its result rather than its fields: finished, and not the one under edit. */
  function isFolded(setIndex: number): boolean {
    return editingSet !== setIndex && isSettled(model(), setIndex);
  }

  /** The button a folded set shows in place of its field: the games, with the loser's points raised. */
  function completedRepresentation(sideNumber: SideNumber, setIndex: number): HTMLButtonElement {
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'chc-sec-set-done';
    done.dataset.doneSide = String(sideNumber);
    done.dataset.doneSet = String(setIndex + 1);
    done.title = 'Click to edit this set';
    done.addEventListener('click', () => reopen(setIndex, sideNumber));
    folded.set(key('games', sideNumber, setIndex), done);
    return done;
  }

  /** The result as the representation reads it: `6` with a raised `3` on the side that lost the tiebreak. */
  function writeCompleted(done: HTMLButtonElement, sideNumber: SideNumber, setIndex: number): void {
    const gamesText = textOf(games(setIndex, sideNumber));
    const mine = valueOf(tiebreak(setIndex, sideNumber));
    const theirs = valueOf(tiebreak(setIndex, otherSide(sideNumber)));
    const raised = mine !== undefined && (theirs === undefined || mine < theirs);

    done.replaceChildren(gamesText);
    if (raised) {
      const sup = document.createElement('sup');
      sup.className = 'chc-sec-tb-mark';
      sup.setAttribute('aria-hidden', 'true');
      sup.textContent = String(mine);
      done.append(sup);
    }
    const said = raised ? `${gamesText} games, tiebreak ${mine}` : `${gamesText} games`;
    done.setAttribute(ARIA_LABEL, `${ordinalSetLabel(setIndex + 1)} set, side ${sideNumber}: ${said} — edit`);
  }

  /**
   * Bring a folded set's fields back, with the caret in the cell that was clicked.
   *
   * Reopening alone is a visibility change. It becomes structural only when the set's tiebreak column
   * comes back with it, which `enterSet` already handles — so this is `enterSet` and then focus.
   */
  function reopen(setIndex: number, sideNumber: SideNumber): void {
    enterSet(setIndex);
    const cell = cells.get(key('games', sideNumber, setIndex));
    cell?.focus();
    cell?.select();
  }

  function tiebreakCell(sideNumber: SideNumber, setIndex: number): HTMLElement {
    const input = numericInput();
    input.classList.add('chc-sec-tb-input');
    input.value = textOf(tiebreak(setIndex, sideNumber));
    input.dataset.tiebreakSide = String(sideNumber);
    input.dataset.tiebreakSet = String(setIndex + 1);
    input.setAttribute(ARIA_LABEL, `${ordinalSetLabel(setIndex + 1)} set tiebreak, side ${sideNumber} points`);
    input.addEventListener('input', () => onTiebreakTyped(sideNumber, setIndex, input));
    input.addEventListener('keydown', (event) => onCellKeydown(event, { kind: 'tiebreak', setIndex }, sideNumber));
    input.addEventListener('focus', () => input.select());
    cells.set(key('tiebreak', sideNumber, setIndex), input);
    return input;
  }

  /**
   * Bring every live field into line with the model.
   *
   * A field already showing the model's value is left alone, which is what keeps the caret in the cell
   * being typed into: it was normalised by `digitsOnly` before the model saw it, so after an accepted
   * keystroke the two agree and nothing is written. A field that disagrees — a refused digit, a
   * complement written opposite — is set, and that is the only way a value reaches a field.
   */
  function syncCells(): void {
    for (const [cellKey, input] of cells) {
      const [kind, setIndex, sideNumber] = cellKey.split(':');
      const desired = textOf({
        kind: kind as Slot['kind'],
        setIndex: Number(setIndex),
        side: Number(sideNumber) as SideNumber
      });
      if (input.value !== desired) input.value = desired;
    }
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

    const mine = valueOf(tiebreak(setIndex, sideNumber));
    const theirs = valueOf(tiebreak(setIndex, otherSide(sideNumber)));

    // Only the lower of the two shows. When only one was entered it IS the loser's, because that is what
    // the operator was asked for.
    const show = mine !== undefined && (theirs === undefined || mine < theirs);
    mark.textContent = show ? String(mine) : '';
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
    // Entering a set unfolds it, and leaving the previous one folds that: visibility, on the elements
    // already there. Only a column coming or going needs the card's full render below.
    syncFolds();
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
   *
   * This is the one place the region reads a value out of the DOM: the text an `input` event delivered,
   * which is the keystroke itself. The model is told what was typed; it is never asked what a field holds.
   */
  function digitsOnly(input: HTMLInputElement): string {
    const cleaned = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    // Written back immediately: a rejected character left sitting in the field reads as accepted.
    if (cleaned !== input.value) input.value = cleaned;
    return cleaned;
  }

  /**
   * The model after a field's whole text is replayed into one cell, digit by digit.
   *
   * Clear the cell, then `typeDigit` each character. The model refuses a digit the format cannot reach
   * — the same object comes back — and the replay stops there, so a typed `44` in a set to six stands as
   * `4`, and an `8` as nothing: refused rather than substituted, which is how the previous modal
   * behaved and the reason CA noticed the difference. The complement rides on the first digit into an
   * empty set, where the model's own rule says it applies.
   */
  function replayed(cell: CellRef, digits: string): ScoreEntryModel {
    let next = clearCell(model(), cell);
    for (const character of digits) {
      const after = typeDigit(next, { cell, digit: Number(character), complement: offersComplement(cell) });
      if (after === next) break;
      next = after;
    }
    noteComplement(cell, next);
    return next;
  }

  /** Whether the model may infer the other side from this cell right now. */
  function offersComplement(cell: CellRef): boolean {
    if (!smartComplements) return false;
    return cell.kind === 'tiebreak' || !complementsUsed.has(cell.setIndex);
  }

  /** Record that a games complement fired for this set, judged by the other cell having moved. */
  function noteComplement(cell: CellRef, next: ScoreEntryModel): boolean {
    if (cell.kind !== 'games') return false;
    const other = otherSide(cell.side);
    const moved = cellValue(next, cell.setIndex, other, 'games') !== valueOf(games(cell.setIndex, other));
    if (moved) complementsUsed.add(cell.setIndex);
    return moved;
  }

  /** Replace the model and bring every field into line with it. */
  function apply(next: ScoreEntryModel): void {
    store.set(next);
    syncCells();
  }

  function onGamesTyped(sideNumber: SideNumber, setIndex: number, input: HTMLInputElement): void {
    const before = layoutSignature();
    editingSet = setIndex;

    apply(replayed(games(setIndex, sideNumber), digitsOnly(input)));

    // If these games now call for a tiebreak, that is where the operator goes.
    settle(before, tiebreakOutstanding(model(), setIndex) ? { kind: 'tiebreak', setIndex } : undefined);
  }

  function onTiebreakTyped(sideNumber: SideNumber, setIndex: number, input: HTMLInputElement): void {
    const before = layoutSignature();

    apply(replayed(tiebreak(setIndex, sideNumber), digitsOnly(input)));

    // Once the tiebreak is known the set is finished, so it stops being the one under edit — which is
    // what folds the column away — and the next set's games field is where the operator goes.
    if (tiebreakComplete(setIndex)) editingSet = undefined;
    settle(before, { kind: 'games', setIndex: setIndex + 1 });
  }

  // ── The keyboard ─────────────────────────────────────────────────────
  //
  // CA, 2026-09-28: *"Shift-3 should enter the '3' on the other side! Like the existing dynamic sets
  // modal..."* Shift CANNOT be handled on `input`: in a text field Shift+3 produces `#`, not `3`, so by
  // the time an input event arrives the digit is gone. The old dialog matches `event.code` on `keydown`
  // and calls `preventDefault` for exactly that reason, and so does this.

  function onCellKeydown(event: KeyboardEvent, slot: Slot, sideNumber: SideNumber): void {
    if (hasCommandModifier(event)) return;

    // ── Enter is the advance in a TIMED format, and nothing else is ──
    //
    // CA, 2026-09-28: *"when I'm in a timed format the enter key in an entry cell should advance to the
    // next 'set/bolt', not a numeric key."* A timed score is multi-digit and has no complement to
    // complete it, so there is no keystroke at which the bolt is finished.
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

    // "Is this cell empty" is the MODEL's answer, not the field's. This read used to come from the input.
    const cell: CellRef = { kind: slot.kind, setIndex: slot.setIndex, side: sideNumber };
    const empty = valueOf(cell) === undefined;

    const digit = digitFromCode(event.code);
    if (digit !== undefined && slot.kind === 'games' && empty && typedDigit(slot, sideNumber, digit, event.shiftKey)) {
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
    if (event.key === 'Backspace' && empty) {
      const target = step(slot, sideNumber, -1);
      if (!target) return;
      event.preventDefault();
      focusSlotSide(target.slot, target.sideNumber);
    }
  }

  /**
   * A digit typed into an empty GAMES cell, which is where the complement decides both sides at once.
   *
   * Returns whether it was handled — `false` lets the keystroke through as an ordinary character, which
   * the `input` event then replays into the model exactly as a tap would.
   *
   * Shift sends the typed number to the OTHER side; that is the whole point of it. A shifted press with
   * no complement still writes to the other side — CA's rule read literally — rather than falling
   * through, which in the old dialog let the browser insert a `#` that the input filter then silently
   * ate. A digit the format cannot reach is refused outright (`true`, nothing written), so the
   * character never lands only to be stripped, which flickers.
   */
  function typedDigit(slot: Slot, sideNumber: SideNumber, digit: number, shifted: boolean): boolean {
    const setIndex = slot.setIndex;
    const before = layoutSignature();
    editingSet = setIndex;

    const target = games(setIndex, shifted ? otherSide(sideNumber) : sideNumber);
    const next = typeDigit(model(), { cell: target, digit, complement: offersComplement(target) });
    if (next === model()) return true;

    const complemented = noteComplement(target, next);
    if (!shifted && !complemented) return false;

    apply(next);

    // Where the set now calls for a tiebreak, that is where the operator goes. Otherwise on to the next
    // set — CA: *"when I enter '3' and the other side smart auto complete's to '6' the focus should then
    // shift to the 2nd set score entry"*. Not past the last set, and not when the match is decided —
    // which is the same question as whether the model shows the next column at all.
    const following = tiebreakOutstanding(model(), setIndex)
      ? ({ kind: 'tiebreak', setIndex } as Slot)
      : advanceTarget(setIndex);

    settle(before, following);
    // Also focused HERE, and not only through `settle`, because `settle` moves focus only when the layout
    // changed — and correcting a set whose successor is already on screen changes no layout at all.
    if (following) focusSlotSide(following, entrySideFor(following));
    return true;
  }

  /** The set to move on to once this one is complete, or nothing if the model offers no next column. */
  function advanceTarget(setIndex: number): Slot | undefined {
    const next = setIndex + 1;
    if (next >= setCount) return undefined;
    if (!layout().some((slot) => slot.kind === 'games' && slot.setIndex === next)) return undefined;
    return { kind: 'games', setIndex: next };
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
    return advanceTarget(setIndex);
  }

  /**
   * One cell forward or back, in the order the operator reads them.
   *
   * Built from `layout()` rather than from the DOM, so it stays correct as a tiebreak column appears and
   * folds away: the visible slots ARE the order, and each carries both sides.
   */
  function step(
    slot: Slot,
    sideNumber: SideNumber,
    direction: 1 | -1
  ): { slot: Slot; sideNumber: SideNumber } | undefined {
    // Bottom cell first within every column, so Tab out of the last cell of one column lands on the
    // BOTTOM of the next — the order CA asked for, applied to the keyboard walk as well as to where
    // focus is placed. Positional rather than `entrySideFor`, because a Tab order that reordered
    // itself as the score changed would be the one thing worse than the wrong order.
    const order = layout().flatMap((current) =>
      ([ENTRY_SIDE, otherSide(ENTRY_SIDE)] as SideNumber[]).map((side) => ({ slot: current, sideNumber: side }))
    );
    const at = order.findIndex(
      (candidate) =>
        candidate.slot.kind === slot.kind &&
        candidate.slot.setIndex === slot.setIndex &&
        candidate.sideNumber === sideNumber
    );
    if (at < 0) return undefined;

    return order[at + direction];
  }

  function focusSlotSide(slot: Slot, sideNumber: SideNumber): void {
    // Moving INTO a folded set means editing it: the fields come back first.
    if (slot.kind === 'games' && isFolded(slot.setIndex)) {
      reopen(slot.setIndex, sideNumber);
      return;
    }
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
   * is the only cell a tiebreak can be entered from: the model derives the pair from the loser's points
   * only, because the WINNER's 7 in a TB7 could have beaten anything from 0 to 5. On the common 7-6 it
   * IS the lower row, so the two rules agree wherever they can.
   */
  function entrySideFor(slot: { kind: Slot['kind']; setIndex: number }): SideNumber {
    if (slot.kind !== 'tiebreak') return ENTRY_SIDE;
    return gamesLoser(model().sets[slot.setIndex]) ?? ENTRY_SIDE;
  }

  /**
   * Reset what is this region's own after the card has emptied the model.
   *
   * The SCORE is already gone — the card clears the model first, score and ending together — so this
   * touches nothing in the store. A first version called the model's `clearAll` here as well, which
   * also dropped the ENDING the card had just chosen: a walkover emptied the cells and then unrecorded
   * itself. A region's reset is presentation, and only presentation.
   */
  function clearAll(): void {
    const before = layoutSignature();
    complementsUsed.clear();
    editingSet = undefined;
    syncCells();
    settle(before);
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
    syncFolds();

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
    // first. `sideNumber` is set only on a restore, which is what distinguishes the two. The caret is
    // the DOM's to know, which is why `cell.value.length` is read here and nowhere else.
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
        sideNumber: Number(sideNumber) as SideNumber
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
   *
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
}
