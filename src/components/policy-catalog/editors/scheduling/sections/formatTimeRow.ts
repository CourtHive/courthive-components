/**
 * Format Time Row — Reusable card for one format group.
 *
 * Format codes are added via the matchUpFormat modal editor.
 * Tags display existing codes with remove buttons.
 */

import { getMatchUpFormatModal } from '../../../../matchUpFormat/matchUpFormat';
import { formatCodeLabel } from '../domain/schedulingProjections';
import {
  seFormatGroupStyle,
  seFormatGroupHeaderStyle,
  seFormatGroupLabelStyle,
  seTagPickerStyle,
  seTagStyle,
  seTagRemoveStyle,
  seTagAddWrapStyle,
  seTagAddBtnStyle,
  seOverrideRowStyle,
  seOverrideCategoriesStyle,
  seFieldInputStyle,
  seFieldUnitStyle,
  seOverrideRemoveStyle,
  seAddBtnStyle,
  seRemoveGroupBtnStyle
} from '../styles';

export interface FormatTimeRowConfig {
  formatCodes: string[];
  overrides: {
    categoryLabel: string;
    isDefault: boolean;
    defaultMinutes: number;
    doublesMinutes?: number;
  }[];
  availableFormats: string[];
  onFormatCodesChange: (codes: string[]) => void;
  onTimeChange: (overrideIndex: number, field: 'default' | 'DOUBLES', value: number | undefined) => void;
  onAddOverride: () => void;
  onRemoveOverride: (index: number) => void;
  onRemoveGroup: () => void;
}

const IS_SUCCESS = 'is-success';
const IS_DANGER = 'is-danger';

function isValidMinutes(value: string): boolean {
  if (value === '') return true;
  const n = parseInt(value, 10);
  return !isNaN(n) && n >= 0 && String(n) === value.trim();
}

function applyValidation(input: HTMLInputElement, value: string, allowEmpty: boolean): void {
  if (value === '' && allowEmpty) {
    input.classList.remove(IS_SUCCESS, IS_DANGER);
    return;
  }
  if (isValidMinutes(value) && (value !== '' || allowEmpty)) {
    input.classList.remove(IS_DANGER);
    input.classList.add(IS_SUCCESS);
  } else {
    input.classList.remove(IS_SUCCESS);
    input.classList.add(IS_DANGER);
  }
}

export function buildFormatTimeRow(config: FormatTimeRowConfig): HTMLElement {
  const root = document.createElement('div');
  root.className = seFormatGroupStyle();

  // Header with tag picker and remove button
  const header = document.createElement('div');
  header.className = seFormatGroupHeaderStyle();

  const tagArea = document.createElement('div');
  tagArea.style.flex = '1';

  const label = document.createElement('div');
  label.className = seFormatGroupLabelStyle();
  label.textContent = 'Formats';
  tagArea.appendChild(label);

  const tagPicker = document.createElement('div');
  tagPicker.className = seTagPickerStyle();

  // Render existing tags — click to edit, × to remove
  for (const code of config.formatCodes) {
    const tag = document.createElement('span');
    tag.className = seTagStyle();
    tag.title = `${code} — click to edit`;

    const tagText = document.createElement('span');
    tagText.textContent = formatCodeLabel(code);

    tag.addEventListener('click', () => {
      getMatchUpFormatModal({
        existingMatchUpFormat: code,
        callback: (newFormat: string) => {
          if (!newFormat || newFormat === code) return;
          const updated = config.formatCodes.map((c) => (c === code ? newFormat : c));
          config.onFormatCodesChange(updated);
        }
      });
    });

    const removeBtn = document.createElement('span');
    removeBtn.className = seTagRemoveStyle();
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      config.onFormatCodesChange(config.formatCodes.filter((c) => c !== code));
    });

    tag.appendChild(tagText);
    tag.appendChild(removeBtn);
    tagPicker.appendChild(tag);
  }

  // Add button — opens matchUpFormat modal
  const addWrap = document.createElement('div');
  addWrap.className = seTagAddWrapStyle();

  const addBtn = document.createElement('button');
  addBtn.className = seTagAddBtnStyle();
  addBtn.textContent = '+';
  addBtn.type = 'button';
  addBtn.title = 'Add format code';

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    getMatchUpFormatModal({
      existingMatchUpFormat: 'SET3-S:6/TB7',
      callback: (format: string) => {
        if (format && !config.formatCodes.includes(format)) {
          config.onFormatCodesChange([...config.formatCodes, format]);
        }
      }
    });
  });

  addWrap.appendChild(addBtn);
  tagPicker.appendChild(addWrap);
  tagArea.appendChild(tagPicker);

  const removeGroupBtn = document.createElement('button');
  removeGroupBtn.className = seRemoveGroupBtnStyle();
  removeGroupBtn.textContent = '\u00d7';
  removeGroupBtn.type = 'button';
  removeGroupBtn.title = 'Remove format group';
  removeGroupBtn.addEventListener('click', () => config.onRemoveGroup());

  header.appendChild(tagArea);
  header.appendChild(removeGroupBtn);
  root.appendChild(header);

  // Override rows
  for (let i = 0; i < config.overrides.length; i++) {
    const ov = config.overrides[i];
    const row = document.createElement('div');
    row.className = seOverrideRowStyle();

    const catEl = document.createElement('div');
    catEl.className = `${seOverrideCategoriesStyle()}${ov.isDefault ? ' all' : ''}`;
    catEl.textContent = ov.categoryLabel;

    const defInput = document.createElement('input');
    defInput.type = 'text';
    defInput.className = seFieldInputStyle();
    defInput.value = String(ov.defaultMinutes);
    defInput.placeholder = '0';
    const idx = i;
    defInput.addEventListener('input', () => {
      applyValidation(defInput, defInput.value, false);
    });
    defInput.addEventListener('change', () => {
      const val = parseInt(defInput.value, 10);
      if (!isNaN(val) && val >= 0) config.onTimeChange(idx, 'default', val);
    });

    const defUnit = document.createElement('span');
    defUnit.className = seFieldUnitStyle();
    defUnit.textContent = 'min';

    const dblLabel = document.createElement('span');
    dblLabel.style.cssText = 'font-size:11px;color:var(--sp-muted);margin-left:8px;';
    dblLabel.textContent = 'Doubles:';

    const dblInput = document.createElement('input');
    dblInput.type = 'text';
    dblInput.className = seFieldInputStyle();
    dblInput.value = ov.doublesMinutes !== undefined ? String(ov.doublesMinutes) : '';
    dblInput.placeholder = '\u2014';
    dblInput.addEventListener('input', () => {
      applyValidation(dblInput, dblInput.value, true);
    });
    dblInput.addEventListener('change', () => {
      const raw = dblInput.value.trim();
      if (raw === '' || raw === '-') {
        config.onTimeChange(idx, 'DOUBLES', undefined);
      } else {
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val >= 0) config.onTimeChange(idx, 'DOUBLES', val);
      }
    });

    row.appendChild(catEl);
    row.appendChild(defInput);
    row.appendChild(defUnit);
    row.appendChild(dblLabel);
    row.appendChild(dblInput);

    if (!ov.isDefault) {
      const removeBtn = document.createElement('span');
      removeBtn.className = seOverrideRemoveStyle();
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => config.onRemoveOverride(idx));
      row.appendChild(removeBtn);
    }

    root.appendChild(row);
  }

  // Add override button
  const addOverrideBtn = document.createElement('button');
  addOverrideBtn.className = seAddBtnStyle();
  addOverrideBtn.textContent = '+ Add Override';
  addOverrideBtn.type = 'button';
  addOverrideBtn.addEventListener('click', () => config.onAddOverride());
  root.appendChild(addOverrideBtn);

  return root;
}
