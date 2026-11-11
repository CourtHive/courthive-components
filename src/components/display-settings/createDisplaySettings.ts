import { buildSelectField, buildToggleField } from '../composition-editor/sections/fieldBuilders';
import { COMPOSITION_EDITOR_SECTIONS } from '../composition-editor/compositionEditorSections';
import { buildSection } from '../composition-editor/sections/sectionBuilder';
import { displaySettingsPreviewMatchUps } from './displaySettingsPreview';
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import {
  DISPLAY_TOGGLES,
  DisplaySettingsModel,
  displayToggleChecked,
  participantDetailValue
} from './displaySettingsModel';

// constants and types
import type { DisplaySettingsConfig, DisplaySettingsLabels, DisplaySettingsMode } from './displaySettingsTypes';
import type { CompositionEditorState } from '../composition-editor/compositionEditorTypes';

export const displaySettingsLabels: DisplaySettingsLabels = {
  title: 'Edit display settings',
  composition: 'Composition',
  advanced: 'Advanced settings',
  basic: 'Basic settings',
  preview: 'Preview',
  scheduleInfo: 'Schedule info',
  pathHighlight: 'Path highlight',
  connectors: 'Connectors',
  flags: 'Nationality flags',
  matchUpFooter: 'MatchUp footer',
  detail: 'Participant detail',
  none: 'None',
  address: 'Address',
  team: 'Team',
  save: 'Save',
  cancel: 'Cancel'
};

const ARIA_LABEL = 'aria-label';
let sequence = 0;

/** A single composition store backs the quick settings, advanced editor and preview. */
export function createDisplaySettings(container: HTMLElement, config: DisplaySettingsConfig) {
  const labels = { ...displaySettingsLabels, ...config.labels };
  const model = new DisplaySettingsModel(config);
  const { store, choices } = model;
  const matchUps = config.previewMatchUps ?? displaySettingsPreviewMatchUps();
  let mode = config.mode ?? 'basic';
  let destroyed = false;
  let previewSignature = '';

  const root = document.createElement('div');
  root.className = 'chc-display-settings';
  const toolbar = document.createElement('div');
  toolbar.className = 'chc-display-settings-toolbar';
  const preset = buildSelectField(
    labels.composition,
    [...choices.values()].map((choice) => ({
      value: choice.name,
      label: choice.label ?? choice.name
    })),
    config.compositionName,
    (name) => model.choosePreset(name)
  );
  preset.element.querySelector('select')!.setAttribute(ARIA_LABEL, labels.composition);
  const modeButton = document.createElement('button');
  modeButton.type = 'button';
  modeButton.className = 'chc-display-settings-mode';
  toolbar.append(preset.element, modeButton);

  const workspace = document.createElement('div');
  workspace.className = 'chc-display-settings-workspace';
  const controls = document.createElement('div');
  controls.className = 'chc-display-settings-controls';
  const basic = document.createElement('div');
  basic.className = 'chc-display-settings-basic';
  const advanced = document.createElement('div');
  advanced.className = 'chc-display-settings-advanced';
  advanced.id = `display-settings-advanced-${++sequence}`;
  modeButton.setAttribute('aria-controls', advanced.id);
  controls.append(basic, advanced);

  const preview = document.createElement('div');
  preview.className = 'chc-display-settings-preview';
  preview.setAttribute('role', 'region');
  preview.setAttribute(ARIA_LABEL, labels.preview);
  workspace.append(controls, preview);
  root.append(toolbar, workspace);
  container.appendChild(root);

  const toggles = DISPLAY_TOGGLES.map((key) => {
    const field = buildToggleField(labels[key], false, (on) => model.setToggle(key, on));
    const input = field.element.querySelector('input')!;
    input.dataset.displaySetting = key;
    input.setAttribute(ARIA_LABEL, labels[key]);
    basic.appendChild(field.element);
    return { key, field };
  });
  const detail = buildSelectField(
    labels.detail,
    [
      { value: '', label: labels.none },
      { value: 'ADDRESS', label: labels.address },
      { value: 'TEAM', label: labels.team }
    ],
    '',
    (value) => model.setParticipantDetail(value)
  );
  detail.element.querySelector('select')!.setAttribute(ARIA_LABEL, labels.detail);
  basic.appendChild(detail.element);
  const panels = COMPOSITION_EDITOR_SECTIONS.filter((section) => section.id !== 'theme').map((section) => {
    const panel = buildSection(section, store);
    advanced.appendChild(panel.element);
    return panel;
  });

  const update = (state: CompositionEditorState) => {
    preset.setValue(state.compositionName);
    model.observe(state);
    for (const { key, field } of toggles) field.setChecked(displayToggleChecked(key, state));
    detail.setValue(participantDetailValue(state.configuration));
    for (const panel of panels) panel.update(state);
    const signature = JSON.stringify({ theme: state.theme, configuration: state.configuration, colors: state.colors });
    if (signature !== previewSignature) {
      previewSignature = signature;
      preview.replaceChildren(
        ...matchUps.map((matchUp) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'chc-display-settings-preview-card';
          wrapper.appendChild(
            renderMatchUp({
              matchUp,
              composition: state,
              eventHandlers: { matchUpShare: () => undefined, onlineResourceClick: () => undefined }
            })
          );
          return wrapper;
        })
      );
    }
  };
  const unsubscribe = store.subscribe((state) => {
    update(state);
    config.onChange?.(model.snapshot());
  });
  const setMode = (next: DisplaySettingsMode) => {
    if (destroyed) return;
    mode = next;
    root.dataset.mode = mode;
    basic.hidden = mode !== 'basic';
    advanced.hidden = mode !== 'advanced';
    modeButton.textContent = mode === 'advanced' ? labels.basic : labels.advanced;
    modeButton.setAttribute('aria-expanded', String(mode === 'advanced'));
    config.onModeChange?.(mode);
  };
  modeButton.onclick = () => setMode(mode === 'basic' ? 'advanced' : 'basic');
  update(store.getState());
  setMode(mode);

  return {
    element: root,
    getComposition: () => model.snapshot(),
    getMode: () => mode,
    setMode,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      root.remove();
    }
  };
}
