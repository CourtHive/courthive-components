import { CompositionEditorStore } from '../composition-editor/compositionEditorStore';
import { CompositionEditorState, SavedComposition } from '../composition-editor/compositionEditorTypes';
import { DisplaySettingsConfig, DisplaySettingsPreset } from './displaySettingsTypes';
import { Configuration } from '../../types';
export declare const DISPLAY_TOGGLES: readonly ["scheduleInfo", "pathHighlight", "connectors", "flags", "matchUpFooter"];
export type DisplayToggle = (typeof DISPLAY_TOGGLES)[number];
/** The quick-settings rules behind the display-settings view, free of the DOM that renders them. */
export declare class DisplaySettingsModel {
    readonly store: CompositionEditorStore;
    /** Preset choices by name; the host's initial composition wins for its own name. */
    readonly choices: Map<string, DisplaySettingsPreset>;
    /** The richest schedule header seen, so a quick off/on keeps its details. */
    private lastHeader;
    constructor(config: Pick<DisplaySettingsConfig, 'composition' | 'compositionName' | 'presets'>);
    /** Replace the composition with a preset's own: its colours and header options, not the previous ones. */
    choosePreset(name: string): void;
    setToggle(key: DisplayToggle, on: boolean): void;
    setParticipantDetail(value: string): void;
    /** Called on every store change: a header turned on by any control becomes the one to restore. */
    observe(state: CompositionEditorState): void;
    snapshot(): SavedComposition;
}
/** Whether a quick-settings toggle reads on: connectors fall back to the theme's own choice. */
export declare function displayToggleChecked(key: DisplayToggle, state: CompositionEditorState): boolean;
/** The participant-detail select's value; `NONE` and unset both read as none. */
export declare function participantDetailValue(configuration: Configuration): string;
