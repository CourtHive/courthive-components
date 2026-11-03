import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildPerWinPointsRow(store: RankingPointsEditorStore, profileIndex: number): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
