import type { ScoringModalLabels } from '../types';
import { endingLabels } from './irregularEnding';

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
  if (!status || !new Set(disabledMatchUpStatuses).has(status)) return undefined;
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

/** Keep the refusal visible even where the restricted status has been removed from the choices. */
export function statusScopeNotice(
  disabledMatchUpStatuses: readonly string[] = [],
  labels?: Record<string, string>
): HTMLElement {
  const notice = document.createElement('div');
  notice.className = 'chc-scoring-status-scope';
  notice.style.fontSize = '0.75rem';
  notice.style.color = 'var(--chc-text-secondary)';
  notice.style.flexBasis = '100%';
  notice.setAttribute('role', 'note');
  notice.textContent = disabledMatchUpStatuses
    .map((status) => statusScopeError(status, disabledMatchUpStatuses, labels))
    .join('. ');
  notice.hidden = !disabledMatchUpStatuses.length;
  return notice;
}
