/**
 * Composition Editor — full-access editor for all Configuration fields.
 *
 * Two-column layout: left = collapsible sections with controls, right = live matchUp preview.
 * Follows the store/control/panel pattern used by policy-catalog and schedule-page.
 */
import { CompositionEditorStore } from './compositionEditorStore';
import type { CompositionEditorConfig, SavedComposition, EditorPanel } from './compositionEditorTypes';
import { ceLayout, ceLeft, ceRight, ceNameRow, ceNameLabel, ceNameInput } from './styles';
import { buildSection, type SectionDef } from './sections/sectionBuilder';
import { buildThemeSection } from './sections/themeSection';
import { buildDisplaySection } from './sections/displaySection';
import { buildScoreSection } from './sections/scoreSection';
import { buildParticipantSection } from './sections/participantSection';
import { buildPlaceholderSection } from './sections/placeholderSection';
import { buildScaleSection } from './sections/scaleSection';
import { buildLayoutSection } from './sections/layoutSection';
import { buildCompositionPreview } from './compositionPreview';

export type { CompositionEditorConfig, SavedComposition };

const SECTION_DEFS: SectionDef[] = [
  { id: 'theme', label: 'Theme & Preset', factory: buildThemeSection },
  { id: 'display', label: 'Display', factory: buildDisplaySection },
  { id: 'score', label: 'Score', factory: buildScoreSection },
  { id: 'participant', label: 'Participant', factory: buildParticipantSection },
  { id: 'placeholder', label: 'Placeholders', factory: buildPlaceholderSection },
  { id: 'scale', label: 'Scale Attributes', factory: buildScaleSection },
  { id: 'layout', label: 'Layout & Info', factory: buildLayoutSection }
];

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
  const sections: EditorPanel[] = SECTION_DEFS.map((def) => {
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
    getComposition: (): SavedComposition => {
      const state = store.getState();
      // Strip runtime-only fields that aren't serializable
      const {
        participantProvider: _pp,
        persistInputFields: _pi,
        inlineAssignment: _ia,
        ...serializableConfig
      } = state.configuration as any;
      return {
        compositionName: state.compositionName,
        theme: state.theme,
        configuration: serializableConfig,
        version: 1
      };
    }
  };
}
