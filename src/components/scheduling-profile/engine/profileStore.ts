/**
 * Scheduling Profile — Profile Store
 *
 * Observable state management for the scheduling profile builder.
 * Follows the TemporalViewState pattern: subscribe/emit with typed events.
 *
 * Every profile mutation triggers revalidation then emits change events.
 * Drop is validated before commit — rejected if it produces ERRORs.
 */

import { validateProfile } from '../domain/validateProfile';
import { buildIssueIndex } from '../domain/issueIndex';
import { applyDropCommit } from '../domain/dndApply';
import { deepClone } from '../domain/utils';
import type {
  ProfileStoreState,
  ProfileChangeListener,
  SchedulingProfileConfig,
  SchedulingProfile,
  RoundLocator,
  DragPayload,
  DropTarget,
  CatalogGroupBy,
  IssueIndex,
  FixAction
} from '../types';

// ============================================================================
// ProfileStore
// ============================================================================

export class ProfileStore {
  private state: ProfileStoreState;
  private readonly listeners: Set<ProfileChangeListener> = new Set();
  private readonly config: SchedulingProfileConfig;

  constructor(config: SchedulingProfileConfig) {
    this.config = config;

    const emptyIndex: IssueIndex = {
      all: [],
      bySeverity: { ERROR: [], WARN: [], INFO: [] },
      byDate: {},
      byVenue: {},
      byDraw: {},
      counts: { total: 0, ERROR: 0, WARN: 0, INFO: 0, byDate: {}, byVenue: {}, byDraw: {} }
    };

    this.state = {
      profileDraft: deepClone(config.initialProfile ?? []),
      venues: config.venues,
      roundCatalog: config.roundCatalog,
      schedulableDates: config.schedulableDates,
      selectedDate: config.selectedDate ?? config.schedulableDates[0] ?? null,
      selectedLocator: null,
      ruleResults: [],
      issueIndex: emptyIndex,
      catalogSearchQuery: '',
      catalogGroupBy: 'event'
    };

    this.revalidate();
  }

  // ---------- Getters ----------

  getState(): ProfileStoreState {
    return this.state;
  }

  getSchedulingProfile(): SchedulingProfile {
    return deepClone(this.state.profileDraft);
  }

  // ---------- Date Selection ----------

  selectDate(date: string): void {
    if (this.state.selectedDate === date) return;
    this.setState({ selectedDate: date, selectedLocator: null });
  }

  // ---------- Card Selection ----------

  selectCard(locator: RoundLocator | null): void {
    this.setState({ selectedLocator: locator });
  }

  // ---------- Catalog Controls ----------

  setCatalogSearch(query: string): void {
    this.setState({ catalogSearchQuery: query });
  }

  setCatalogGroupBy(mode: CatalogGroupBy): void {
    this.setState({ catalogGroupBy: mode });
  }

  // ---------- Profile Mutations ----------

  dropRound(drag: DragPayload, drop: DropTarget): { ok: boolean; errorMessage?: string } {
    const result = applyDropCommit(this.state.profileDraft, drag, drop);
    if (!result.ok) return { ok: false, errorMessage: 'Invalid drop operation' };

    // Validate before committing
    const tempResults = validateProfile({
      profile: result.profile,
      temporal: this.config.temporalAdapter,
      venueOrder: this.config.venueOrder
    });

    const firstError = tempResults.find((r) => r.severity === 'ERROR');
    if (firstError) {
      return { ok: false, errorMessage: firstError.message };
    }

    this.commitProfile(result.profile);
    return { ok: true };
  }

  removeRound(locator: RoundLocator): void {
    const next = deepClone(this.state.profileDraft);
    const day = next.find((d) => d.scheduleDate === locator.date);
    if (!day) return;
    const venue = day.venues.find((v) => v.venueId === locator.venueId);
    if (!venue) return;
    if (locator.index < 0 || locator.index >= venue.rounds.length) return;
    venue.rounds.splice(locator.index, 1);

    // Normalize sort order
    for (let i = 0; i < venue.rounds.length; i++) {
      venue.rounds[i].sortOrder = i + 1;
    }

    this.commitProfile(next);

    // Clear selection if we removed the selected card
    if (
      this.state.selectedLocator &&
      this.state.selectedLocator.date === locator.date &&
      this.state.selectedLocator.venueId === locator.venueId &&
      this.state.selectedLocator.index === locator.index
    ) {
      this.setState({ selectedLocator: null });
    }
  }

  setNotBeforeTime(locator: RoundLocator, time: string | undefined): void {
    const next = deepClone(this.state.profileDraft);
    const day = next.find((d) => d.scheduleDate === locator.date);
    if (!day) return;
    const venue = day.venues.find((v) => v.venueId === locator.venueId);
    if (!venue) return;
    const round = venue.rounds[locator.index];
    if (!round) return;

    if (time) {
      round.notBeforeTime = time;
    } else {
      delete round.notBeforeTime;
    }

    this.commitProfile(next);
  }

  applyFixAction(action: FixAction): void {
    if (action.kind === 'JUMP_TO_ITEM' && action.locator) {
      this.setState({
        selectedDate: action.locator.date,
        selectedLocator: action.locator
      });
      return;
    }

    if (action.kind === 'OPEN_TEMPORAL_GRID') {
      this.config.onFixAction?.(action);
      return;
    }

    if (action.kind === 'MOVE_ITEM_AFTER' && action.locator && action.after) {
      const next = moveItemAfter(this.state.profileDraft, action.locator, action.after);
      this.commitProfile(next);
      return;
    }

    if (action.kind === 'MOVE_ITEM_BEFORE' && action.locator && action.before) {
      const next = moveItemBefore(this.state.profileDraft, action.locator, action.before);
      this.commitProfile(next);
      return;
    }

    this.config.onFixAction?.(action);
  }

  // ---------- Subscription ----------

  subscribe(listener: ProfileChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- Internal ----------

  private setState(partial: Partial<ProfileStoreState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private commitProfile(nextProfile: SchedulingProfile): void {
    this.state = { ...this.state, profileDraft: nextProfile };
    this.revalidate();
    this.config.onProfileChanged?.(deepClone(nextProfile));
  }

  private revalidate(): void {
    const results = validateProfile({
      profile: this.state.profileDraft,
      temporal: this.config.temporalAdapter,
      venueOrder: this.config.venueOrder
    });
    const index = buildIssueIndex(results);
    this.state = { ...this.state, ruleResults: results, issueIndex: index };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

// ============================================================================
// Fix Action Helpers
// ============================================================================

function moveItemAfter(
  profile: SchedulingProfile,
  locator: RoundLocator,
  afterLocator: RoundLocator
): SchedulingProfile {
  const next = deepClone(profile);
  const item = removeAt(next, locator);
  if (!item) return profile;

  const list = ensureVenueRounds(next, afterLocator.date, afterLocator.venueId);
  const idx = Math.min(list.length, afterLocator.index + 1);
  list.splice(idx, 0, item);
  return next;
}

function moveItemBefore(
  profile: SchedulingProfile,
  locator: RoundLocator,
  beforeLocator: RoundLocator
): SchedulingProfile {
  const next = deepClone(profile);
  const item = removeAt(next, locator);
  if (!item) return profile;

  const list = ensureVenueRounds(next, beforeLocator.date, beforeLocator.venueId);
  const idx = Math.max(0, Math.min(list.length, beforeLocator.index));
  list.splice(idx, 0, item);
  return next;
}

function removeAt(profile: SchedulingProfile, locator: RoundLocator) {
  const day = profile.find((d) => d.scheduleDate === locator.date);
  if (!day) return null;
  const venue = day.venues.find((v) => v.venueId === locator.venueId);
  if (!venue) return null;
  if (locator.index < 0 || locator.index >= venue.rounds.length) return null;
  return venue.rounds.splice(locator.index, 1)[0];
}

function ensureVenueRounds(profile: SchedulingProfile, date: string, venueId: string) {
  let day = profile.find((d) => d.scheduleDate === date);
  if (!day) {
    day = { scheduleDate: date, venues: [] };
    profile.push(day);
  }
  let v = day.venues.find((x) => x.venueId === venueId);
  if (!v) {
    v = { venueId, rounds: [] };
    day.venues.push(v);
  }
  return v.rounds;
}
