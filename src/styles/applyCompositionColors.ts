import type { CompositionColors } from '../types';

const COLOR_TO_CSS_VAR: Record<keyof CompositionColors, string> = {
  accent: '--chc-color-accent',
  accentText: '--chc-color-accent-text',
  border: '--chc-color-border',
  borderHover: '--chc-color-border-hover',
  borderInlineStart: '--chc-color-border-inline-start',
  borderInlineStartWidth: '--chc-border-width-inline-start',
  connector: '--chc-color-connector',
  matchUpBackground: '--chc-color-matchup',
  internalDividers: '--chc-color-internal-dividers',
  score: '--chc-color-score',
  roundHeader: '--chc-color-round-header',
  roundHeaderBackground: '--chc-color-round-header-bg',
  roundHeaderUnderline: '--chc-color-round-header-underline',
  scheduleHeaderText: '--chc-color-schedule-header-text',
  scheduleHeaderBackground: '--chc-color-schedule-header-bg',
  scheduleHeaderDivider: '--chc-color-schedule-header-divider',
  matchUpFooterBackground: '--chc-color-matchup-footer-bg',
  matchUpFooterText: '--chc-color-matchup-footer-text',
  matchUpFooterDivider: '--chc-color-matchup-footer-divider'
};

/**
 * Apply per-composition color overrides as inline CSS custom properties on a container.
 * Values cascade to `.chc-matchup` borders and `.chc-link` connector pseudo-elements without
 * touching their style rules. Unspecified fields are left to the theme class default.
 */
export function applyCompositionColors(element: HTMLElement, colors?: CompositionColors): void {
  if (!colors) return;
  for (const [key, cssVar] of Object.entries(COLOR_TO_CSS_VAR)) {
    const value = colors[key as keyof CompositionColors];
    if (value) element.style.setProperty(cssVar, value);
  }
}

/** Remove every CSS custom property managed by `applyCompositionColors` from a container. */
export function clearCompositionColors(element: HTMLElement): void {
  for (const cssVar of Object.values(COLOR_TO_CSS_VAR)) {
    element.style.removeProperty(cssVar);
  }
}

/** Read effective theme colors for the editor without saving inherited defaults as explicit overrides. */
export function readCompositionColors(theme: string, colors?: CompositionColors): CompositionColors {
  const probe = document.createElement('div');
  probe.className = theme;
  probe.style.cssText = 'position:fixed; visibility:hidden; pointer-events:none; width:0; height:0; overflow:hidden;';
  applyCompositionColors(probe, colors);
  const swatch = document.createElement('span');
  probe.appendChild(swatch);
  document.body.appendChild(probe);
  try {
    const styles = getComputedStyle(probe);
    const fallbacks: Partial<Record<keyof CompositionColors, string>> = {
      accent: 'var(--chc-status-info)',
      accentText: 'var(--chc-on-primary)',
      borderInlineStart: 'var(--chc-color-border)',
      score: 'var(--chc-status-info)',
      roundHeader: 'var(--chc-text-primary)',
      roundHeaderUnderline: 'var(--chc-color-round-header, var(--chc-text-primary))',
      scheduleHeaderText: 'var(--chc-text-muted)',
      scheduleHeaderBackground: 'var(--chc-bg-secondary)',
      scheduleHeaderDivider: 'var(--chc-border-primary)',
      matchUpFooterBackground: 'var(--chc-color-matchup)',
      matchUpFooterText: 'var(--chc-text-muted)'
    };
    const resolved: CompositionColors = {};
    for (const [key, cssVar] of Object.entries(COLOR_TO_CSS_VAR)) {
      const field = key as keyof CompositionColors;
      if (field === 'borderInlineStartWidth') continue;
      const value = styles.getPropertyValue(cssVar).trim() || fallbacks[field] || 'transparent';
      swatch.style.color = value;
      const color = getComputedStyle(swatch).color;
      const rgb = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
      resolved[field] = rgb
        ? `#${rgb
            .slice(1)
            .map((channel) => Number(channel).toString(16).padStart(2, '0'))
            .join('')}`
        : color === 'rgba(0, 0, 0, 0)'
          ? 'transparent'
          : color;
    }
    return resolved;
  } finally {
    probe.remove();
  }
}
