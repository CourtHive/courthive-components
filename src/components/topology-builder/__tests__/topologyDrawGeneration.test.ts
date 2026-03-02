import { describe, it, expect } from 'vitest';
import { drawDefinitionConstants } from 'tods-competition-factory';
import { generateDrawFromTopology } from '../domain/generateDrawFromTopology';
import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import type { TopologyState, TopologyNode } from '../types';

const { SINGLE_ELIMINATION, FEED_IN, MAIN, QUALIFYING, PLAY_OFF, WINNER, LOSER } = drawDefinitionConstants;

type Stage = TopologyNode['stage'];

function makeState(overrides: Partial<TopologyState> = {}): TopologyState {
  return {
    drawName: 'Test Draw',
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    ...overrides
  };
}

describe('topologyToDrawOptions — drawType coercion', () => {
  it('keeps SINGLE_ELIMINATION for power-of-2 draw sizes', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 0, y: 0 }
        }
      ]
    });
    const { drawOptions } = topologyToDrawOptions(state);
    expect(drawOptions.drawType).toBe(SINGLE_ELIMINATION);
  });

  it('coerces SINGLE_ELIMINATION to FEED_IN for non-power-of-2 draw sizes', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 36,
          position: { x: 0, y: 0 }
        }
      ]
    });
    const { drawOptions } = topologyToDrawOptions(state);
    expect(drawOptions.drawType).toBe(FEED_IN);
  });

  it('does not override to CUSTOM when qualifying nodes exist', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 320, y: 40 }
        },
        {
          id: 'q1',
          structureName: 'Qualifying',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          qualifyingPositions: 4,
          position: { x: 40, y: 40 }
        }
      ],
      edges: [
        {
          id: 'e1',
          sourceNodeId: 'q1',
          targetNodeId: 'main',
          linkType: WINNER,
          targetRoundNumber: 1,
          qualifyingPositions: 4
        }
      ]
    });
    const { drawOptions } = topologyToDrawOptions(state);
    // Should remain SINGLE_ELIMINATION (32 is power of 2), NOT CUSTOM
    expect(drawOptions.drawType).toBe(SINGLE_ELIMINATION);
    expect(drawOptions.qualifyingProfiles).toBeDefined();
  });
});

describe('generateDrawFromTopology — factory integration', () => {
  it('generates a simple power-of-2 SINGLE_ELIMINATION draw (32)', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 0, y: 0 }
        }
      ]
    });

    const result = generateDrawFromTopology(state);
    expect(result.success).toBe(true);
    expect(result.structures).toHaveLength(1);
    expect(result.structures[0].matchUpCount).toBe(31);
    expect(result.drawOptions.drawType).toBe(SINGLE_ELIMINATION);
  });

  it('generates a non-power-of-2 FEED_IN draw (36) with 35 matchUps', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 36,
          position: { x: 0, y: 0 }
        }
      ]
    });

    const result = generateDrawFromTopology(state);
    expect(result.success).toBe(true);
    expect(result.drawOptions.drawType).toBe(FEED_IN);
    expect(result.structures).toHaveLength(1);
    expect(result.structures[0].matchUpCount).toBe(35);
  });

  it('generates power-of-2 draw with 1 qualifying structure', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 320, y: 40 }
        },
        {
          id: 'q1',
          structureName: 'Qualifying',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          qualifyingPositions: 4,
          position: { x: 40, y: 40 }
        }
      ],
      edges: [
        {
          id: 'e1',
          sourceNodeId: 'q1',
          targetNodeId: 'main',
          linkType: WINNER,
          targetRoundNumber: 1,
          qualifyingPositions: 4
        }
      ]
    });

    const result = generateDrawFromTopology(state, 44); // 32 main + 16 qualifying, some overlap
    expect(result.success).toBe(true);
    expect(result.drawOptions.drawType).toBe(SINGLE_ELIMINATION);

    // Should have MAIN + QUALIFYING structures
    expect(result.structures.length).toBeGreaterThanOrEqual(2);

    const mainStructure = result.structures.find((s) => s.stage === MAIN);
    expect(mainStructure).toBeDefined();
    expect(mainStructure.matchUpCount).toBe(31);

    const qualifyingStructures = result.structures.filter((s) => s.stage === QUALIFYING);
    expect(qualifyingStructures.length).toBeGreaterThanOrEqual(1);
  });

  it('"Barry" scenario — 36-draw main + 2 qualifying structures', () => {
    const state = makeState({
      drawName: 'Barry Draw',
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 36,
          position: { x: 320, y: 40 }
        },
        {
          id: 'q1',
          structureName: 'Qualifying 1',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          qualifyingPositions: 4,
          position: { x: 40, y: 40 }
        },
        {
          id: 'q2',
          structureName: 'Qualifying 2',
          stage: QUALIFYING as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          qualifyingPositions: 4,
          position: { x: 40, y: 210 }
        }
      ],
      edges: [
        {
          id: 'e1',
          sourceNodeId: 'q1',
          targetNodeId: 'main',
          linkType: WINNER,
          targetRoundNumber: 1,
          qualifyingPositions: 4
        },
        {
          id: 'e2',
          sourceNodeId: 'q2',
          targetNodeId: 'main',
          linkType: WINNER,
          targetRoundNumber: 1,
          qualifyingPositions: 4
        }
      ]
    });

    const result = generateDrawFromTopology(state, 60);
    expect(result.success).toBe(true);
    expect(result.drawOptions.drawType).toBe(FEED_IN);

    // Main structure should have 35 matchUps (n-1 for 36)
    const mainStructure = result.structures.find((s) => s.stage === MAIN);
    expect(mainStructure).toBeDefined();
    expect(mainStructure.matchUpCount).toBe(35);

    // Should have qualifying structures
    const qualifyingStructures = result.structures.filter((s) => s.stage === QUALIFYING);
    expect(qualifyingStructures.length).toBeGreaterThanOrEqual(1);

    // Should have WINNER links
    expect(result.linkCount).toBeGreaterThanOrEqual(1);
  });

  it('generates SE draw with playoff structure via withPlayoffs', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 0, y: 0 }
        },
        {
          id: 'po1',
          structureName: '3-4 Playoff',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 2,
          position: { x: 400, y: 200 }
        }
      ],
      edges: [
        {
          id: 'e1',
          sourceNodeId: 'main',
          targetNodeId: 'po1',
          linkType: LOSER,
          sourceRoundNumber: 4
        }
      ]
    });

    // Verify topologyToDrawOptions produces withPlayoffs in drawOptions
    const { drawOptions, postGenerationMethods } = topologyToDrawOptions(state);
    expect(drawOptions.withPlayoffs).toBeDefined();
    expect(drawOptions.withPlayoffs.roundProfiles).toHaveLength(1);
    expect(postGenerationMethods).toHaveLength(0);

    // Verify factory integration produces playoff structure
    const result = generateDrawFromTopology(state);
    expect(result.success).toBe(true);

    const playoffStructures = result.structures.filter((s) => s.stage === PLAY_OFF);
    expect(playoffStructures.length).toBeGreaterThanOrEqual(1);

    // Should have LOSER link connecting main to playoff
    expect(result.linkCount).toBeGreaterThanOrEqual(1);
  });

  it('COMPASS-like topology produces nested withPlayoffs.roundPlayoffs', () => {
    const state = makeState({
      nodes: [
        {
          id: 'main',
          structureName: 'Main Draw',
          stage: MAIN as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 32,
          position: { x: 0, y: 0 }
        },
        {
          id: 'west',
          structureName: 'West',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 16,
          position: { x: 400, y: 0 }
        },
        {
          id: 'north',
          structureName: 'North',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 400, y: 200 }
        },
        {
          id: 'northeast',
          structureName: 'Northeast',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 400, y: 400 }
        },
        {
          id: 'south',
          structureName: 'South',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 8,
          position: { x: 800, y: 0 }
        },
        {
          id: 'southwest',
          structureName: 'Southwest',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 800, y: 200 }
        },
        {
          id: 'northwest',
          structureName: 'Northwest',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 800, y: 400 }
        },
        {
          id: 'southeast',
          structureName: 'Southeast',
          stage: PLAY_OFF as Stage,
          drawType: SINGLE_ELIMINATION,
          drawSize: 4,
          position: { x: 1200, y: 0 }
        }
      ],
      edges: [
        // Main -> West (R1), North (R2), Northeast (R3)
        { id: 'e1', sourceNodeId: 'main', targetNodeId: 'west', linkType: LOSER, sourceRoundNumber: 1 },
        { id: 'e2', sourceNodeId: 'main', targetNodeId: 'north', linkType: LOSER, sourceRoundNumber: 2 },
        { id: 'e3', sourceNodeId: 'main', targetNodeId: 'northeast', linkType: LOSER, sourceRoundNumber: 3 },
        // West -> South (R1), Southwest (R2)
        { id: 'e4', sourceNodeId: 'west', targetNodeId: 'south', linkType: LOSER, sourceRoundNumber: 1 },
        { id: 'e5', sourceNodeId: 'west', targetNodeId: 'southwest', linkType: LOSER, sourceRoundNumber: 2 },
        // North -> Northwest (R1)
        { id: 'e6', sourceNodeId: 'north', targetNodeId: 'northwest', linkType: LOSER, sourceRoundNumber: 1 },
        // South -> Southeast (R1)
        { id: 'e7', sourceNodeId: 'south', targetNodeId: 'southeast', linkType: LOSER, sourceRoundNumber: 1 }
      ]
    });

    // Verify topologyToDrawOptions produces nested roundPlayoffs
    const { drawOptions } = topologyToDrawOptions(state);
    expect(drawOptions.withPlayoffs).toBeDefined();
    expect(drawOptions.withPlayoffs.roundProfiles).toHaveLength(3);
    expect(drawOptions.withPlayoffs.roundPlayoffs).toBeDefined();
    expect(drawOptions.withPlayoffs.roundPlayoffs[1]).toBeDefined(); // West children
    expect(drawOptions.withPlayoffs.roundPlayoffs[2]).toBeDefined(); // North children
    expect(drawOptions.withPlayoffs.roundPlayoffs[1].roundPlayoffs).toBeDefined(); // South children
    expect(drawOptions.withPlayoffs.roundPlayoffs[1].roundPlayoffs[1]).toBeDefined(); // Southeast

    // Verify factory integration produces all 8 structures
    const result = generateDrawFromTopology(state);
    expect(result.success).toBe(true);
    expect(result.structures).toHaveLength(8);

    const structureNames = result.structures.map((s) => s.structureName).sort();
    expect(structureNames).toEqual([
      'Main',
      'North',
      'Northeast',
      'Northwest',
      'South',
      'Southeast',
      'Southwest',
      'West'
    ]);

    // 7 LOSER links
    expect(result.linkCount).toEqual(7);

    // 72 total matchUps
    const totalMatchUps = result.structures.reduce((sum, s) => sum + s.matchUpCount, 0);
    expect(totalMatchUps).toEqual(72);
  });
});
