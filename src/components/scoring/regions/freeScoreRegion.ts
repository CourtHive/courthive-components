/**
 * The Free Score region: type the whole result as text.
 *
 * Artboard `06-Desktop-FreeScore`. The participant rows carry a read-only readout of the sets, and the
 * entry surface is one field beneath them, labelled TYPE THE SCORE, with a confirmation line under it
 * saying what the parse made of it.
 *
 * ── It parses endings, and that is the point ──
 *
 * `parseScore` reads irregular endings out of the text: `6-4 ret` is a retirement, `wo` a walkover.
 * That is the whole reason this approach exists, so the region reports the status it parsed through
 * `matchUpStatus()`. The card applies it ONLY when the operator has selected no ending of their own —
 * a click is an unambiguous instruction and parsed text is an inference, so the click wins. See
 * `resolveReportedEnding` in `scoreEntryState.ts`, which is where that precedence is written down.
 *
 * ── It computes nothing ──
 *
 * `parseScore` (the freeScore tool) turns text into sets and a status; `validateScore` turns the
 * formatted result into an outcome with a winner. Both already exist and are the same ones the old
 * approach used, so a typed score cannot mean one thing here and another there.
 */

import { createScoreReadouts, READOUT_COLUMN_WIDTH } from './scoreReadout';
import { scoreLine } from './scoreLine';
import { parseScore } from '../../../tools/freeScore/freeScore';
import { validateScore } from '../utils/scoreValidator';

import type { SideNumber } from '../logic/scoreEntryState';
import type { ScoreRegion } from '../scoreEntryCard';
import type { SetScore } from '../types';

export type FreeScoreRegionParams = {
  matchUpFormat?: string;
  /** The score to open with, already formatted (e.g. `'6-4 6-3'`). */
  initialText?: string;
  /** Label above the field. */
  label?: string;
  /** Called after any change. Wire to the card's `refresh`. */
  onChange?: () => void;
};

export type FreeScoreRegion = ScoreRegion & {
  /** What is currently in the field. */
  getText: () => string;
  /** The sets the parse produced, for submission. */
  getSets: () => SetScore[];
  /** Required here, though optional on `ScoreRegion`: every entry approach can answer it. */
  hasEntry: () => boolean;
};

export function createFreeScoreRegion(params: FreeScoreRegionParams): FreeScoreRegion {
  const matchUpFormat = params.matchUpFormat ?? 'SET3-S:6/TB7';
  let text = params.initialText ?? '';
  let field: HTMLInputElement | undefined;
  let note: HTMLElement | undefined;
  const readouts = createScoreReadouts();

  return {
    // One unlabelled column: the rows READ here, they do not accept input.
    columns: () => [{ width: READOUT_COLUMN_WIDTH }],
    rowCells: (sideNumber) => [readouts.cell(sideNumber, parsed().sets)],
    block: () => entryBlock(),
    scoreString: () => scoreText(),
    isComplete: () => parsed().matchComplete,
    winningSide: () => outcome().winningSide as SideNumber | undefined,
    matchUpStatus: () => parsed().result?.matchUpStatus,
    getText: () => text,
    getSets: () => parsed().sets,
    // Text that does not parse to a single set is still entry — and is exactly the state worth NOT
    // discarding, because the operator is mid-way through typing it.
    hasEntry: () => !!text.trim(),
  };

  // ── Parsing ──────────────────────────────────────────────────────────

  /**
   * The parse of what is currently typed.
   *
   * Recomputed on demand rather than cached. The field is short, the parser is pure, and a cache here
   * would be a second place the score lives — which is exactly the shape that let the old approaches
   * disagree with each other about a saved result.
   */
  function parsed(): { sets: SetScore[]; matchComplete: boolean; result?: ReturnType<typeof parseScore> } {
    if (!text.trim()) return { sets: [], matchComplete: false };

    const result = parseScore(text, matchUpFormat);
    return {
      // `ParsedSet` already uses `side1Score` / `side2Score` / `side1TiebreakScore` — the same names as
      // `SetScore` — so it is used directly. An earlier version mapped through a `set.side1 ?? ...`
      // translator, defending against a shape the parser does not produce; checked rather than
      // assumed, and removed.
      sets: result.sets ?? [],
      matchComplete: result.matchComplete,
      result,
    };
  }

  function outcome() {
    const result = parsed().result;
    if (!result?.valid) return {} as ReturnType<typeof validateScore>;
    return validateScore(result.formattedScore, matchUpFormat, result.matchUpStatus);
  }

  function scoreText(): string | undefined {
    const result = parsed().result;
    if (!result) return undefined;

    // The FACTORY's line when the parse succeeded, so the band quotes a canonical `6-4 6-3` rather than
    // whatever shorthand was typed — and quotes it identically to the other two approaches, which is
    // what `scoreLine` exists for. The raw text when the parse did NOT succeed, because showing nothing
    // while the operator is mid-word reads as the field being ignored.
    if (!result.valid) return text || undefined;
    return scoreLine(parsed().sets, matchUpFormat) ?? result.formattedScore;
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
      text = field?.value ?? '';
      // The readout is in the participant ROWS, which the card's `refresh` deliberately does not
      // re-render — so the region updates it itself. Without this the rows stay blank however much is
      // typed, which is precisely what six tests caught.
      readouts.update(parsed().sets);
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

    const { result, matchComplete } = parsed();
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
      note.textContent =
        typeof first === 'string' ? first : (first?.message ?? 'Not a score this format allows');
      note.dataset.tone = 'error';
      return;
    }

    note.dataset.tone = matchComplete ? 'good' : 'idle';
    note.textContent = matchComplete
      ? `A complete match under ${matchUpFormat}`
      : `${result.formattedScore} — not a finished result`;
  }
}
