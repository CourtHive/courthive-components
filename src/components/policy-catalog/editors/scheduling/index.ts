/**
 * Scheduling Editor — Public API
 *
 * Standalone exports for the scheduling policy editor.
 */

// ============================================================================
// Controller
// ============================================================================

export { SchedulingEditorControl, createSchedulingEditor } from './schedulingEditorControl';

// ============================================================================
// Store
// ============================================================================

export { SchedulingEditorStore } from './schedulingEditorStore';

// ============================================================================
// Domain
// ============================================================================

export { validateSchedulingPolicy } from './domain/schedulingValidation';
export { formatCodeLabel, emptySchedulingPolicy } from './domain/schedulingProjections';

// ============================================================================
// UI Components (for custom layouts)
// ============================================================================

export { buildSchedulingEditorPanel } from './schedulingEditorPanel';

// ============================================================================
// Types
// ============================================================================

export type {
  SchedulingPolicyData,
  SchedulingEditorState,
  SchedulingEditorSection,
  SchedulingEditorChangeListener,
  SchedulingEditorConfig,
  SchedulingValidationResult,
  ValidationSeverity,
  MinutesEntry,
  AverageTimeEntry,
  RecoveryTimeEntry,
  MatchUpAverageTime,
  MatchUpRecoveryTime,
} from './types';
