import { SeedingEditorState } from '../types';
import { SeedingEditorStore } from '../seedingEditorStore';
export declare function buildProfileSection(store: SeedingEditorStore): {
    element: HTMLElement;
    update(state: SeedingEditorState): void;
};
