/**
 * Scheduling Policy Editor — Type Definitions
 *
 * Mirrors the factory's scheduling policy data shape exactly.
 */

// ============================================================================
// Policy Data Shape (matches tods-competition-factory)
// ============================================================================

export interface MinutesEntry {
  default: number;
  DOUBLES?: number;
}

export interface AverageTimeEntry {
  categoryNames?: string[];
  categoryTypes?: string[];
  minutes: MinutesEntry;
}

export interface RecoveryTimeEntry {
  categoryNames?: string[];
  categoryTypes?: string[];
  minutes: MinutesEntry;
}

export interface MatchUpAverageTime {
  matchUpFormatCodes: string[];
  averageTimes: AverageTimeEntry[];
}

export interface MatchUpRecoveryTime {
  matchUpFormatCodes: string[];
  recoveryTimes: RecoveryTimeEntry[];
}

export interface SchedulingPolicyData {
  allowModificationWhenMatchUpsScheduled?: {
    courts: boolean;
    venues: boolean;
  };
  defaultTimes?: {
    averageTimes?: AverageTimeEntry[];
    recoveryTimes?: RecoveryTimeEntry[];
  };
  defaultDailyLimits?: {
    SINGLES?: number;
    DOUBLES?: number;
    total?: number;
  };
  matchUpAverageTimes?: MatchUpAverageTime[];
  matchUpRecoveryTimes?: MatchUpRecoveryTime[];
  matchUpDailyLimits?: unknown[];
}

// ============================================================================
// Editor State
// ============================================================================

export type SchedulingEditorSection =
  | 'modificationFlags'
  | 'dailyLimits'
  | 'defaultTimes'
  | 'averageTimes'
  | 'recoveryTimes';

export interface SchedulingEditorState {
  draft: SchedulingPolicyData;
  expandedSections: Set<SchedulingEditorSection>;
  dirty: boolean;
}

export type SchedulingEditorChangeListener = (state: SchedulingEditorState) => void;

// ============================================================================
// Validation
// ============================================================================

export type ValidationSeverity = 'error' | 'warning';

export interface SchedulingValidationResult {
  severity: ValidationSeverity;
  path: string;
  message: string;
}

// ============================================================================
// Editor Config
// ============================================================================

export interface SchedulingEditorConfig {
  initialPolicy?: SchedulingPolicyData;
  categoryNames?: string[];
  categoryTypes?: string[];
  matchUpFormatCodes?: string[];
  onChange?: (policy: SchedulingPolicyData) => void;
}
