import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildQualityWinSection(store: RankingPointsEditorStore): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
