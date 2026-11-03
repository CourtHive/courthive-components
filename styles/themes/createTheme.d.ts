/**
 * Theme system — plain CSS class names.
 * Replaces Stitches createTheme(). Theme classes are defined in themes.css.
 */
/**
 * @deprecated `overrides` is ignored: the theme is the CSS class this returns, styled in themes.css.
 * Change a composition's look with its `colors` (`CompositionColors`) or the `--chc-*` CSS tokens.
 *
 * Still returns the class name; kept until a later major decides its removal.
 */
export declare function createTheme(name: string, _overrides: Record<string, any>): string;
