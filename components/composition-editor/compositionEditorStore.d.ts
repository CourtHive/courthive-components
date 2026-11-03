import { CompositionColors, Configuration } from '../../types';
import { CompositionEditorConfig, CompositionEditorState, CompositionEditorListener, SectionId } from './compositionEditorTypes';
export declare class CompositionEditorStore {
    private state;
    private readonly listeners;
    private readonly config;
    constructor(config: CompositionEditorConfig);
    getState(): CompositionEditorState;
    subscribe(listener: CompositionEditorListener): () => void;
    toggleSection(sectionId: SectionId): void;
    setTheme(theme: string): void;
    setColorField<K extends keyof CompositionColors>(key: K, value: CompositionColors[K] | undefined): void;
    clearColors(): void;
    setCompositionName(name: string): void;
    setConfigField<K extends keyof Configuration>(key: K, value: Configuration[K]): void;
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
