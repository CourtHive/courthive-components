/**
 * Scoring Editor Panel — three-section accordion assembly.
 *
 * Mirrors buildSeedingEditorPanel. Each section is a separate file
 * under sections/; this module owns the wrapper, the accordion
 * mechanics, and the top-level update pump.
 */

import type { ScoringEditorState, ScoringEditorSection } from './types';
import type { ScoringEditorStore } from './scoringEditorStore';
import { buildDefaultsSection } from './sections/defaultsSection';
import { buildAllowedFormatsSection } from './sections/allowedFormatsSection';
import { buildStatusCodesSection } from './sections/statusCodesSection';

interface SectionDef {
  id: ScoringEditorSection;
  label: string;
  factory: () => { element: HTMLElement; update(state: ScoringEditorState): void };
}

export function buildScoringEditorPanel(
  store: ScoringEditorStore,
): {
  element: HTMLElement;
  update(state: ScoringEditorState): void;
} {
  const root = document.createElement('div');
  root.className = 'sc-editor';

  const sectionDefs: SectionDef[] = [
    { id: 'defaults', label: 'Defaults', factory: () => buildDefaultsSection(store) },
    { id: 'allowedFormats', label: 'Allowed match-up formats', factory: () => buildAllowedFormatsSection(store) },
    { id: 'statusCodes', label: 'Status code refinements', factory: () => buildStatusCodesSection(store) },
  ];

  const sections: {
    id: ScoringEditorSection;
    chevron: HTMLElement;
    bodyEl: HTMLElement;
    inner: { element: HTMLElement; update(state: ScoringEditorState): void };
  }[] = [];

  for (const def of sectionDefs) {
    const section = document.createElement('div');
    section.className = 'sc-section';

    const header = document.createElement('div');
    header.className = 'sc-section-header';

    const chevron = document.createElement('span');
    chevron.className = 'sc-section-chevron';

    const label = document.createElement('span');
    label.textContent = def.label;

    header.appendChild(chevron);
    header.appendChild(label);
    header.addEventListener('click', () => store.toggleSection(def.id));

    const bodyEl = document.createElement('div');
    bodyEl.className = 'sc-section-body';

    const inner = def.factory();
    bodyEl.appendChild(inner.element);

    section.appendChild(header);
    section.appendChild(bodyEl);
    root.appendChild(section);

    sections.push({ id: def.id, chevron, bodyEl, inner });
  }

  function update(state: ScoringEditorState): void {
    for (const s of sections) {
      const isExpanded = state.expandedSections.has(s.id);
      s.chevron.textContent = isExpanded ? '▾' : '▸';
      s.bodyEl.style.display = isExpanded ? 'block' : 'none';
      if (isExpanded) s.inner.update(state);
    }
  }

  return { element: root, update };
}
