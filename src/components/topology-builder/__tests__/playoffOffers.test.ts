/**
 * Playoff offers read from the factory's live answer, and turned back into what its generator is asked for.
 *
 * Built on a real draw: a 32-entry round robin in groups of 4 with a 1-16 playoff attached, the case CA met
 * (2026-11-08) — the round robin could still feed 17-24 and 25-32, the playoff 9-16, 5-8 and 3-4, and nothing showed a
 * director that without visiting each structure.
 */
import { playoffGenerationParams, playoffOffersByStructure, playoffOffersFromProfile } from '../domain/playoffOffers';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { beforeEach, describe, expect, it } from 'vitest';

const PLAYOFF_1_16 = 'Playoff 1-16';
const MAIN = 'Main';
const PLAYOFF_5_8 = 'Playoff 5-8';
let drawId: string;

beforeEach(() => {
  const result: any = mocksEngine.generateTournamentRecord({
    drawProfiles: [
      {
        drawSize: 32,
        drawType: 'ROUND_ROBIN_WITH_PLAYOFF',
        structureOptions: {
          groupSize: 4,
          playoffGroups: [{ finishingPositions: [1, 2], structureName: PLAYOFF_1_16 }]
        }
      }
    ]
  });
  tournamentEngine.setState(result.tournamentRecord);
  drawId = result.drawIds[0];
});

const structureNamed = (name: string) =>
  tournamentEngine.getEvent({ drawId }).drawDefinition.structures.find((s: any) => s.structureName === name);
const offersNow = () =>
  playoffOffersByStructure(tournamentEngine.getAvailablePlayoffProfiles({ drawId }).availablePlayoffProfiles);
const ranges = (structureName: string) =>
  (offersNow().get(structureNamed(structureName).structureId) ?? []).map((offer) => offer.finishingPositionRange);

describe('playoffOffersFromProfile', () => {
  it('reads every structure of the draw from one call, with what is already played off taken out', () => {
    expect(ranges(MAIN)).toEqual(['17-24', '25-32']);
    expect(ranges(PLAYOFF_1_16)).toEqual(['3-4', '5-8', '9-16']);
  });

  it('says where each offer comes from: a round for an elimination structure, a group position for a round robin', () => {
    const offers = offersNow();
    expect(offers.get(structureNamed(MAIN).structureId)).toEqual([
      expect.objectContaining({ key: 'P3', groupFinishingPosition: 3, finishingPositionRange: '17-24' }),
      expect.objectContaining({ key: 'P4', groupFinishingPosition: 4, finishingPositionRange: '25-32' })
    ]);
    expect(offers.get(structureNamed(PLAYOFF_1_16).structureId)).toEqual([
      expect.objectContaining({ key: 'R3', sourceRoundNumber: 3, finishingPositionRange: '3-4' }),
      expect.objectContaining({ key: 'R2', sourceRoundNumber: 2, finishingPositionRange: '5-8' }),
      expect.objectContaining({ key: 'R1', sourceRoundNumber: 1, finishingPositionRange: '9-16' })
    ]);
  });

  it('offers nothing for a structure the factory gives no ranges', () => {
    expect(playoffOffersFromProfile(undefined)).toEqual([]);
    expect(playoffOffersFromProfile({ structureId: 's' })).toEqual([]);
  });
});

describe('playoffGenerationParams — one offer, attached through the factory', () => {
  const attach = (structureName: string, offer: any, name: string) => {
    const generated: any = tournamentEngine.generateAndPopulatePlayoffStructures({
      drawId,
      structureId: structureNamed(structureName).structureId,
      ...(playoffGenerationParams(offer, name) as any)
    });
    expect(generated.error).toBeUndefined();
    const attached: any = tournamentEngine.attachPlayoffStructures({
      drawId,
      structures: generated.structures,
      links: generated.links,
      matchUpModifications: generated.matchUpModifications
    });
    expect(attached.success).toBe(true);
  };

  it('an elimination offer plays off the losers of its round, under the name given', () => {
    const offer = offersNow()
      .get(structureNamed(PLAYOFF_1_16).structureId)!
      .find((o) => o.finishingPositionRange === '5-8');
    attach(PLAYOFF_1_16, offer, PLAYOFF_5_8);
    expect(structureNamed(PLAYOFF_5_8)).toBeTruthy();
    expect(ranges(PLAYOFF_1_16)).toEqual(['3-4', '9-16']);
    expect(ranges(PLAYOFF_5_8)).toEqual(['7-8']);
  });

  it('a round robin offer plays off a group finishing position', () => {
    const offer = offersNow()
      .get(structureNamed(MAIN).structureId)!
      .find((o) => o.finishingPositionRange === '17-24');
    attach(MAIN, offer, 'Playoff 17-24');
    expect(structureNamed('Playoff 17-24')).toBeTruthy();
    expect(ranges(MAIN)).toEqual(['25-32']);
  });
});
