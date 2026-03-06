/**
 * Modification Flags Section — 2 toggle checkboxes (courts, venues).
 */

import type { SchedulingEditorState } from '../types';
import type { SchedulingEditorStore } from '../schedulingEditorStore';
import { seCheckboxRowStyle } from '../styles';

export function buildModificationFlagsSection(store: SchedulingEditorStore): {
  element: HTMLElement;
  update(state: SchedulingEditorState): void;
} {
  const root = document.createElement('div');

  const courtsRow = document.createElement('div');
  courtsRow.className = seCheckboxRowStyle();
  const courtsCheckbox = document.createElement('input');
  courtsCheckbox.type = 'checkbox';
  courtsCheckbox.id = 'se-mod-courts';
  const courtsLabel = document.createElement('label');
  courtsLabel.htmlFor = 'se-mod-courts';
  courtsLabel.textContent = 'Allow court modifications when matchUps scheduled';
  courtsCheckbox.addEventListener('change', () => {
    store.setModificationFlag('courts', courtsCheckbox.checked);
  });
  courtsRow.appendChild(courtsCheckbox);
  courtsRow.appendChild(courtsLabel);

  const venuesRow = document.createElement('div');
  venuesRow.className = seCheckboxRowStyle();
  const venuesCheckbox = document.createElement('input');
  venuesCheckbox.type = 'checkbox';
  venuesCheckbox.id = 'se-mod-venues';
  const venuesLabel = document.createElement('label');
  venuesLabel.htmlFor = 'se-mod-venues';
  venuesLabel.textContent = 'Allow venue modifications when matchUps scheduled';
  venuesCheckbox.addEventListener('change', () => {
    store.setModificationFlag('venues', venuesCheckbox.checked);
  });
  venuesRow.appendChild(venuesCheckbox);
  venuesRow.appendChild(venuesLabel);

  root.appendChild(courtsRow);
  root.appendChild(venuesRow);

  function update(state: SchedulingEditorState): void {
    const flags = state.draft.allowModificationWhenMatchUpsScheduled;
    courtsCheckbox.checked = flags?.courts ?? false;
    venuesCheckbox.checked = flags?.venues ?? false;
  }

  return { element: root, update };
}
