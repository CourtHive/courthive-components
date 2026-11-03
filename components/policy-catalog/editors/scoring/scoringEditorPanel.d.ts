import { ScoringEditorState } from './types';
import { ScoringEditorStore } from './scoringEditorStore';
export declare function buildScoringEditorPanel(store: ScoringEditorStore): {
    element: HTMLElement;
    update(state: ScoringEditorState): void;
};
