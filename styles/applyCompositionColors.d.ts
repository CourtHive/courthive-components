import { CompositionColors } from '../types';
/**
 * Apply per-composition color overrides as inline CSS custom properties on a container.
 * Values cascade to `.chc-matchup` borders and `.chc-link` connector pseudo-elements without
 * touching their style rules. Unspecified fields are left to the theme class default.
 */
export declare function applyCompositionColors(element: HTMLElement, colors?: CompositionColors): void;
/** Remove every CSS custom property managed by `applyCompositionColors` from a container. */
export declare function clearCompositionColors(element: HTMLElement): void;
/** Read effective theme colors for the editor without saving inherited defaults as explicit overrides. */
export declare function readCompositionColors(theme: string, colors?: CompositionColors): CompositionColors;
