import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildScopeEditor(store: RankingPointsEditorStore, profileIndex: number): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
