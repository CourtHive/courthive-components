/**
 * Policy Catalog — Public API
 *
 * Main entry point for the policy catalog component.
 */

// ============================================================================
// Controller
// ============================================================================

export { PolicyCatalogControl } from './controller/policyCatalogControl';

// ============================================================================
// Store
// ============================================================================

export { PolicyCatalogStore } from './engine/policyCatalogStore';

// ============================================================================
// Domain
// ============================================================================

export { filterPolicyCatalog, groupPolicyCatalog } from './domain/catalogProjections';
export { POLICY_TYPE_METADATA, POLICY_TYPE_GROUPS, getPolicyTypeMeta, getEmptyPolicyData } from './domain/policyDefaults';
export { deepClone } from './domain/utils';

// ============================================================================
// UI Components (for custom layouts)
// ============================================================================

export { buildPolicyCatalogPanel } from './ui/policyCatalogPanel';
export { buildEditorShell } from './ui/editorShell';
export { buildPolicyCatalogLayout } from './ui/policyCatalogLayout';
export { buildJsonEditor } from './ui/jsonEditor';

// ============================================================================
// Scheduling Editor (re-export standalone)
// ============================================================================

export {
  SchedulingEditorControl,
  createSchedulingEditor,
  SchedulingEditorStore,
  validateSchedulingPolicy,
  formatCodeLabel,
  emptySchedulingPolicy,
  buildSchedulingEditorPanel,
} from './editors/scheduling';

// ============================================================================
// Ranking Editor (re-export standalone)
// ============================================================================

export {
  RankingPointsEditorControl,
  createRankingPointsEditor,
  RankingPointsEditorStore,
  buildRankingPointsEditorPanel,
  emptyRankingPolicy,
} from './editors/ranking';

// ============================================================================
// Types
// ============================================================================

export type {
  PolicyCatalogItem,
  PolicyCatalogState,
  PolicyCatalogChangeListener,
  PolicyCatalogConfig,
  PolicyEditorInstance,
  PolicyEditorPlugin,
  PolicySource,
  PolicyTypeGroup,
  PolicyTypeMeta,
  CatalogGroupBy,
  UIPanel,
} from './types';

export type {
  SchedulingPolicyData,
  SchedulingEditorState,
  SchedulingEditorSection,
  SchedulingEditorChangeListener,
  SchedulingEditorConfig,
  SchedulingValidationResult,
  ValidationSeverity,
  MinutesEntry,
  AverageTimeEntry,
  RecoveryTimeEntry,
  MatchUpAverageTime,
  MatchUpRecoveryTime,
} from './editors/scheduling';

export type {
  RankingPolicyData,
  RankingPointsEditorState,
  RankingEditorSection,
  RankingPointsEditorChangeListener,
  RankingPointsEditorConfig,
  AwardProfileData,
  QualityWinProfileData,
  AggregationRulesData,
  TableLayout,
} from './editors/ranking';

// ============================================================================
// Convenience Factory
// ============================================================================

import type { PolicyCatalogConfig } from './types';
import { PolicyCatalogControl } from './controller/policyCatalogControl';

export function createPolicyCatalog(
  config: PolicyCatalogConfig,
  container: HTMLElement,
): PolicyCatalogControl {
  const control = new PolicyCatalogControl(config);
  control.render(container);
  return control;
}
