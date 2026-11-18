import { mocksEngine, tournamentEngine, drawDefinitionConstants } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';
import {
  defaultQualifiers,
  eliminationQualifierCounts,
  eliminationQualifyingShape,
  qualifierCounts,
  steppedQualifierCount
} from '../domain/qualifierCounts';
import { getNumRounds } from '../ui/structureCard';
import { generatePreviewMatchUps } from '../domain/previewGenerator';

const { SINGLE_ELIMINATION, FEED_IN, QUALIFYING } = drawDefinitionConstants;
const node = (drawSize: number, structureType: string = SINGLE_ELIMINATION, qualifyingPositions?: number) =>
  ({ id: 'q', stage: QUALIFYING, structureName: 'Q', drawSize, structureType, qualifyingPositions }) as any;

/**
 * The qualifying structure the factory generates for `entrants` playing down to `qualifiers`. The main draw is an
 * elimination draw of twice the qualifiers, the rest direct entries, so its first round seats every qualifier.
 */
function generatedQualifying(entrants: number, qualifiers: number) {
  const mainSize = 2 ** Math.ceil(Math.log2(qualifiers * 2));
  const direct = mainSize - qualifiers;
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    participantsProfile: { participantsCount: entrants + direct }
  });
  tournamentEngine.setState(tournamentRecord);
  const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
  const { event } = tournamentEngine.addEvent({ event: { eventName: 'E' } });
  tournamentEngine.addEventEntries({
    eventId: event.eventId,
    participantIds: ids.slice(0, direct),
    entryStage: 'MAIN'
  });
  tournamentEngine.addEventEntries({
    eventId: event.eventId,
    participantIds: ids.slice(direct),
    entryStage: QUALIFYING
  });
  const result = tournamentEngine.generateDrawDefinition({
    eventId: event.eventId,
    drawType: SINGLE_ELIMINATION,
    drawSize: mainSize,
    automated: true,
    qualifyingPlaceholder: true,
    qualifyingProfiles: [
      {
        roundTarget: 1,
        structureProfiles: [{ drawType: SINGLE_ELIMINATION, drawSize: entrants, qualifyingPositions: qualifiers }]
      }
    ]
  });
  if (result.error) throw new Error(`${entrants} for ${qualifiers}: ${JSON.stringify(result.error)}`);
  const structure = result.drawDefinition.structures.find((s: any) => s.stage === QUALIFYING);
  const rounds: number[] = [];
  for (const matchUp of structure.matchUps)
    rounds[matchUp.roundNumber - 1] = (rounds[matchUp.roundNumber - 1] ?? 0) + 1;
  return { positions: structure.positionAssignments.length, rounds };
}

describe('qualifier counts', () => {
  it('offers both shapes, up to half the entrants (CA, 2026-11-17)', () => {
    // 40 halves to 20, 10, 5; a 64 draw gives 16, 8, 4, 2, 1; 32 would qualify 24 on byes
    expect(eliminationQualifierCounts(40)).toEqual([20, 16, 10, 8, 5, 4, 2, 1]);
    expect(eliminationQualifierCounts(32)).toEqual([16, 8, 4, 2, 1]);
    expect(eliminationQualifierCounts(24)).toEqual([12, 8, 6, 4, 3, 2, 1]);
  });

  it("takes a feed-in structure's counts from the factory", () => {
    expect(qualifierCounts(node(40, FEED_IN))).toEqual([20, 10, 8, 5, 4, 2, 1]);
  });

  it('steps only between counts the structure produces: 40 never reaches 18', () => {
    expect(steppedQualifierCount(node(40, SINGLE_ELIMINATION, 10), 1)).toBe(16);
    expect(steppedQualifierCount(node(40, SINGLE_ELIMINATION, 16), 1)).toBe(20);
    expect(steppedQualifierCount(node(40, SINGLE_ELIMINATION, 20), 1)).toBeUndefined();
    expect(steppedQualifierCount(node(40, SINGLE_ELIMINATION, 10), -1)).toBe(8);
    expect(steppedQualifierCount(node(40, SINGLE_ELIMINATION, 1), -1)).toBeUndefined();
  });

  it('defaults to a count the structure produces, about a quarter of its entrants', () => {
    expect(defaultQualifiers(node(40))).toBe(10);
    expect(defaultQualifiers(node(32))).toBe(8);
    // a quarter of 30 is 7, which neither shape produces
    expect(defaultQualifiers(node(30))).toBe(4);
  });
});

describe('the card is the structure the factory generates', () => {
  const sizes = [12, 16, 20, 24, 30, 32, 36, 40, 48, 64];
  for (const entrants of sizes) {
    it(`${entrants} entrants, every offered count`, () => {
      for (const qualifiers of eliminationQualifierCounts(entrants)) {
        const generated = generatedQualifying(entrants, qualifiers);
        const shape = eliminationQualifyingShape(entrants, qualifiers);
        expect({ qualifiers, ...shape }).toEqual({ qualifiers, ...generated });

        const card = node(entrants, SINGLE_ELIMINATION, qualifiers);
        expect(getNumRounds(card)).toBe(generated.rounds.length);
        const preview = generatePreviewMatchUps({ ...card, structureId: 'q' });
        const previewRounds: number[] = [];
        for (const matchUp of preview)
          previewRounds[matchUp.roundNumber - 1] = (previewRounds[matchUp.roundNumber - 1] ?? 0) + 1;
        expect(previewRounds).toEqual(generated.rounds);
      }
    });
  }
});
