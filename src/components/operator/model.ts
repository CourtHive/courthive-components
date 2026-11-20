import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';

/** Display state supplied by the host; components never compare server revisions or authorize an action. */
export type OperatorViewPhase =
  'current' | 'projection-pending' | 'outcome-unknown' | 'stale' | 'read-only' | 'unavailable';
export type OperatorRoundState = Readonly<{ roundNumber?: number }>;
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
  upset: string;
  phases: Record<OperatorViewPhase, string>;
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
  upset: 'Upset',
  phases: {
    current: 'Up to date',
    'projection-pending': 'Saved · updating views',
    'outcome-unknown': 'Outcome unknown · checking',
    stale: 'Refresh needed',
    'read-only': 'Read only',
    unavailable: 'View unavailable'
  }
};

/** Selection reconciles by identity when a replacement arrives; no DOM or tournament state. */
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

/** Format a venue calendar date without converting it through the browser's time zone. */
export function operatorDateLabel(date: string | undefined, locale = 'en-GB', unavailable = 'Date unavailable') {
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return unavailable;
  const calendarDate = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) return unavailable;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    calendarDate
  );
}

/** Names/labels only. Winner, upset, score and BYE facts are already computed/supplied by the producer. */
export function operatorMatchText(
  match: OperatorMatchPresentation,
  labels: OperatorLabels = defaultOperatorLabels,
  locale = 'en-GB'
) {
  const sides = match.sides.map((side) => ({
    ...side,
    displayName: side.name || (side.bye ? labels.bye : side.qualifier ? labels.qualifier : labels.awaitingParticipant),
    seedLabel: side.seed === undefined ? undefined : '[' + side.seed + ']',
    qualifierLabel: side.qualifier && side.name ? labels.qualifier : undefined,
    winnerLabel: side.isWinner ? labels.winner : undefined
  }));
  const separator = ` ${labels.versus} `;
  return {
    sides,
    statusText: match.status?.replaceAll('_', ' ') ?? '',
    upsetLabel: match.isUpset ? labels.upset : undefined,
    scoreLine: match.scoreText ? labels.score + ': ' + match.scoreText : undefined,
    accessibleName: `${labels.openMatch}: ${sides.map((side) => side.displayName).join(separator)}`,
    scheduleText: [
      operatorDateLabel(match.schedule?.date, locale, labels.dateUnavailable),
      match.schedule?.time
        ? match.schedule.time + ' (' + (match.schedule.timeZone || labels.timeZoneUnavailable) + ')'
        : undefined,
      match.schedule?.venue,
      match.schedule?.court
    ]
      .filter(Boolean)
      .join(' · ')
  };
}
