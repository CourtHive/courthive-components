import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import { RankingPointsEditorState } from '../types';
export declare function buildAggregationSection(store: RankingPointsEditorStore): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
