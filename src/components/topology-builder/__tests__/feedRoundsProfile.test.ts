import { mocksEngine, tournamentEngine, drawDefinitionConstants } from 'tods-competition-factory';
import { eliminationRounds, feedRoundsProfileOf, getFeedRoundCapacities, getTotalRounds } from '../domain/feedRounds';
import { describe, expect, it } from 'vitest';

const { FEED_IN } = drawDefinitionConstants;

/** The rounds the factory's FEED_IN draw enters positions in, and how many in each: { 3: 8, 4: 8 }. */
function generatedFeedEntries(drawSize: number, feedRoundsProfile?: number[]) {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    participantsProfile: { participantsCount: drawSize }
  });
  tournamentEngine.setState(tournamentRecord);
  const participantIds = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
  const { event } = tournamentEngine.addEvent({ event: { eventName: 'Feed' } });
  tournamentEngine.addEventEntries({ eventId: event.eventId, participantIds });
  const result = tournamentEngine.generateDrawDefinition({
    structureOptions: feedRoundsProfile ? { feedRoundsProfile } : undefined,
    eventId: event.eventId,
    drawType: FEED_IN,
    drawSize
  });
  if (result.error)
    throw new Error(`${drawSize} ${JSON.stringify(feedRoundsProfile)}: ${JSON.stringify(result.error)}`);
  const structure = result.drawDefinition.structures[0];
  const entered = new Map<number, number>();
  let roundsCount = 0;
  for (const { roundNumber, drawPositions } of structure.matchUps) {
    roundsCount = Math.max(roundsCount, roundNumber);
    for (const drawPosition of drawPositions ?? [])
      if (drawPosition) entered.set(drawPosition, Math.min(entered.get(drawPosition) ?? Infinity, roundNumber));
  }
  const fed = new Map<number, number>();
  for (const roundNumber of entered.values())
    if (roundNumber > 1) fed.set(roundNumber, (fed.get(roundNumber) ?? 0) + 1);
  return { fed, roundsCount };
}

describe('feed rounds the factory generates', () => {
  const cases: [number, number[] | undefined][] = [
    [36, undefined],
    [40, undefined],
    [48, undefined],
    [48, [8, 8]],
    [48, [16]],
    [56, [16, 4, 4]],
    [40, [4, 4]],
    [80, [8, 8]]
  ];
  for (const [drawSize, profile] of cases) {
    it(`${drawSize} ${profile ? JSON.stringify(profile) : 'default'}`, () => {
      const structureOptions = profile ? { feedRoundsProfile: profile } : undefined;
      const generated = generatedFeedEntries(drawSize, profile);
      expect(getFeedRoundCapacities(drawSize, structureOptions)).toEqual(generated.fed);
      expect(getTotalRounds(drawSize, structureOptions)).toEqual(generated.roundsCount);
    });
  }
});

describe('feedRoundsProfileOf', () => {
  it('a 48 as [8, 8] enters 8 at R3 and 8 at R4 (CA, 2026-11-18)', () => {
    expect(eliminationRounds(48, { feedRoundsProfile: [8, 8] })).toEqual([
      { count: 16, isFeed: false },
      { count: 8, isFeed: false },
      { count: 8, isFeed: true },
      { count: 8, isFeed: true },
      { count: 4, isFeed: false },
      { count: 2, isFeed: false },
      { count: 1, isFeed: false }
    ]);
  });

  it('ignores a profile the factory would refuse, and shows the default shape', () => {
    expect(feedRoundsProfileOf(48, { feedRoundsProfile: [8] })).toBeUndefined();
    expect(feedRoundsProfileOf(48, { feedRoundsProfile: [12, 4] })).toBeUndefined();
    expect(feedRoundsProfileOf(48, { feedRoundsProfile: 'eight' })).toBeUndefined();
    expect(getFeedRoundCapacities(48, { feedRoundsProfile: [8] })).toEqual(new Map([[2, 16]]));
  });
});
