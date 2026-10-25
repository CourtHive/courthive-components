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

export const DEFAULT_LIGHT_PALETTE = 'courtside';
export const DEFAULT_DARK_PALETTE = 'midnight';

export const THEME_PALETTES: readonly ThemePalette[] = [
  {
    id: 'courtside',
    mode: 'light',
    name: 'Courtside',
    swatches: ['#eef1f5', '#ffffff', '#23324a', '#111827', '#1747c2', '#0f6a33']
  },
  {
    id: 'linen',
    mode: 'light',
    name: 'Linen',
    swatches: ['#f3f0ea', '#fbfaf7', '#efe9de', '#2b2620', '#2f5fb3', '#2e7048']
  },
  {
    id: 'slate',
    mode: 'light',
    name: 'Slate',
    swatches: ['#f3f5f8', '#ffffff', '#e2e8f0', '#1b2430', '#2563eb', '#15703a']
  },
  {
    id: 'midnight',
    mode: 'dark',
    name: 'Midnight',
    swatches: ['#1a1a2e', '#16213e', '#16213e', '#e0e0e0', '#7fb0e6', '#6cc488']
  },
  {
    id: 'graphite',
    mode: 'dark',
    name: 'Graphite',
    swatches: ['#1d1e21', '#25262a', '#25262a', '#e8e8ea', '#7fb2ff', '#62c58a']
  }
];

export function getThemePalettes(mode: ThemeMode): ThemePalette[] {
  return THEME_PALETTES.filter((palette) => palette.mode === mode);
}

export function defaultThemePalette(mode: ThemeMode): string {
  return mode === 'dark' ? DEFAULT_DARK_PALETTE : DEFAULT_LIGHT_PALETTE;
}

/**
 * The palette id to use for `mode`. A missing, unknown or wrong-mode id (a retired palette, a stored
 * light id offered for dark) resolves to the mode's default rather than to no palette at all.
 */
export function resolveThemePalette(mode: ThemeMode, paletteId?: string | null): string {
  const match = THEME_PALETTES.find((palette) => palette.id === paletteId && palette.mode === mode);
  return match ? match.id : defaultThemePalette(mode);
}

/** Sets `data-palette` on the root element and returns the id it applied. */
export function applyThemePalette(
  mode: ThemeMode,
  paletteId?: string | null,
  root: HTMLElement = document.documentElement
): string {
  const resolved = resolveThemePalette(mode, paletteId);
  root.dataset.palette = resolved;
  return resolved;
}
