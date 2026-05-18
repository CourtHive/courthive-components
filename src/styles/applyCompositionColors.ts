import type { CompositionColors } from '../types';

const COLOR_TO_CSS_VAR: Record<keyof CompositionColors, string> = {
  border: '--chc-color-border',
  borderHover: '--chc-color-border-hover',
  borderInlineStart: '--chc-color-border-inline-start',
  borderInlineStartWidth: '--chc-border-width-inline-start',
  connector: '--chc-color-connector',
  matchUpBackground: '--chc-color-matchup',
  internalDividers: '--chc-color-internal-dividers',
  score: '--chc-color-score',
  roundHeader: '--chc-color-round-header'
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
