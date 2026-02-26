/**
 * Theme system — plain CSS class names.
 * Replaces Stitches createTheme(). Theme classes are defined in themes.css.
 */
export function createTheme(name: string, _overrides: Record<string, any>): string {
  // The CSS class is defined in ../themes.css
  // The overrides parameter is kept for documentation/reference but is no longer used at runtime.
  return `chc-theme-${name.replace('-theme', '')}`;
}
