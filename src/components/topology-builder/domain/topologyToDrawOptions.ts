/**
 * Topology to Draw Options — Converts TopologyState to factory drawOptions.
 * Groups qualifying edges by targetRoundNumber -> qualifyingProfiles.
 */
import type { TopologyState, TopologyNode, TopologyEdge } from '../types';
import { drawDefinitionConstants } from 'tods-competition-factory';

const {
  MAIN,
  CONSOLATION,
  QUALIFYING,
  PLAY_OFF,
  SINGLE_ELIMINATION,
  FEED_IN,
  FIRST_MATCH_LOSER_CONSOLATION,
  FIRST_ROUND_LOSER_CONSOLATION,
  FEED_IN_CHAMPIONSHIP,
  COMPASS,
  WINNER,
  LOSER,
  ROUND_ROBIN,
  ROUND_ROBIN_WITH_PLAYOFF
} = drawDefinitionConstants;

const POSITION = 'POSITION';
const RR_TYPES = new Set([ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF]);

export interface DrawOptionsResult {
  drawOptions: any;
  postGenerationMethods: any[];
}

const CONSOLATION_COMPOSITE_TYPES: Record<string, string> = {
  [FIRST_MATCH_LOSER_CONSOLATION]: FIRST_MATCH_LOSER_CONSOLATION,
  [FIRST_ROUND_LOSER_CONSOLATION]: FIRST_ROUND_LOSER_CONSOLATION,
  [FEED_IN_CHAMPIONSHIP]: FEED_IN_CHAMPIONSHIP,
  [COMPASS]: COMPASS
};

export function topologyToDrawOptions(state: TopologyState): DrawOptionsResult {
  const mainNode = state.nodes.find((n) => n.stage === MAIN);
  if (!mainNode) {
    throw new Error('No main structure node found');
  }

  const consolationNodes = state.nodes.filter((n) => n.stage === CONSOLATION);
  const qualifyingNodes = state.nodes.filter((n) => n.stage === QUALIFYING);
  const playoffNodes = state.nodes.filter((n) => n.stage === PLAY_OFF);

  // Determine the effective draw type.
  // Use the main node's drawType, or map to a composite type for consolation.
  // The factory handles qualifyingProfiles independently, so no CUSTOM wrapper is needed.
  let drawType = mainNode.drawType;

  if (
    drawType !== COMPASS &&
    consolationNodes.length === 1 &&
    qualifyingNodes.length === 0 &&
    playoffNodes.length === 0
  ) {
    const consolationType = consolationNodes[0].drawType;
    const composite = CONSOLATION_COMPOSITE_TYPES[consolationType];
    if (composite) drawType = composite;
  }

  // Coerce SINGLE_ELIMINATION to FEED_IN for non-power-of-2 draw sizes.
  // FEED_IN uses feedInMatchUps() which properly handles staggered entry.
  if (drawType === SINGLE_ELIMINATION && !isPowerOf2(mainNode.drawSize)) {
    drawType = FEED_IN;
  }

  const drawOptions: any = {
    drawName: state.drawName,
    drawType,
    drawSize: mainNode.drawSize,
    matchUpFormat: mainNode.matchUpFormat || undefined,
    structureOptions: mainNode.structureOptions || undefined,
    automated: true
  };

  // Build qualifying profiles from qualifying nodes and their edges
  if (qualifyingNodes.length > 0) {
    const qualifyingEdges = state.edges.filter(
      (e) => e.linkType === WINNER && qualifyingNodes.some((n) => n.id === e.sourceNodeId)
    );

    // Group by target round number
    const byTargetRound: Record<number, { node: TopologyNode; edge: TopologyEdge }[]> = {};
    for (const qNode of qualifyingNodes) {
      const edge = qualifyingEdges.find((e) => e.sourceNodeId === qNode.id);
      const targetRound = edge?.targetRoundNumber || 1;
      if (!byTargetRound[targetRound]) byTargetRound[targetRound] = [];
      byTargetRound[targetRound].push({ node: qNode, edge });
    }

    // Calculate total qualifying positions
    let totalQualifiers = 0;
    const profiles = Object.entries(byTargetRound).map(([roundTarget, entries]) => {
      const structureProfiles = entries.map(({ node, edge }) => {
        const qualifyingPositions =
          node.qualifyingPositions || edge?.qualifyingPositions || Math.floor(node.drawSize / 4);
        totalQualifiers += qualifyingPositions;
        return {
          structureName: node.structureName,
          drawType: node.drawType,
          drawSize: node.drawSize,
          qualifyingPositions,
          seedsCount: 0
        };
      });
      return {
        roundTarget: Number(roundTarget),
        structureProfiles
      };
    });

    drawOptions.qualifyingProfiles = profiles;
    drawOptions.qualifiersCount = totalQualifiers;
    drawOptions.qualifyingPlaceholder = true;
  }

  // Post-generation methods for playoff structures
  const postGenerationMethods: any[] = [];
  const isMainRR = RR_TYPES.has(mainNode.drawType);

  // Collect POSITION edges from the main RR node to playoff nodes
  const rrPositionEdges = isMainRR
    ? state.edges.filter(
        (e) =>
          e.sourceNodeId === mainNode.id && e.linkType === POSITION && playoffNodes.some((p) => p.id === e.targetNodeId)
      )
    : [];

  if (isMainRR && rrPositionEdges.length > 0) {
    // RR → playoff via POSITION links
    const playoffAttributes: Record<string, { name: string; abbreviation: string }> = {};
    let attrIndex = 0;

    // Group POSITION edges by target playoff node
    const byTarget = new Map<string, TopologyEdge[]>();
    for (const edge of rrPositionEdges) {
      if (!byTarget.has(edge.targetNodeId)) byTarget.set(edge.targetNodeId, []);
      byTarget.get(edge.targetNodeId).push(edge);
    }

    for (const [targetId, edges] of byTarget) {
      const playoffNode = playoffNodes.find((n) => n.id === targetId);
      if (!playoffNode) continue;

      // Merge all finishingPositions targeting this playoff node
      const finishingPositions = Array.from(new Set(edges.flatMap((e) => e.finishingPositions || []))).sort();

      const attrKey = `0-${attrIndex + 1}`;
      playoffAttributes[attrKey] = {
        name: playoffNode.structureName,
        abbreviation: playoffNode.structureName.substring(0, 3)
      };
      attrIndex++;

      postGenerationMethods.push({
        method: 'addPlayoffStructures',
        params: {
          playoffPositions: finishingPositions,
          playoffStructureNameBase: playoffNode.structureName
        }
      });
    }

    if (Object.keys(playoffAttributes).length > 0) {
      drawOptions.playoffAttributes = playoffAttributes;
    }
  } else if (playoffNodes.length > 0) {
    // Non-RR playoff handling: build recursive withPlayoffs tree
    const tree = buildPlayoffTree(mainNode.id, playoffNodes, state.edges);
    if (tree) {
      drawOptions.withPlayoffs = tree;
    }
  }

  return { drawOptions, postGenerationMethods };
}

function buildPlayoffTree(
  sourceNodeId: string,
  playoffNodes: TopologyNode[],
  edges: TopologyEdge[]
): any | undefined {
  // Find LOSER edges FROM this source node TO playoff nodes
  const outEdges = edges.filter(
    (e) =>
      e.sourceNodeId === sourceNodeId && e.linkType === LOSER && playoffNodes.some((n) => n.id === e.targetNodeId)
  );
  if (!outEdges.length) return undefined;

  const roundProfiles: { [key: number]: number }[] = [];
  const playoffAttributes: Record<string, { name: string; abbreviation: string }> = {};
  const roundPlayoffs: Record<number, any> = {};

  for (const edge of outEdges) {
    if (!edge.sourceRoundNumber) continue;
    const targetNode = playoffNodes.find((n) => n.id === edge.targetNodeId);
    if (!targetNode) continue;

    roundProfiles.push({ [edge.sourceRoundNumber]: 1 });
    const attrKey = `0-${roundProfiles.length}`;
    playoffAttributes[attrKey] = {
      name: targetNode.structureName,
      abbreviation: targetNode.structureName.substring(0, 3)
    };

    // Recurse: does this playoff node itself feed other playoff nodes?
    const childTree = buildPlayoffTree(targetNode.id, playoffNodes, edges);
    if (childTree) {
      roundPlayoffs[edge.sourceRoundNumber] = childTree;
    }
  }

  if (!roundProfiles.length) return undefined;

  return {
    roundProfiles,
    ...(Object.keys(playoffAttributes).length > 0 && { playoffAttributes }),
    ...(Object.keys(roundPlayoffs).length > 0 && { roundPlayoffs })
  };
}

function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
