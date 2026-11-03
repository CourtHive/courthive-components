import { RankingPointsEditorState } from '../types';
import { RankingPointsEditorStore } from '../rankingPointsEditorStore';
export declare function buildProfileCard(store: RankingPointsEditorStore, profileIndex: number): {
    element: HTMLElement;
    update(state: RankingPointsEditorState): void;
};
