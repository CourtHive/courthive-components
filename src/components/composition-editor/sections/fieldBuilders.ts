/**
 * Reusable field builder helpers for composition editor sections.
 * Each returns an HTMLElement ready to append.
 */
import {
  ceField,
  ceFieldLabel,
  ceFieldControl,
  ceToggle,
  ceToggleTrack,
  ceSelect,
  ceTextInput,
  ceColorInput,
} from '../styles';

export function buildToggleField(
  label: string,
  checked: boolean,
  onChange: (val: boolean) => void,
  disabled = false,
): { element: HTMLElement; setChecked: (v: boolean) => void } {
  const row = document.createElement('div');
  row.className = ceField();

  const labelEl = document.createElement('span');
  labelEl.className = ceFieldLabel();
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const toggle = document.createElement('label');
  toggle.className = ceToggle();

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener('change', () => onChange(input.checked));

  const track = document.createElement('span');
  track.className = ceToggleTrack();

  toggle.appendChild(input);
  toggle.appendChild(track);

  const controlWrap = document.createElement('div');
  controlWrap.className = ceFieldControl();
  controlWrap.appendChild(toggle);
  row.appendChild(controlWrap);

  return {
    element: row,
    setChecked: (v: boolean) => {
      input.checked = v;
    },
  };
}

export function buildSelectField(
  label: string,
  options: Array<{ value: string; label: string }>,
  currentValue: string,
  onChange: (val: string) => void,
  disabled = false,
): { element: HTMLElement; setValue: (v: string) => void } {
  const row = document.createElement('div');
  row.className = ceField();

  const labelEl = document.createElement('span');
  labelEl.className = ceFieldLabel();
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const select = document.createElement('select');
  select.className = ceSelect();
  select.disabled = disabled;

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === currentValue) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => onChange(select.value));

  const controlWrap = document.createElement('div');
  controlWrap.className = ceFieldControl();
  controlWrap.appendChild(select);
  row.appendChild(controlWrap);

  return {
    element: row,
    setValue: (v: string) => {
      select.value = v;
    },
  };
}

export function buildTextInputField(
  label: string,
  currentValue: string,
  onChange: (val: string) => void,
  placeholder = '',
  disabled = false,
): { element: HTMLElement; setValue: (v: string) => void } {
  const row = document.createElement('div');
  row.className = ceField();

  const labelEl = document.createElement('span');
  labelEl.className = ceFieldLabel();
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = ceTextInput();
  input.value = currentValue;
  input.placeholder = placeholder;
  input.disabled = disabled;
  input.addEventListener('input', () => onChange(input.value));

  const controlWrap = document.createElement('div');
  controlWrap.className = ceFieldControl();
  controlWrap.appendChild(input);
  row.appendChild(controlWrap);

  return {
    element: row,
    setValue: (v: string) => {
      input.value = v;
    },
  };
}

export function buildColorField(
  label: string,
  currentValue: string,
  onChange: (val: string) => void,
  disabled = false,
): { element: HTMLElement; setValue: (v: string) => void } {
  const row = document.createElement('div');
  row.className = ceField();

  const labelEl = document.createElement('span');
  labelEl.className = ceFieldLabel();
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = 'color';
  input.className = ceColorInput();
  input.value = currentValue || '#000000';
  input.disabled = disabled;
  input.addEventListener('input', () => onChange(input.value));

  const controlWrap = document.createElement('div');
  controlWrap.className = ceFieldControl();
  controlWrap.appendChild(input);
  row.appendChild(controlWrap);

  return {
    element: row,
    setValue: (v: string) => {
      input.value = v || '#000000';
    },
  };
}
