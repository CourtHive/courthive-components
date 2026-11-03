import { ScoringEditorState } from '../types';
import { ScoringEditorStore } from '../scoringEditorStore';
export declare function buildAllowedFormatsSection(store: ScoringEditorStore): {
    element: HTMLElement;
    update(state: ScoringEditorState): void;
};
