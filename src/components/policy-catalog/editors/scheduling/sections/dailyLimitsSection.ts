/**
 * Daily Limits Section — 3 inline text inputs (singles/doubles/total)
 * with real-time validation.
 */

import type { SchedulingEditorState } from '../types';
import type { SchedulingEditorStore } from '../schedulingEditorStore';
import { seFieldRowStyle, seFieldLabelStyle, seFieldInputStyle } from '../styles';

const IS_SUCCESS = 'is-success';
const IS_DANGER = 'is-danger';

function isValidLimit(value: string): boolean {
  if (value === '') return true;
  const n = parseInt(value, 10);
  return !isNaN(n) && n >= 0 && String(n) === value.trim();
}

function applyValidation(input: HTMLInputElement, value: string): void {
  if (value === '') {
    input.classList.remove(IS_SUCCESS, IS_DANGER);
    return;
  }
  if (isValidLimit(value)) {
    input.classList.remove(IS_DANGER);
    input.classList.add(IS_SUCCESS);
  } else {
    input.classList.remove(IS_SUCCESS);
    input.classList.add(IS_DANGER);
  }
}

export function buildDailyLimitsSection(store: SchedulingEditorStore): {
  element: HTMLElement;
  update(state: SchedulingEditorState): void;
} {
  const root = document.createElement('div');

  const fields: { key: 'SINGLES' | 'DOUBLES' | 'total'; label: string; input: HTMLInputElement }[] = [];

  for (const [key, label] of [
    ['SINGLES', 'Singles limit'],
    ['DOUBLES', 'Doubles limit'],
    ['total', 'Total limit'],
  ] as const) {
    const row = document.createElement('div');
    row.className = seFieldRowStyle();

    const lbl = document.createElement('div');
    lbl.className = seFieldLabelStyle();
    lbl.textContent = label;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = seFieldInputStyle();
    input.placeholder = '0';
    input.addEventListener('input', () => {
      applyValidation(input, input.value);
    });
    input.addEventListener('change', () => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val >= 0) store.setDailyLimit(key, val);
    });

    row.appendChild(lbl);
    row.appendChild(input);
    root.appendChild(row);

    fields.push({ key, label, input });
  }

  function update(state: SchedulingEditorState): void {
    const limits = state.draft.defaultDailyLimits;
    for (const f of fields) {
      const val = limits?.[f.key];
      if (document.activeElement !== f.input) {
        f.input.value = val !== undefined ? String(val) : '';
      }
    }
  }

  return { element: root, update };
}
