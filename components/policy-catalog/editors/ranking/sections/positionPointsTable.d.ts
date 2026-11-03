import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildPositionPointsTable(store: RankingPointsEditorStore, profileIndex: number): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
