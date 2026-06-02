/**
 * Profile Section — Policy name + positioning radio.
 */

import type { SeedingEditorState, SeedingPositioning } from '../types';
import type { SeedingEditorStore } from '../seedingEditorStore';
import { POSITIONING_OPTIONS } from '../domain/seedingProjections';
import { sdFieldInputStyle, sdFieldLabelStyle, sdFieldRowStyle, sdRadioGroupStyle, sdRadioOptionStyle } from '../styles';

export function buildProfileSection(store: SeedingEditorStore): {
  element: HTMLElement;
  update(state: SeedingEditorState): void;
} {
  const root = document.createElement('div');

  // Policy name
  const nameRow = document.createElement('div');
  nameRow.className = sdFieldRowStyle();

  const nameLabel = document.createElement('div');
  nameLabel.className = sdFieldLabelStyle();
  nameLabel.textContent = 'Policy name';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = sdFieldInputStyle() + ' sd-field-input--wide';
  nameInput.placeholder = 'e.g. USTA SEEDING';
  nameInput.addEventListener('input', () => store.setPolicyName(nameInput.value));

  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);
  root.appendChild(nameRow);

  // Positioning radio group
  const posRow = document.createElement('div');
  posRow.className = sdFieldRowStyle() + ' sd-field-row--top';

  const posLabel = document.createElement('div');
  posLabel.className = sdFieldLabelStyle();
  posLabel.textContent = 'Default positioning';
  posRow.appendChild(posLabel);

  const radioGroup = document.createElement('div');
  radioGroup.className = sdRadioGroupStyle();

  const radios: { value: SeedingPositioning; input: HTMLInputElement }[] = [];
  for (const opt of POSITIONING_OPTIONS) {
    const optionWrap = document.createElement('label');
    optionWrap.className = sdRadioOptionStyle();

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'sd-positioning';
    input.value = opt.value;
    input.addEventListener('change', () => {
      if (input.checked) store.setPositioning(opt.value);
    });

    const labelText = document.createElement('span');
    labelText.innerHTML = `<strong>${opt.label}</strong><div class="sd-radio-desc">${opt.description}</div>`;

    optionWrap.appendChild(input);
    optionWrap.appendChild(labelText);
    radioGroup.appendChild(optionWrap);
    radios.push({ value: opt.value, input });
  }
  posRow.appendChild(radioGroup);
  root.appendChild(posRow);

  function update(state: SeedingEditorState): void {
    if (document.activeElement !== nameInput) {
      nameInput.value = state.draft.policyName ?? '';
    }
    const positioning = state.draft.seedingProfile?.positioning;
    for (const r of radios) {
      r.input.checked = r.value === positioning;
    }
  }

  return { element: root, update };
}
