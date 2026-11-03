import { CompositionEditorConfig, SavedComposition } from './compositionEditorTypes';
export type { CompositionEditorConfig, SavedComposition };
export declare function createCompositionEditor(container: HTMLElement, config: CompositionEditorConfig): {
    destroy: () => void;
    getComposition: () => SavedComposition;
};
