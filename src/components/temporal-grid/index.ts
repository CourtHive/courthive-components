/**
 * Temporal Grid - Main Entry Point
 * 
 * Export all public APIs for the temporal resource grid system.
 */

// ============================================================================
// Engine (Core State Machine)
// ============================================================================

export { TemporalGridEngine } from './engine/temporalGridEngine';
export { BLOCK_TYPES } from './engine/types';
export type * from './engine/types';
export {
  buildDayRange,
  clampToDayRange,
  courtDayKey,
  courtKey,
  venueKey,
  venueDayKey,
  deriveRailSegments,
  diffMinutes,
  extractDay,
  mergeAdjacentSegments,
  overlappingRange,
  rangesOverlap,
  resolveStatus,
  validateSegments,
} from './engine/railDerivation';
export {
  calculateCapacityStats,
  compareCapacityCurves,
  filterCapacityCurve,
  generateCapacityCurve,
  sampleCapacityCurve,
  type CapacityDiff,
  type CapacityStats,
} from './engine/capacityCurve';

// ============================================================================
// Conflict Evaluators
// ============================================================================

export {
  adjacentBlockEvaluator,
  blockDurationEvaluator,
  courtOverlapEvaluator,
  createFollowByEvaluator,
  dayBoundaryEvaluator,
  defaultEvaluators,
  EvaluatorRegistry,
  formatConflicts,
  getHighestSeverity,
  groupConflictsBySeverity,
  lightingEvaluator,
  maintenanceWindowEvaluator,
  matchWindowEvaluator,
} from './engine/conflictEvaluators';

// ============================================================================
// Factory Bridge
// ============================================================================

export {
  applyTemporalAvailabilityToTournamentRecord,
  buildSchedulingProfileFromUISelections,
  calculateCourtHours,
  mergeOverlappingAvailability,
  railsToDateAvailability,
  todsAvailabilityToBlocks,
  validateDateAvailability,
  validateSchedulingProfile,
  type BridgeConfig,
  type SchedulingProfile,
  type SchedulingProfileItem,
  type SchedulingProfileRound,
  type SchedulingSelection,
  type TodsDateAvailability,
  type TodsCourt,
  type TodsVenue,
} from './bridge/temporalGridFactoryBridge';

// ============================================================================
// Controller & View Projections
// ============================================================================

export {
  createTemporalGridControl,
  TemporalGridControl,
  type TemporalGridControlConfig,
} from './controller/temporalGridControl';

export {
  buildBlockEvents,
  buildCapacityVisualization,
  buildConflictEvents,
  buildEventsFromTimelines,
  buildVenueGroups,
  buildHiddenDates,
  buildResourcesFromTimelines,
  buildTimeSlotConfig,
  buildTimelineWindowConfig,
  DEFAULT_COLOR_SCHEME,
  filterEventsByTimeRange,
  filterResourcesByVenue,
  generateBlockPatternCSS,
  isBlockEvent,
  isConflictEvent,
  isSegmentEvent,
  parseBlockEventId,
  parseResourceId,
  sortResources,
  type BlockColorScheme,
  type CalendarEvent,
  type CalendarResource,
  type TimelineGroup,
  type TimelineItem,
  type ProjectionConfig,
  type ResourceGroupingMode,
} from './controller/viewProjections';

// ============================================================================
// UI Components
// ============================================================================

export {
  createTemporalGrid,
  TemporalGrid,
  type TemporalGridConfig,
} from './ui/temporalGrid';

export {
  ModernTimePicker,
  showModernTimePicker,
  type TimePickerConfig,
} from './ui/modernTimePicker';

export {
  createBlockPopoverManager,
  type BlockPopoverManager,
  type BlockPopoverOptions,
  type EngineBlockPopoverOptions,
} from './ui/blockPopover';

export {
  buildStatsBar,
  type StatsBarUpdate,
} from './ui/statsBar';

export {
  buildViewToolbar,
  VIEW_PRESETS,
  type ViewPreset,
} from './ui/viewToolbar';

export {
  showCourtAvailabilityModal,
  type CourtAvailabilityModalConfig,
} from './ui/courtAvailabilityModal';

// ============================================================================
// Styles
// ============================================================================

// Import styles (consumers need to include this in their build)
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import './ui/styles.css';
