import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildMetadataSection(store: RankingPointsEditorStore): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
