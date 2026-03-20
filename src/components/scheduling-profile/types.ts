/**
 * Scheduling Profile — Type Definitions
 *
 * All interfaces for the scheduling profile builder component.
 * The SchedulingProfile shape matches the factory's `scheduleProfileRounds()` input.
 */

// ============================================================================
// Core Profile Types (matches factory schema)
// ============================================================================

export interface RoundSegment {
  segmentNumber: number;
  segmentsCount: number;
}

export interface RoundProfile {
  tournamentId: string;
  eventId: string;
  eventName?: string;
  drawId: string;
  drawName?: string;
  structureId: string;
  structureType?: string;
  roundNumber: number;
  roundName?: string;
  roundSegment?: RoundSegment;
  notBeforeTime?: string;
  sortOrder?: number;
  matchCountEstimate?: number;
}

export interface VenueSchedule {
  venueId: string;
  rounds: RoundProfile[];
}

export interface ScheduleDay {
  scheduleDate: string;
  venues: VenueSchedule[];
}

export type SchedulingProfile = ScheduleDay[];

// ============================================================================
// Venue Info
// ============================================================================

export interface VenueInfo {
  venueId: string;
  name: string;
}

// ============================================================================
// Round Catalog
// ============================================================================

export interface CatalogRoundItem {
  tournamentId: string;
  eventId: string;
  eventName: string;
  drawId: string;
  drawName?: string;
  structureId: string;
  structureType?: string;
  roundNumber: number;
  roundName?: string;
  matchCountEstimate?: number;
}

export type CatalogGroupBy = 'event' | 'draw' | 'round';

export type PlannedRoundBehavior = 'dim' | 'hide' | 'navigate';

// ============================================================================
// Selection & Location
// ============================================================================

export interface RoundKey {
  tournamentId: string;
  eventId: string;
  drawId: string;
  structureId: string;
  roundNumber: number;
}

export interface RoundLocator {
  date: string;
  venueId: string;
  index: number;
  roundKey: RoundKey;
  roundSegment?: RoundSegment;
}

// ============================================================================
// Drag & Drop
// ============================================================================

export interface CatalogDragPayload {
  type: 'CATALOG_ROUND';
  roundRef: CatalogRoundItem;
}

export interface PlannedDragPayload {
  type: 'PLANNED_ROUND';
  locator: RoundLocator;
}

export type DragPayload = CatalogDragPayload | PlannedDragPayload;

export interface DropTarget {
  date: string;
  venueId: string;
  index: number;
}

export interface DropResult {
  ok: boolean;
  profile: SchedulingProfile;
}

// ============================================================================
// Validation
// ============================================================================

export type Severity = 'ERROR' | 'WARN' | 'INFO';

export type ValidationCode =
  | 'DATE_UNAVAILABLE'
  | 'DUPLICATE_ROUND'
  | 'DUPLICATE_SEGMENT'
  | 'INVALID_SEGMENT_CONFIG'
  | 'ROUND_ORDER_VIOLATION'
  | 'DEPENDENCY_VIOLATION'
  | 'DAY_OVERLOAD'
  | 'DROP_REJECTED';

export type FixActionKind =
  | 'JUMP_TO_ITEM'
  | 'OPEN_TEMPORAL_GRID'
  | 'MOVE_ITEM_AFTER'
  | 'MOVE_ITEM_BEFORE';

export interface FixAction {
  kind: FixActionKind;
  label: string;
  locator?: RoundLocator;
  after?: RoundLocator;
  before?: RoundLocator;
  date?: string;
}

export interface ValidationResult {
  code: ValidationCode;
  severity: Severity;
  message: string;
  context: {
    date?: string;
    venueId?: string;
    scope?: string;
    drawId?: string;
    structureId?: string;
    locator?: RoundLocator;
    prerequisite?: RoundLocator;
    demandMinutes?: number;
    capacityMinutes?: number;
    ratio?: number;
    reason?: string;
  };
  fixActions?: FixAction[];
}

// ============================================================================
// Issue Index
// ============================================================================

export interface SeverityCounts {
  total: number;
  ERROR: number;
  WARN: number;
  INFO: number;
}

export interface IssueIndex {
  all: ValidationResult[];
  bySeverity: Record<Severity, ValidationResult[]>;
  byDate: Record<string, ValidationResult[]>;
  byVenue: Record<string, ValidationResult[]>;
  byDraw: Record<string, ValidationResult[]>;
  counts: {
    total: number;
    ERROR: number;
    WARN: number;
    INFO: number;
    byDate: Record<string, SeverityCounts>;
    byVenue: Record<string, SeverityCounts>;
    byDraw: Record<string, SeverityCounts>;
  };
}

// ============================================================================
// Store State
// ============================================================================

export interface ProfileStoreState {
  profileDraft: SchedulingProfile;
  venues: VenueInfo[];
  roundCatalog: CatalogRoundItem[];
  schedulableDates: string[];
  activeDates?: string[];
  selectedDate: string | null;
  selectedLocator: RoundLocator | null;
  ruleResults: ValidationResult[];
  issueIndex: IssueIndex;
  catalogSearchQuery: string;
  catalogGroupBy: CatalogGroupBy;
  plannedRoundBehavior: PlannedRoundBehavior;
}

export type ProfileChangeListener = (state: ProfileStoreState) => void;

// ============================================================================
// Validation Adapter (injected temporal/demand interfaces)
// ============================================================================

export interface TemporalAdapter {
  isDateAvailable: (date: string) => { ok: boolean; reason?: string };
  getDayCapacityMinutes?: (date: string) => number;
}

export interface DemandAdapter {
  estimateDayDemandMinutes: (date: string, profile: SchedulingProfile) => number;
}

export interface DependencyAdapter {
  /**
   * Returns roundKeyStrings for all rounds that must complete
   * before the given round can proceed.
   * Key format: "tournamentId|eventId|drawId|structureId|roundNumber"
   */
  getRoundDependencies: (roundKeyString: string) => string[];
}

// ============================================================================
// Configuration
// ============================================================================

export interface SchedulingProfileConfig {
  venues: VenueInfo[];
  roundCatalog: CatalogRoundItem[];
  schedulableDates: string[];
  activeDates?: string[];
  /** When true, the left column (date strip + issues panel) is not rendered. */
  hideLeft?: boolean;
  /** Which side to place the round catalog. Defaults to 'right'. */
  catalogSide?: 'left' | 'right';
  initialProfile?: SchedulingProfile;
  selectedDate?: string;
  temporalAdapter?: TemporalAdapter;
  demandAdapter?: DemandAdapter;
  dependencyAdapter?: DependencyAdapter;
  venueOrder?: string[];
  plannedRoundBehavior?: PlannedRoundBehavior;
  onProfileChanged?: (profile: SchedulingProfile) => void;
  onFixAction?: (action: FixAction) => void;
}

// ============================================================================
// UI Panel Pattern
// ============================================================================

export interface UIPanel<T = unknown> {
  element: HTMLElement;
  update: (state: T) => void;
  destroy?: () => void;
}

// ============================================================================
// Flattened round (used internally by validation)
// ============================================================================

export interface FlattenedRound {
  round: RoundProfile;
  locator: RoundLocator;
}
