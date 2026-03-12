/**
 * Generic section builder — creates collapsible accordion sections.
 */
import { ceSection, ceSectionHeader, ceSectionChevron, ceSectionBody } from '../styles';
import type { CompositionEditorState, SectionId, EditorPanel } from '../compositionEditorTypes';
import type { CompositionEditorStore } from '../compositionEditorStore';

export interface SectionDef {
  id: SectionId;
  label: string;
  factory: (store: CompositionEditorStore) => EditorPanel;
}

export function buildSection(
  def: SectionDef,
  store: CompositionEditorStore,
): EditorPanel {
  const root = document.createElement('div');
  root.className = ceSection();

  // Header
  const header = document.createElement('div');
  header.className = ceSectionHeader();

  const chevron = document.createElement('span');
  chevron.className = ceSectionChevron();

  const label = document.createElement('span');
  label.textContent = def.label;

  header.appendChild(chevron);
  header.appendChild(label);
  header.addEventListener('click', () => store.toggleSection(def.id));

  // Body
  const body = document.createElement('div');
  body.className = ceSectionBody();

  const inner = def.factory(store);
  body.appendChild(inner.element);

  root.appendChild(header);
  root.appendChild(body);

  function update(state: CompositionEditorState): void {
    const expanded = state.expandedSections.has(def.id);
    chevron.textContent = expanded ? '\u25BC' : '\u25B6';
    body.style.display = expanded ? 'block' : 'none';
    if (expanded) {
      inner.update(state);
    }
  }

  return { element: root, update };
}
