/**
 * Scheduling Profile — Drag & Drop Commit Logic
 *
 * Pure functions for applying drag-and-drop mutations to the profile draft.
 * Handles CATALOG_ROUND (new placement) and PLANNED_ROUND (move/reorder).
 */

import type { SchedulingProfile, DragPayload, DropTarget, DropResult, ScheduleDay, VenueSchedule, RoundProfile } from '../types';
import { deepClone, clamp } from './utils';

export function applyDropCommit(
  profileDraft: SchedulingProfile,
  drag: DragPayload,
  drop: DropTarget,
): DropResult {
  const next = deepClone(profileDraft);
  const { date, venueId } = drop;
  const day = ensureDay(next, date);
  const venue = ensureVenue(day, venueId);

  if (drag.type === 'CATALOG_ROUND') {
    const roundProfile: RoundProfile = {
      tournamentId: drag.roundRef.tournamentId,
      eventId: drag.roundRef.eventId,
      eventName: drag.roundRef.eventName,
      drawId: drag.roundRef.drawId,
      drawName: drag.roundRef.drawName,
      structureId: drag.roundRef.structureId,
      structureType: drag.roundRef.structureType,
      roundNumber: drag.roundRef.roundNumber,
      roundName: drag.roundRef.roundName,
    };
    const idx = clamp(drop.index, 0, venue.rounds.length);
    venue.rounds.splice(idx, 0, roundProfile);
    normalizeSortOrder(venue.rounds);
    return { ok: true, profile: next };
  }

  if (drag.type === 'PLANNED_ROUND') {
    const { locator } = drag;
    const srcDay = ensureDay(next, locator.date);
    const srcVenue = ensureVenue(srcDay, locator.venueId);
    const [removed] = srcVenue.rounds.splice(locator.index, 1);
    normalizeSortOrder(srcVenue.rounds);

    // Adjust for same-venue shift BEFORE clamping to post-removal length
    let targetIndex = drop.index;
    if (locator.date === date && locator.venueId === venueId && locator.index < targetIndex) {
      targetIndex = targetIndex - 1;
    }
    targetIndex = clamp(targetIndex, 0, venue.rounds.length);

    venue.rounds.splice(targetIndex, 0, removed);
    normalizeSortOrder(venue.rounds);

    return { ok: true, profile: next };
  }

  return { ok: false, profile: profileDraft };
}

function ensureDay(profile: SchedulingProfile, date: string): ScheduleDay {
  let day = profile.find((d) => d.scheduleDate === date);
  if (!day) {
    day = { scheduleDate: date, venues: [] };
    profile.push(day);
    profile.sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate));
  }
  return day;
}

function ensureVenue(day: ScheduleDay, venueId: string): VenueSchedule {
  let v = day.venues.find((x) => x.venueId === venueId);
  if (!v) {
    v = { venueId, rounds: [] };
    day.venues.push(v);
  }
  return v;
}

function normalizeSortOrder(rounds: RoundProfile[]): void {
  for (let i = 0; i < rounds.length; i++) {
    rounds[i].sortOrder = i + 1;
  }
}
