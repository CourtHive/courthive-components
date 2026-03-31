/**
 * Schedule Cell Configurator Modal — select what info appears in OOP grid cells.
 *
 * Provides checkboxes for each field that can appear in a schedule cell:
 * participant names, match number, event/round, nationality, seeds,
 * scheduled time, format code, score.
 *
 * Returns a CellConfig object consumed by pdf-factory's scheduleV2 renderer.
 */

import { cModal } from './cmodal';
import { renderForm } from '../forms/renderForm';

export interface ScheduleCellConfig {
  showParticipantNames: boolean;
  showNationality: boolean;
  showSeedings: boolean;
  showMatchNumber: boolean;
  showEventRound: boolean;
  showScheduledTime: boolean;
  showMatchFormat: boolean;
  showScore: boolean;
  nameFormat: 'full' | 'abbreviated' | 'lastOnly';
  cellStyle: 'detailed' | 'compact';
}

const DEFAULT_CONFIG: ScheduleCellConfig = {
  showParticipantNames: true,
  showNationality: true,
  showSeedings: true,
  showMatchNumber: false,
  showEventRound: true,
  showScheduledTime: true,
  showMatchFormat: false,
  showScore: true,
  nameFormat: 'full',
  cellStyle: 'detailed',
};

export interface ScheduleCellConfigOptions {
  initial?: Partial<ScheduleCellConfig>;
  onApply?: (config: ScheduleCellConfig) => void;
}

export function openScheduleCellConfigModal(options: ScheduleCellConfigOptions = {}) {
  const initial = { ...DEFAULT_CONFIG, ...options.initial };
  let inputs: any = {};

  const buildContent = (container: HTMLElement) => {
    inputs = renderForm(container, [
      { header: true, text: 'Schedule Cell Content' },
      { text: 'Select which information appears in each schedule grid cell.', style: 'color: var(--chc-text-muted); font-size: 13px;' },
      { spacer: 0.5 },
      { field: 'showParticipantNames', label: 'Participant Names', checkbox: true, value: initial.showParticipantNames },
      { field: 'showNationality', label: 'Nationality (country code)', checkbox: true, value: initial.showNationality },
      { field: 'showSeedings', label: 'Seedings', checkbox: true, value: initial.showSeedings },
      { field: 'showEventRound', label: 'Event & Round', checkbox: true, value: initial.showEventRound },
      { field: 'showScheduledTime', label: 'Scheduled Time / Not Before', checkbox: true, value: initial.showScheduledTime },
      { field: 'showScore', label: 'Score (for completed matches)', checkbox: true, value: initial.showScore },
      { field: 'showMatchNumber', label: 'Match Number', checkbox: true, value: initial.showMatchNumber },
      { field: 'showMatchFormat', label: 'Match Format Code', checkbox: true, value: initial.showMatchFormat },
      { divider: true },
      {
        field: 'nameFormat',
        label: 'Name Format',
        options: [
          { label: 'Full (LASTNAME, First)', value: 'full', selected: initial.nameFormat === 'full' },
          { label: 'Abbreviated (F. LASTNAME)', value: 'abbreviated', selected: initial.nameFormat === 'abbreviated' },
          { label: 'Last Name Only', value: 'lastOnly', selected: initial.nameFormat === 'lastOnly' },
        ],
      },
      {
        field: 'cellStyle',
        label: 'Cell Density',
        options: [
          { label: 'Detailed', value: 'detailed', selected: initial.cellStyle === 'detailed' },
          { label: 'Compact', value: 'compact', selected: initial.cellStyle === 'compact' },
        ],
      },
    ]);
  };

  const getConfig = (): ScheduleCellConfig => ({
    showParticipantNames: inputs.showParticipantNames?.checked ?? true,
    showNationality: inputs.showNationality?.checked ?? true,
    showSeedings: inputs.showSeedings?.checked ?? true,
    showMatchNumber: inputs.showMatchNumber?.checked ?? false,
    showEventRound: inputs.showEventRound?.checked ?? true,
    showScheduledTime: inputs.showScheduledTime?.checked ?? true,
    showMatchFormat: inputs.showMatchFormat?.checked ?? false,
    showScore: inputs.showScore?.checked ?? true,
    nameFormat: inputs.nameFormat?.value || 'full',
    cellStyle: inputs.cellStyle?.value || 'detailed',
  });

  const presetButtons = document.createElement('div');
  presetButtons.style.cssText = 'display: flex; gap: 6px; margin-top: 4px;';

  const presets = [
    { label: 'Detailed', config: { ...DEFAULT_CONFIG } },
    { label: 'Compact', config: { ...DEFAULT_CONFIG, showNationality: false, showScheduledTime: false, showMatchFormat: false, nameFormat: 'abbreviated' as const, cellStyle: 'compact' as const } },
    { label: 'Broadcast', config: { ...DEFAULT_CONFIG, showMatchNumber: true, showMatchFormat: true } },
    { label: 'Minimal', config: { ...DEFAULT_CONFIG, showNationality: false, showSeedings: false, showScheduledTime: false, showMatchFormat: false, showScore: false, nameFormat: 'lastOnly' as const, cellStyle: 'compact' as const } },
  ];

  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.className = 'chc-button chc-button--sm';
    btn.style.cssText = 'padding: 2px 8px; font-size: 11px; cursor: pointer; border: 1px solid var(--chc-border-primary); border-radius: 3px; background: var(--chc-bg-secondary);';
    btn.onclick = () => {
      // Apply preset values to form inputs
      const c = preset.config;
      if (inputs.showParticipantNames) inputs.showParticipantNames.checked = c.showParticipantNames;
      if (inputs.showNationality) inputs.showNationality.checked = c.showNationality;
      if (inputs.showSeedings) inputs.showSeedings.checked = c.showSeedings;
      if (inputs.showMatchNumber) inputs.showMatchNumber.checked = c.showMatchNumber;
      if (inputs.showEventRound) inputs.showEventRound.checked = c.showEventRound;
      if (inputs.showScheduledTime) inputs.showScheduledTime.checked = c.showScheduledTime;
      if (inputs.showMatchFormat) inputs.showMatchFormat.checked = c.showMatchFormat;
      if (inputs.showScore) inputs.showScore.checked = c.showScore;
      if (inputs.nameFormat) inputs.nameFormat.value = c.nameFormat;
      if (inputs.cellStyle) inputs.cellStyle.value = c.cellStyle;
    };
    presetButtons.appendChild(btn);
  }

  const modalHandle = cModal.open({
    title: 'Schedule Cell Configuration',
    content: (container: HTMLElement) => {
      buildContent(container);
      const presetLabel = document.createElement('div');
      presetLabel.style.cssText = 'font-size: 12px; color: var(--chc-text-muted); margin-top: 12px;';
      presetLabel.textContent = 'Quick presets:';
      container.appendChild(presetLabel);
      container.appendChild(presetButtons);
    },
    buttons: [
      {
        label: 'Apply',
        intent: 'is-info',
        onClick: () => {
          options.onApply?.(getConfig());
          cModal.close();
        },
      },
      { label: 'Cancel', close: true },
    ],
    config: { maxWidth: 440 },
  });

  return modalHandle;
}
