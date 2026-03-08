/**
 * Temporal Grid - Main Entry Point
 *
 * Engine modules re-exported from tods-competition-factory via `temporal` namespace.
 * Controller, UI, and view state are local to courthive-components.
 */

// ============================================================================
// Engine (re-exported from factory)
// ============================================================================

export { TemporalEngine, TemporalEngine as TemporalGridEngine, temporal } from 'tods-competition-factory';

// ============================================================================
// View State (UI-specific, stays in courthive-components)
// ============================================================================

export {
  TemporalViewState,
  type ViewChangeEvent,
  type ViewChangeListener,
  type ViewStateSnapshot
} from './engine/viewState';

// ============================================================================
// Controller & View Projections
// ============================================================================

export {
  createTemporalGridControl,
  TemporalGridControl,
  type TemporalGridControlConfig
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
  type ResourceGroupingMode
} from './controller/viewProjections';

// ============================================================================
// UI Components
// ============================================================================

export {
  createTemporalGrid,
  TemporalGrid,
  type TemporalGridCallbacks,
  type TemporalGridConfig,
  type TemporalGridLabels
} from './ui/temporalGrid';

export { ModernTimePicker, showModernTimePicker, type TimePickerConfig } from './ui/modernTimePicker';

export {
  createBlockPopoverManager,
  type BlockPopoverManager,
  type BlockPopoverOptions,
  type EngineBlockPopoverOptions
} from './ui/blockPopover';

export { buildStatsBar, type StatsBarUpdate } from './ui/statsBar';

export { buildViewToolbar, VIEW_PRESETS, type ViewPreset } from './ui/viewToolbar';

export { showCourtAvailabilityModal, type CourtAvailabilityModalConfig } from './ui/courtAvailabilityModal';

// ============================================================================
// CourtTimeline (custom timeline component)
// ============================================================================

export { CourtTimeline } from './timeline/CourtTimeline';
export type {
  TimelineGroupData,
  TimelineItemData,
  TimelineOptions,
  TimelineCallbacks,
  MultiRowSpan
} from './timeline/types';

// ============================================================================
// Styles
// ============================================================================

// Import styles (consumers need to include this in their build)
import './ui/styles.css';
