import { SchedulingProfileConfig } from './types';
import { SchedulingProfileControl } from './controller/schedulingProfileControl';
/**
 * Scheduling Profile — Public API
 *
 * Main entry point for the scheduling profile builder component.
 */
export { SchedulingProfileControl } from './controller/schedulingProfileControl';
export { ProfileStore } from './engine/profileStore';
export { validateProfile, type ValidateProfileParams } from './domain/validateProfile';
export { buildIssueIndex } from './domain/issueIndex';
export { applyDropCommit } from './domain/dndApply';
export { filterCatalog, groupCatalog, getPlannedRoundKeys, getPlacedRoundKeys, roundPlaysOnDate, countNotPlayingRounds, type FilterCatalogOptions } from './domain/catalogProjections';
export { getVenueRounds, getRoundAt, findIssuesForLocator, maxSeverity, findRoundInProfile } from './domain/profileProjections';
export { deepClone, clamp, roundKeyString, roundLabel, sameLocator, pickRoundKey } from './domain/utils';
export { buildDateStrip } from './ui/dateStrip';
export { buildVenueBoard } from './ui/venueBoard';
export { buildRoundCatalog } from './ui/roundCatalog';
export { buildIssuesPanel } from './ui/issuesPanel';
export { buildRoundCard } from './ui/roundCard';
export { createCardPopoverManager } from './ui/cardPopover';
export { buildSchedulingProfileLayout } from './ui/schedulingProfileLayout';
export type { SchedulingProfile, ScheduleDay, VenueSchedule, RoundProfile, RoundSegment, VenueInfo, CatalogRoundItem, CatalogGroupBy, RoundKey, RoundLocator, DragPayload, CatalogDragPayload, PlannedDragPayload, DropTarget, DropResult, Severity, ValidationCode, FixActionKind, FixAction, ValidationResult, SeverityCounts, IssueIndex, ProfileStoreState, ProfileChangeListener, AvailabilityAdapter, DemandAdapter, DependencyAdapter, SchedulingProfileConfig, UIPanel, FlattenedRound, PlannedRoundBehavior } from './types';
export declare function createSchedulingProfile(config: SchedulingProfileConfig, container: HTMLElement): SchedulingProfileControl;
