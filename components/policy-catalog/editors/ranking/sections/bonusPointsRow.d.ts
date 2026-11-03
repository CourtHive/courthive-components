import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildBonusPointsRow(store: RankingPointsEditorStore, profileIndex: number): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
