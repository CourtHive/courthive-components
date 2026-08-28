/**
 * Synthetic single-elimination structures for the projection tests.
 *
 * Hand-built rather than mocksEngine-generated so ratings are exact and the
 * expected arithmetic can be written down. The SHAPE is kept faithful to what
 * `getEventData` actually returns — verified against factory output: round 1
 * matchUps carry `drawPositions` and hydrated `sides`, later rounds carry
 * `roundNumber`/`roundPosition` with empty sides until played, and ratings sit
 * under `participant.ratings[SINGLES]` as `{ scaleName, scaleValue }`.
 * A separate spec pins that fidelity against real mocksEngine output.
 */

export const WTN = 'WTN';

export type FixtureEntrant = {
  participantId: string;
  /** Value on `scaleName`; omit for an unrated participant. */
  rating?: number;
  bye?: boolean;
};

function participant(entrant: FixtureEntrant, scaleName: string) {
  if (entrant.bye) return undefined;
  const ratings =
    entrant.rating === undefined
      ? {}
      : { SINGLES: [{ scaleName, scaleValue: scaleName === WTN ? { wtnRating: entrant.rating } : entrant.rating }] };
  return {
    participantId: entrant.participantId,
    participantName: entrant.participantId,
    ratings,
  };
}

/**
 * Build an elimination structure from a flat list of entrants in drawPosition
 * order. `entrants.length` must be a power of two; use `{ bye: true }` to leave
 * a slot empty.
 */
export function buildEliminationFixture({
  entrants,
  scaleName = WTN,
}: {
  entrants: FixtureEntrant[];
  scaleName?: string;
}): any[] {
  const drawSize = entrants.length;
  const roundCount = Math.log2(drawSize);
  if (!Number.isInteger(roundCount)) throw new Error(`drawSize ${drawSize} is not a power of two`);

  const matchUps: any[] = [];

  for (let roundPosition = 1; roundPosition <= drawSize / 2; roundPosition += 1) {
    const first = entrants[roundPosition * 2 - 2];
    const second = entrants[roundPosition * 2 - 1];
    const sides = [
      { sideNumber: 1, drawPosition: roundPosition * 2 - 1, bye: first.bye, participant: participant(first, scaleName) },
      { sideNumber: 2, drawPosition: roundPosition * 2, bye: second.bye, participant: participant(second, scaleName) },
    ];
    matchUps.push({
      matchUpId: `r1p${roundPosition}`,
      roundNumber: 1,
      roundPosition,
      drawPositions: [roundPosition * 2 - 1, roundPosition * 2],
      matchUpStatus: first.bye || second.bye ? 'BYE' : 'TO_BE_PLAYED',
      sides,
    });
  }

  for (let roundNumber = 2; roundNumber <= roundCount; roundNumber += 1) {
    const positions = drawSize / 2 ** roundNumber;
    for (let roundPosition = 1; roundPosition <= positions; roundPosition += 1) {
      matchUps.push({
        matchUpId: `r${roundNumber}p${roundPosition}`,
        roundNumber,
        roundPosition,
        matchUpStatus: 'TO_BE_PLAYED',
        sides: [{ sideNumber: 1 }, { sideNumber: 2 }],
      });
    }
  }

  return matchUps;
}

/** Mark a matchUp played, hydrating the sides the way a completed matchUp does. */
export function completeMatchUp({
  matchUps,
  matchUpId,
  winningSide,
  sets,
  participantIds,
}: {
  matchUps: any[];
  matchUpId: string;
  winningSide: number;
  sets?: any[];
  participantIds?: [string, string];
}): void {
  const matchUp = matchUps.find((m) => m.matchUpId === matchUpId);
  if (!matchUp) throw new Error(`no matchUp ${matchUpId}`);
  matchUp.winningSide = winningSide;
  matchUp.matchUpStatus = 'COMPLETED';
  matchUp.score = { sets: sets ?? [{ side1Score: 6, side2Score: 3 }, { side1Score: 6, side2Score: 4 }] };
  if (participantIds) {
    const lookup = new Map<string, any>();
    for (const candidate of matchUps) {
      for (const side of candidate.sides ?? []) {
        if (side?.participant?.participantId) lookup.set(side.participant.participantId, side.participant);
      }
    }
    matchUp.sides = participantIds.map((participantId, index) => ({
      sideNumber: index + 1,
      participant: lookup.get(participantId),
    }));
  }
}
