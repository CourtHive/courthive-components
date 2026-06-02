/**
 * Seeding Editor Panel — Accordion section assembly.
 *
 * Creates the 4 sections as collapsible accordions. Mirrors
 * buildSchedulingEditorPanel.
 */

import type { SeedingEditorState, SeedingEditorSection, SeedingEditorConfig } from './types';
import type { SeedingEditorStore } from './seedingEditorStore';
import { buildProfileSection } from './sections/profileSection';
import { buildFlagsSection } from './sections/flagsSection';
import { buildThresholdsSection } from './sections/thresholdsSection';
import { buildDrawTypeOverridesSection } from './sections/drawTypeOverridesSection';
import {
  sdEditorStyle,
  sdSectionStyle,
  sdSectionHeaderStyle,
  sdSectionChevronStyle,
  sdSectionBodyStyle
} from './styles';

interface SectionDef {
  id: SeedingEditorSection;
  label: string;
  factory: () => { element: HTMLElement; update(state: SeedingEditorState): void };
}

export function buildSeedingEditorPanel(
  store: SeedingEditorStore,
  config: SeedingEditorConfig
): {
  element: HTMLElement;
  update(state: SeedingEditorState): void;
} {
  const root = document.createElement('div');
  root.className = sdEditorStyle();

  const sectionDefs: SectionDef[] = [
    { id: 'profile', label: 'Profile', factory: () => buildProfileSection(store) },
    { id: 'flags', label: 'Flags', factory: () => buildFlagsSection(store) },
    { id: 'thresholds', label: 'Seed Count Thresholds', factory: () => buildThresholdsSection(store) },
    {
      id: 'drawTypeOverrides',
      label: 'Draw Type Overrides',
      factory: () => buildDrawTypeOverridesSection(store, config)
    }
  ];

  const sections: {
    id: SeedingEditorSection;
    chevron: HTMLElement;
    bodyEl: HTMLElement;
    inner: { element: HTMLElement; update(state: SeedingEditorState): void };
  }[] = [];

  for (const def of sectionDefs) {
    const section = document.createElement('div');
    section.className = sdSectionStyle();

    const header = document.createElement('div');
    header.className = sdSectionHeaderStyle();

    const chevron = document.createElement('span');
    chevron.className = sdSectionChevronStyle();

    const label = document.createElement('span');
    label.textContent = def.label;

    header.appendChild(chevron);
    header.appendChild(label);
    header.addEventListener('click', () => store.toggleSection(def.id));

    const bodyEl = document.createElement('div');
    bodyEl.className = sdSectionBodyStyle();

    const inner = def.factory();
    bodyEl.appendChild(inner.element);

    section.appendChild(header);
    section.appendChild(bodyEl);
    root.appendChild(section);

    sections.push({ id: def.id, chevron, bodyEl, inner });
  }

  function update(state: SeedingEditorState): void {
    for (const s of sections) {
      const isExpanded = state.expandedSections.has(s.id);
      s.chevron.textContent = isExpanded ? '▼' : '▶';
      s.bodyEl.style.display = isExpanded ? 'block' : 'none';
      if (isExpanded) {
        s.inner.update(state);
      }
    }
  }

  return { element: root, update };
}
