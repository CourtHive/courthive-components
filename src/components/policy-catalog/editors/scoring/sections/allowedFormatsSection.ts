/**
 * "Allowed match-up formats" section — a structured row list.
 *
 * Each row carries three fields the MatchUp Format Dialog needs to
 * surface a policy-defined format as a labeled option:
 *
 *   Name (short label)  |  Format (code)  |  Description (sub-text)  |  ×
 *
 * Empty list = no restriction. The format input lights up green / red
 * as the operator types, based on matchUpFormatCode.parse. Pasting a
 * preset (via the "From preset…" picker) seeds all three fields at
 * once and the format-code validity carries over.
 */

import { matchUpFormatCode } from 'tods-competition-factory';
import type { ScoringEditorState, MatchUpFormatEntry } from '../types';
import type { ScoringEditorStore } from '../scoringEditorStore';
import {
  MATCH_UP_FORMAT_PRESETS,
  formatStringOf,
  formatNameOf,
  formatDescriptionOf,
} from '../domain/scoringProjections';

interface RowHandle {
  element: HTMLElement;
  setEntry(entry: MatchUpFormatEntry | string): void;
  setIndex(next: number): void;
  destroy(): void;
}

export function buildAllowedFormatsSection(store: ScoringEditorStore): {
  element: HTMLElement;
  update(state: ScoringEditorState): void;
} {
  const root = document.createElement('div');
  root.className = 'sc-section-body-inner';

  const help = document.createElement('div');
  help.className = 'sc-field-help';
  help.textContent =
    'Restrict which formats events under this policy can use. Each entry surfaces in the MatchUp Format Dialog using Name as the dropdown label and Description as the sub-text. Empty list = no restriction.';
  root.appendChild(help);

  // Column header row — kept simple so it tracks the row layout in CSS.
  const headerRow = document.createElement('div');
  headerRow.className = 'sc-format-list-header';
  headerRow.appendChild(headerLabel('Name'));
  headerRow.appendChild(headerLabel('Format'));
  headerRow.appendChild(headerLabel('Description'));
  headerRow.appendChild(headerLabel('')); // remove-button column
  root.appendChild(headerRow);

  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'sc-format-list-rows';
  root.appendChild(rowsWrap);

  const emptyEl = document.createElement('div');
  emptyEl.className = 'sc-format-list-empty';
  emptyEl.textContent = 'No allowed formats — any format will be accepted.';
  root.appendChild(emptyEl);

  // Action row — "+ Add" + preset picker.
  const actionsRow = document.createElement('div');
  actionsRow.className = 'sc-format-list-actions';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline';
  addBtn.textContent = '+ Add format';
  addBtn.addEventListener('click', () => store.addAllowedFormat());

  const presetSelect = document.createElement('select');
  presetSelect.className = 'sc-format-list-preset-picker';
  const presetPlaceholder = document.createElement('option');
  presetPlaceholder.value = '';
  presetPlaceholder.textContent = 'Add from preset…';
  presetSelect.appendChild(presetPlaceholder);
  for (const preset of MATCH_UP_FORMAT_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset.format;
    opt.textContent = preset.description ? `${preset.label} — ${preset.description}` : preset.label;
    presetSelect.appendChild(opt);
  }
  presetSelect.addEventListener('change', () => {
    const value = presetSelect.value;
    if (!value) return;
    const preset = MATCH_UP_FORMAT_PRESETS.find((p) => p.format === value);
    if (preset) {
      store.addAllowedFormat({
        matchUpFormat: preset.format,
        name: preset.label,
        description: preset.description,
      });
    }
    presetSelect.value = '';
  });

  actionsRow.appendChild(addBtn);
  actionsRow.appendChild(presetSelect);
  root.appendChild(actionsRow);

  if (store.isReadonly()) {
    addBtn.disabled = true;
    presetSelect.disabled = true;
  }

  // Row pool — reuse existing row DOM when the array length stays the
  // same, so input focus survives store-emitted re-renders. Re-create
  // when length differs.
  let rows: RowHandle[] = [];

  function syncRows(entries: (MatchUpFormatEntry | string)[]): void {
    emptyEl.style.display = entries.length === 0 ? '' : 'none';
    headerRow.style.display = entries.length === 0 ? 'none' : '';

    // Trim excess rows.
    while (rows.length > entries.length) {
      const r = rows.pop();
      r?.destroy();
    }
    // Add new rows.
    while (rows.length < entries.length) {
      const index = rows.length;
      const row = buildRow(store, index);
      rowsWrap.appendChild(row.element);
      rows.push(row);
    }
    // Refresh all rows' indexes + values.
    for (let i = 0; i < entries.length; i += 1) {
      rows[i].setIndex(i);
      rows[i].setEntry(entries[i]);
    }
  }

  syncRows(store.getData().matchUpFormats ?? []);

  function update(state: ScoringEditorState): void {
    syncRows(state.draft.matchUpFormats ?? []);
  }

  return { element: root, update };
}

function headerLabel(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'sc-format-list-header-label';
  el.textContent = text;
  return el;
}

function buildRow(store: ScoringEditorStore, initialIndex: number): RowHandle {
  let index = initialIndex;
  const readonly = store.isReadonly();

  const row = document.createElement('div');
  row.className = 'sc-format-list-row';

  const nameInput = textInput('Standard', readonly);
  const formatInput = textInput('SET3-S:6/TB7', readonly);
  formatInput.classList.add('sc-format-list-format-input');
  const descInput = textInput('Best of 3 sets, TB7 at 6-6', readonly);

  const validityChip = document.createElement('span');
  validityChip.className = 'sc-format-list-validity';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'sc-format-list-row-remove';
  removeBtn.setAttribute('aria-label', 'Remove format');
  removeBtn.textContent = '×';
  if (readonly) removeBtn.disabled = true;
  removeBtn.addEventListener('click', () => store.removeAllowedFormat(index));

  const formatCell = document.createElement('div');
  formatCell.className = 'sc-format-list-format-cell';
  formatCell.appendChild(formatInput);
  formatCell.appendChild(validityChip);

  row.appendChild(nameInput);
  row.appendChild(formatCell);
  row.appendChild(descInput);
  row.appendChild(removeBtn);

  // Hook inputs to store. Use input event so the live validity chip
  // tracks the user's typing; the store update fires onChange on
  // every keystroke, mirroring the other typed editors.
  nameInput.addEventListener('input', () => store.setAllowedFormatField(index, 'name', nameInput.value));
  formatInput.addEventListener('input', () => {
    store.setAllowedFormatField(index, 'matchUpFormat', formatInput.value);
    refreshValidity();
  });
  descInput.addEventListener('input', () =>
    store.setAllowedFormatField(index, 'description', descInput.value),
  );

  function refreshValidity(): void {
    const value = formatInput.value.trim();
    if (!value) {
      validityChip.textContent = '';
      validityChip.dataset.state = 'empty';
      return;
    }
    const parsed = matchUpFormatCode.parse?.(value);
    if (parsed) {
      validityChip.textContent = '✓';
      validityChip.dataset.state = 'valid';
    } else {
      validityChip.textContent = '✗';
      validityChip.dataset.state = 'invalid';
    }
  }

  return {
    element: row,
    setEntry(entry) {
      const nextName = formatNameOf(entry);
      const nextFormat = formatStringOf(entry);
      const nextDescription = formatDescriptionOf(entry);
      // Avoid clobbering focus + caret on re-renders — only assign
      // when value actually differs.
      if (nameInput.value !== nextName) nameInput.value = nextName;
      if (formatInput.value !== nextFormat) formatInput.value = nextFormat;
      if (descInput.value !== nextDescription) descInput.value = nextDescription;
      refreshValidity();
    },
    setIndex(next) {
      index = next;
    },
    destroy() {
      row.remove();
    },
  };
}

function textInput(placeholder: string, readonly: boolean): HTMLInputElement {
  const el = document.createElement('input');
  el.type = 'text';
  el.className = 'sc-format-list-input';
  el.placeholder = placeholder;
  if (readonly) el.disabled = true;
  return el;
}
