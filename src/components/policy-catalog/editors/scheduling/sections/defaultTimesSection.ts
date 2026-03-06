/**
 * Default Times Section — Fallback average + recovery times with optional doubles override.
 * Uses text inputs with real-time validation.
 */

import type { SchedulingEditorState } from '../types';
import type { SchedulingEditorStore } from '../schedulingEditorStore';
import { seFieldRowStyle, seFieldLabelStyle, seFieldInputStyle, seFieldUnitStyle } from '../styles';

function isValidMinutes(value: string): boolean {
  if (value === '') return true;
  const n = parseInt(value, 10);
  return !isNaN(n) && n >= 0 && String(n) === value.trim();
}

function applyValidation(input: HTMLInputElement, value: string, allowEmpty: boolean): void {
  if (value === '' && allowEmpty) {
    input.classList.remove('is-success', 'is-danger');
    return;
  }
  if (isValidMinutes(value) && (value !== '' || allowEmpty)) {
    input.classList.remove('is-danger');
    input.classList.add('is-success');
  } else {
    input.classList.remove('is-success');
    input.classList.add('is-danger');
  }
}

export function buildDefaultTimesSection(store: SchedulingEditorStore): {
  element: HTMLElement;
  update(state: SchedulingEditorState): void;
} {
  const root = document.createElement('div');

  // Average times header
  const avgHeader = document.createElement('div');
  avgHeader.style.cssText = 'font-size:11px;font-weight:700;color:var(--sp-muted);margin-bottom:6px;';
  avgHeader.textContent = 'Default Average Times';
  root.appendChild(avgHeader);

  const avgDefaultRow = createFieldRow('Default', 'min', false);
  const avgDoublesRow = createFieldRow('Doubles override', 'min', true);
  root.appendChild(avgDefaultRow.row);
  root.appendChild(avgDoublesRow.row);

  avgDefaultRow.input.addEventListener('input', () => {
    applyValidation(avgDefaultRow.input, avgDefaultRow.input.value, false);
  });
  avgDefaultRow.input.addEventListener('change', () => {
    const val = parseInt(avgDefaultRow.input.value, 10);
    if (!isNaN(val) && val >= 0) store.setDefaultAverageTime(0, 'default', val);
  });

  avgDoublesRow.input.addEventListener('input', () => {
    applyValidation(avgDoublesRow.input, avgDoublesRow.input.value, true);
  });
  avgDoublesRow.input.addEventListener('change', () => {
    const raw = avgDoublesRow.input.value.trim();
    if (raw === '' || raw === '-') {
      store.setDefaultAverageTime(0, 'DOUBLES', undefined);
    } else {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= 0) store.setDefaultAverageTime(0, 'DOUBLES', val);
    }
  });

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.height = '12px';
  root.appendChild(spacer);

  // Recovery times header
  const recHeader = document.createElement('div');
  recHeader.style.cssText = 'font-size:11px;font-weight:700;color:var(--sp-muted);margin-bottom:6px;';
  recHeader.textContent = 'Default Recovery Times';
  root.appendChild(recHeader);

  const recDefaultRow = createFieldRow('Default', 'min', false);
  const recDoublesRow = createFieldRow('Doubles override', 'min', true);
  root.appendChild(recDefaultRow.row);
  root.appendChild(recDoublesRow.row);

  recDefaultRow.input.addEventListener('input', () => {
    applyValidation(recDefaultRow.input, recDefaultRow.input.value, false);
  });
  recDefaultRow.input.addEventListener('change', () => {
    const val = parseInt(recDefaultRow.input.value, 10);
    if (!isNaN(val) && val >= 0) store.setDefaultRecoveryTime(0, 'default', val);
  });

  recDoublesRow.input.addEventListener('input', () => {
    applyValidation(recDoublesRow.input, recDoublesRow.input.value, true);
  });
  recDoublesRow.input.addEventListener('change', () => {
    const raw = recDoublesRow.input.value.trim();
    if (raw === '' || raw === '-') {
      store.setDefaultRecoveryTime(0, 'DOUBLES', undefined);
    } else {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= 0) store.setDefaultRecoveryTime(0, 'DOUBLES', val);
    }
  });

  function update(state: SchedulingEditorState): void {
    const avg = state.draft.defaultTimes?.averageTimes?.[0];
    if (document.activeElement !== avgDefaultRow.input) {
      avgDefaultRow.input.value = avg ? String(avg.minutes.default) : '';
    }
    if (document.activeElement !== avgDoublesRow.input) {
      avgDoublesRow.input.value = avg?.minutes.DOUBLES !== undefined ? String(avg.minutes.DOUBLES) : '';
    }
    avgDoublesRow.input.placeholder = '\u2014';

    const rec = state.draft.defaultTimes?.recoveryTimes?.[0];
    if (document.activeElement !== recDefaultRow.input) {
      recDefaultRow.input.value = rec ? String(rec.minutes.default) : '';
    }
    if (document.activeElement !== recDoublesRow.input) {
      recDoublesRow.input.value = rec?.minutes.DOUBLES !== undefined ? String(rec.minutes.DOUBLES) : '';
    }
    recDoublesRow.input.placeholder = '\u2014';
  }

  return { element: root, update };
}

function createFieldRow(label: string, unit: string, allowEmpty: boolean): {
  row: HTMLElement;
  input: HTMLInputElement;
} {
  const row = document.createElement('div');
  row.className = seFieldRowStyle();

  const lbl = document.createElement('div');
  lbl.className = seFieldLabelStyle();
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = seFieldInputStyle();
  input.placeholder = allowEmpty ? '\u2014' : '0';

  const unitEl = document.createElement('div');
  unitEl.className = seFieldUnitStyle();
  unitEl.textContent = unit;

  row.appendChild(lbl);
  row.appendChild(input);
  row.appendChild(unitEl);

  return { row, input };
}
