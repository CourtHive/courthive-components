/**
 * The Free Score region: type the whole result as text.
 *
 * Artboard `06-Desktop-FreeScore`. The participant rows carry a read-only readout of the sets, and the
 * entry surface is one field beneath them, labelled TYPE THE SCORE, with a confirmation line under it
 * saying what the parse made of it.
 *
 * ── The boundary (S4 of the state-engine extraction) ──
 *
 * Free Score's field is TEXT and the model holds SETS, so this region is where parse and commit live.
 * The field keeps the text as its own value while it is being typed — a half-typed `6-4 re` is nothing
 * the model can represent, and a model that destroyed it would be worse than the string it replaces.
 * At every keystroke the text is parsed, and the sets the parse produced are committed to the model
 * through `replaceSets`; the same model comes back when a keystroke inside a word changed nothing.
 *
 * From there every answer the card asks for is the model's: `scoreString`, `isComplete`,
 * `winningSide`, `error`, `getSets`. That is what brings the two invariants to typed text for the first
 * time. Measured 2026-10-01: the parser calls `4-2 2-6 2-6` a complete match, as the old region
 * reported; the model does not, because the first set is not finished.
 *
 * ── It parses endings, and that is the point ──
 *
 * `parseScore` reads irregular endings out of the text: `6-4 ret` is a retirement, `wo` a walkover.
 * The region reports the status it parsed through `matchUpStatus()`, and that report stays the
 * region's rather than entering the model: it is an inference about the text, not the operator's
 * selection. The card applies it ONLY when the operator has selected no ending of their own, and keys
 * its walkover lock on the SELECTION — a typed `wo` must not lock the field it was typed into. See
 * `resolveReportedEnding` in `scoreEntryState.ts`, which is where that precedence is written down.
 */

import { enteredSets, scoreString, isComplete } from '../logic/scoreEntrySelectors';
import { createScoreReadouts, READOUT_COLUMN_WIDTH } from './scoreReadout';
import { createScoreEntryStore } from '../logic/scoreEntryStore';
import { parseScore } from '../../../tools/freeScore/freeScore';
import { replaceSets } from '../logic/scoreEntryModel';

import type { ScoreEntryStore } from '../logic/scoreEntryStore';
import type { ScoreEntryModel } from '../logic/scoreEntryModel';
import type { ScoreRegion } from '../scoreEntryCard';
import type { SetScore } from '../types';

export type FreeScoreRegionParams = {
  /** The model the card holds. Omit it and the region makes its own from the params below. */
  store?: ScoreEntryStore;
  matchUpFormat?: string;
  /** The score to open with, already formatted (e.g. `'6-4 6-3'`). With a `store`, the model's own line is used. */
  initialText?: string;
  /** Label above the field. */
  label?: string;
  /** Called after any change. Wire to the card's `refresh`. */
  onChange?: () => void;
};

export type FreeScoreRegion = ScoreRegion & {
  store: ScoreEntryStore;
  /** What is currently in the field. */
  getText: () => string;
  /** The entered sets, for a host or a test reading the region directly. The card reads the model. */
  getSets: () => SetScore[];
  /** Text in the field counts as entry the model cannot see; required here. */
  hasEntry: () => boolean;
};

export function createFreeScoreRegion(params: FreeScoreRegionParams): FreeScoreRegion {
  /** The field's own value. Text, because that is what the operator is typing. */
  let text = params.initialText ?? '';
  /**
   * The one truth about the SCORE, shared with the card. Replaced at every point the text parses to sets.
   * Given a store, the field opens on the factory's line for the model's sets — the same line the other
   * two approaches display — so an approach switch into Free Score is a render of the model, not a
   * translation through text.
   */
  const store = params.store ?? createScoreEntryStore({ matchUpFormat: params.matchUpFormat, approach: 'freeScore' });
  const matchUpFormat = store.get().matchUpFormat;
  if (params.store) text = params.initialText ?? scoreString(store.get()) ?? '';
  else commit();
  let field: HTMLInputElement | undefined;
  let note: HTMLElement | undefined;
  const readouts = createScoreReadouts();

  return {
    store,
    // One unlabelled column: the rows READ here, they do not accept input.
    columns: () => [{ width: READOUT_COLUMN_WIDTH }],
    rowCells: (sideNumber) => [readouts.cell(sideNumber, enteredSets(model()))],
    block: () => entryBlock(),
    matchUpStatus: () => reportedEnding(),
    getText: () => text,
    getSets: () => enteredSets(model()),
    // Text that does not parse to a single set is still entry — and is exactly the state worth NOT
    // discarding, because the operator is mid-way through typing it.
    hasEntry: () => !!text.trim(),
    // The card has already emptied the model; this resets what is the field's own.
    clear: () => {
      text = '';
      if (field) field.value = '';
      readouts.update([]);
      params.onChange?.();
    },
    focusFirst: () => {
      if (!field) return;
      field.focus();

      // The CARET goes to the end; the text is not selected. CA, 2026-09-30: *"The text in the entry
      // field is all selected, when the cursor should be at the end of the entry field. as it is
      // hitting any key deletes the score!"*
      //
      // `select()` is right for a per-set CELL, where a set score is one or two characters and typing
      // over it is the correction. It is wrong for a whole match: `6-4 2-1` is a sentence being
      // extended, and selecting all of it turns the next keystroke into a delete.
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  };

  // ── Parsing: the boundary ────────────────────────────────────────────

  function model(): ScoreEntryModel {
    return store.get();
  }

  /**
   * The parse of what is currently typed.
   *
   * Recomputed on demand rather than cached. The field is short, the parser is pure, and a cache here
   * would be a second place the score lives.
   */
  function parsed(): { sets: SetScore[]; result?: ReturnType<typeof parseScore> } {
    if (!text.trim()) return { sets: [] };

    const result = parseScore(text, matchUpFormat);
    // `ParsedSet` already uses `side1Score` / `side2Score` / `side1TiebreakScore` — the same names as
    // `SetScore` — so it is used directly.
    return { sets: (result.sets ?? []) as SetScore[], result };
  }

  /** The ending the TEXT says, if any — reported to the card, never selected on its behalf. */
  function reportedEnding(): string | undefined {
    return parsed().result?.matchUpStatus;
  }

  /** Commit what the text now parses to. The model decides whether anything changed. */
  function commit(): void {
    store.set(replaceSets(model(), parsed().sets));
  }

  // ── Rendering ────────────────────────────────────────────────────────

  function entryBlock(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'chc-sec-freescore';

    const id = `chc-fs-${Math.random().toString(36).slice(2, 8)}`;
    const label = document.createElement('label');
    label.className = 'chc-sec-field-label';
    label.htmlFor = id;
    label.textContent = params.label ?? 'TYPE THE SCORE';

    field = document.createElement('input');
    field.type = 'text';
    field.id = id;
    field.className = 'chc-sec-freescore-input';
    field.value = text;
    field.dataset.freeScore = 'true';
    // A real `<label for>` rather than an aria-label, so clicking the label focuses the field — the
    // one accessibility affordance an aria-label does not give you.
    field.autocomplete = 'off';
    field.spellcheck = false;

    field.addEventListener('input', () => {
      // The one DOM read: the text the keystroke produced. The field is the source of what was typed,
      // and the model is the source of what it means.
      text = field?.value ?? '';
      commit();
      // The readout is in the participant ROWS, which the card's `refresh` deliberately does not
      // re-render — so the region updates it itself.
      readouts.update(enteredSets(model()));
      renderNote();
      params.onChange?.();
    });

    note = document.createElement('div');
    note.className = 'chc-sec-field-note';

    wrapper.append(label, field, note);
    renderNote();
    return wrapper;
  }

  /**
   * The line under the field, saying what the parse made of the text.
   *
   * This is the region's own feedback, distinct from the card's result band: the band says what will be
   * SUBMITTED, this says whether the text was UNDERSTOOD. Both matter and they answer different
   * questions — a typo produces a comprehensible band ("no result entered yet") and an incomprehensible
   * field, and only this line can say so.
   */
  function renderNote(): void {
    if (!note) return;

    const { result } = parsed();
    if (!text.trim()) {
      note.textContent = '';
      note.dataset.tone = 'idle';
      return;
    }

    // ── `valid` alone does not mean the text was understood ──
    //
    // Measured 2026-09-27: `parseScore('qqq', 'SET3-S:6/TB7')` returns `valid: true` with ZERO errors
    // and ZERO sets. So the parser's `valid` flag says "nothing went wrong", not "this is a score", and
    // a note keyed on it alone reports nonsense as fine. The signal is text that produced no sets and
    // no ending — something was typed and none of it landed.
    const parsedNothing = !result?.sets?.length && !result?.matchUpStatus;
    if (!result?.valid || parsedNothing) {
      const first = result?.errors?.[0];
      note.textContent = typeof first === 'string' ? first : (first?.message ?? 'Not a score this format allows');
      note.dataset.tone = 'error';
      return;
    }

    // "Finished" is the MODEL's judgement now, not the parser's: the parser calls `4-2 2-6 2-6`
    // complete, and it is not.
    const finished = !result.matchUpStatus && isComplete(model());
    note.dataset.tone = finished ? 'good' : 'idle';
    note.textContent = finished
      ? `A complete match under ${matchUpFormat}`
      : `${result.formattedScore} — not a finished result`;
  }
}
