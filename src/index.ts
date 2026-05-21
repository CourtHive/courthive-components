export { renderParticipant } from './components/renderStructure/renderParticipant';
export { renderParticipantInput } from './components/renderStructure/renderParticipantInput';
export { renderRoundHeader } from './components/renderStructure/renderRoundHeader';
export { renderStructure } from './components/renderStructure/renderStructure';
export { renderContainer } from './components/renderStructure/renderContainer';
export { renderMatchUp } from './components/renderStructure/renderMatchUp';
export { compositions } from './compositions/compositions';
export { resolvePublishedComposition } from './compositions/resolvePublishedComposition';
export type { DisplayExtensionValue } from './compositions/resolvePublishedComposition';
export { renderRound } from './components/renderStructure/renderRound';

// Schematic Structure — compact bracket preview (no participant details)
export {
  renderSchematicStructure,
  renderSchematicRound,
  renderSchematicMatchUp
} from './components/renderSchematicStructure';
export type { SchematicMatchUp } from './components/renderSchematicStructure';

export { cModal } from './components/modal/cmodal';

// Mock participants generator modal
export { getMockParticipantsModal } from './components/modal/mockParticipants';
export type { MockParticipantsConfig } from './components/modal/mockParticipants';

// Generate teams modal
export { getGenerateTeamsModal } from './components/modal/generateTeamsModal';
export type { GenerateTeamsConfig } from './components/modal/generateTeamsModal';

// PDF composition modals
export { openCompositionEditorModal } from './components/modal/compositionEditorModal';
export type { CompositionEditorResult, CompositionEditorOptions } from './components/modal/compositionEditorModal';
export { openScheduleCellConfigModal } from './components/modal/scheduleCellConfigModal';
export type { ScheduleCellDisplayConfig, ScheduleCellConfigOptions } from './components/modal/scheduleCellConfigModal';

// Match format selector modal
export { getMatchUpFormatModal } from './components/matchUpFormat/matchUpFormat';

// Age category editor modal
export { getAgeCategoryModal } from './components/categories/ageCategory/ageCategory';
export type { AgeCategoryConfig } from './components/categories/ageCategory/ageCategory';
export { getCategoryModal } from './components/categories/category/category';
export type { CategoryConfig, Category } from './components/categories/category/category';

// Flight profile editor modal
export { getFlightProfileModal } from './components/flightProfile/flightProfileNew';
export type { FlightProfileConfig } from './components/flightProfile/flightProfileNew';

// Scoring modals
export { scoringModal } from './components/scoring/scoringModal';
export { setScoringConfig, getScoringConfig, resetScoringConfig } from './components/scoring/config';
export type { ScoringModalParams, ScoringModalLabels, ScoreOutcome, SetScore } from './components/scoring/types';

// Dynamic Sets state management API (pure functions, testable)
export {
  getSetFormatForIndex,
  isSetTiebreakOnly,
  isSetTimed,
  getMaxAllowedScore,
  isSetComplete,
  getSetWinner,
  isMatchComplete,
  getMatchWinner,
  calculateComplement,
  shouldApplySmartComplement,
  shouldShowTiebreak,
  shouldCreateNextSet,
  buildSetScore
} from './components/scoring/logic/dynamicSetsLogic';
export type { SetFormat, MatchUpConfig, SmartComplementResult } from './components/scoring/logic/dynamicSetsLogic';

// Drawer component
export { drawer, initDrawer } from './components/drawer/drawer';
export type { DrawerOptions } from './components/drawer/drawer';

// Theme variables (CSS bundled in courthive-components.css)
import './styles/theme.css';
import './styles/themes.css';
import './styles/draw.css';
import './styles/schematic.css';
import './components/topology-builder/ui/topology-builder.css';
import './styles/components/buttons.css';
import './styles/components/sp-buttons.css';
import './styles/components/forms.css';
import './styles/components/switch.css';
import './styles/components/ui.css';

// Notes toolbar (rich text editor toolbar)
import './components/notes-toolbar/notesToolbar.css';
export { notesToolbar, updateToolbarState, updateHeadingSelect } from './components/notes-toolbar/notesToolbar';
export type { NotesToolbarOptions } from './components/notes-toolbar/notesToolbar';

// Tippy.js popover (CSS bundled in courthive-components.css)
import './styles/tippy.css';
import './styles/tipster.css';
export { tipster, destroyTipster } from './components/popover/tipster';

// Court/field SVG factories + sport-resolution helpers
import './components/courts/courts.css';
export {
  tennisCourt,
  basketballCourt,
  baseballDiamond,
  hockeyRink,
  pickleballCourt,
  badmintonCourt,
  padelCourt,
  createCourtSvg,
  resolveCourtSport,
  sportFromMatchUpFormat,
  COURT_SVG_RESOURCE_SUB_TYPE
} from './components/courts';
export type { CourtSport } from './components/courts';

// Card helpers (shared by tournament-card, event-card, venue-card)
export {
  formatAddress,
  formatVenueLocation,
  formatDateRange,
  extractImageURL,
  extractCourtSvgSport,
  buildCardSkeleton
} from './helpers/cards';
export type {
  CardAddress,
  CardOnlineResource,
  CardVenueLike,
  CardSkeletonConfig
} from './helpers/cards';

// Tournament Card — card-grid renderer for tournament listings
import './components/tournament-card/tournament-card.css';
export {
  buildTournamentCard,
  buildSkeletonCard,
  mapTournamentToCardData,
  resolveTournamentStatus,
  formatFeeRange,
  DEFAULT_TOURNAMENT_CARD_CONFIG,
  mergeTournamentCardConfig
} from './components/tournament-card';
export type {
  MapTournamentOptions,
  StatusResolverInput,
  TournamentCardCallbacks,
  TournamentCardConfig,
  TournamentCardCornerField,
  TournamentCardData,
  TournamentCardField,
  TournamentEntryFee,
  TournamentStatusKind,
  TournamentStatusPill
} from './components/tournament-card';

// Venue Card — card-grid renderer for tournament venues
import './components/venue-card/venue-card.css';
export {
  buildVenueCard,
  buildVenueSkeletonCard,
  mapVenueToCardData,
  DEFAULT_VENUE_CARD_CONFIG,
  mergeVenueCardConfig
} from './components/venue-card';
export type {
  MapVenueOptions,
  VenueCardCallbacks,
  VenueCardConfig,
  VenueCardCornerField,
  VenueCardData,
  VenueCardField
} from './components/venue-card';

// Court Card — card-grid renderer for venue courts
import './components/court-card/court-card.css';
export {
  buildCourtCard,
  buildCourtSkeletonCard,
  mapCourtToCardData,
  DEFAULT_COURT_CARD_CONFIG,
  mergeCourtCardConfig
} from './components/court-card';
export type {
  CourtCardCallbacks,
  CourtCardConfig,
  CourtCardCornerField,
  CourtCardData,
  CourtCardField,
  MapCourtOptions
} from './components/court-card';

// Competitiveness — segmented bar + donut showing competitiveness distribution
import './components/competitivenessBar/competitiveness-bar.css';
import './components/competitivenessBar/competitiveness-donut.css';
export {
  buildCompetitivenessBar,
  buildCompetitivenessDonut,
  aggregateCompetitiveness,
  totalBuckets,
  COMPETITIVENESS_BUCKETS
} from './components/competitivenessBar';
export type {
  BuildCompetitivenessBarResult,
  BuildCompetitivenessDonutResult,
  CompetitivenessBucket,
  CompetitivenessBuckets
} from './components/competitivenessBar';

// Draw Card — card-grid renderer for the per-event draws list
import './components/draw-card/draw-card.css';
export {
  buildDrawCard,
  buildDrawSkeletonCard,
  mapDrawDefinitionToCardData,
  DEFAULT_DRAW_CARD_CONFIG,
  mergeDrawCardConfig
} from './components/draw-card';
export type {
  DrawCardCallbacks,
  DrawCardConfig,
  DrawCardCornerField,
  DrawCardData,
  DrawCardField,
  DrawMatchUpCounts,
  DrawStatusKind,
  DrawStatusPill,
  MapDrawOptions
} from './components/draw-card';

// Event Card — card-grid renderer for tournament events
import './components/event-card/event-card.css';
export {
  buildEventCard,
  buildEventSkeletonCard,
  mapEventToCardData,
  resolveEventStatus,
  DEFAULT_EVENT_CARD_CONFIG,
  EVENT_CARD_LIGHT_MODE_THRESHOLD,
  mergeEventCardConfig
} from './components/event-card';
export type {
  EventCardCallbacks,
  EventCardConfig,
  EventCardCornerField,
  EventCardData,
  EventCardField,
  EventGenderKind,
  EventMatchUpCounts,
  EventStatusKind,
  EventStatusPill,
  EventStatusResolverInput,
  EventTypeKind,
  MapEventOptions
} from './components/event-card';

// Version API
export { courthiveComponentsVersion } from './version';

// Constants
export { MATCH_FORMATS } from './constants/matchUpFormats';
export type { MatchUpFormatCode } from './constants/matchUpFormats';

// Form renderers (import styles first)
import './components/forms/styles';
export { renderButtons } from './components/forms/renderButtons';
export { renderField, renderOptions } from './components/forms/renderField';
export { renderForm } from './components/forms/renderForm';
export { renderMenu } from './components/forms/renderMenu';
export { validator } from './components/forms/renderValidator';

// Form validators
export * as validators from './validators';

// State management
export { DrawStateManager } from './helpers/drawStateManager';
export type { RenderCallback } from './helpers/drawStateManager';

// Search input helper — adds a consistent (x) clear button to bare <input>
// search fields. Used by the scheduling-profile and schedule-page catalogs
// internally; exported so TMX and other consumers can match the styling on
// inputs that don't go through controlBar.
export { wrapSearchWithClear, syncClearVisibility } from './helpers/searchClearButton';

// Burst Chart — D3v7 Sunburst Tournament Visualization
export { burstChart } from './components/burstChart/burstChart';
export type {
  SunburstDrawData,
  SunburstMatchUp,
  SunburstSide,
  SegmentData,
  BurstChartEventHandlers,
  BurstChartOptions,
  BurstChartInstance
} from './components/burstChart/burstChart';
export { fromFactoryDrawData, fromLegacyDraw } from './components/burstChart/matchUpTransform';

// Rating Distribution Chart — histogram + donut visualization for the format wizard
// (data shape comes from tods-competition-factory: RatingDistributionStats / DistributionBin)
export { buildRatingDistributionChart } from './components/ratingDistributionChart';
export type {
  RatingDistributionChartOptions,
  RatingDistributionChartMode
} from './components/ratingDistributionChart';

// Control Bar (CSS bundled in courthive-components.css)
import './components/controlBar/controlBar.css';
export { controlBar } from './components/controlBar/controlBar';
export { toggleOverlay } from './components/controlBar/toggleOverlay';

// Buttons
export { dropDownButton } from './components/button/dropDownButton';
export { barButton } from './components/button/barButton';

// Select Item modal
export { selectItem } from './components/modal/selectItem';
export type { SelectItemParams, SelectItemOption } from './components/modal/selectItem';

// Scheduling Profile Builder
export {
  SchedulingProfileControl,
  ProfileStore,
  createSchedulingProfile,
  validateProfile,
  buildIssueIndex,
  applyDropCommit,
  filterCatalog,
  groupCatalog,
  getPlannedRoundKeys,
  getVenueRounds,
  getRoundAt,
  findIssuesForLocator,
  maxSeverity,
  buildDateStrip,
  buildVenueBoard,
  buildRoundCatalog,
  buildIssuesPanel,
  buildRoundCard,
  createCardPopoverManager,
  buildSchedulingProfileLayout
} from './components/scheduling-profile';

// Temporal Grid
import './components/temporal-grid/ui/styles.css';
export { createTemporalGrid, TemporalGrid, showCourtAvailabilityModal } from './components/temporal-grid';
export type { TemporalGridConfig, TemporalGridLabels } from './components/temporal-grid';

// Topology Builder
export {
  TopologyBuilderControl,
  TopologyStore,
  topologyToDrawOptions,
  validateTopology,
  generatePreviewMatchUps,
  standardTemplates,
  buildTopologyCanvas,
  buildStructureCard,
  getPortPosition,
  buildNodeEditor,
  buildEdgeEditor,
  buildToolbar,
  buildTopologyBuilderLayout
} from './components/topology-builder';
export type {
  TopologyNode,
  TopologyEdge,
  TopologyState,
  TopologyChangeListener,
  TopologyBuilderConfig,
  TopologyTemplate,
  DrawOptionsResult,
  ValidationError
} from './components/topology-builder';

export type {
  SchedulingProfile,
  ScheduleDay,
  VenueSchedule,
  RoundProfile,
  RoundSegment,
  VenueInfo,
  CatalogRoundItem,
  CatalogGroupBy,
  RoundKey,
  RoundLocator,
  DragPayload,
  DropTarget,
  DropResult,
  Severity,
  ValidationCode,
  FixAction,
  ValidationResult,
  IssueIndex,
  ProfileStoreState,
  SchedulingProfileConfig,
  TemporalAdapter,
  DemandAdapter,
  DependencyAdapter,
  UIPanel
} from './components/scheduling-profile';

// Schedule Page
import './components/schedule-page/ui/schedule-page.css';
export {
  SchedulePageControl,
  SchedulePageStore,
  createSchedulePage,
  filterMatchUpCatalog,
  groupMatchUpCatalog,
  isCompletedStatus,
  buildScheduleIssueIndex,
  matchUpLabel,
  participantLabel,
  matchUpSearchKey,
  buildScheduleDateStrip,
  buildScheduleIssuesPanel,
  buildMatchUpCatalog,
  buildMatchUpCard,
  buildScheduleInspectorPanel,
  buildCourtGridSlot,
  buildSchedulePageLayout,
  buildScheduleGridCell,
  mapMatchUpToCellData,
  DEFAULT_SCHEDULE_CELL_CONFIG,
  activateScheduleCellTypeAhead,
  buildActiveStripPanel
} from './components/schedule-page';

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
  SchedulePageCatalogState,
  SchedulePageState,
  SchedulePageChangeListener,
  ScheduleCellConfig,
  ScheduleCellField,
  ParticipantDisplayConfig,
  ScheduleCellData,
  ScheduleCellSide,
  ScheduleCellTypeAheadOptions,
  ActiveStripPanel,
  ActiveStripPanelCallbacks,
  ActiveStripPanelData,
  ActiveStripPanelOptions,
  ActiveStripCourtMeta
} from './components/schedule-page';

// Composition Editor
export { createCompositionEditor } from './components/composition-editor/compositionEditor';
export { CompositionEditorStore } from './components/composition-editor/compositionEditorStore';
export type {
  CompositionEditorConfig,
  SavedComposition,
  CompositionEditorState,
  CompositionEditorListener,
  SectionId as CompositionEditorSectionId,
  EditorPanel as CompositionEditorPanel
} from './components/composition-editor/compositionEditorTypes';

// Print Composition Editor (pdf-factory CompositionConfig — distinct from
// the matchUp-visualization Composition above)
export { createPrintCompositionEditor } from './components/print-composition-editor/printCompositionEditor';
export type {
  PrintCompositionConfig,
  PrintCompositionEditorConfig,
  PrintCompositionEditorHandle,
  PrintType,
  HeaderLayout as PrintHeaderLayout,
  FooterLayout as PrintFooterLayout,
  PageSize as PrintPageSize,
  PageOrientation as PrintPageOrientation
} from './components/print-composition-editor/printCompositionEditorTypes';

// Team Scorecard
import './components/scorecard/scorecard.css';
export { renderScorecard, renderTeamVsHeader, updateTieScore } from './components/scorecard';
export type { ScorecardOptions, TeamVsOptions } from './components/scorecard';

// Inline Scoring
import './components/inline-scoring/inline-scoring.css';
export {
  InlineScoringManager,
  renderInlineMatchUp,
  engineToMatchUp,
  createInlineScoringFooter
} from './components/inline-scoring';
export type {
  InlineScoringMode,
  InlineScoringConfig,
  InlineScoringCallbacks,
  InlineScoringEngineState
} from './components/inline-scoring';

// Interactive Scoring Shell (courthive-public Phase 2)
import './components/interactive-scoring/interactive-scoring.css';
export { buildInteractiveScoringShell } from './components/interactive-scoring';
export type {
  InteractiveScoringShell,
  InteractiveScoringShellConfig,
  StateChangedDetail
} from './components/interactive-scoring';

// Policy Catalog
import './components/policy-catalog/ui/policy-catalog.css';
import './components/policy-catalog/editors/scheduling/scheduling-editor.css';
export {
  PolicyCatalogControl,
  PolicyCatalogStore,
  createPolicyCatalog,
  filterPolicyCatalog,
  groupPolicyCatalog,
  POLICY_TYPE_METADATA,
  POLICY_TYPE_GROUPS,
  getPolicyTypeMeta,
  buildPolicyCatalogPanel,
  buildEditorShell,
  buildPolicyCatalogLayout,
  buildJsonEditor,
  // Scheduling Editor (standalone)
  SchedulingEditorControl,
  createSchedulingEditor,
  SchedulingEditorStore,
  validateSchedulingPolicy,
  formatCodeLabel,
  emptySchedulingPolicy,
  buildSchedulingEditorPanel
} from './components/policy-catalog';

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
  CatalogGroupBy as PolicyCatalogGroupBy,
  SchedulingPolicyData,
  SchedulingEditorState,
  SchedulingEditorSection,
  SchedulingEditorChangeListener,
  SchedulingEditorConfig,
  SchedulingValidationResult,
  ValidationSeverity as SchedulingValidationSeverity,
  MinutesEntry,
  AverageTimeEntry,
  RecoveryTimeEntry,
  MatchUpAverageTime,
  MatchUpRecoveryTime
} from './components/policy-catalog';
