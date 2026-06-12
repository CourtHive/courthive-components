/**
 * "Defaults" section — the primary scoring-rule toggles + the
 * matchUpFormat picker.
 *
 *   Default match-up format   [picker]
 *   Require both participants     [✓]
 *   Require all positions assigned [default ▾]
 *   Allow change propagation       [ ]
 *   Allow deletion with scores present
 *     ├ Draw definitions  [ ]
 *     └ Structures        [ ]
 */

import type { ScoringEditorState, RequireAllPositionsTriState } from '../types';
import type { ScoringEditorStore } from '../scoringEditorStore';
import { buildMatchUpFormatPicker } from './matchUpFormatPicker';

export function buildDefaultsSection(store: ScoringEditorStore): {
  element: HTMLElement;
  update(state: ScoringEditorState): void;
} {
  const root = document.createElement('div');
  root.className = 'sc-section-body-inner';

  // ── Default matchUp format ──────────────────────────
  const formatRow = document.createElement('div');
  formatRow.className = 'sc-field-block';
  const formatLabel = document.createElement('div');
  formatLabel.className = 'sc-field-block-label';
  formatLabel.textContent = 'Default match-up format';
  const formatHelp = document.createElement('div');
  formatHelp.className = 'sc-field-help';
  formatHelp.textContent = 'Used when an event or draw does not specify its own format.';
  formatRow.appendChild(formatLabel);
  formatRow.appendChild(formatHelp);

  const picker = buildMatchUpFormatPicker({
    initialValue: store.getData().defaultMatchUpFormat,
    readonly: store.isReadonly(),
    onChange: (value) => store.setDefaultMatchUpFormat(value),
  });
  formatRow.appendChild(picker.element);
  root.appendChild(formatRow);

  // ── Require participants ────────────────────────────
  const reqParticipants = checkboxRow({
    label: 'Require both participants before scoring',
    help: 'Block score entry until both sides have a participant assigned.',
    initial: !!store.getData().requireParticipantsForScoring,
    readonly: store.isReadonly(),
    onChange: (v) => store.setRequireParticipants(v),
  });
  root.appendChild(reqParticipants.element);

  // ── Require all positions ───────────────────────────
  const reqPositionsRow = document.createElement('div');
  reqPositionsRow.className = 'sc-field-row';
  const reqPositionsLabel = document.createElement('label');
  reqPositionsLabel.className = 'sc-field-label';
  reqPositionsLabel.textContent = 'Require all positions assigned';
  const reqPositionsSelect = document.createElement('select');
  reqPositionsSelect.className = 'sc-field-input';
  for (const opt of [
    { value: 'default', label: 'Default (required in MAIN stage)' },
    { value: 'true', label: 'Always required' },
    { value: 'false', label: 'Never required' },
  ] as { value: RequireAllPositionsTriState; label: string }[]) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    reqPositionsSelect.appendChild(o);
  }
  reqPositionsSelect.addEventListener('change', () => {
    store.setRequireAllPositions(reqPositionsSelect.value as RequireAllPositionsTriState);
  });
  if (store.isReadonly()) reqPositionsSelect.disabled = true;
  reqPositionsRow.appendChild(reqPositionsLabel);
  reqPositionsRow.appendChild(reqPositionsSelect);
  root.appendChild(reqPositionsRow);

  // ── Allow change propagation ────────────────────────
  const allowProp = checkboxRow({
    label: 'Allow change propagation',
    help: 'Editing a completed matchUp\'s winningSide updates all downstream matchUps in the structure.',
    initial: !!store.getData().allowChangePropagation,
    readonly: store.isReadonly(),
    onChange: (v) => store.setAllowChangePropagation(v),
  });
  root.appendChild(allowProp.element);

  // ── Allow deletion with scores present ──────────────
  const delGroup = document.createElement('div');
  delGroup.className = 'sc-field-block';
  const delGroupLabel = document.createElement('div');
  delGroupLabel.className = 'sc-field-block-label';
  delGroupLabel.textContent = 'Allow deletion with scores present';
  const delGroupHelp = document.createElement('div');
  delGroupHelp.className = 'sc-field-help';
  delGroupHelp.textContent = 'When off, the corresponding entity cannot be deleted while it has scored matchUps.';
  delGroup.appendChild(delGroupLabel);
  delGroup.appendChild(delGroupHelp);
  const delDraws = checkboxRow({
    label: 'Draw definitions',
    help: '',
    initial: !!store.getData().allowDeletionWithScoresPresent?.drawDefinitions,
    readonly: store.isReadonly(),
    onChange: (v) => store.setAllowDeletionDraws(v),
  });
  const delStructs = checkboxRow({
    label: 'Structures',
    help: '',
    initial: !!store.getData().allowDeletionWithScoresPresent?.structures,
    readonly: store.isReadonly(),
    onChange: (v) => store.setAllowDeletionStructures(v),
  });
  delGroup.appendChild(delDraws.element);
  delGroup.appendChild(delStructs.element);
  root.appendChild(delGroup);

  function update(state: ScoringEditorState): void {
    const draft = state.draft;
    picker.setValue(draft.defaultMatchUpFormat || '');
    reqParticipants.setChecked(!!draft.requireParticipantsForScoring);
    if (draft.requireAllPositionsAssigned === undefined) reqPositionsSelect.value = 'default';
    else reqPositionsSelect.value = draft.requireAllPositionsAssigned ? 'true' : 'false';
    allowProp.setChecked(!!draft.allowChangePropagation);
    delDraws.setChecked(!!draft.allowDeletionWithScoresPresent?.drawDefinitions);
    delStructs.setChecked(!!draft.allowDeletionWithScoresPresent?.structures);
  }

  return { element: root, update };
}

// ----------------------------------------------------------- form atoms

interface CheckboxRowConfig {
  label: string;
  help: string;
  initial: boolean;
  readonly: boolean;
  onChange: (value: boolean) => void;
}

interface CheckboxRowHandle {
  element: HTMLElement;
  setChecked(value: boolean): void;
}

function checkboxRow(config: CheckboxRowConfig): CheckboxRowHandle {
  const row = document.createElement('div');
  row.className = 'sc-checkbox-row';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = config.initial;
  if (config.readonly) input.disabled = true;
  input.addEventListener('change', () => config.onChange(input.checked));

  const text = document.createElement('div');
  text.className = 'sc-checkbox-text';
  const label = document.createElement('label');
  label.textContent = config.label;
  text.appendChild(label);
  if (config.help) {
    const help = document.createElement('div');
    help.className = 'sc-checkbox-help';
    help.textContent = config.help;
    text.appendChild(help);
  }

  row.appendChild(input);
  row.appendChild(text);

  return {
    element: row,
    setChecked(value: boolean) {
      input.checked = value;
    },
  };
}
