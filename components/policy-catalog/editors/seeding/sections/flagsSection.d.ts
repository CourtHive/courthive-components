import { SeedingEditorState } from '../types';
import { SeedingEditorStore } from '../seedingEditorStore';
export declare function buildFlagsSection(store: SeedingEditorStore): {
    element: HTMLElement;
    update(state: SeedingEditorState): void;
};
