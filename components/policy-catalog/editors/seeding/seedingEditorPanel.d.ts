import { SeedingEditorState, SeedingEditorConfig } from './types';
import { SeedingEditorStore } from './seedingEditorStore';
export declare function buildSeedingEditorPanel(store: SeedingEditorStore, config: SeedingEditorConfig): {
    element: HTMLElement;
    update(state: SeedingEditorState): void;
};
