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

  // Preset loader — loads a complete built-in composition (theme + all settings)
  const presetOptions = [
    { value: '', label: '— Load preset —' },
    ...Object.keys(compositions).map((name) => ({ value: name, label: name }))
  ];

  const presetField = buildSelectField(
    'Load preset',
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
    store.getState().readOnly
  );
  root.appendChild(presetField.element);

  const presetHint = document.createElement('div');
  presetHint.style.cssText =
    'font-size:0.7rem; color:var(--chc-text-secondary, #999); padding:0 0 0.3rem; line-height:1.3;';
  presetHint.textContent = 'Replaces all settings with a built-in composition.';
  root.appendChild(presetHint);

  // Theme selector — changes only the color scheme
  const themeField = buildSelectField(
    'Color theme',
    THEME_MAP,
    store.getState().theme,
    (val) => store.setTheme(val),
    store.getState().readOnly
  );
  root.appendChild(themeField.element);

  const themeHint = document.createElement('div');
  themeHint.style.cssText =
    'font-size:0.7rem; color:var(--chc-text-secondary, #999); padding:0 0 0.3rem; line-height:1.3;';
  themeHint.textContent = 'Changes only the color scheme, not the display settings.';
  root.appendChild(themeHint);

  function update(state: CompositionEditorState): void {
    themeField.setValue(state.theme);
  }

  return { element: root, update };
}
