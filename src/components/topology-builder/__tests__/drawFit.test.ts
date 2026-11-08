/**
 * Fit mode's reading of `getDrawFit`: which node is which structure, what a card and the footer say, what a lever does.
 */
import {
  fitByNode,
  fitKey,
  fitSentence,
  ledgerText,
  steppedDrawSize,
  steppedQualifiers,
  takesEntries
} from '../domain/drawFit';
import { describe, expect, it } from 'vitest';

import type { DrawFit, StructureFit, TopologyNode, TopologyState } from '../types';

const node = (over: Partial<TopologyNode>): TopologyNode =>
  ({
    id: 'n',
    structureName: 'Main',
    stage: 'MAIN',
    structureType: 'SINGLE_ELIMINATION',
    drawSize: 32,
    position: { x: 0, y: 0 },
    ...over
  }) as TopologyNode;

const structureFit = (over: Partial<StructureFit>): StructureFit => ({
  positions: 32,
  placed: 32,
  byes: 0,
  seedByes: 0,
  byesBeyondSeeds: 0,
  seedsCount: 0,
  qualifierSlots: 0,
  open: 0,
  notPlaced: 0,
  status: 'FITS',
  ...over
});

const state = (nodes: TopologyNode[]): TopologyState =>
  ({ nodes, edges: [], selectedNodeId: null, selectedEdgeId: null, drawName: 'D' }) as TopologyState;

describe('fitByNode', () => {
  it('maps the first main node to the main structure, and qualifying nodes by name', () => {
    const topology = state([
      node({ id: 'main' }),
      node({ id: 'q2', stage: 'QUALIFYING', structureName: 'Qual B' }),
      node({ id: 'q1', stage: 'QUALIFYING', structureName: 'Qual A' }),
      node({ id: 'po', stage: 'PLAY_OFF', structureName: 'Playoff' })
    ]);
    const fit: DrawFit = {
      structures: [
        structureFit({ stage: 'MAIN', stageSequence: 1, structureName: 'Main' }),
        structureFit({ stage: 'QUALIFYING', structureName: 'Qual A', positions: 16 }),
        structureFit({ stage: 'QUALIFYING', structureName: 'Qual B', positions: 8 })
      ]
    };
    const byNode = fitByNode(topology, fit);
    expect(byNode.get('main')?.positions).toBe(32);
    expect(byNode.get('q1')?.positions).toBe(16);
    expect(byNode.get('q2')?.positions).toBe(8);
    // a playoff is filled by results: no fit
    expect(byNode.has('po')).toBe(false);
  });

  it('only the main and qualifying structures take entries', () => {
    const topology = state([
      node({ id: 'main' }),
      node({ id: 'q', stage: 'QUALIFYING' }),
      node({ id: 'c', stage: 'CONSOLATION' })
    ]);
    expect(topology.nodes.map((n) => takesEntries(n, topology))).toEqual([true, true, false]);
  });
});

describe('fitKey — what the fit is asked again for', () => {
  it('ignores where a card sits and what is selected', () => {
    const before = state([node({ id: 'main' })]);
    const moved = { ...before, nodes: [{ ...before.nodes[0], position: { x: 400, y: 300 } }], selectedNodeId: 'main' };
    expect(fitKey(moved)).toBe(fitKey(before));
  });

  it('changes with a size or a qualifier count', () => {
    const before = state([node({ id: 'main' })]);
    expect(fitKey(state([node({ id: 'main', drawSize: 64 })]))).not.toBe(fitKey(before));
    expect(fitKey(state([node({ id: 'main', qualifyingPositions: 4 })]))).not.toBe(fitKey(before));
  });
});

describe('what a card and the footer say', () => {
  it('reads a fit as a sentence', () => {
    expect(fitSentence(structureFit({ placed: 28, qualifierSlots: 4 }))).toBe('28 entered · 4 qualifiers');
    expect(fitSentence(structureFit({ placed: 26, byes: 6, seedByes: 6 }))).toBe('26 entered · 6 BYEs (6 to seeds)');
    expect(fitSentence(structureFit({ placed: 32, notPlaced: 8, status: 'OVER' }))).toBe('32 entered · 8 not placed');
    expect(fitSentence(structureFit({ placed: 0, status: 'EMPTY' }))).toBe('No entries yet · 32 positions');
  });

  it('reads the ledger main first, then what was not placed', () => {
    const fit: DrawFit = {
      ledger: {
        QUALIFYING: { selected: { DIRECT_ACCEPTANCE: 12 }, selectedCount: 12, alternates: 0, withdrawn: 0, other: {} },
        MAIN: {
          selected: { DIRECT_ACCEPTANCE: 24, WILDCARD: 4 },
          selectedCount: 28,
          alternates: 6,
          withdrawn: 2,
          other: {}
        }
      },
      notPlaced: [{ participantId: 'p' }]
    };
    expect(ledgerText(fit)).toBe('Main  24 DA · 4 WC · 6 ALT · 2 WD   |   Qualifying  12 DA   |   1 not placed');
    expect(ledgerText({ ledger: {} })).toBe('No entries yet');
  });
});

describe('the levers', () => {
  it('an elimination draw doubles and halves', () => {
    expect(steppedDrawSize(node({ drawSize: 32 }), 1)).toBe(64);
    expect(steppedDrawSize(node({ drawSize: 32 }), -1)).toBe(16);
    expect(steppedDrawSize(node({ drawSize: 2 }), -1)).toBeUndefined();
  });

  it('a round robin moves by a group, a feed-in by one', () => {
    const rr = node({ structureType: 'ROUND_ROBIN', drawSize: 16, structureOptions: { groupSize: 4 } });
    expect(steppedDrawSize(rr, 1)).toBe(20);
    expect(steppedDrawSize({ ...rr, drawSize: 4 }, -1)).toBeUndefined();
    expect(steppedDrawSize(node({ structureType: 'FEED_IN', drawSize: 24 }), 1)).toBe(25);
  });

  it('qualifiers stay between one and half the qualifying draw', () => {
    const q = node({ stage: 'QUALIFYING', drawSize: 16, qualifyingPositions: 4 });
    expect(steppedQualifiers(q, 1)).toBe(5);
    expect(steppedQualifiers({ ...q, qualifyingPositions: 8 }, 1)).toBeUndefined();
    expect(steppedQualifiers({ ...q, qualifyingPositions: 1 }, -1)).toBeUndefined();
  });
});
