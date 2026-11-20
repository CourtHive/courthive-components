/**
 * The words for a status the host's scope refuses. Whether a status is out of scope is the factory's score-state rule
 * (`statusOutOfScope`, from the host's `SCORE` action); this module only says so, in the host's labels. The DOM
 * notice that shows these sentences is `statusScopeNotice.ts`, kept apart so this stays importable without a DOM.
 */
import { statusOutOfScope } from 'tods-competition-factory/score-entry-state';
import { endingLabels } from './irregularEnding';

import type { ScoringModalLabels } from '../types';

const DEFAULT_SCOPE_LABELS = {
  ...endingLabels(),
  CHALLENGED: 'Challenged',
  statusUnavailable: '{{status}} is unavailable for this match'
};

/** Adapt the legacy modal's named labels to the card's status-keyed labels. */
export function scoringStatusScopeLabels(labels: ScoringModalLabels = {}): Record<string, string> {
  return {
    ...endingLabels(labels),
    CHALLENGED: present(labels.challenged) ?? DEFAULT_SCOPE_LABELS.CHALLENGED,
    statusUnavailable: present(labels.statusUnavailable) ?? DEFAULT_SCOPE_LABELS.statusUnavailable
  };
}

/** Scope decisions come from the host's factory SCORE action, never from UI draw heuristics. */
export function statusScopeError(
  status: string | undefined,
  disabledMatchUpStatuses: readonly string[] = [],
  labels: Record<string, string> = DEFAULT_SCOPE_LABELS
): string | undefined {
  if (!status || !statusOutOfScope(status, disabledMatchUpStatuses)) return undefined;
  const name = present(labels[status]) ?? DEFAULT_SCOPE_LABELS[status] ?? status;
  const template = present(labels.statusUnavailable) ?? DEFAULT_SCOPE_LABELS.statusUnavailable;
  return template.replaceAll('{{status}}', name);
}

/**
 * A host's word, unless it is blank: then the English default stands, as `scoreEntryText` does for every other key.
 * A blank translation used to make the refusal itself blank, and a blank refusal reads as no refusal: Submit stayed
 * live and the out-of-scope status was submitted.
 */
function present(word: string | undefined): string | undefined {
  return word?.trim() ? word : undefined;
}
