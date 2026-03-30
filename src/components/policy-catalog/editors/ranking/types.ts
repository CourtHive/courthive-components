/**
 * Ranking Points Editor — Type Definitions
 *
 * Mirrors the factory's rankingTypes.ts shapes for the editor state.
 * Uses `any` for complex polymorphic types (PositionValue, LevelKeyed)
 * to avoid importing factory internals into the component library.
 */

// ============================================================================
// Editor State
// ============================================================================

export type RankingEditorSection = 'metadata' | 'awardProfiles' | 'qualityWinProfiles' | 'aggregationRules';

export interface RankingPointsEditorState {
  draft: RankingPolicyData;
  expandedSections: Set<RankingEditorSection>;
  expandedProfiles: Set<number>;
  profileFilter: string;
  dirty: boolean;
  readonly: boolean;
}

export type RankingPointsEditorChangeListener = (state: RankingPointsEditorState) => void;

// ============================================================================
// Editor Config
// ============================================================================

export interface RankingPointsEditorConfig {
  initialPolicy?: RankingPolicyData;
  onChange?: (policy: RankingPolicyData) => void;
  readonly?: boolean;
}

// ============================================================================
// Policy Data Shape (matches factory rankingTypes.ts)
// ============================================================================

export interface RankingPolicyData {
  policyName?: string;
  policyVersion?: string;
  validDateRange?: DateRange;
  awardProfiles?: AwardProfileData[];
  qualityWinProfiles?: QualityWinProfileData[];
  aggregationRules?: AggregationRulesData;
  requireWinForPoints?: boolean;
  requireWinFirstRound?: boolean;
  doublesAttribution?: string;
  categoryResolution?: string;
}

export interface AwardProfileData {
  profileName?: string;
  finishingPositionRanges?: Record<string, any>;
  finishingRound?: Record<string, any>;
  perWinPoints?: any;
  pointsPerWin?: any;
  finishingPositionPoints?: { participationOrders: number[] };
  maxCountableMatches?: any;
  bonusPoints?: BonusPointData[];
  requireWinForPoints?: boolean;
  requireWinFirstRound?: boolean;
  // Scope fields
  dateRanges?: DateRange[];
  eventTypes?: string[];
  drawTypes?: string[];
  drawSizes?: number[];
  maxDrawSize?: number;
  stages?: string[];
  stageSequences?: number[];
  levels?: number[];
  maxLevel?: number;
  flights?: any;
  maxFlightNumber?: number;
  participationOrder?: number;
  category?: CategoryScopeData;
  priority?: number;
}

export interface BonusPointData {
  finishingPositions: number[];
  value: any;
}

export interface QualityWinProfileData {
  rankingRanges: QualityWinRangeData[];
  rankingScaleName: string;
  rankingEventType?: string;
  rankingSnapshot?: string;
  unrankedOpponentBehavior?: string;
  defaultRank?: number;
  levels?: number[];
  eventTypes?: string[];
  drawTypes?: string[];
  stages?: string[];
  dateRanges?: DateRange[];
  category?: CategoryScopeData;
  maxBonusPerTournament?: number;
  includeWalkovers?: boolean;
}

export interface QualityWinRangeData {
  rankRange: [number, number];
  value: number;
}

export interface AggregationRulesData {
  countingBuckets?: CountingBucketData[];
  bestOfCount?: number;
  rollingPeriodDays?: number;
  decayFunction?: string;
  decaySteps?: { afterDays: number; multiplier: number }[];
  separateByGender?: boolean;
  perCategory?: boolean;
  minCountableResults?: number;
  maxResultsPerLevel?: Record<string, number>;
  doublesAttribution?: string;
  tiebreakCriteria?: string[];
}

export interface CountingBucketData {
  bucketName?: string;
  eventTypes?: string[];
  pointComponents?: string[];
  bestOfCount?: number;
  maxResultsPerLevel?: Record<string, number>;
  minResults?: number;
  levels?: number[];
  mandatoryRules?: MandatoryRuleData[];
}

export interface MandatoryRuleData {
  ruleName?: string;
  levels: number[];
  bestOfCount?: number;
}

export interface CategoryScopeData {
  ageCategoryCodes?: string[];
  genders?: string[];
  categoryNames?: string[];
  categoryTypes?: string[];
  ratingTypes?: string[];
  ballTypes?: string[];
  wheelchairClasses?: string[];
  subTypes?: string[];
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Position Value Analysis (for table layout decisions)
// ============================================================================

export type TableLayout =
  | { type: 'flat' }
  | { type: 'level-columns'; levels: number[] }
  | { type: 'flight-columns'; flights: number[] }
  | { type: 'level-flight-tabs'; levels: number[]; flightsPerLevel: Record<number, number[]> }
  | { type: 'conditional' };
