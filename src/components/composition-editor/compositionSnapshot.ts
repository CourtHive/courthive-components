// constants and types
import type { SavedComposition } from './compositionEditorTypes';
import type { Composition } from '../../types';

/** Capture the complete persistent display state, leaving runtime callbacks and assignment inputs behind. */
export function compositionSnapshot(value: Composition & { compositionName: string }): SavedComposition {
  const {
    participantProvider: _provider,
    persistInputFields: _inputs,
    inlineAssignment: _assignment,
    renderers: _renderers,
    ...configuration
  } = value.configuration || {};
  // This is the JSON persistence boundary, not a runtime copy of a renderer or engine record.
  const serialized = JSON.stringify(
    { compositionName: value.compositionName, theme: value.theme, configuration, colors: value.colors, version: 1 },
    (_key, item) =>
      typeof item === 'function' || (typeof Node !== 'undefined' && item instanceof Node) ? undefined : item
  );
  return JSON.parse(serialized);
}
