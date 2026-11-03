import { RankingPointsEditorStore } from './rankingPointsEditorStore';
import { RankingPointsEditorState, RankingPointsEditorConfig } from './types';
interface PanelResult {
    element: HTMLElement;
    update: (state: RankingPointsEditorState) => void;
}
export declare function buildRankingPointsEditorPanel(store: RankingPointsEditorStore, _config: RankingPointsEditorConfig): PanelResult;
export {};
