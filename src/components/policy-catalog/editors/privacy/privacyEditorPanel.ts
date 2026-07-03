/**
 * Participant Privacy Editor — panel. Renders the policy name plus grouped
 * publish/strip toggles (person details, participant details) derived from the
 * factory template. Returns { element, update } like the other editors.
 */
import { privacyFields, readField, readPolicyName } from './domain/privacyProjections';
import type { PrivacyEditorStore } from './privacyEditorStore';
import type { PrivacyEditorConfig, PrivacyEditorState } from './types';

export function buildPrivacyEditorPanel(
  store: PrivacyEditorStore,
  _config: PrivacyEditorConfig,
): { element: HTMLElement; update: (state: PrivacyEditorState) => void } {
  const element = document.createElement('div');
  element.className = 'privacy-editor';

  const intro = document.createElement('p');
  intro.className = 'privacy-editor__intro';
  intro.textContent = 'Choose which participant details are published publicly. Unchecked = kept private.';
  element.appendChild(intro);

  const nameRow = document.createElement('label');
  nameRow.className = 'privacy-editor__name';
  const nameLabel = document.createElement('span');
  nameLabel.textContent = 'Policy name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g. Public roster privacy';
  nameInput.addEventListener('input', () => store.setPolicyName(nameInput.value));
  nameRow.append(nameLabel, nameInput);
  element.appendChild(nameRow);

  const fields = privacyFields();
  const checkboxes = new Map<string, HTMLInputElement>();

  const buildGroup = (group: 'person' | 'participant', title: string): void => {
    const section = document.createElement('section');
    section.className = 'privacy-editor__group';
    const heading = document.createElement('h4');
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'privacy-editor__grid';
    for (const meta of fields.filter((f) => f.group === group)) {
      const row = document.createElement('label');
      row.className = 'privacy-editor__toggle';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.addEventListener('change', () => store.setField(group, meta.field, cb.checked));
      const text = document.createElement('span');
      text.textContent = meta.label;
      row.append(cb, text);
      grid.appendChild(row);
      checkboxes.set(`${group}.${meta.field}`, cb);
    }
    section.appendChild(grid);
    element.appendChild(section);
  };

  buildGroup('person', 'Person details');
  buildGroup('participant', 'Participant details');

  const update = (state: PrivacyEditorState): void => {
    nameInput.value = readPolicyName(state.draft);
    for (const meta of fields) {
      const cb = checkboxes.get(`${meta.group}.${meta.field}`);
      if (cb) cb.checked = readField(state.draft, meta.group, meta.field);
    }
  };

  return { element, update };
}
