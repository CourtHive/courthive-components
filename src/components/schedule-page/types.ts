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
  /** Human-readable structure label set by the factory (e.g. "Main",
   *  "Consolation", "Compass NE"). Optional because some structures
   *  ship without one — the catalog falls back to a labeled stage and
   *  finally the eventName alone so the "by structure" group header
   *  never shows a raw structureId GUID. */
  structureName?: string;
  /** Draw stage — MAIN / CONSOLATION / PLAYOFF / QUALIFYING / ROUND_ROBIN /
   *  etc. Rendered as a chip when present and not MAIN so a Quarterfinal in
   *  the consolation bracket reads distinctly from a Quarterfinal in the
   *  main draw of the same event. */
  stage?: string;
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
  /** Order of play for this date is published (drives the selector publish cue). */
  isPublished?: boolean;
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
  /** Structured conflict data for rich rendering */
  issueType?: string;
  prefix?: string;
  participants?: string;
  conflictParticipants?: string[];
  /** All matchUpIds involved in this conflict (for click-to-scroll fallback) */
  conflictMatchUpIds?: string[];
}

// ============================================================================
// Catalog GroupBy
// ============================================================================

export type MatchUpCatalogGroupBy = 'event' | 'draw' | 'round' | 'structure' | 'time';

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

/**
 * Persisted catalog filter state. The consumer can seed the store from a
 * previously captured snapshot (e.g. when re-entering the schedule page
 * within the same session) and subscribe to the store to write it back.
 */
export interface SchedulePageCatalogState {
  catalogSearchQuery?: string;
  catalogGroupBy?: MatchUpCatalogGroupBy;
  catalogFilters?: CatalogFilters;
  showCompleted?: boolean;
  showScheduled?: boolean;
}

export interface SchedulePageConfig {
  matchUpCatalog: CatalogMatchUpItem[];
  scheduleDates: ScheduleDate[];
  issues?: ScheduleIssue[];
  courtGridElement?: HTMLElement;
  /** Seed the store's catalog filter fields. Any field omitted falls back
   *  to the built-in default. */
  initialCatalogState?: SchedulePageCatalogState;
  /** Max height for the court grid viewport (e.g. '500px', '60vh'). Defaults to none (fills available space). */
  gridMaxHeight?: string;
  /** When true, the left column (date strip + issues panel) is not rendered at all. */
  hideLeft?: boolean;
  /** Which side to place the matchUp catalog. Defaults to 'right'. */
  catalogSide?: 'left' | 'right';
  scheduledBehavior?: ScheduledBehavior;
  schedulingMode?: SchedulingMode;
  /** Initial visibility of the active strip (one-row court summary above the grid). Defaults to true. */
  activeStripVisible?: boolean;
  /** Consumer-owned buttons rendered right-aligned in the court grid header.
   *  Consumer keeps live refs and mutates state (visibility, disabled, label) directly. */
  headerActions?: HTMLElement | HTMLElement[];
  /** Consumer-owned buttons rendered immediately before the "Court Grid" title.
   *  Use this slot for controls that act on content to the LEFT of the panel
   *  (e.g. a catalog show/hide toggle when the catalog sits on the left). */
  titleLeadingActions?: HTMLElement | HTMLElement[];
  /** Optional element rendered in place of the default "Court Grid" title.
   *  When set, replaces both the default text and the `.spl-center-title`
   *  wrapper — consumer owns layout (e.g. inject a search input here so
   *  the header reads as a single clean field). */
  titleSlot?: HTMLElement;
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
  showScheduled: boolean;
  scheduledBehavior: ScheduledBehavior;
  schedulingMode: SchedulingMode;
  pendingActions: PendingScheduleAction[];
  hasUnsavedChanges: boolean;
  leftCollapsed: boolean;
  hideLeft: boolean;
  activeStripVisible: boolean;
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
  gender?: string;

  sides?: ScheduleCellSide[];
  potentialParticipants?: any[][];

  schedule?: {
    scheduledTime?: string;
    startTime?: string;
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
    /**
     * Participant labels to render below the booking type. Pre-formatted
     * by the consumer so the cell stays display-only — e.g.
     * `["Smith / Jones (14:00–14:30)", "Ortiz (14:30–15:00)"]`.
     *
     * NOTE: as of 2026-06-01 there is no expected consumer. The Now/Live
     * strip uses a separate banner path (`ActiveStripCourtBlock.detail`),
     * and PRACTICE bookings are time-windowed — they don't currently
     * surface as grid cells, which have fixed row positions, not fixed
     * times. The field is kept available for future use (e.g. if a
     * tournament chooses to materialize PRACTICE bookings as cells) but
     * no production callsite populates it today.
     */
    registrations?: string[];
  };
}
