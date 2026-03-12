/**
 * Schedule Page — Type Definitions
 *
 * All interfaces for the schedule page component.
 * The component provides layout + matchUp catalog; the consumer injects the court grid.
 */

// ============================================================================
// MatchUp Side (participant info)
// ============================================================================

export interface MatchUpSide {
  participantName?: string;
  participantId?: string;
  seedNumber?: number;
  ranking?: number;
}

// ============================================================================
// Catalog MatchUp Item
// ============================================================================

export interface CatalogMatchUpItem {
  matchUpId: string;
  eventId: string;
  eventName: string;
  drawId: string;
  drawName?: string;
  structureId: string;
  roundNumber: number;
  roundName?: string;
  matchUpFormat?: string;
  matchUpType?: 'SINGLES' | 'DOUBLES';
  matchUpStatus?: string;
  gender?: string;
  sides?: MatchUpSide[];
  isScheduled: boolean;
  scheduledTime?: string;
  scheduledCourtName?: string;
}

// ============================================================================
// Schedule Date
// ============================================================================

export interface ScheduleDate {
  date: string;
  isActive: boolean;
  matchUpCount?: number;
  issueCount?: number;
}

// ============================================================================
// Schedule Issue
// ============================================================================

export type ScheduleIssueSeverity = 'ERROR' | 'WARN' | 'INFO';

export interface ScheduleIssue {
  severity: ScheduleIssueSeverity;
  message: string;
  matchUpId?: string;
  date?: string;
}

// ============================================================================
// Catalog GroupBy
// ============================================================================

export type MatchUpCatalogGroupBy = 'event' | 'draw' | 'round' | 'structure';

// ============================================================================
// Catalog Filters
// ============================================================================

export interface CatalogFilters {
  eventType?: string;
  eventName?: string;
  drawName?: string;
  gender?: string;
  roundName?: string;
}

// ============================================================================
// Scheduled Behavior
// ============================================================================

export type ScheduledBehavior = 'dim' | 'hide';

// ============================================================================
// Scheduling Mode
// ============================================================================

/**
 * Controls how drop/remove actions are committed:
 * - 'immediate': each drop fires the consumer callback right away (e.g. executionQueue per action)
 * - 'bulk': actions accumulate in a pending queue; consumer calls save() to flush
 */
export type SchedulingMode = 'immediate' | 'bulk';

export interface PendingScheduleAction {
  kind: 'schedule' | 'unschedule';
  matchUpId: string;
  /** Present for 'schedule' actions — the full item that was dropped */
  matchUp?: CatalogMatchUpItem;
  /** The DragEvent from the drop, if available */
  event?: DragEvent;
}

// ============================================================================
// Drag & Drop
// ============================================================================

export interface CatalogMatchUpDragPayload {
  type: 'CATALOG_MATCHUP';
  matchUp: CatalogMatchUpItem;
}

export interface GridMatchUpDragPayload {
  type: 'GRID_MATCHUP';
  matchUp: CatalogMatchUpItem;
  sourceTime?: string;
  sourceCourt?: string;
}

export type SchedulePageDragPayload = CatalogMatchUpDragPayload | GridMatchUpDragPayload;

// ============================================================================
// Configuration
// ============================================================================

export interface SchedulePageConfig {
  matchUpCatalog: CatalogMatchUpItem[];
  scheduleDates: ScheduleDate[];
  issues?: ScheduleIssue[];
  courtGridElement?: HTMLElement;
  /** Max height for the court grid viewport (e.g. '500px', '60vh'). Defaults to none (fills available space). */
  gridMaxHeight?: string;
  scheduledBehavior?: ScheduledBehavior;
  schedulingMode?: SchedulingMode;
  onDateSelected?: (date: string) => void;
  onMatchUpDrop?: (payload: SchedulePageDragPayload, event: DragEvent) => void;
  onMatchUpRemove?: (matchUpId: string) => void;
  onMatchUpSelected?: (matchUp: CatalogMatchUpItem | null) => void;
  /** Called in 'bulk' mode when the user triggers save — receives all pending actions */
  onBulkSave?: (actions: PendingScheduleAction[]) => void;
}

// ============================================================================
// Store State
// ============================================================================

export interface SchedulePageState {
  matchUpCatalog: CatalogMatchUpItem[];
  scheduleDates: ScheduleDate[];
  issues: ScheduleIssue[];
  selectedDate: string | null;
  selectedMatchUp: CatalogMatchUpItem | null;
  catalogSearchQuery: string;
  catalogGroupBy: MatchUpCatalogGroupBy;
  catalogFilters: CatalogFilters;
  showCompleted: boolean;
  scheduledBehavior: ScheduledBehavior;
  schedulingMode: SchedulingMode;
  pendingActions: PendingScheduleAction[];
  hasUnsavedChanges: boolean;
  leftCollapsed: boolean;
}

export type SchedulePageChangeListener = (state: SchedulePageState) => void;

// ============================================================================
// Issue Index
// ============================================================================

export interface ScheduleIssueCounts {
  total: number;
  ERROR: number;
  WARN: number;
  INFO: number;
}

export interface ScheduleIssueIndex {
  all: ScheduleIssue[];
  bySeverity: Record<ScheduleIssueSeverity, ScheduleIssue[]>;
  byDate: Record<string, ScheduleIssue[]>;
  counts: ScheduleIssueCounts;
  countsByDate: Record<string, ScheduleIssueCounts>;
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
// Schedule Grid Cell — Configurable Cell Renderer
// ============================================================================

/** Field identifiers for the 3-zone cell layout */
export type ScheduleCellField =
  | 'time'
  | 'eventRound'
  | 'participants'
  | 'score'
  | 'matchUpStatus'
  | 'matchUpFormat'
  | 'umpire';

/** Controls how participant names are rendered inside a cell */
export interface ParticipantDisplayConfig {
  nameFormat?: 'full' | 'last' | 'lastFirst' | 'firstLast';
  showSeed?: boolean;
  showRanking?: boolean;
  showNationality?: boolean;
  boldWinner?: boolean;
  showPotentials?: boolean;
}

/**
 * JSON-serializable cell configuration.
 * 3 fixed zones (header, body, footer), each containing an ordered array of field identifiers.
 * Safe for factory extensions and publishing data.
 */
export interface ScheduleCellConfig {
  header: ScheduleCellField[];
  body: ScheduleCellField[];
  footer: ScheduleCellField[];
  participantDisplay?: ParticipantDisplayConfig;
}

/** Participant info for a single side of a matchUp cell */
export interface ScheduleCellSide {
  sideNumber?: number;
  participantName?: string;
  participantId?: string;
  seedNumber?: number;
  ranking?: number;
  nationality?: string;
  /** Team name when participant is a member of a team (tie/team event) */
  teamName?: string;
  /** True if this side is a BYE (no participant) */
  bye?: boolean;
}

/**
 * Flat data shape the cell renderer consumes — mapped from factory matchUp objects.
 * Decouples the renderer from the factory's nested matchUp shape.
 */
export interface ScheduleCellData {
  matchUpId: string;
  drawId?: string;
  eventName?: string;
  roundName?: string;
  matchUpFormat?: string;
  matchUpType?: string;
  matchUpStatus?: string;
  winningSide?: number;

  sides?: ScheduleCellSide[];
  potentialParticipants?: any[][];

  schedule?: {
    scheduledTime?: string;
    timeModifiers?: string[];
    courtAnnotation?: string;
    courtId?: string;
    courtOrder?: number;
    venueId?: string;
  };

  score?: {
    scoreStringSide1?: string;
    scoreStringSide2?: string;
  };

  umpire?: string;

  /** Conflict state injected by proConflicts */
  scheduleState?: string;
  issueType?: string;
  issueIds?: string[];

  /** Blocked cell (alternative to matchUp) */
  isBlocked?: boolean;
  booking?: {
    bookingType?: string;
    rowCount?: number;
    notes?: string;
  };
}
