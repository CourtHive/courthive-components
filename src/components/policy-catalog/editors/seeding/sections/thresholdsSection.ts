/**
 * Seed Count Thresholds Section — Editable table of
 * { drawSize, minimumParticipantCount, seedsCount } rows.
 *
 * Factory consumer: getSeedsCount() in
 * factory/src/query/drawDefinition/getSeedsCount.ts.
 */

import type { SeedingEditorState, SeedsCountThreshold } from '../types';
import type { SeedingEditorStore } from '../seedingEditorStore';
import {
  sdAddBtnStyle,
  sdRemoveBtnStyle,
  sdSortBtnStyle,
  sdTableStyle,
  sdTableWrapStyle,
  sdActionsRowStyle,
  sdEmptyStyle,
  sdNumberCellInputStyle
} from '../styles';

type FieldKey = keyof SeedsCountThreshold;

const COLUMNS: { field: FieldKey; label: string; min: number; placeholder?: string }[] = [
  { field: 'drawSize', label: 'Draw size', min: 2, placeholder: '32' },
  { field: 'minimumParticipantCount', label: 'Min participants', min: 0, placeholder: '24' },
  { field: 'seedsCount', label: 'Seeds', min: 0, placeholder: '8' }
];

export function buildThresholdsSection(store: SeedingEditorStore): {
  element: HTMLElement;
  update(state: SeedingEditorState): void;
} {
  const root = document.createElement('div');

  const wrap = document.createElement('div');
  wrap.className = sdTableWrapStyle();

  const table = document.createElement('table');
  table.className = sdTableStyle();

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of COLUMNS) {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  }
  const actionsTh = document.createElement('th');
  actionsTh.setAttribute('aria-label', 'Actions');
  headerRow.appendChild(actionsTh);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  wrap.appendChild(table);
  root.appendChild(wrap);

  const emptyEl = document.createElement('div');
  emptyEl.className = sdEmptyStyle();
  emptyEl.textContent = 'No seed-count thresholds defined. Add a row to configure seeds per draw size.';
  root.appendChild(emptyEl);

  const actions = document.createElement('div');
  actions.className = sdActionsRowStyle();

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = sdAddBtnStyle();
  addBtn.textContent = '+ Add threshold';
  addBtn.addEventListener('click', () => store.addThreshold());

  const sortBtn = document.createElement('button');
  sortBtn.type = 'button';
  sortBtn.className = sdSortBtnStyle();
  sortBtn.textContent = 'Sort by draw size';
  sortBtn.addEventListener('click', () => store.sortThresholds());

  actions.appendChild(addBtn);
  actions.appendChild(sortBtn);
  root.appendChild(actions);

  function update(state: SeedingEditorState): void {
    const rows = state.draft.seedsCountThresholds ?? [];
    tbody.innerHTML = '';

    if (rows.length === 0) {
      table.style.display = 'none';
      emptyEl.style.display = 'block';
      sortBtn.disabled = true;
      return;
    }

    table.style.display = '';
    emptyEl.style.display = 'none';
    sortBtn.disabled = rows.length < 2;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const tr = document.createElement('tr');

      for (const col of COLUMNS) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.min = String(col.min);
        input.className = sdNumberCellInputStyle();
        input.value = String(row[col.field]);
        if (col.placeholder) input.placeholder = col.placeholder;
        const rowIndex = i;
        const fieldKey = col.field;
        input.addEventListener('change', () => {
          const parsed = parseInt(input.value, 10);
          if (!isNaN(parsed) && parsed >= col.min) {
            store.setThresholdField(rowIndex, fieldKey, parsed);
          } else {
            // Revert to last known good value
            input.value = String(row[col.field]);
          }
        });
        td.appendChild(input);
        tr.appendChild(td);
      }

      const actionsTd = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = sdRemoveBtnStyle();
      removeBtn.setAttribute('aria-label', `Remove threshold row ${i + 1}`);
      removeBtn.textContent = '×';
      const rowIndexForRemove = i;
      removeBtn.addEventListener('click', () => store.removeThreshold(rowIndexForRemove));
      actionsTd.appendChild(removeBtn);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    }
  }

  return { element: root, update };
}
