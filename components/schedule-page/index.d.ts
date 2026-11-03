import { SchedulePageControl } from './controller/schedulePageControl';
import { SchedulePageConfig } from './types';
/**
 * Schedule Page — Public API
 *
 * Main entry point for the schedule page component.
 */
export { SchedulePageControl } from './controller/schedulePageControl';
export { SchedulePageStore } from './engine/schedulePageStore';
export { filterMatchUpCatalog, groupMatchUpCatalog, visibleCatalogGroups, allCatalogGroupsCollapsed, computeBaseRoundByEvent, isCompletedStatus } from './domain/matchUpCatalogProjections';
export { buildScheduleIssueIndex } from './domain/scheduleIssues';
export { matchUpLabel, participantLabel, matchUpSearchKey, memberNamesLabel, deepClone } from './domain/utils';
export { computeActiveStrip, computeActiveStripCell, computeActiveStripDropTarget, computeReschedulePlacements } from './domain/activeStrip';
export type { ActiveStripCell, ActiveStripCellState, ActiveStripCourtColumn, ActiveStripDropCandidate, ActiveStripDropTarget, ActiveStripGrid, ActiveStripGridMatchUp, ActiveStripStatusOptions, RescheduleCandidate, ReschedulePlacement } from './domain/activeStrip';
export { buildScheduleDateStrip } from './ui/dateStrip';
export { buildScheduleIssuesPanel } from './ui/issuesPanel';
export { buildMatchUpCatalog } from './ui/matchUpCatalog';
export { buildMatchUpCard } from './ui/matchUpCard';
export type { CardTimeStatus, MatchUpCardCallbacks, MatchUpCardOptions } from './ui/matchUpCard';
export { applyRelatedHighlight, clearRelatedHighlight, RELATED_HIGHLIGHT } from './ui/matchUpHighlight';
export { buildScheduleInspectorPanel } from './ui/inspectorPanel';
export type { ScheduleInspectorPanelOptions } from './ui/inspectorPanel';
export { buildCourtGridSlot } from './ui/courtGridSlot';
export { buildSchedulePageLayout } from './ui/schedulePageLayout';
export { buildActiveStripPanel } from './ui/activeStrip';
export type { ActiveStripPanel, ActiveStripPanelCallbacks, ActiveStripPanelData, ActiveStripPanelOptions, ActiveStripCourtMeta, ActiveStripCourtBlock, ActiveStripUpcomingBlock } from './ui/activeStrip';
export { buildScheduleGridCell, mapMatchUpToCellData, DEFAULT_SCHEDULE_CELL_CONFIG } from './ui/scheduleGridCell';
export { activateScheduleCellTypeAhead } from './ui/scheduleCellTypeAhead';
export type { ScheduleCellTypeAheadOptions } from './ui/scheduleCellTypeAhead';
export type { CatalogPlacement, InspectorPlacement, InspectorGeometry, CatalogMatchUpItem, CatalogFilters, MatchUpSide, ScheduleDate, ScheduleIssue, ScheduleIssueSeverity, ScheduleIssueIndex, ScheduleIssueCounts, MatchUpCatalogGroupBy, ScheduledBehavior, SchedulingMode, PendingScheduleAction, CatalogMatchUpDragPayload, GridMatchUpDragPayload, SchedulePageDragPayload, SchedulePageConfig, SchedulePageCatalogState, SchedulePageState, SchedulePageChangeListener, UIPanel, ScheduleCellConfig, ScheduleCellField, ParticipantDisplayConfig, ScheduleCellData, ScheduleCellSide } from './types';
export declare function createSchedulePage(config: SchedulePageConfig, container: HTMLElement): SchedulePageControl;
