/** Scope decisions come from the host's factory SCORE action, never from UI draw heuristics. */
export function statusScopeError(
  status: string | undefined,
  disabledMatchUpStatuses: readonly string[] = []
): string | undefined {
  if (!status || !new Set(disabledMatchUpStatuses).has(status)) return undefined;
  const label = status.toLowerCase().replaceAll('_', ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} is unavailable for this match`;
}

/** Keep the refusal visible even where the restricted status has been removed from the choices. */
export function statusScopeNotice(disabledMatchUpStatuses: readonly string[] = []): HTMLElement {
  const notice = document.createElement('div');
  notice.className = 'chc-scoring-status-scope';
  notice.style.fontSize = '0.75rem';
  notice.style.color = 'var(--chc-text-secondary)';
  notice.style.flexBasis = '100%';
  notice.setAttribute('role', 'note');
  notice.textContent = disabledMatchUpStatuses
    .map((status) => statusScopeError(status, disabledMatchUpStatuses))
    .join('. ');
  notice.hidden = !disabledMatchUpStatuses.length;
  return notice;
}
