/**
 * Playoff offers read from the factory's live answer, and turned back into what its generator is asked for.
 *
 * Built on a real draw: a 32-entry round robin in groups of 4 with a 1-16 playoff attached, the case CA met
 * (2026-11-08) — the round robin could still feed 17-24 and 25-32, the playoff 9-16, 5-8 and 3-4, and nothing showed a
 * director that without visiting each structure.
 */
import {
  canAddVoluntaryConsolation,
  playoffOffersByStructure,
  playoffOffersFromProfile,
  playoffGenerationParams,
  offerStructureName
} from '../domain/playoffOffers';
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
    // the 1-16 playoff offers 3-4, so it offers a page playoff for 1-4 beside it
    expect(ranges(PLAYOFF_1_16)).toEqual(['1-4', '3-4', '5-8', '9-16']);
  });

  it('says where each offer comes from: a round for an elimination structure, a group position for a round robin', () => {
    const offers = offersNow();
    expect(offers.get(structureNamed(MAIN).structureId)).toEqual([
      expect.objectContaining({ key: 'P3', groupFinishingPosition: 3, finishingPositionRange: '17-24' }),
      expect.objectContaining({ key: 'P4', groupFinishingPosition: 4, finishingPositionRange: '25-32' })
    ]);
    expect(offers.get(structureNamed(PLAYOFF_1_16).structureId)).toEqual([
      expect.objectContaining({
        key: 'PAGE',
        kind: 'pagePlayoff',
        sourceRoundNumber: 3,
        finishingPositionRange: '1-4'
      }),
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
    expect(ranges(PLAYOFF_1_16)).toEqual(['1-4', '3-4', '9-16']);
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

describe('a page playoff is offered beside 3-4, and is its alternative', () => {
  const elimination = () => {
    const result: any = mocksEngine.generateTournamentRecord({ drawProfiles: [{ drawSize: 16 }] });
    tournamentEngine.setState(result.tournamentRecord);
    return result.drawIds[0] as string;
  };
  const mainOffers = (id: string) => {
    const dd = tournamentEngine.getEvent({ drawId: id }).drawDefinition;
    const profiles = tournamentEngine.getAvailablePlayoffProfiles({ drawId: id }).availablePlayoffProfiles;
    return playoffOffersByStructure(profiles, dd).get(dd.structures[0].structureId) ?? [];
  };
  const keys = (id: string) => mainOffers(id).map((o) => o.key);

  it('offers it wherever 3-4 is offered, drawing from the semifinal', () => {
    const id = elimination();
    expect(keys(id)).toEqual(['PAGE', 'R3', 'R2', 'R1', 'VC']);
    expect(mainOffers(id).find((o) => o.kind === 'pagePlayoff')).toMatchObject({
      finishingPositionRange: '1-4',
      finishingPositions: [1, 2, 3, 4],
      sourceRoundNumber: 3
    });
  });

  it('a round robin, which offers no 3-4 range, offers no page playoff', () => {
    expect(ranges(MAIN)).toEqual(['17-24', '25-32']);
  });

  it('once attached, the factory no longer offers 3-4, so neither chip remains', () => {
    const id = elimination();
    const page = mainOffers(id).find((o) => o.kind === 'pagePlayoff')!;
    const structureId = tournamentEngine.getEvent({ drawId: id }).drawDefinition.structures[0].structureId;
    const generated: any = tournamentEngine.generateAndPopulatePlayoffStructures({
      drawId: id,
      structureId,
      ...(playoffGenerationParams(page, offerStructureName(page)) as any)
    });
    expect(generated.error).toBeUndefined();
    const attached: any = tournamentEngine.attachPlayoffStructures({
      drawId: id,
      structures: generated.structures,
      links: generated.links,
      matchUpModifications: generated.matchUpModifications
    });
    expect(attached.success).toBe(true);
    const names = tournamentEngine.getEvent({ drawId: id }).drawDefinition.structures.map((s: any) => s.structureName);
    // unnamed, as the dialog leaves it: the factory names the three structures
    expect(names).toEqual(['Main', '3-4 Playoff', 'Playoff Qualifier', 'Playoff Final']);
    expect(keys(id)).toEqual(['R2', 'R1', 'VC']);
  });
});

describe('a voluntary consolation is offered on the first main elimination structure, once', () => {
  it('the structure menu rule: main, first stage, not a round robin, not ad hoc, none yet', () => {
    const result: any = mocksEngine.generateTournamentRecord({ drawProfiles: [{ drawSize: 16 }] });
    tournamentEngine.setState(result.tournamentRecord);
    const id = result.drawIds[0];
    const dd = () => tournamentEngine.getEvent({ drawId: id }).drawDefinition;
    const mainId = dd().structures[0].structureId;
    expect(canAddVoluntaryConsolation(dd(), mainId)).toBe(true);

    const vc = playoffOffersByStructure([], dd()).get(mainId)!;
    expect(vc).toEqual([expect.objectContaining({ key: 'VC', kind: 'voluntaryConsolation' })]);
    // not a playoff: no generator parameters, the host attaches it its own way
    expect(playoffGenerationParams(vc[0], offerStructureName(vc[0]))).toBeUndefined();

    const generated: any = tournamentEngine.generateVoluntaryConsolation({
      drawId: id,
      structureName: offerStructureName(vc[0])
    });
    const attached: any = tournamentEngine.attachConsolationStructures({
      drawId: id,
      structures: generated.structures,
      links: generated.links
    });
    expect(attached.success).toBe(true);
    expect(dd().structures.map((s: any) => [s.stage, s.structureName])).toEqual([
      ['MAIN', 'Main'],
      ['VOLUNTARY_CONSOLATION', 'Consolation']
    ]);
    // one only
    expect(canAddVoluntaryConsolation(dd(), mainId)).toBe(false);
  });

  it('not on a round robin, nor on a playoff structure', () => {
    const dd = tournamentEngine.getEvent({ drawId }).drawDefinition;
    expect(canAddVoluntaryConsolation(dd, structureNamed(MAIN).structureId)).toBe(false);
    expect(canAddVoluntaryConsolation(dd, structureNamed(PLAYOFF_1_16).structureId)).toBe(false);
  });

  it('not in an ad hoc draw', () => {
    const result: any = mocksEngine.generateTournamentRecord({ drawProfiles: [{ drawSize: 8, drawType: 'AD_HOC' }] });
    tournamentEngine.setState(result.tournamentRecord);
    const dd = tournamentEngine.getEvent({ drawId: result.drawIds[0] }).drawDefinition;
    expect(canAddVoluntaryConsolation(dd, dd.structures[0].structureId)).toBe(false);
  });
});
