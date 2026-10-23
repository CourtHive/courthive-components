/**
 * A link out of a round robin traverses by finishingPositions whether it is labelled POSITION or WINNER, and a
 * sourceRoundNumber on it decides nothing (CA ruling 2026-10-23). Every builder decision that asks "is this a
 * finishing-position edge" must answer the same for all four shapes of that edge.
 */
import { getEdgeEditMode, siblingFinishingPositionEdges } from '../ui/edgeEditMode';
import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import { validateTopology } from '../domain/topologyValidator';
import { describe, it, expect } from 'vitest';
import {
  carriesQualifiers,
  edgeDisplayType,
  isRoundWinnerEdge,
  leavesRoundRobin,
  traversesByFinishingPosition,
  traversesByRound
} from '../domain/edgeTraversal';

// constants and types
import type { TopologyEdge, TopologyNode, TopologyState } from '../types';
import { drawDefinitionConstants } from 'tods-competition-factory';

const { MAIN, QUALIFYING, PLAY_OFF, ROUND_ROBIN, SINGLE_ELIMINATION, WINNER, LOSER } = drawDefinitionConstants;
const POSITION = 'POSITION';

type Stage = TopologyNode['stage'];
type Variant = { linkType: TopologyEdge['linkType']; sourceRoundNumber?: number };

/** the four shapes of one round robin finishing-position link */
const RR_VARIANTS: Variant[] = [
  { linkType: POSITION },
  { linkType: POSITION, sourceRoundNumber: 3 },
  { linkType: WINNER },
  { linkType: WINNER, sourceRoundNumber: 3 }
];
const variantName = ({ linkType, sourceRoundNumber }: Variant) =>
  sourceRoundNumber ? `${linkType} + sourceRoundNumber ${sourceRoundNumber}` : linkType;

function node(id: string, stage: string, structureType: string, drawSize: number, extra: Partial<TopologyNode> = {}) {
  return { id, structureName: id, stage: stage as Stage, structureType, drawSize, position: { x: 0, y: 0 }, ...extra };
}

function makeState(nodes: TopologyNode[], edges: TopologyEdge[]): TopologyState {
  return { drawName: 'Test', nodes, edges, selectedNodeId: null, selectedEdgeId: null };
}

const rrMain = node('rrMain', MAIN, ROUND_ROBIN, 16, { structureOptions: { groupSize: 4 } });
const gold = node('gold', PLAY_OFF, SINGLE_ELIMINATION, 4);
const silver = node('silver', PLAY_OFF, SINGLE_ELIMINATION, 4);
const rrQualifying = node('rrQ', QUALIFYING, ROUND_ROBIN, 16, { structureOptions: { groupSize: 4 } });
const seQualifying = node('seQ', QUALIFYING, SINGLE_ELIMINATION, 16);
const seMain = node('seMain', MAIN, SINGLE_ELIMINATION, 32);

/** RR main → gold [1] and silver [2], both edges in the variant's shape */
function rrPlayoffState(variant: Variant): TopologyState {
  return makeState(
    [rrMain, gold, silver],
    [
      { id: 'e1', sourceNodeId: 'rrMain', targetNodeId: 'gold', finishingPositions: [1], ...variant },
      { id: 'e2', sourceNodeId: 'rrMain', targetNodeId: 'silver', finishingPositions: [2], ...variant }
    ]
  );
}

/** RR qualifying → SE main round 2, in the variant's shape */
function rrQualifyingState(variant: Variant): TopologyState {
  return makeState(
    [rrQualifying, seMain],
    [
      {
        id: 'q1',
        sourceNodeId: 'rrQ',
        targetNodeId: 'seMain',
        finishingPositions: [1],
        targetRoundNumber: 2,
        ...variant
      }
    ]
  );
}

const roundWinnerEdge: TopologyEdge = {
  id: 'w1',
  sourceNodeId: 'seQ',
  targetNodeId: 'seMain',
  linkType: WINNER,
  sourceRoundNumber: 2
};

describe('edge traversal predicates', () => {
  it.each(RR_VARIANTS)('a round robin edge is a finishing-position edge: $linkType, round $sourceRoundNumber', (v) => {
    const { edges, nodes } = rrPlayoffState(v);
    expect(leavesRoundRobin(edges[0], nodes)).toBe(true);
    expect(traversesByFinishingPosition(edges[0], nodes)).toBe(true);
    expect(traversesByRound(edges[0], nodes)).toBe(false);
    expect(isRoundWinnerEdge(edges[0], nodes)).toBe(false);
    expect(edgeDisplayType(edges[0], nodes)).toBe(POSITION);
  });

  it('a WINNER edge out of an elimination structure is still a round edge', () => {
    const nodes = [seQualifying, seMain];
    expect(traversesByFinishingPosition(roundWinnerEdge, nodes)).toBe(false);
    expect(traversesByRound(roundWinnerEdge, nodes)).toBe(true);
    expect(isRoundWinnerEdge(roundWinnerEdge, nodes)).toBe(true);
    expect(edgeDisplayType(roundWinnerEdge, nodes)).toBe(WINNER);
    expect(carriesQualifiers(roundWinnerEdge, nodes)).toBe(true);
  });

  it('a WINNER edge out of an elimination structure stays a round edge even when it names finishingPositions', () => {
    const edge: TopologyEdge = { ...roundWinnerEdge, finishingPositions: [1] };
    expect(traversesByFinishingPosition(edge, [seQualifying, seMain])).toBe(false);
    expect(isRoundWinnerEdge(edge, [seQualifying, seMain])).toBe(true);
  });

  it('a round robin WINNER edge naming no finishingPositions is not a finishing-position edge', () => {
    const nodes = [rrMain, gold];
    for (const finishingPositions of [undefined, []]) {
      const edge: TopologyEdge = {
        id: 'e',
        sourceNodeId: 'rrMain',
        targetNodeId: 'gold',
        linkType: WINNER,
        finishingPositions
      };
      expect(traversesByFinishingPosition(edge, nodes)).toBe(false);
      expect(traversesByRound(edge, nodes)).toBe(true);
      expect(edgeDisplayType(edge, nodes)).toBe(WINNER);
    }
  });

  it('a LOSER edge out of a round robin is never a finishing-position edge', () => {
    const edge: TopologyEdge = {
      id: 'l',
      sourceNodeId: 'rrMain',
      targetNodeId: 'gold',
      linkType: LOSER,
      finishingPositions: [1]
    };
    expect(traversesByFinishingPosition(edge, [rrMain, gold])).toBe(false);
    expect(traversesByRound(edge, [rrMain, gold])).toBe(true);
    expect(isRoundWinnerEdge(edge, [rrMain, gold])).toBe(false);
  });

  it('a POSITION edge is a finishing-position edge out of any structure', () => {
    const edge: TopologyEdge = { id: 'p', sourceNodeId: 'seMain', targetNodeId: 'gold', linkType: POSITION };
    expect(traversesByFinishingPosition(edge, [seMain, gold])).toBe(true);
    expect(leavesRoundRobin(edge, [seMain, gold])).toBe(false);
  });

  it.each(RR_VARIANTS)('a round robin qualifying edge carries qualifiers: $linkType, round $sourceRoundNumber', (v) => {
    const { edges, nodes } = rrQualifyingState(v);
    expect(carriesQualifiers(edges[0], nodes)).toBe(true);
  });
});

describe('edge editor mode', () => {
  it.each(RR_VARIANTS)('a round robin edge edits as finishing positions: $linkType, round $sourceRoundNumber', (v) => {
    const state = rrPlayoffState(v);
    expect(getEdgeEditMode(state.edges[0], state)).toEqual({
      isQualifyingWinner: false,
      isRRPosition: true,
      showRoundFields: false,
      showFinishingPositionsInput: false,
      showFeedProfile: false
    });
    expect(siblingFinishingPositionEdges(state.edges[0], state).map((e) => e.id)).toEqual(['e2']);
  });

  it.each(RR_VARIANTS)('a round robin qualifying edge shows no qualifier round fields: $linkType', (v) => {
    const state = rrQualifyingState(v);
    const mode = getEdgeEditMode(state.edges[0], state);
    expect(mode.isQualifyingWinner).toBe(false);
    expect(mode.isRRPosition).toBe(true);
    expect(mode.showRoundFields).toBe(false);
  });

  it('a WINNER edge out of an elimination qualifying structure edits as a round winner', () => {
    const state = makeState([seQualifying, seMain], [roundWinnerEdge]);
    expect(getEdgeEditMode(roundWinnerEdge, state)).toEqual({
      isQualifyingWinner: true,
      isRRPosition: false,
      showRoundFields: true,
      showFinishingPositionsInput: false,
      showFeedProfile: false
    });
  });

  it('a round robin WINNER edge naming no finishingPositions shows round fields, not finishing positions', () => {
    const edge: TopologyEdge = { id: 'e', sourceNodeId: 'rrMain', targetNodeId: 'gold', linkType: WINNER };
    const mode = getEdgeEditMode(edge, makeState([rrMain, gold], [edge]));
    expect(mode.isRRPosition).toBe(false);
    expect(mode.showRoundFields).toBe(true);
    expect(mode.showFinishingPositionsInput).toBe(false);
  });
});

describe('topologyToDrawOptions: both labels, with and without sourceRoundNumber, generate the same draw', () => {
  const playoffOptions = RR_VARIANTS.map((v) => {
    const { drawOptions } = topologyToDrawOptions(rrPlayoffState(v));
    return {
      name: variantName(v),
      drawType: drawOptions.drawType,
      playoffGroups: drawOptions.structureOptions?.playoffGroups
    };
  });

  it('every variant is a round robin with playoff groups', () => {
    for (const option of playoffOptions) {
      expect(option.drawType, option.name).toBe('ROUND_ROBIN_WITH_PLAYOFF');
      expect(
        option.playoffGroups?.map((g: any) => g.finishingPositions),
        option.name
      ).toEqual([[1], [2]]);
    }
  });

  it('every variant produces the same drawOptions', () => {
    const [first, ...rest] = playoffOptions;
    for (const option of rest) {
      expect({ ...option, name: first.name }, option.name).toEqual(first);
    }
  });

  it('a round robin qualifying edge sets the roundTarget it names, for every variant', () => {
    const profiles = RR_VARIANTS.map((v) => topologyToDrawOptions(rrQualifyingState(v)).drawOptions.qualifyingProfiles);
    for (const [i, profile] of profiles.entries()) {
      expect(
        profile.map((p: any) => p.roundTarget),
        variantName(RR_VARIANTS[i])
      ).toEqual([2]);
      expect(profile, variantName(RR_VARIANTS[i])).toEqual(profiles[0]);
    }
  });

  it('an elimination qualifying WINNER edge still sets its roundTarget', () => {
    const edge = { ...roundWinnerEdge, targetRoundNumber: 2 };
    const { drawOptions } = topologyToDrawOptions(makeState([seQualifying, seMain], [edge]));
    expect(drawOptions.qualifyingProfiles.map((p: any) => p.roundTarget)).toEqual([2]);
  });
});

describe('validateTopology: both labels, with and without sourceRoundNumber, validate the same', () => {
  const messagesOf = (state: TopologyState) => validateTopology(state).map((e) => `${e.severity}: ${e.message}`);

  it('two round robin finishing-position edges are neither "multiple winner links" nor duplicate rounds', () => {
    const results = RR_VARIANTS.map((v) => messagesOf(rrPlayoffState(v)));
    for (const [i, messages] of results.entries()) {
      const name = variantName(RR_VARIANTS[i]);
      expect(
        messages.some((m) => m.includes('multiple winner links')),
        name
      ).toBe(false);
      expect(
        messages.some((m) => m.includes('multiple links from round')),
        name
      ).toBe(false);
      expect(
        messages.some((m) => m.includes('Edge source round')),
        name
      ).toBe(false);
      expect(messages, name).toEqual(results[0]);
    }
  });

  it('overlapping finishing positions are flagged for every variant', () => {
    const results = RR_VARIANTS.map((v) => {
      const state = rrPlayoffState(v);
      state.edges[1].finishingPositions = [1];
      return messagesOf(state);
    });
    for (const [i, messages] of results.entries()) {
      const name = variantName(RR_VARIANTS[i]);
      expect(messages, name).toContain(
        'warning: Position 1 from "rrMain" is used by multiple finishing-position links'
      );
      expect(messages, name).toEqual(results[0]);
    }
  });

  it('a round robin qualifying structure linked to main is not "without a winner link", for every variant', () => {
    const results = RR_VARIANTS.map((v) => messagesOf(rrQualifyingState(v)));
    for (const [i, messages] of results.entries()) {
      const name = variantName(RR_VARIANTS[i]);
      expect(
        messages.some((m) => m.includes('has no winner link')),
        name
      ).toBe(false);
      expect(messages, name).toEqual(results[0]);
    }
  });

  it('two elimination WINNER edges out of one source are still "multiple winner links"', () => {
    const second = { ...roundWinnerEdge, id: 'w2', sourceRoundNumber: 3 };
    const messages = messagesOf(makeState([seQualifying, seMain], [roundWinnerEdge, second]));
    expect(messages.filter((m) => m.includes('multiple winner links'))).toHaveLength(2);
  });

  it('two elimination edges from the same round are still duplicate rounds', () => {
    const loser: TopologyEdge = {
      id: 'l1',
      sourceNodeId: 'seQ',
      targetNodeId: 'seMain',
      linkType: LOSER,
      sourceRoundNumber: 2
    };
    const messages = messagesOf(makeState([seQualifying, seMain], [roundWinnerEdge, loser]));
    expect(messages.some((m) => m.includes('multiple links from round 2'))).toBe(true);
  });
});
