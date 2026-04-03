/**
 * Ranking Points Editor — Public API
 */

export { RankingPointsEditorControl, createRankingPointsEditor } from './rankingPointsEditorControl';
export { RankingPointsEditorStore } from './rankingPointsEditorStore';
export { buildRankingPointsEditorPanel } from './rankingPointsEditorPanel';
export {
  analyzePositionValueShape,
  resolvePositionValue,
  positionToRoundLabel,
  formatPointValue,
  getProfileScopeBadges,
  profileSummaryText
} from './domain/rankingProjections';
export { emptyRankingPolicy } from './domain/emptyRankingPolicy';

export type {
  RankingPolicyData,
  RankingPointsEditorState,
  RankingEditorSection,
  RankingPointsEditorChangeListener,
  RankingPointsEditorConfig,
  AwardProfileData,
  QualityWinProfileData,
  AggregationRulesData,
  TableLayout
} from './types';
