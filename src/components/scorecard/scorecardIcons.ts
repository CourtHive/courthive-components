/**
 * The scorecard's small inline icons, drawn in `currentColor` so each takes its chip's color in either theme.
 */
export const FLAG_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5v13M3 2.5h8.5l-1.75 3 1.75 3H3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
export const WARNING_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="currentColor"/><path d="M8 6v3.5M8 11.3v.2" stroke="var(--chc-bg-primary)" stroke-width="1.6" stroke-linecap="round"/></svg>';

export const icon = (svg: string) => {
  const element = document.createElement('span');
  element.className = 'chc-scorecard-icon';
  element.innerHTML = svg;
  return element;
};
