import { TeamPresentation, TeamDisplayColors } from './teamPalette';
export { resolveTeamColors } from './teamPalette';
/** Only use the identity actually exposed on this side. Never recover privacy-filtered child data from a parent. */
export declare function teamColorsOf(side: any, presentation?: TeamPresentation): TeamDisplayColors | undefined;
export declare function hasExplicitSideColors(composition: any): boolean;
/**
 * Re-resolve every accented name under `root` against the surface it is painted on now. Only the paint
 * (`color`) changes; the stored brand values stay on the `--chc-team-*` custom properties.
 */
export declare function resolveTeamAccents(root?: Document | Element): void;
/**
 * Paint team names only; the scorecard header and state indicators retain theme semantics. Cards are usually
 * built detached, so the readable paint is resolved once the element is attached (next frame) and again on every
 * theme change. Until then names keep the theme's own color, which is always readable.
 */
export declare function applyTeamAccent(element: HTMLElement, colors?: TeamDisplayColors): void;
