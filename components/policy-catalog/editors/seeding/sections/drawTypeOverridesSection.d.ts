import { SeedingEditorConfig, SeedingEditorState } from '../types';
import { SeedingEditorStore } from '../seedingEditorStore';
export declare function buildDrawTypeOverridesSection(store: SeedingEditorStore, config: SeedingEditorConfig): {
    element: HTMLElement;
    update(state: SeedingEditorState): void;
};
