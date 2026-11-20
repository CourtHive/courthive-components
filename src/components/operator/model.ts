import { matchUpStatusLabels, matchUpStatusLabel } from '../match-up-card/labels';

// constants and types
import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';

/** Presentation facts from a verified host, never permissions or factory eligibility computed by this view. */
export type OperatorAccess = 'read-only' | 'operator';
export type OperatorFreshness =
  'unverified' | 'current' | 'saving' | 'projection-pending' | 'outcome-unknown' | 'stale' | 'refused' | 'unavailable';
export type OperatorViewState = Readonly<{
  access?: OperatorAccess;
  freshness?: OperatorFreshness;
  updatedAt?: string;
}>;
export type OperatorRoundState = Readonly<{ roundNumber?: number }>;
export type OperatorDayBucket = 'ready' | 'on-court' | 'finished' | 'other';
export type OperatorDayFilter = 'all' | OperatorDayBucket;
export type OperatorGrouping = 'court' | 'time';
export type OperatorDayFrame = Readonly<{
  date: string;
  locale: string;
  timeZone?: string;
  /** Human wording supplied by the host, e.g. Eastern Time (EST). */
  timeZoneLabel?: string;
  venueLabel?: string;
  now?: Readonly<{ date: string; time: string }>;
}>;
/** Unpublished display slots for contract exploration. Do not parse scoreText or derive a Ready bucket. */
export type OperatorMatchDetails = Readonly<{
  title?: string;
  meta?: string;
  scoreColumns?: readonly Readonly<{ label: string; side1: string; side2: string }>[];
  dayBucket?: OperatorDayBucket;
  courtGroup?: Readonly<{ id: string; label: string }>;
}>;
export type OperatorDetails = Readonly<Record<string, OperatorMatchDetails>>;
export type OperatorLabels = {
  openMatch: string;
  versus: string;
  winner: string;
  timeZoneUnavailable: string;
  dateUnavailable: string;
  bye: string;
  qualifier: string;
  awaitingParticipant: string;
  noMatches: string;
  previousRound: string;
  nextRound: string;
  round: string;
  score: string;
  readOnly: string;
  lastUpdated: string;
  refresh: string;
  now: string;
  groupBy: string;
  court: string;
  time: string;
  unscheduled: string;
  otherCourt: string;
  matches: string;
  deliveredMatches: string;
  filtersGroup: string;
  filters: Record<OperatorDayFilter, string>;
  statuses: Readonly<Record<string, string>>;
  unknownStatus: string;
  phases: Record<OperatorFreshness, string>;
};
export const defaultOperatorLabels: OperatorLabels = {
  openMatch: 'Open match',
  versus: 'versus',
  winner: 'Winner',
  timeZoneUnavailable: 'Time zone unavailable',
  dateUnavailable: 'Date unavailable',
  bye: 'BYE',
  qualifier: 'Qualifier',
  awaitingParticipant: 'Awaiting participant',
  noMatches: 'No matches in this view',
  previousRound: 'Previous round',
  nextRound: 'Next round',
  round: 'Round',
  score: 'Score',
  readOnly: 'Read only',
  lastUpdated: 'Last updated',
  refresh: 'Refresh',
  now: 'Jump to now',
  groupBy: 'Group by',
  court: 'Court',
  time: 'Time',
  unscheduled: 'Unscheduled',
  otherCourt: 'Court unassigned',
  matches: 'matches',
  deliveredMatches: 'delivered matches',
  unknownStatus: 'Status unavailable',
  filtersGroup: 'Match filters',
  filters: { all: 'All', ready: 'Ready', 'on-court': 'On court', finished: 'Finished', other: 'Other' },
  statuses: matchUpStatusLabels,
  phases: {
    unverified: 'Freshness not confirmed',
    current: 'Up to date',
    saving: 'Saving…',
    'projection-pending': 'Saved · updating views',
    'outcome-unknown': 'Outcome unknown · check before retrying',
    stale: 'Refresh needed',
    refused: 'Not saved · review the result',
    unavailable: 'View unavailable'
  }
};
export function operatorFreshness(state: OperatorViewState, labels: OperatorLabels, frame?: OperatorDayFrame) {
  const freshness = state.freshness ?? 'unverified';
  const severity =
    freshness === 'unavailable' || freshness === 'refused'
      ? 'error'
      : freshness === 'outcome-unknown' || freshness === 'stale'
        ? 'warning'
        : 'quiet';
  let updated: string | undefined;
  if (state.updatedAt && frame?.timeZone) {
    const instant = new Date(state.updatedAt);
    if (Number.isFinite(instant.getTime()))
      try {
        updated = new Intl.DateTimeFormat(frame.locale, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: frame.timeZone
        }).format(instant);
      } catch {
        updated = undefined;
      }
  }
  return {
    freshness,
    severity,
    text: labels.phases[freshness],
    updated: updated ? `${labels.lastUpdated} ${updated}` : undefined
  };
}
export function reconcileOperatorRound(
  state: OperatorRoundState,
  document: OperatorDrawPresentation
): OperatorRoundState {
  return {
    roundNumber: document.rounds.some((round) => round.roundNumber === state.roundNumber)
      ? state.roundNumber
      : document.rounds[0]?.roundNumber
  };
}
export function selectOperatorRound(roundNumber: number, document: OperatorDrawPresentation): OperatorRoundState {
  return reconcileOperatorRound({ roundNumber }, document);
}
export function moveOperatorRound(
  state: OperatorRoundState,
  direction: -1 | 1,
  document: OperatorDrawPresentation
): OperatorRoundState {
  const selected = reconcileOperatorRound(state, document);
  const index = document.rounds.findIndex((round) => round.roundNumber === selected.roundNumber);
  const next = document.rounds[index + direction];
  return next ? { roundNumber: next.roundNumber } : selected;
}
export function operatorDateLabel(
  date: string | undefined,
  locale = 'en-GB',
  unavailable = 'Date unavailable',
  day = false
) {
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return unavailable;
  const value = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) return unavailable;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    ...(day ? { weekday: 'long' as const } : { year: 'numeric' as const }),
    timeZone: 'UTC'
  }).format(value);
}
export function operatorMatchText(
  match: OperatorMatchPresentation,
  labels: OperatorLabels = defaultOperatorLabels,
  locale = 'en-GB',
  frame?: OperatorDayFrame
) {
  const sides = match.sides.map((side) => ({
    ...side,
    displayName: side.name || (side.bye ? labels.bye : side.qualifier ? labels.qualifier : labels.awaitingParticipant),
    seedLabel: side.seed === undefined ? undefined : '[' + side.seed + ']',
    qualifierLabel: side.qualifier && side.name ? labels.qualifier : undefined,
    winnerLabel: side.isWinner ? labels.winner : undefined
  }));
  const names = sides.map((side) => side.displayName).join(' ' + labels.versus + ' ');
  const sameZone = !!frame?.timeZone && match.schedule?.timeZone === frame.timeZone;
  const sameDay = !!frame && match.schedule?.date === frame.date;
  return {
    sides,
    statusText: matchUpStatusLabel(match.status, labels.statuses, labels.unknownStatus),
    statusTone: match.status === 'COMPLETED' ? 'finished' : match.status === 'IN_PROGRESS' ? 'active' : 'neutral',
    scoreLine: match.scoreText || undefined,
    accessibleName: `${labels.openMatch}: ${names}`,
    scheduleText: [
      match.schedule?.court,
      match.schedule?.time,
      sameDay ? undefined : operatorDateLabel(match.schedule?.date, frame?.locale ?? locale, labels.dateUnavailable),
      sameZone ? undefined : match.schedule?.timeZone || labels.timeZoneUnavailable,
      frame?.venueLabel === match.schedule?.venue ? undefined : match.schedule?.venue
    ]
      .filter(Boolean)
      .join(' · ')
  };
}
/** Group/filter only the delivered authorized rows. Bucket membership is supplied, including Ready. */
export function operatorDayGroups(
  matches: readonly OperatorMatchPresentation[],
  details: OperatorDetails,
  filter: OperatorDayFilter,
  grouping: OperatorGrouping,
  labels = defaultOperatorLabels
) {
  const delivered = matches.filter(
    (match) => filter === 'all' || (details[match.matchUpId]?.dayBucket ?? 'other') === filter
  );
  const groups = new Map<string, { id: string; label: string; matches: OperatorMatchPresentation[] }>();
  for (const match of delivered) {
    const court = details[match.matchUpId]?.courtGroup;
    const id =
      grouping === 'court'
        ? (court?.id ?? JSON.stringify([match.schedule?.venue, match.schedule?.court]))
        : (match.schedule?.time ?? '');
    const label =
      grouping === 'court'
        ? (court?.label ?? match.schedule?.court ?? labels.otherCourt)
        : (match.schedule?.time ?? labels.unscheduled);
    const group = groups.get(id) ?? { id, label, matches: [] };
    group.matches.push(match);
    groups.set(id, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }))
    .map((group) => ({
      ...group,
      matches: [...group.matches].sort(
        (a, b) =>
          (a.schedule?.time ?? '99:99').localeCompare(b.schedule?.time ?? '99:99') ||
          a.matchUpId.localeCompare(b.matchUpId)
      )
    }));
}
export function operatorNowMatch(
  matches: readonly OperatorMatchPresentation[],
  frame?: OperatorDayFrame
): string | undefined {
  if (!frame?.timeZone || !frame.now || frame.now.date !== frame.date || !/^\d{2}:\d{2}$/.test(frame.now.time))
    return undefined;
  return [...matches]
    .filter(
      (match) =>
        match.schedule?.date === frame.date &&
        match.schedule?.timeZone === frame.timeZone &&
        !!match.schedule?.time &&
        match.schedule.time >= frame.now!.time
    )
    .sort((a, b) => a.schedule!.time!.localeCompare(b.schedule!.time!) || a.matchUpId.localeCompare(b.matchUpId))[0]
    ?.matchUpId;
}
