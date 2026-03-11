import { compositions } from './compositions';
import type { Composition, Configuration } from '../types';

const DEFAULT_COMPOSITION = 'National';

export interface DisplayExtensionValue {
  compositionName?: string;
  theme?: string;
  configuration?: Partial<Configuration>;
}

/**
 * Resolves a published composition from a DISPLAY extension value.
 * Returns a new composition object (never mutates the built-in singletons).
 * Falls back to 'National' if the named composition is not found.
 */
export function resolvePublishedComposition(
  display?: DisplayExtensionValue,
  fallbackName = DEFAULT_COMPOSITION,
): Composition {
  const compositionName = display?.compositionName ?? fallbackName;
  const base = compositions[compositionName] ?? compositions[fallbackName] ?? compositions[DEFAULT_COMPOSITION];

  return {
    theme: display?.theme ?? base.theme,
    configuration: {
      ...base.configuration,
      ...display?.configuration,
    },
  };
}
