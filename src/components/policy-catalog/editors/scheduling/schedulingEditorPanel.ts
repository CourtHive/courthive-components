/**
 * Scheduling Editor Panel — Accordion section assembly.
 *
 * Creates all 5 sections as collapsible accordions.
 */

import type { SchedulingEditorState, SchedulingEditorSection, SchedulingEditorConfig } from './types';
import type { SchedulingEditorStore } from './schedulingEditorStore';
import { buildModificationFlagsSection } from './sections/modificationFlagsSection';
import { buildDailyLimitsSection } from './sections/dailyLimitsSection';
import { buildDefaultTimesSection } from './sections/defaultTimesSection';
import { buildAverageTimesSection } from './sections/averageTimesSection';
import { buildRecoveryTimesSection } from './sections/recoveryTimesSection';
import { seEditorStyle, seSectionStyle, seSectionHeaderStyle, seSectionChevronStyle, seSectionBodyStyle } from './styles';

interface SectionDef {
  id: SchedulingEditorSection;
  label: string;
  factory: () => { element: HTMLElement; update(state: SchedulingEditorState): void };
}

export function buildSchedulingEditorPanel(
  store: SchedulingEditorStore,
  config: SchedulingEditorConfig,
): {
  element: HTMLElement;
  update(state: SchedulingEditorState): void;
} {
  const root = document.createElement('div');
  root.className = seEditorStyle();

  const sectionDefs: SectionDef[] = [
    { id: 'modificationFlags', label: 'Modification Flags', factory: () => buildModificationFlagsSection(store) },
    { id: 'dailyLimits', label: 'Daily Limits', factory: () => buildDailyLimitsSection(store) },
    { id: 'defaultTimes', label: 'Default Times', factory: () => buildDefaultTimesSection(store) },
    { id: 'averageTimes', label: 'Match Average Times', factory: () => buildAverageTimesSection(store, config) },
    { id: 'recoveryTimes', label: 'Match Recovery Times', factory: () => buildRecoveryTimesSection(store, config) },
  ];

  const sections: {
    id: SchedulingEditorSection;
    chevron: HTMLElement;
    bodyEl: HTMLElement;
    inner: { element: HTMLElement; update(state: SchedulingEditorState): void };
  }[] = [];

  for (const def of sectionDefs) {
    const section = document.createElement('div');
    section.className = seSectionStyle();

    const header = document.createElement('div');
    header.className = seSectionHeaderStyle();

    const chevron = document.createElement('span');
    chevron.className = seSectionChevronStyle();

    const label = document.createElement('span');
    label.textContent = def.label;

    header.appendChild(chevron);
    header.appendChild(label);
    header.addEventListener('click', () => store.toggleSection(def.id));

    const bodyEl = document.createElement('div');
    bodyEl.className = seSectionBodyStyle();

    const inner = def.factory();
    bodyEl.appendChild(inner.element);

    section.appendChild(header);
    section.appendChild(bodyEl);
    root.appendChild(section);

    sections.push({ id: def.id, chevron, bodyEl, inner });
  }

  function update(state: SchedulingEditorState): void {
    for (const s of sections) {
      const isExpanded = state.expandedSections.has(s.id);
      s.chevron.textContent = isExpanded ? '\u25BC' : '\u25B6';
      s.bodyEl.style.display = isExpanded ? 'block' : 'none';
      if (isExpanded) {
        s.inner.update(state);
      }
    }
  }

  return { element: root, update };
}
