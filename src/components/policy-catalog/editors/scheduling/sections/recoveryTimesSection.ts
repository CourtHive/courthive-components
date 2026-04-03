/**
 * Recovery Times Section — Format groups with category overrides for match recovery times.
 * Same structure as averageTimes, emphasis on categoryTypes (age-group correlation).
 */

import type { SchedulingEditorState, SchedulingEditorConfig } from '../types';
import type { SchedulingEditorStore } from '../schedulingEditorStore';
import { buildFormatTimeRow } from './formatTimeRow';
import { seAddBtnStyle } from '../styles';

export function buildRecoveryTimesSection(
  store: SchedulingEditorStore,
  config: SchedulingEditorConfig
): {
  element: HTMLElement;
  update(state: SchedulingEditorState): void;
} {
  const root = document.createElement('div');

  const groupsContainer = document.createElement('div');
  root.appendChild(groupsContainer);

  const addGroupBtn = document.createElement('button');
  addGroupBtn.className = seAddBtnStyle();
  addGroupBtn.textContent = '+ Add Format Group';
  addGroupBtn.type = 'button';
  addGroupBtn.addEventListener('click', () => store.addRecoveryFormatGroup());
  root.appendChild(addGroupBtn);

  function update(state: SchedulingEditorState): void {
    groupsContainer.innerHTML = '';
    const groups = state.draft.matchUpRecoveryTimes ?? [];

    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const overrides = group.recoveryTimes.map((rt, idx) => {
        const cats = rt.categoryTypes ?? rt.categoryNames ?? [];
        return {
          categoryLabel: cats.length === 0 && idx === 0 ? 'All categories' : cats.join(', ') || 'All categories',
          isDefault: cats.length === 0 && idx === 0,
          defaultMinutes: rt.minutes.default,
          doublesMinutes: rt.minutes.DOUBLES
        };
      });

      const groupIdx = g;
      const row = buildFormatTimeRow({
        formatCodes: group.matchUpFormatCodes,
        overrides,
        availableFormats: config.matchUpFormatCodes ?? getDefaultFormatCodes(),
        onFormatCodesChange: (codes) => store.setRecoveryFormatCodes(groupIdx, codes),
        onTimeChange: (overrideIndex, field, value) => store.setRecoveryTime(groupIdx, overrideIndex, field, value),
        onAddOverride: () => store.addRecoveryCategoryOverride(groupIdx),
        onRemoveOverride: (idx) => store.removeRecoveryCategoryOverride(groupIdx, idx),
        onRemoveGroup: () => store.removeRecoveryFormatGroup(groupIdx)
      });

      groupsContainer.appendChild(row);
    }

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--sp-muted);padding:8px 0;';
      empty.textContent =
        'No format-specific recovery times configured. Add a format group to set per-format recovery.';
      groupsContainer.appendChild(empty);
    }
  }

  return { element: root, update };
}

function getDefaultFormatCodes(): string[] {
  return [
    'SET3-S:6/TB7',
    'SET3-S:6/TB7-F:TB10',
    'SET3-S:6/TB7-F:TB7',
    'SET3-S:4NOAD-F:TB7',
    'SET3-S:4/TB7',
    'SET3-S:4/TB7-F:TB7',
    'SET3-S:4/TB7-F:TB10',
    'SET3-S:4/TB5@3',
    'SET1-S:8/TB7',
    'SET1-S:8/TB7@7',
    'SET1-S:5/TB9@4',
    'SET1-S:6/TB7',
    'SET1-S:6NOAD',
    'SET1-S:4/TB7',
    'SET1-S:4/TB5@3',
    'SET1-S:4NOAD',
    'SET3-S:TB10',
    'SET1-S:T20',
    'SET1-S:TB10'
  ];
}
