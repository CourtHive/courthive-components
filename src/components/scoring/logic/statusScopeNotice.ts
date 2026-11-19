import { statusScopeError } from './statusScope';

/**
 * Keep the refusal visible even where the restricted status has been removed from the choices. The DOM half of
 * `statusScope.ts`, split from it so the sentences stay importable where there is no `document`.
 */
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
