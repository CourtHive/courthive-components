import { customLuckyProfile, getNodeLosersForRound, getNodeTotalRounds } from '../domain/feedRounds';
import { drawDefinitionConstants, tournamentEngine } from 'tods-competition-factory';
import { generateDrawFromTopology } from '../domain/generateDrawFromTopology';
import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import { generatePreviewMatchUps } from '../domain/previewGenerator';
import { validateTopology } from '../domain/topologyValidator';
import type { TopologyState, TopologyNode } from '../types';
import { describe, expect, it } from 'vitest';

// LUCKY_DRAW round profiles in the topology builder (CA, 2026-11-08): a main lucky draw node carries its explicit
// matchUps-per-round as `structureOptions.roundProfile`, which reaches the factory as `roundProfile`.

const { LUCKY_DRAW, MAIN } = drawDefinitionConstants;
const CUSTOM = [20, 12, 8, 4, 2, 1];

function luckyMain(structureOptions?: any, drawSize = 40): TopologyNode {
  return {
    id: 'main',
    structureName: 'Lucky Draw',
    stage: MAIN as TopologyNode['stage'],
    structureType: LUCKY_DRAW,
    drawSize,
    structureOptions,
    position: { x: 0, y: 0 }
  };
}

const stateWith = (node: TopologyNode): TopologyState => ({
  drawName: 'Lucky',
  nodes: [node],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null
});

const perRound = (matchUps: Array<{ roundNumber?: number }>) => {
  const counts: number[] = [];
  for (const { roundNumber } of matchUps) if (roundNumber) counts[roundNumber - 1] = (counts[roundNumber - 1] ?? 0) + 1;
  return counts;
};

describe('feedRounds — a custom lucky profile drives rounds and losers', () => {
  it('uses the profile for the round count and for the losers who leave each round', () => {
    expect(getNodeTotalRounds(LUCKY_DRAW, 40, { roundProfile: [20, 12, 8, 4, 2, 1] })).toBe(6);
    expect(getNodeTotalRounds(LUCKY_DRAW, 64, { roundProfile: [32, 20, 10, 5, 3, 2, 1] })).toBe(7);
    // R1: 20 losers, 4 taken back as lucky losers → 16 leave; R2: 12 − 4 → 8; then all leave
    const leaving = [1, 2, 3, 4, 5, 6].map((r) => getNodeLosersForRound(LUCKY_DRAW, 40, r, { roundProfile: CUSTOM }));
    expect(leaving).toEqual([16, 8, 8, 4, 2, 1]);
  });

  it('ignores an invalid profile and counts the default cascade instead', () => {
    const invalid = { roundProfile: [20, 9, 5, 3, 2, 1] };
    expect(customLuckyProfile(40, invalid)).toBeUndefined();
    expect(getNodeTotalRounds(LUCKY_DRAW, 40, invalid)).toBe(getNodeTotalRounds(LUCKY_DRAW, 40));
    expect(getNodeLosersForRound(LUCKY_DRAW, 40, 1, invalid)).toBe(getNodeLosersForRound(LUCKY_DRAW, 40, 1));
  });
});

describe('previewGenerator — the canvas shows the profile', () => {
  it('previews each round with the matchUps the profile names, flagging the rounds that feed lucky losers', () => {
    const matchUps = generatePreviewMatchUps({
      structureType: LUCKY_DRAW,
      drawSize: 40,
      structureOptions: { roundProfile: CUSTOM }
    });
    expect(perRound(matchUps)).toEqual(CUSTOM);
    const feeding = [...new Set(matchUps.filter((m: any) => m.preFeedRound).map((m) => m.roundNumber))];
    expect(feeding).toEqual([1, 2]);
  });
});

describe('topologyToDrawOptions — the profile is the factory roundProfile', () => {
  it('sends a valid profile as roundProfile and keeps it out of structureOptions', () => {
    const { drawOptions } = topologyToDrawOptions(stateWith(luckyMain({ roundProfile: CUSTOM })));
    expect(drawOptions.drawType).toBe(LUCKY_DRAW);
    expect(drawOptions.roundProfile).toEqual(CUSTOM);
    expect(drawOptions.structureOptions).toBeUndefined();
  });

  it('sends nothing for no profile, or an invalid one', () => {
    expect(topologyToDrawOptions(stateWith(luckyMain())).drawOptions.roundProfile).toBeUndefined();
    const invalid = topologyToDrawOptions(stateWith(luckyMain({ roundProfile: [20, 9, 5, 3, 2, 1] })));
    expect(invalid.drawOptions.roundProfile).toBeUndefined();
  });
});

describe('topologyValidator — an invalid profile is an error on its node', () => {
  it('reports why, on the node', () => {
    const errors = validateTopology(stateWith(luckyMain({ roundProfile: [20, 9, 5, 3, 2, 1] })));
    const error = errors.find((e) => e.nodeId === 'main' && e.severity === 'error');
    expect(error?.message).toContain('Round 2 has only 18 slots');
  });

  it('is silent for a valid profile', () => {
    expect(
      validateTopology(stateWith(luckyMain({ roundProfile: CUSTOM }))).filter((e) => e.severity === 'error')
    ).toEqual([]);
  });
});

describe('generateDrawFromTopology — the factory builds the profiled draw', () => {
  it('generates the matchUps per round the profile names, and stores the profile on the structure', () => {
    const result = generateDrawFromTopology(stateWith(luckyMain({ roundProfile: CUSTOM })));
    expect(result.success).toBe(true);
    expect(result.structures[0].matchUpCount).toBe(CUSTOM.reduce((a, b) => a + b, 0));

    const { matchUps } = tournamentEngine.allTournamentMatchUps({ inContext: true });
    expect(perRound(matchUps)).toEqual(CUSTOM);

    const { tournamentRecord } = tournamentEngine.getTournament();
    const structure = tournamentRecord.events[0].drawDefinitions[0].structures[0];
    const stored = structure.extensions?.find((e: any) => e.name === 'customRoundProfile')?.value;
    expect(stored).toEqual(CUSTOM);
  });
});
