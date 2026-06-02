/**
 * Draw Type Overrides Section — Per-drawType positioning override.
 *
 * Editable rows of (drawType → positioning). Drawn from
 * seedingProfile.drawTypes in the policy draft.
 */

import type { SeedingEditorConfig, SeedingEditorState, SeedingPositioning } from '../types';
import type { SeedingEditorStore } from '../seedingEditorStore';
import { DRAW_TYPE_OPTIONS, POSITIONING_OPTIONS } from '../domain/seedingProjections';
import {
  sdAddBtnStyle,
  sdActionsRowStyle,
  sdEmptyStyle,
  sdOverrideAddRowStyle,
  sdOverrideRowStyle,
  sdRemoveBtnStyle,
  sdSelectStyle,
  sdOverrideDrawTypeStyle
} from '../styles';

function buildPositioningSelect(value: SeedingPositioning, onChange: (v: SeedingPositioning) => void): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = sdSelectStyle();
  for (const opt of POSITIONING_OPTIONS) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value as SeedingPositioning));
  return select;
}

export function buildDrawTypeOverridesSection(
  store: SeedingEditorStore,
  config: SeedingEditorConfig
): {
  element: HTMLElement;
  update(state: SeedingEditorState): void;
} {
  const root = document.createElement('div');
  const drawTypeOptions = config.drawTypes ?? DRAW_TYPE_OPTIONS;

  const rowsContainer = document.createElement('div');
  root.appendChild(rowsContainer);

  const emptyEl = document.createElement('div');
  emptyEl.className = sdEmptyStyle();
  emptyEl.textContent = 'No draw-type overrides. The default positioning is used for every drawType.';
  root.appendChild(emptyEl);

  // Add-row picker (drawType select + add button)
  const addRow = document.createElement('div');
  addRow.className = sdOverrideAddRowStyle();

  const drawTypeSelect = document.createElement('select');
  drawTypeSelect.className = sdSelectStyle();

  function rebuildDrawTypeOptions(currentDraftDrawTypes: Set<string>): void {
    drawTypeSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select drawType…';
    drawTypeSelect.appendChild(placeholder);
    for (const dt of drawTypeOptions) {
      if (currentDraftDrawTypes.has(dt)) continue;
      const opt = document.createElement('option');
      opt.value = dt;
      opt.textContent = dt;
      drawTypeSelect.appendChild(opt);
    }
  }

  const positioningSelect = buildPositioningSelect('WATERFALL', () => {
    /* handled on add-click */
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = sdAddBtnStyle();
  addBtn.textContent = '+ Add override';
  addBtn.addEventListener('click', () => {
    const drawType = drawTypeSelect.value;
    if (!drawType) return;
    store.addDrawTypeOverride(drawType, positioningSelect.value as SeedingPositioning);
  });

  const addActions = document.createElement('div');
  addActions.className = sdActionsRowStyle();
  addActions.appendChild(drawTypeSelect);
  addActions.appendChild(positioningSelect);
  addActions.appendChild(addBtn);
  addRow.appendChild(addActions);

  root.appendChild(addRow);

  function update(state: SeedingEditorState): void {
    const drawTypes = state.draft.seedingProfile?.drawTypes ?? {};
    const entries = Object.entries(drawTypes);

    rowsContainer.innerHTML = '';
    if (entries.length === 0) {
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
      for (const [drawType, { positioning }] of entries) {
        const row = document.createElement('div');
        row.className = sdOverrideRowStyle();

        const name = document.createElement('div');
        name.className = sdOverrideDrawTypeStyle();
        name.textContent = drawType;

        const select = buildPositioningSelect(positioning, (v) => store.setDrawTypeOverridePositioning(drawType, v));

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = sdRemoveBtnStyle();
        removeBtn.setAttribute('aria-label', `Remove override for ${drawType}`);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => store.removeDrawTypeOverride(drawType));

        row.appendChild(name);
        row.appendChild(select);
        row.appendChild(removeBtn);
        rowsContainer.appendChild(row);
      }
    }

    // Refresh add-picker options so already-used drawTypes are filtered out
    rebuildDrawTypeOptions(new Set(Object.keys(drawTypes)));
    addBtn.disabled = drawTypeSelect.options.length <= 1;
  }

  return { element: root, update };
}
