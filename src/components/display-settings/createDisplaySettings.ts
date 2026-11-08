import { buildSelectField, buildToggleField } from '../composition-editor/sections/fieldBuilders';
import { COMPOSITION_EDITOR_SECTIONS } from '../composition-editor/compositionEditorSections';
import { CompositionEditorStore } from '../composition-editor/compositionEditorStore';
import { compositionSnapshot } from '../composition-editor/compositionSnapshot';
import { buildSection } from '../composition-editor/sections/sectionBuilder';
import { mocksEngine, queryGovernor } from 'tods-competition-factory';
import { showsConnectors } from '../../compositions/showsConnectors';
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { compositions } from '../../compositions/compositions';

// constants and types
import type { CompositionEditorState } from '../composition-editor/compositionEditorTypes';
import type { Configuration, MatchUp } from '../../types';
import type {
  DisplaySettingsConfig,
  DisplaySettingsLabels,
  DisplaySettingsMode,
  DisplaySettingsPreset
} from './displaySettingsTypes';

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

function mockPreview(): MatchUp[] {
  // A modal must not replace the host application's active tournament engine state.
  const startDate = new Date().toISOString().slice(0, 10);
  const venueId = 'display-preview-venue';
  const drawId = 'display-preview-draw';
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    setState: false,
    drawProfiles: [{ drawId, drawSize: 4, matchUpFormat: 'SET3-S:6/TB7' }],
    venueProfiles: [
      {
        venueId,
        venueName: 'Preview courts',
        courtNames: ['1', '2'],
        courtsCount: 2,
        startTime: '08:00',
        endTime: '20:00'
      }
    ],
    schedulingProfile: [{ scheduleDate: startDate, venues: [{ venueId, rounds: [{ drawId, roundNumber: 1 }] }] }],
    autoSchedule: true,
    startDate,
    completeAllMatchUps: true
  });
  const { matchUps } = queryGovernor.allTournamentMatchUps({
    tournamentRecord,
    participantsProfile: { withISO2: true, withIOC: true }
  }) as unknown as { matchUps: MatchUp[] };
  const completed: MatchUp = {
    ...matchUps.find((matchUp) => matchUp.roundNumber === 1)!,
    onlineResources: [
      { resourceType: 'URL', resourceSubType: 'VIDEO', identifier: 'https://example.org/match', name: 'Match video' }
    ]
  };
  const live: MatchUp = {
    ...completed,
    matchUpId: `${completed.matchUpId}-live`,
    matchUpStatus: 'IN_PROGRESS',
    winningSide: undefined,
    serverSideNumber: 2,
    score: { sets: [{ setNumber: 1, side1Score: 3, side2Score: 2, side1PointScore: '30', side2PointScore: '15' }] },
    schedule: { ...completed.schedule, milliseconds: 16 * 60_000 }
  };
  return [completed, live];
}

/** A single composition store backs the quick settings, advanced editor and preview. */
export function createDisplaySettings(container: HTMLElement, config: DisplaySettingsConfig) {
  const labels = { ...displaySettingsLabels, ...config.labels };
  const presets: DisplaySettingsPreset[] =
    config.presets ??
    Object.entries(compositions)
      .filter(([name]) => name !== 'InlineScoring')
      .map(([name, composition]) => ({ name, composition }));
  const choices = new Map(presets.map((preset) => [preset.name, preset]));
  choices.set(config.compositionName, {
    ...choices.get(config.compositionName),
    name: config.compositionName,
    composition: config.composition
  });
  const store = new CompositionEditorStore({
    composition: config.composition,
    compositionName: config.compositionName
  });
  const matchUps = config.previewMatchUps ?? mockPreview();
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
    (name) => {
      const chosen = choices.get(name)!;
      lastHeader = chosen.composition.configuration?.scheduleInfo;
      store.loadComposition(
        name,
        chosen.composition.theme,
        chosen.composition.configuration ?? {},
        chosen.composition.colors
      );
    }
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

  const toggles = (['scheduleInfo', 'pathHighlight', 'connectors', 'flags', 'matchUpFooter'] as const).map((key) => {
    const field = buildToggleField(labels[key], false, (on) => {
      // A quick off/on retains the composition's richer header options.
      if (key === 'scheduleInfo') {
        if (!on && store.getState().configuration.scheduleInfo)
          lastHeader = store.getState().configuration.scheduleInfo;
        store.setConfigField(key, on ? lastHeader || true : false);
      } else store.setConfigField(key, on);
    });
    const input = field.element.querySelector('input')!;
    input.dataset.displaySetting = key;
    input.setAttribute(ARIA_LABEL, labels[key]);
    basic.appendChild(field.element);
    return { key, field };
  });
  let lastHeader: Configuration['scheduleInfo'] = config.composition.configuration?.scheduleInfo;
  const detail = buildSelectField(
    labels.detail,
    [
      { value: '', label: labels.none },
      { value: 'ADDRESS', label: labels.address },
      { value: 'TEAM', label: labels.team }
    ],
    '',
    (value) =>
      store.setConfiguration({
        ...store.getState().configuration,
        participantDetail: value || undefined,
        showAddress: value === 'ADDRESS'
      })
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
    if (state.configuration.scheduleInfo) lastHeader = state.configuration.scheduleInfo;
    for (const { key, field } of toggles)
      field.setChecked(key === 'connectors' ? showsConnectors(state) : !!state.configuration[key]);
    detail.setValue(
      state.configuration.participantDetail === 'NONE' ? '' : (state.configuration.participantDetail ?? '')
    );
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
    config.onChange?.(compositionSnapshot(state));
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
    getComposition: () => compositionSnapshot(store.getState()),
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
