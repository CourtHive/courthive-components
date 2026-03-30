/**
 * Metadata Section — Editable policy name, version, date range, global flags.
 *
 * Returns { element, update } — built once, updated on state changes.
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import {
  reFieldRowStyle,
  reFieldLabelStyle,
  reFieldInputTextStyle,
  reFieldInputDateStyle,
  reFieldSelectStyle,
  reCheckboxRowStyle,
} from '../styles';

export function buildMetadataSection(store: RankingPointsEditorStore): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const root = document.createElement('div');

  // --- Policy Name ---
  const nameRow = document.createElement('div');
  nameRow.className = reFieldRowStyle();
  const nameLbl = document.createElement('div');
  nameLbl.className = reFieldLabelStyle();
  nameLbl.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = reFieldInputTextStyle();
  nameInput.placeholder = 'Policy name';
  nameInput.addEventListener('change', () => store.setPolicyName(nameInput.value));
  nameRow.appendChild(nameLbl);
  nameRow.appendChild(nameInput);
  root.appendChild(nameRow);

  // --- Policy Version ---
  const versionRow = document.createElement('div');
  versionRow.className = reFieldRowStyle();
  const versionLbl = document.createElement('div');
  versionLbl.className = reFieldLabelStyle();
  versionLbl.textContent = 'Version';
  const versionInput = document.createElement('input');
  versionInput.type = 'text';
  versionInput.className = reFieldInputTextStyle();
  versionInput.placeholder = '1.0';
  versionInput.style.width = '80px';
  versionInput.addEventListener('change', () => store.setPolicyVersion(versionInput.value));
  versionRow.appendChild(versionLbl);
  versionRow.appendChild(versionInput);
  root.appendChild(versionRow);

  // --- Valid Date Range ---
  const startRow = document.createElement('div');
  startRow.className = reFieldRowStyle();
  const startLbl = document.createElement('div');
  startLbl.className = reFieldLabelStyle();
  startLbl.textContent = 'Valid from';
  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.className = reFieldInputDateStyle();
  startInput.addEventListener('change', () => store.setValidDateRange('startDate', startInput.value));
  startRow.appendChild(startLbl);
  startRow.appendChild(startInput);
  root.appendChild(startRow);

  const endRow = document.createElement('div');
  endRow.className = reFieldRowStyle();
  const endLbl = document.createElement('div');
  endLbl.className = reFieldLabelStyle();
  endLbl.textContent = 'Valid until';
  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.className = reFieldInputDateStyle();
  endInput.addEventListener('change', () => store.setValidDateRange('endDate', endInput.value));
  endRow.appendChild(endLbl);
  endRow.appendChild(endInput);
  root.appendChild(endRow);

  // --- Doubles Attribution ---
  const doublesRow = document.createElement('div');
  doublesRow.className = reFieldRowStyle();
  const doublesLbl = document.createElement('div');
  doublesLbl.className = reFieldLabelStyle();
  doublesLbl.textContent = 'Doubles attribution';
  const doublesSelect = document.createElement('select');
  doublesSelect.className = reFieldSelectStyle();
  for (const [val, label] of [
    ['', '(none)'],
    ['fullToEach', 'Full to each'],
    ['halfToEach', 'Half to each'],
    ['split', 'Split'],
  ] as const) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    doublesSelect.appendChild(opt);
  }
  doublesSelect.addEventListener('change', () => store.setDoublesAttribution(doublesSelect.value));
  doublesRow.appendChild(doublesLbl);
  doublesRow.appendChild(doublesSelect);
  root.appendChild(doublesRow);

  // --- Category Resolution ---
  const catRow = document.createElement('div');
  catRow.className = reFieldRowStyle();
  const catLbl = document.createElement('div');
  catLbl.className = reFieldLabelStyle();
  catLbl.textContent = 'Category resolution';
  const catSelect = document.createElement('select');
  catSelect.className = reFieldSelectStyle();
  for (const [val, label] of [
    ['', '(none)'],
    ['matchCategory', 'Match category'],
    ['eventCategory', 'Event category'],
  ] as const) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    catSelect.appendChild(opt);
  }
  catSelect.addEventListener('change', () => store.setCategoryResolution(catSelect.value));
  catRow.appendChild(catLbl);
  catRow.appendChild(catSelect);
  root.appendChild(catRow);

  // --- Global Flags ---
  const winRow = document.createElement('div');
  winRow.className = reCheckboxRowStyle();
  const winCheckbox = document.createElement('input');
  winCheckbox.type = 'checkbox';
  winCheckbox.id = 're-require-win';
  const winLabel = document.createElement('label');
  winLabel.htmlFor = 're-require-win';
  winLabel.textContent = 'Require win for points';
  winCheckbox.addEventListener('change', () => store.setGlobalFlag('requireWinForPoints', winCheckbox.checked));
  winRow.appendChild(winCheckbox);
  winRow.appendChild(winLabel);
  root.appendChild(winRow);

  const winR1Row = document.createElement('div');
  winR1Row.className = reCheckboxRowStyle();
  const winR1Checkbox = document.createElement('input');
  winR1Checkbox.type = 'checkbox';
  winR1Checkbox.id = 're-require-win-r1';
  const winR1Label = document.createElement('label');
  winR1Label.htmlFor = 're-require-win-r1';
  winR1Label.textContent = 'Require win in first round';
  winR1Checkbox.addEventListener('change', () => store.setGlobalFlag('requireWinFirstRound', winR1Checkbox.checked));
  winR1Row.appendChild(winR1Checkbox);
  winR1Row.appendChild(winR1Label);
  root.appendChild(winR1Row);

  // --- All inputs for readonly toggling ---
  const allInputs = [nameInput, versionInput, startInput, endInput];
  const allSelects = [doublesSelect, catSelect];
  const allCheckboxes = [winCheckbox, winR1Checkbox];

  function update(state: RankingPointsEditorState): void {
    const { draft } = state;

    // Sync values (skip if focused to avoid cursor jumping)
    if (document.activeElement !== nameInput) nameInput.value = draft.policyName ?? '';
    if (document.activeElement !== versionInput) versionInput.value = draft.policyVersion ?? '';
    if (document.activeElement !== startInput) startInput.value = draft.validDateRange?.startDate ?? '';
    if (document.activeElement !== endInput) endInput.value = draft.validDateRange?.endDate ?? '';
    if (document.activeElement !== doublesSelect) doublesSelect.value = draft.doublesAttribution ?? '';
    if (document.activeElement !== catSelect) catSelect.value = draft.categoryResolution ?? '';
    winCheckbox.checked = draft.requireWinForPoints ?? false;
    winR1Checkbox.checked = draft.requireWinFirstRound ?? false;

    // Readonly mode
    const ro = state.readonly;
    for (const input of allInputs) input.disabled = ro;
    for (const select of allSelects) select.disabled = ro;
    for (const cb of allCheckboxes) cb.disabled = ro;
  }

  return { element: root, update };
}
