/**
 * Scheduling Profile — Public API
 *
 * Main entry point for the scheduling profile builder component.
 */

// ============================================================================
// Controller
// ============================================================================

export { SchedulingProfileControl } from './controller/schedulingProfileControl';

// ============================================================================
// Store
// ============================================================================

export { ProfileStore } from './engine/profileStore';

// ============================================================================
// Domain (for advanced consumers)
// ============================================================================

export { validateProfile, type ValidateProfileParams } from './domain/validateProfile';
export { buildIssueIndex } from './domain/issueIndex';
export { applyDropCommit } from './domain/dndApply';
export { filterCatalog, groupCatalog, getPlannedRoundKeys } from './domain/catalogProjections';
export { getVenueRounds, getRoundAt, findIssuesForLocator, maxSeverity } from './domain/profileProjections';
export { deepClone, clamp, roundKeyString, roundLabel, sameLocator, pickRoundKey } from './domain/utils';

// ============================================================================
// UI Components (for custom layouts)
// ============================================================================

export { buildDateStrip } from './ui/dateStrip';
export { buildVenueBoard } from './ui/venueBoard';
export { buildRoundCatalog } from './ui/roundCatalog';
export { buildInspectorPanel } from './ui/inspectorPanel';
export { buildIssuesPanel } from './ui/issuesPanel';
export { buildRoundCard } from './ui/roundCard';
export { createCardPopoverManager } from './ui/cardPopover';
export { buildSchedulingProfileLayout } from './ui/schedulingProfileLayout';

// ============================================================================
// Types
// ============================================================================

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
  CatalogDragPayload,
  PlannedDragPayload,
  DropTarget,
  DropResult,
  Severity,
  ValidationCode,
  FixActionKind,
  FixAction,
  ValidationResult,
  SeverityCounts,
  IssueIndex,
  ProfileStoreState,
  ProfileChangeListener,
  TemporalAdapter,
  DemandAdapter,
  SchedulingProfileConfig,
  UIPanel,
  FlattenedRound,
} from './types';

// ============================================================================
// Convenience Factory
// ============================================================================

import type { SchedulingProfileConfig } from './types';
import { SchedulingProfileControl } from './controller/schedulingProfileControl';

export function createSchedulingProfile(
  config: SchedulingProfileConfig,
  container: HTMLElement,
): SchedulingProfileControl {
  const control = new SchedulingProfileControl(config);
  control.render(container);
  return control;
}
