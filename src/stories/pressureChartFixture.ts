/**
 * Story fixture: a draw whose SEEDING IS CONSISTENT WITH ITS RATINGS.
 *
 * This matters more than it sounds. A mocksEngine draw generated with ratings
 * but no seeding places the strongest players at random, so every projected
 * pressure curve is arbitrary and the chart demonstrates nothing. A real draw is
 * seeded from a rating or ranking list, which is exactly the structure the
 * pressure chart exists to show: seeds should read as a low-then-rising ramp,
 * and an unseeded player drawn into a seed's section should spike early.
 *
 * How the invariant is established, and why this way round:
 *
 *  - `mocksEngine` seeds via `drawProfiles[].seedsCount`, but `applySeedingScales`
 *    assigns seeds 1..N in **participant-list order, not by rating** — so
 *    `seedsCount` alone gives seeding unrelated to the WTN values.
 *  - The factory's own seed-from-a-scale path is `autoSeeding` (it chains
 *    `getEntriesAndSeedsCount` -> `getScaledEntries` -> `generateSeedingScaleItems`),
 *    but driving it plus `generateDrawDefinition` by hand needs entries, a
 *    seeding policy and a seeding scale threaded through correctly; getting one
 *    of those wrong yields `seedAssignments` with no `participantId`, i.e. a draw
 *    that LOOKS seeded and is not. (Observed: without `policyDefinitions`,
 *    `autoSeeding` returns nothing at all and the mistake is silent.)
 *  - So the fixture uses the well-trodden `seedsCount` path — which does place
 *    seeds properly (verified: in a 16 draw, seed 1 -> drawPosition 1, seed 2 ->
 *    16, seeds 3/4 -> 12/5, i.e. opposite halves then opposite quarters) — and
 *    then writes the RATINGS to match the seed order.
 *
 * The invariant "seed order == rating order" is identical either way; this
 * direction reaches it with supported APIs and no silent-failure mode.
 */

import { mocksEngine, tournamentEngine } from 'tods-competition-factory';

const WTN = 'WTN';
const SINGLES = 'SINGLES' as const;
const RATING = 'RATING';
const SCALE_DATE = '2026-01-01';
const SINGLE_ELIMINATION = 'SINGLE_ELIMINATION';

/** Best WTN in the field, and the step between successive players. Lower is stronger. */
const BEST_WTN = 4;
const WTN_STEP = 0.62;

const CFS_PARTICIPANTS_PROFILE = {
  convertExtensions: true,
  withScaleValues: true,
  withGroupings: true,
};

export type SeededDrawOptions = {
  drawSize?: number;
  seedsCount?: number;
  /** Fewer participants than drawSize produces BYEs. */
  participantsCount?: number;
  /** Play the draw out. Results follow form except for the planted upsets below. */
  play?: boolean;
  /** roundNumber values in which the LOWER-rated side wins instead. */
  upsetsInRounds?: number[];
  rated?: boolean;
};

export type SeededDrawFixture = {
  matchUps: any[];
  /** participantId of the top seed, for stories that follow one player. */
  topSeedId?: string;
  /** participantIds of every seed, in seed order. */
  seedIds: string[];
  /** participantId of an unseeded entrant in the top seed's half. */
  unseededId?: string;
  scaleName: string;
};

function orderedByStrength(structure: any): string[] {
  const seeded = structure.seedAssignments
    .filter((assignment: any) => assignment.participantId)
    .toSorted((a: any, b: any) => a.seedNumber - b.seedNumber)
    .map((assignment: any) => assignment.participantId);
  const seededSet = new Set(seeded);
  const unseeded = (structure.positionAssignments ?? [])
    .filter((assignment: any) => assignment.participantId && !seededSet.has(assignment.participantId))
    .toSorted((a: any, b: any) => a.drawPosition - b.drawPosition)
    .map((assignment: any) => assignment.participantId);
  return [...seeded, ...unseeded];
}

function applyRatings(participantIds: string[]): void {
  const scaleItemsWithParticipantIds = participantIds.map((participantId, index) => ({
    participantId,
    scaleItems: [
      {
        scaleValue: { wtnRating: Number((BEST_WTN + index * WTN_STEP).toFixed(2)), confidence: 90 },
        eventType: SINGLES,
        scaleDate: SCALE_DATE,
        scaleType: RATING,
        scaleName: WTN,
      },
    ],
  }));
  tournamentEngine.setParticipantScaleItems({ scaleItemsWithParticipantIds });
}

/** Rank within the strength ladder — lower index is stronger. */
function strongerSide(matchUp: any, strength: Map<string, number>): number | undefined {
  const ranks = (matchUp.sides ?? []).map((side: any) => {
    const participantId = side?.participant?.participantId ?? side?.participantId;
    return participantId ? strength.get(participantId) : undefined;
  });
  if (ranks[0] === undefined || ranks[1] === undefined) return undefined;
  return ranks[0] < ranks[1] ? 1 : 2;
}

function playToForm({ drawId, strength, upsetsInRounds }: { drawId: string; strength: Map<string, number>; upsetsInRounds: Set<number> }): void {
  const rounds = new Set<number>(
    tournamentEngine
      .allDrawMatchUps({ drawId })
      .matchUps.map((matchUp: any) => matchUp.roundNumber)
      .filter((roundNumber: number) => typeof roundNumber === 'number'),
  );

  for (const roundNumber of [...rounds].toSorted((a, b) => a - b)) {
    const matchUps = tournamentEngine
      .allDrawMatchUps({ drawId, inContext: true })
      .matchUps.filter((matchUp: any) => matchUp.roundNumber === roundNumber && !matchUp.winningSide);

    let upsetUsed = false;
    for (const matchUp of matchUps) {
      const favourite = strongerSide(matchUp, strength);
      if (!favourite) continue;
      const upset = upsetsInRounds.has(roundNumber) && !upsetUsed;
      if (upset) upsetUsed = true;
      const winningSide = upset ? 3 - favourite : favourite;
      const scoreString = upset ? '4-6 7-6(5) 7-5' : '6-2 6-3';
      const { outcome } = mocksEngine.generateOutcomeFromScoreString({
        matchUpStatus: 'COMPLETED',
        winningSide,
        scoreString,
      });
      // `winningSide` rides inside the generated outcome; setMatchUpStatus does
      // not accept it as a sibling param.
      tournamentEngine.setMatchUpStatus({ drawId, matchUpId: matchUp.matchUpId, outcome });
    }
  }
}

/** Build a rating-seeded draw and return the structure matchUps, hydrated as CFS hydrates them. */
export function seededDraw({
  drawSize = 16,
  seedsCount = 4,
  participantsCount,
  play = false,
  upsetsInRounds = [],
  rated = true,
}: SeededDrawOptions = {}): SeededDrawFixture {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize, seedsCount, participantsCount, drawType: SINGLE_ELIMINATION }],
    participantsProfile: { category: { ratingType: WTN } },
    setState: true,
    nonRandom: 1,
  });
  tournamentEngine.setState(tournamentRecord);

  const event = tournamentRecord.events[0];
  const drawDefinition = event.drawDefinitions[0];
  const structure = drawDefinition.structures[0];
  const ladder = orderedByStrength(structure);
  if (rated) applyRatings(ladder);

  const strength = new Map(ladder.map((participantId, index) => [participantId, index]));
  if (play) {
    playToForm({ drawId: drawDefinition.drawId, strength, upsetsInRounds: new Set(upsetsInRounds) });
  }

  const { eventData }: any = tournamentEngine.getEventData({
    participantsProfile: rated ? CFS_PARTICIPANTS_PROFILE : { withGroupings: true },
    contextProfile: { withCompetitiveness: true },
    eventId: event.eventId,
    hydrateParticipants: true,
  });
  const hydrated = eventData.drawsData[0].structures[0];
  const matchUps = Object.values(hydrated.roundMatchUps).flat() as any[];

  const topSeedId = ladder[0];
  // An unseeded entrant sharing the top seed's half of the draw — the player the
  // seeding is designed to disadvantage, and the clearest contrast on the chart.
  const half = new Set(
    (structure.positionAssignments ?? [])
      .filter((assignment: any) => assignment.drawPosition <= drawSize / 2 && assignment.participantId)
      .map((assignment: any) => assignment.participantId),
  );
  const unseededId = ladder.slice(seedsCount).find((participantId) => half.has(participantId));

  return { matchUps, topSeedId, seedIds: ladder.slice(0, seedsCount), unseededId, scaleName: WTN };
}
