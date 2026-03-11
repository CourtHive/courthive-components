import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { compositions } from '../../../compositions/compositions';
import { buildSelectField } from './fieldBuilders';

/** Map theme CSS class → human-readable name */
const THEME_MAP: Array<{ value: string; label: string }> = [];

// Build from compositions (deduplicate themes)
const seen = new Set<string>();
for (const [, comp] of Object.entries(compositions)) {
  if (!seen.has(comp.theme)) {
    seen.add(comp.theme);
    // Derive label from theme string: "chc-theme-australian" → "Australian"
    const themeLabel = comp.theme
      .replace('chc-theme-', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    THEME_MAP.push({ value: comp.theme, label: themeLabel });
  }
}

export function buildThemeSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');

  // Theme selector
  const themeField = buildSelectField(
    'Theme',
    THEME_MAP,
    store.getState().theme,
    (val) => store.setTheme(val),
    store.getState().readOnly,
  );
  root.appendChild(themeField.element);

  // Preset loader
  const presetOptions = [
    { value: '', label: '— Load preset —' },
    ...Object.keys(compositions).map((name) => ({ value: name, label: name })),
  ];

  const presetField = buildSelectField(
    'Preset',
    presetOptions,
    '',
    (val) => {
      if (!val) return;
      const preset = compositions[val];
      if (preset) {
        store.loadComposition(val, preset.theme, preset.configuration || {});
      }
      // Reset the dropdown back to placeholder
      presetField.setValue('');
    },
    store.getState().readOnly,
  );
  root.appendChild(presetField.element);

  function update(state: CompositionEditorState): void {
    themeField.setValue(state.theme);
  }

  return { element: root, update };
}
