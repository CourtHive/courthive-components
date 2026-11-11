import { CompositionEditorStore } from '../composition-editor/compositionEditorStore';
import { compositionSnapshot } from '../composition-editor/compositionSnapshot';
import { showsConnectors } from '../../compositions/showsConnectors';
import { compositions } from '../../compositions/compositions';

// constants and types
import type { CompositionEditorState, SavedComposition } from '../composition-editor/compositionEditorTypes';
import type { DisplaySettingsConfig, DisplaySettingsPreset } from './displaySettingsTypes';
import type { Configuration } from '../../types';

export const DISPLAY_TOGGLES = ['scheduleInfo', 'pathHighlight', 'connectors', 'flags', 'matchUpFooter'] as const;
export type DisplayToggle = (typeof DISPLAY_TOGGLES)[number];

/** The quick-settings rules behind the display-settings view, free of the DOM that renders them. */
export class DisplaySettingsModel {
  readonly store: CompositionEditorStore;
  /** Preset choices by name; the host's initial composition wins for its own name. */
  readonly choices: Map<string, DisplaySettingsPreset>;
  /** The richest schedule header seen, so a quick off/on keeps its details. */
  private lastHeader: Configuration['scheduleInfo'];

  constructor(config: Pick<DisplaySettingsConfig, 'composition' | 'compositionName' | 'presets'>) {
    const presets: DisplaySettingsPreset[] =
      config.presets ??
      Object.entries(compositions)
        .filter(([name]) => name !== 'InlineScoring')
        .map(([name, composition]) => ({ name, composition }));
    this.choices = new Map(presets.map((preset) => [preset.name, preset]));
    this.choices.set(config.compositionName, {
      ...this.choices.get(config.compositionName),
      name: config.compositionName,
      composition: config.composition
    });
    this.store = new CompositionEditorStore({
      composition: config.composition,
      compositionName: config.compositionName
    });
    this.lastHeader = config.composition.configuration?.scheduleInfo;
  }

  /** Replace the composition with a preset's own: its colours and header options, not the previous ones. */
  choosePreset(name: string): void {
    const chosen = this.choices.get(name)!;
    this.lastHeader = chosen.composition.configuration?.scheduleInfo;
    this.store.loadComposition(
      name,
      chosen.composition.theme,
      chosen.composition.configuration ?? {},
      chosen.composition.colors
    );
  }

  setToggle(key: DisplayToggle, on: boolean): void {
    if (key !== 'scheduleInfo') return this.store.setConfigField(key, on);
    // A quick off/on retains the composition's richer header options.
    const current = this.store.getState().configuration.scheduleInfo;
    if (!on && current) this.lastHeader = current;
    this.store.setConfigField(key, on ? this.lastHeader || true : false);
  }

  setParticipantDetail(value: string): void {
    this.store.setConfiguration({
      ...this.store.getState().configuration,
      participantDetail: value || undefined,
      showAddress: value === 'ADDRESS'
    });
  }

  /** Called on every store change: a header turned on by any control becomes the one to restore. */
  observe(state: CompositionEditorState): void {
    if (state.configuration.scheduleInfo) this.lastHeader = state.configuration.scheduleInfo;
  }

  snapshot(): SavedComposition {
    return compositionSnapshot(this.store.getState());
  }
}

/** Whether a quick-settings toggle reads on: connectors fall back to the theme's own choice. */
export function displayToggleChecked(key: DisplayToggle, state: CompositionEditorState): boolean {
  return key === 'connectors' ? showsConnectors(state) : !!state.configuration[key];
}

/** The participant-detail select's value; `NONE` and unset both read as none. */
export function participantDetailValue(configuration: Configuration): string {
  return configuration.participantDetail === 'NONE' ? '' : (configuration.participantDetail ?? '');
}
