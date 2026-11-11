/**
 * The Free Score field's note: whether the typed text was UNDERSTOOD, separately from what will be submitted.
 *
 * The band says what will be recorded; this says whether the field makes sense. They answer different
 * questions — a typo produces a comprehensible band ("no result entered yet") and an incomprehensible
 * field, and only the note can say so. Lifted out of `freeScoreRegion.ts` so the rule is tested without a DOM.
 */

import { parseScore } from '../../../tools/freeScore/freeScore';
import { isComplete } from './scoreEntrySelectors';
import { scoreEntryText } from './scoreEntryText';
import { statusScopeError } from './statusScope';

import type { ScoreEntryModel } from './scoreEntryModel';

export type FreeScoreNoteTone = 'idle' | 'good' | 'error';

export type FreeScoreNoteParams = {
  /** What is in the field. */
  text: string;
  /** `parseScore` of that text under the model's format; omitted when the field is blank. */
  result?: ReturnType<typeof parseScore>;
  /** The model the parsed sets were committed to. */
  model: ScoreEntryModel;
  disabledMatchUpStatuses?: string[];
  statusScopeLabels?: Record<string, string>;
  labels?: Record<string, string | undefined>;
};

export function freeScoreNote(params: FreeScoreNoteParams): { tone: FreeScoreNoteTone; text: string } {
  const { text, result, model, labels } = params;

  const scopeError = statusScopeError(result?.matchUpStatus, params.disabledMatchUpStatuses, params.statusScopeLabels);
  if (scopeError) return { tone: 'error', text: scopeError };
  if (!text.trim()) return { tone: 'idle', text: '' };

  // ── `valid` alone does not mean the text was understood ──
  //
  // Measured 2026-09-27: `parseScore('qqq', 'SET3-S:6/TB7')` returns `valid: true` with ZERO errors
  // and ZERO sets. So the parser's `valid` flag says "nothing went wrong", not "this is a score", and
  // a note keyed on it alone reports nonsense as fine. The signal is text that produced no sets and
  // no ending — something was typed and none of it landed.
  const parsedNothing = !result?.sets?.length && !result?.matchUpStatus;
  if (!result?.valid || parsedNothing) {
    const first = result?.errors?.[0];
    return {
      tone: 'error',
      text: typeof first === 'string' ? first : (first?.message ?? scoreEntryText(labels, 'notAScore'))
    };
  }

  // "Finished" is the MODEL's judgement, not the parser's: the parser calls `4-2 2-6 2-6` complete, and
  // it is not.
  const finished = !result.matchUpStatus && isComplete(model);
  return finished
    ? { tone: 'good', text: scoreEntryText(labels, 'completeMatch', { format: model.matchUpFormat }) }
    : { tone: 'idle', text: scoreEntryText(labels, 'notFinished', { score: result.formattedScore }) };
}
