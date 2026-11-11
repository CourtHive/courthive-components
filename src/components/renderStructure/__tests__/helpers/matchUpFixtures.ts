import { sideIsWinner, sideStatusPill } from '../../sideStatus';
import { statusPillText } from '../../renderStatusPill';

// constants and types
import type { MatchUp } from '../../../../types';

/** A singles matchUp between two named players; every field can be overridden. */
export function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 3,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Alice Smith' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Bob Jones' } }
    ],
    score: { scoreStringSide1: '', scoreStringSide2: '' },
    ...overrides
  } as MatchUp;
}

/**
 * The pill text each side of a rendered matchUp shows, `[side1, side2]`, `undefined` for a side with no pill:
 * the same decision `renderParticipant` makes, through the same two functions it calls.
 */
export function sidePills(matchUp: MatchUp, liveStatusPill?: boolean): (string | undefined)[] {
  return [1, 2].map((sideNumber) => {
    const participant = matchUp.sides?.find((side) => side.sideNumber === sideNumber)?.participant;
    const isWinningSide = sideIsWinner({ participant, sideNumber, matchUp });
    const status = sideStatusPill({ liveStatusPill, isWinningSide, sideNumber, matchUp });
    return status === undefined ? undefined : statusPillText(status);
  });
}

/** The side numbers that show a pill. */
export const pillSides = (matchUp: MatchUp) =>
  sidePills(matchUp).flatMap((pill, index) => (pill === undefined ? [] : [index + 1]));
