/**
 * Color palette catalog.
 *
 * A palette is chosen per mode: a user picks one light palette and one dark palette, and `data-theme`
 * (owned by the host app: light | dark, resolved from light/dark/system) decides which of the two shows.
 * The host sets `data-palette` on <html> with `applyThemePalette`; the token values live in
 * styles/theme.css (the defaults) and styles/palettes.css (the alternatives).
 *
 * Names are proper names, like font names, so they are not translated.
 */
export type ThemeMode = 'light' | 'dark';
export type ThemePalette = {
    id: string;
    mode: ThemeMode;
    name: string;
    /** Representative colors for a picker: canvas, surface, chrome, text, accent, success. */
    swatches: string[];
};
export declare const DEFAULT_LIGHT_PALETTE = "courtside";
export declare const DEFAULT_DARK_PALETTE = "midnight";
export declare const THEME_PALETTES: readonly ThemePalette[];
export declare function getThemePalettes(mode: ThemeMode): ThemePalette[];
export declare function defaultThemePalette(mode: ThemeMode): string;
/**
 * The palette id to use for `mode`. A missing, unknown or wrong-mode id (a retired palette, a stored
 * light id offered for dark) resolves to the mode's default rather than to no palette at all.
 */
export declare function resolveThemePalette(mode: ThemeMode, paletteId?: string | null): string;
/** Sets `data-palette` on the root element and returns the id it applied. */
export declare function applyThemePalette(mode: ThemeMode, paletteId?: string | null, root?: HTMLElement): string;
