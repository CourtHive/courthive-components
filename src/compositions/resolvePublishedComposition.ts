import { compositions } from './compositions';
import type { Composition, CompositionColors, Configuration } from '../types';

const DEFAULT_COMPOSITION = 'National';

export interface DisplayExtensionValue {
  compositionName?: string;
  theme?: string;
  configuration?: Partial<Configuration>;
  /** Per-composition color overrides snapshot. When present, wins over the
   * named-composition's theme defaults. Set by TMX when applying a user
   * composition so the colors travel with published draws even when the
   * `compositionName` isn't a builtin known to this package. */
  colors?: CompositionColors;
}

/**
 * Resolves a published composition from a DISPLAY extension value.
 * Returns a new composition object (never mutates the built-in singletons).
 * Falls back to 'National' if the named composition is not found.
 *
 * For user compositions (names not in the builtin map), the named lookup
 * falls back to the default, but `display.theme`, `display.configuration`,
 * and `display.colors` from the extension still apply — so TMX-side custom
 * compositions render correctly in courthive-public as long as TMX persists
 * the full snapshot.
 */
export function resolvePublishedComposition(
  display?: DisplayExtensionValue,
  fallbackName = DEFAULT_COMPOSITION
): Composition {
  const compositionName = display?.compositionName ?? fallbackName;
  const base = compositions[compositionName] ?? compositions[fallbackName] ?? compositions[DEFAULT_COMPOSITION];

  const resolved: Composition = {
    theme: display?.theme ?? base.theme,
    configuration: {
      ...base.configuration,
      ...display?.configuration
    }
  };

  if (display?.colors) {
    resolved.colors = { ...display.colors };
  }

  return resolved;
}
