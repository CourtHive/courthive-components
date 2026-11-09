/**
 * Composition Editor — full-access editor for all Configuration fields.
 *
 * Two-column layout: left = collapsible sections with controls, right = live matchUp preview.
 * Follows the store/control/panel pattern used by policy-catalog and schedule-page.
 */
import { ceLayout, ceLeft, ceRight, ceNameRow, ceNameLabel, ceNameInput } from './styles';
import { COMPOSITION_EDITOR_SECTIONS } from './compositionEditorSections';
import { CompositionEditorStore } from './compositionEditorStore';
import { buildCompositionPreview } from './compositionPreview';
import { compositionSnapshot } from './compositionSnapshot';
import { buildSection } from './sections/sectionBuilder';

// constants and types
import type { CompositionEditorConfig, SavedComposition, EditorPanel } from './compositionEditorTypes';

export type { CompositionEditorConfig, SavedComposition };

export function createCompositionEditor(
  container: HTMLElement,
  config: CompositionEditorConfig
): {
  destroy: () => void;
  getComposition: () => SavedComposition;
} {
  const store = new CompositionEditorStore(config);

  // ── Build layout ──
  const root = document.createElement('div');
  root.className = ceLayout();

  // Left column: name + accordion sections
  const left = document.createElement('div');
  left.className = ceLeft();

  // Name input row
  const nameRow = document.createElement('div');
  nameRow.className = ceNameRow();
  const nameLabel = document.createElement('span');
  nameLabel.className = ceNameLabel();
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = ceNameInput();
  nameInput.value = store.getState().compositionName;
  nameInput.disabled = store.getState().readOnly;
  nameInput.addEventListener('input', () => store.setCompositionName(nameInput.value));
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);
  left.appendChild(nameRow);

  // Build sections
  const sections: EditorPanel[] = COMPOSITION_EDITOR_SECTIONS.map((def) => {
    const panel = buildSection(def, store);
    left.appendChild(panel.element);
    return panel;
  });

  // Right column: preview
  const right = document.createElement('div');
  right.className = ceRight();
  const preview = buildCompositionPreview();
  right.appendChild(preview.element);

  root.appendChild(left);
  root.appendChild(right);
  container.appendChild(root);

  // ── Subscribe ──
  const unsubscribe = store.subscribe((state) => {
    nameInput.value = state.compositionName;
    for (const section of sections) {
      section.update(state);
    }
    preview.update(state);
  });

  // Initial render
  const initialState = store.getState();
  for (const section of sections) {
    section.update(initialState);
  }
  preview.update(initialState);

  // ── Public API ──
  return {
    destroy: () => {
      unsubscribe();
      if (container.contains(root)) {
        container.removeChild(root);
      }
    },
    getComposition: () => compositionSnapshot(store.getState())
  };
}
