/**
 * Schedule Page — Public API
 *
 * Main entry point for the schedule page component.
 */

// ============================================================================
// Controller
// ============================================================================

export { SchedulePageControl } from './controller/schedulePageControl';

// ============================================================================
// Store
// ============================================================================

export { SchedulePageStore } from './engine/schedulePageStore';

// ============================================================================
// Domain (for advanced consumers)
// ============================================================================

export { filterMatchUpCatalog, groupMatchUpCatalog, isCompletedStatus } from './domain/matchUpCatalogProjections';
export { buildScheduleIssueIndex } from './domain/scheduleIssues';
export { matchUpLabel, participantLabel, matchUpSearchKey, deepClone } from './domain/utils';

// ============================================================================
// UI Components (for custom layouts)
// ============================================================================

export { buildScheduleDateStrip } from './ui/dateStrip';
export { buildScheduleIssuesPanel } from './ui/issuesPanel';
export { buildMatchUpCatalog } from './ui/matchUpCatalog';
export { buildMatchUpCard } from './ui/matchUpCard';
export { buildScheduleInspectorPanel } from './ui/inspectorPanel';
export { buildCourtGridSlot } from './ui/courtGridSlot';
export { buildSchedulePageLayout } from './ui/schedulePageLayout';

// ============================================================================
// Schedule Grid Cell (configurable cell renderer)
// ============================================================================

export { buildScheduleGridCell, mapMatchUpToCellData, DEFAULT_SCHEDULE_CELL_CONFIG } from './ui/scheduleGridCell';

export { activateScheduleCellTypeAhead } from './ui/scheduleCellTypeAhead';
export type { ScheduleCellTypeAheadOptions } from './ui/scheduleCellTypeAhead';

// ============================================================================
// Types
// ============================================================================

export type {
  CatalogMatchUpItem,
  CatalogFilters,
  MatchUpSide,
  ScheduleDate,
  ScheduleIssue,
  ScheduleIssueSeverity,
  ScheduleIssueIndex,
  ScheduleIssueCounts,
  MatchUpCatalogGroupBy,
  ScheduledBehavior,
  SchedulingMode,
  PendingScheduleAction,
  CatalogMatchUpDragPayload,
  GridMatchUpDragPayload,
  SchedulePageDragPayload,
  SchedulePageConfig,
  SchedulePageState,
  SchedulePageChangeListener,
  UIPanel,
  ScheduleCellConfig,
  ScheduleCellField,
  ParticipantDisplayConfig,
  ScheduleCellData,
  ScheduleCellSide
} from './types';

// ============================================================================
// Convenience Factory
// ============================================================================

import type { SchedulePageConfig } from './types';
import { SchedulePageControl } from './controller/schedulePageControl';

export function createSchedulePage(config: SchedulePageConfig, container: HTMLElement): SchedulePageControl {
  const control = new SchedulePageControl(config);
  control.render(container);
  return control;
}
