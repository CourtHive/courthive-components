import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';

/** Display state supplied by the host; components never compare server revisions or authorize an action. */
export type OperatorViewPhase =
  'current' | 'projection-pending' | 'outcome-unknown' | 'stale' | 'read-only' | 'unavailable';
export type OperatorRoundState = Readonly<{ roundNumber?: number }>;
export type OperatorLabels = {
  openMatch: string;
  versus: string;
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

/** Names/labels only. Winner, upset, score and BYE facts are already computed/supplied by the producer. */
export function operatorMatchText(match: OperatorMatchPresentation, labels: OperatorLabels = defaultOperatorLabels) {
  const sides = match.sides.map((side) => ({
    ...side,
    displayName: side.name || (side.bye ? labels.bye : side.qualifier ? labels.qualifier : labels.awaitingParticipant),
    seedLabel: side.seed === undefined ? undefined : '[' + side.seed + ']',
    qualifierLabel: side.qualifier && side.name ? labels.qualifier : undefined
  }));
  const separator = ` ${labels.versus} `;
  return {
    sides,
    statusText: match.status?.replaceAll('_', ' ') ?? '',
    upsetLabel: match.isUpset ? labels.upset : undefined,
    scoreLine: match.scoreText ? labels.score + ': ' + match.scoreText : undefined,
    accessibleName: `${labels.openMatch}: ${sides.map((side) => side.displayName).join(separator)}`,
    scheduleText: [match.schedule?.date, match.schedule?.time, match.schedule?.venue, match.schedule?.court]
      .filter(Boolean)
      .join(' · ')
  };
}
