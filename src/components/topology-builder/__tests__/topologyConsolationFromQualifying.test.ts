import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import { drawDefinitionConstants } from 'tods-competition-factory';
import { validateTopology } from '../domain/topologyValidator';
import type { TopologyState, TopologyNode } from '../types';
import { standardTemplates } from '../domain/templates';
import { describe, it, expect } from 'vitest';

const { SINGLE_ELIMINATION, FIRST_MATCH_LOSER_CONSOLATION, MAIN, QUALIFYING, CONSOLATION, WINNER, LOSER } =
  drawDefinitionConstants;
type Stage = TopologyNode['stage'];
const QUALIFYING_CONSOLATION = 'Qualifying Consolation';

const main = (drawSize = 64): TopologyNode => ({
  id: 'main',
  structureName: 'Main Draw',
  stage: MAIN as Stage,
  structureType: SINGLE_ELIMINATION,
  drawSize,
  position: { x: 0, y: 0 }
});
const qualifying = (seedsCount?: number): TopologyNode => ({
  id: 'qual',
  structureName: 'Qualifying',
  stage: QUALIFYING as Stage,
  structureType: SINGLE_ELIMINATION,
  drawSize: 64,
  qualifyingPositions: 16,
  ...(seedsCount === undefined ? {} : { seedsCount }),
  position: { x: 0, y: 0 }
});
const consolation = (id = 'qcons', structureName = QUALIFYING_CONSOLATION, drawSize = 32): TopologyNode => ({
  id,
  structureName,
  stage: CONSOLATION as Stage,
  structureType: SINGLE_ELIMINATION,
  drawSize,
  position: { x: 0, y: 0 }
});
const qualifierEdge = { id: 'e-q', sourceNodeId: 'qual', targetNodeId: 'main', linkType: WINNER, targetRoundNumber: 1 };
const qualConsolationEdge = {
  id: 'e-qc',
  sourceNodeId: 'qual',
  targetNodeId: 'qcons',
  linkType: LOSER,
  sourceRoundNumber: 1,
  targetRoundNumber: 1
};
const state = (nodes: TopologyNode[], edges: any[]): TopologyState => ({
  drawName: 'T',
  selectedNodeId: null,
  selectedEdgeId: null,
  nodes,
  edges
});

describe('topologyToDrawOptions — a consolation fed by a QUALIFYING node', () => {
  it('becomes an attach method that names its source, and leaves the main drawType alone', () => {
    const s = state([qualifying(16), main(), consolation()], [qualifierEdge, qualConsolationEdge]);
    expect(validateTopology(s).filter((v) => v.severity === 'error')).toEqual([]);

    const { drawOptions, postGenerationMethods } = topologyToDrawOptions(s);
    expect(drawOptions.drawType).toBe(SINGLE_ELIMINATION);
    expect(drawOptions.qualifyingProfiles).toEqual([
      {
        roundTarget: 1,
        structureProfiles: [
          {
            structureName: 'Qualifying',
            drawType: SINGLE_ELIMINATION,
            drawSize: 64,
            qualifyingPositions: 16,
            seedsCount: 16
          }
        ]
      }
    ]);
    expect(postGenerationMethods).toEqual([
      {
        method: 'attachConsolationStructures',
        params: {
          structureName: QUALIFYING_CONSOLATION,
          structureType: SINGLE_ELIMINATION,
          drawSize: 32,
          matchUpFormat: undefined,
          structureOptions: undefined,
          sourceStructureName: 'Qualifying',
          sourceStage: QUALIFYING,
          links: [{ sourceRoundNumber: 1, targetRoundNumber: 1 }]
        }
      }
    ]);
  });

  it('a node without seedsCount still sends seedsCount: 0', () => {
    const { drawOptions } = topologyToDrawOptions(state([qualifying(), main()], [qualifierEdge]));
    expect(drawOptions.qualifyingProfiles[0].structureProfiles[0].seedsCount).toBe(0);
  });

  it('under an FMLC main the main-side consolation is the drawType and only the qualifying-side one is attached', () => {
    const mainConsolationEdge = {
      id: 'e-mc',
      sourceNodeId: 'main',
      targetNodeId: 'mcons',
      linkType: LOSER,
      sourceRoundNumber: 1,
      targetRoundNumber: 1
    };
    // no qualifying node: a single consolation off main round 1 infers FMLC
    const fmlc = topologyToDrawOptions(state([main(), consolation('mcons', 'Consolation')], [mainConsolationEdge]));
    expect(fmlc.drawOptions.drawType).toBe(FIRST_MATCH_LOSER_CONSOLATION);
    expect(fmlc.postGenerationMethods).toEqual([]);

    // with a qualifying present the inference is SE (its guard needs no qualifying nodes), so BOTH consolations attach,
    // each naming its own source
    const both = topologyToDrawOptions(
      state(
        [qualifying(), main(), consolation('mcons', 'Consolation'), consolation()],
        [qualifierEdge, mainConsolationEdge, qualConsolationEdge]
      )
    );
    expect(both.drawOptions.drawType).toBe(SINGLE_ELIMINATION);
    expect(both.postGenerationMethods.map((m) => [m.params.sourceStage, m.params.structureName])).toEqual([
      [MAIN, 'Consolation'],
      [QUALIFYING, QUALIFYING_CONSOLATION]
    ]);
  });
});

describe('standard template — Single Elimination + Qualifying with consolation', () => {
  it('validates and converts to a 64 SE main, a seeded 64 qualifying and a tagged consolation attach', () => {
    const template = standardTemplates.find((t) => t.name === 'Single Elimination + Qualifying with consolation');
    expect(template).toBeDefined();
    const s: TopologyState = { ...template!.state, selectedNodeId: null, selectedEdgeId: null };
    expect(validateTopology(s)).toEqual([]);
    const { drawOptions, postGenerationMethods } = topologyToDrawOptions(s);
    expect(drawOptions.drawType).toBe(SINGLE_ELIMINATION);
    expect(drawOptions.drawSize).toBe(64);
    expect(drawOptions.qualifiersCount).toBe(16);
    expect(drawOptions.qualifyingProfiles[0].structureProfiles[0]).toMatchObject({
      drawSize: 64,
      qualifyingPositions: 16,
      seedsCount: 16
    });
    expect(postGenerationMethods).toHaveLength(1);
    expect(postGenerationMethods[0].params).toMatchObject({
      sourceStage: QUALIFYING,
      drawSize: 32,
      links: [{ sourceRoundNumber: 1, targetRoundNumber: 1 }]
    });
  });
});
