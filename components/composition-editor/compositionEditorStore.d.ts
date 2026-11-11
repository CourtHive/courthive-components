import { CompositionColors, Configuration, ScheduleInfoOptions } from '../../types';
import { CompositionEditorConfig, CompositionEditorState, CompositionEditorListener, SectionId } from './compositionEditorTypes';
/** The schedule header's detail controls are locked in read-only mode and while the header itself is off. */
export declare function scheduleHeaderDisabled(state: Pick<CompositionEditorState, 'readOnly' | 'configuration'>): boolean;
export declare class CompositionEditorStore {
    private state;
    private readonly listeners;
    private readonly config;
    private scheduleInfoChoice;
    constructor(config: CompositionEditorConfig);
    getState(): CompositionEditorState;
    subscribe(listener: CompositionEditorListener): () => void;
    toggleSection(sectionId: SectionId): void;
    setTheme(theme: string): void;
    setColorField<K extends keyof CompositionColors>(key: K, value: CompositionColors[K] | undefined): void;
    clearColors(): void;
    setCompositionName(name: string): void;
    setConfigField<K extends keyof Configuration>(key: K, value: Configuration[K]): void;
    /** Hidden header details are retained for this edit session, never serialized while the header is off. */
    setScheduleInfoEnabled(enabled: boolean): void;
    /** Change one header detail; ignored while the header is off, so a hidden choice cannot turn it back on. */
    setScheduleInfoOption<K extends keyof ScheduleInfoOptions>(key: K, value: ScheduleInfoOptions[K]): void;
    getScheduleInfoOptions(): ScheduleInfoOptions;
    /** Update a nested object field (e.g., gameScore, placeHolders, scaleAttributes) */
    setConfigNestedField<K extends keyof Configuration>(key: K, nestedKey: string, value: unknown): void;
    /** Replace the entire configuration (e.g., loading a preset) */
    setConfiguration(configuration: Configuration): void;
    /** Load a full composition (theme + config + name + colors) */
    loadComposition(name: string, theme: string, configuration: Configuration, colors?: CompositionColors): void;
    resetToInitial(): void;
    private setState;
    private emit;
    private notifyChange;
}
