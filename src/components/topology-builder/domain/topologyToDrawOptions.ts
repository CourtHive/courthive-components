/**
 * Topology to Draw Options — Converts TopologyState to factory drawOptions.
 * Groups qualifying edges by targetRoundNumber -> qualifyingProfiles.
 *
 * Derives the factory drawType from the link topology rather than
 * from individual node structureTypes, which only describe the
 * structure shape (SE, FEED_IN, ROUND_ROBIN, AD_HOC).
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
  FEED_IN_CHAMPIONSHIP,
  COMPASS,
  WINNER,
  LOSER,
  ROUND_ROBIN,
  AD_HOC,
  LUCKY_DRAW
} = drawDefinitionConstants;

const POSITION = 'POSITION';

export interface DrawOptionsResult {
  drawOptions: any;
  postGenerationMethods: any[];
}

/**
 * Infer the factory drawType from the topology's structure types + link topology.
 */
function inferFactoryDrawType(state: TopologyState, mainNode: TopologyNode): string {
  const consolationNodes = state.nodes.filter((n) => n.stage === CONSOLATION);
  const qualifyingNodes = state.nodes.filter((n) => n.stage === QUALIFYING);
  const playoffNodes = state.nodes.filter((n) => n.stage === PLAY_OFF);

  // RR with POSITION links to playoff nodes → ROUND_ROBIN_WITH_PLAYOFF
  if (mainNode.structureType === ROUND_ROBIN) {
    const hasPlayoffs = state.edges.some(
      (e) =>
        e.sourceNodeId === mainNode.id &&
        e.linkType === POSITION &&
        state.nodes.some((n) => n.id === e.targetNodeId && n.stage === PLAY_OFF)
    );
    return hasPlayoffs ? 'ROUND_ROBIN_WITH_PLAYOFF' : ROUND_ROBIN;
  }
  if (mainNode.structureType === AD_HOC) return AD_HOC;
  if (mainNode.structureType === FEED_IN) return FEED_IN;
  if (mainNode.structureType === LUCKY_DRAW) return LUCKY_DRAW;

  // From here, main is SINGLE_ELIMINATION
  // Check for compass: 7 consolation structures with loser links from main at R1/R2/R3
  if (consolationNodes.length === 7 && qualifyingNodes.length === 0 && playoffNodes.length === 0) {
    const mainLoserEdges = state.edges.filter((e) => e.linkType === LOSER && e.sourceNodeId === mainNode.id);
    const mainLoserRounds = new Set(mainLoserEdges.map((e) => e.sourceRoundNumber));
    if (mainLoserRounds.has(1) && mainLoserRounds.has(2) && mainLoserRounds.has(3)) {
      return COMPASS;
    }
  }

  // Check for consolation-based composite types
  if (consolationNodes.length === 1 && qualifyingNodes.length === 0 && playoffNodes.length === 0) {
    const consNode = consolationNodes[0];
    const mainLoserEdges = state.edges.filter(
      (e) => e.linkType === LOSER && e.sourceNodeId === mainNode.id && e.targetNodeId === consNode.id
    );

    // FIC: consolation is FEED_IN, or multiple loser round links
    if (consNode.structureType === FEED_IN || mainLoserEdges.length > 1) {
      return FEED_IN_CHAMPIONSHIP;
    }

    // FMLC: single loser link from R1
    if (mainLoserEdges.length === 1 && mainLoserEdges[0].sourceRoundNumber === 1) {
      return FIRST_MATCH_LOSER_CONSOLATION;
    }
  }

  // Default: SINGLE_ELIMINATION (coerced to FEED_IN for non-power-of-2 later)
  return SINGLE_ELIMINATION;
}

export function topologyToDrawOptions(state: TopologyState): DrawOptionsResult {
  const mainNode = state.nodes.find((n) => n.stage === MAIN);
  if (!mainNode) {
    throw new Error('No main structure node found');
  }

  const qualifyingNodes = state.nodes.filter((n) => n.stage === QUALIFYING);
  const playoffNodes = state.nodes.filter((n) => n.stage === PLAY_OFF);

  // Derive factory drawType from link topology
  let drawType = inferFactoryDrawType(state, mainNode);

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
          drawType: node.structureType,
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

  const postGenerationMethods: any[] = [];

  // Consolation structures linked via LOSER edges from main
  const consolationNodes = state.nodes.filter((n) => n.stage === CONSOLATION);
  const consolationLoserEdges = state.edges.filter(
    (e) =>
      e.linkType === LOSER && e.sourceNodeId === mainNode.id && consolationNodes.some((n) => n.id === e.targetNodeId)
  );

  // Only emit consolation post-generation when NOT handled by inferFactoryDrawType
  // (i.e., when the drawType is not already a composite type like FMLC, FIC, COMPASS)
  const compositeTypes = [FIRST_MATCH_LOSER_CONSOLATION, FEED_IN_CHAMPIONSHIP, COMPASS];
  if (consolationLoserEdges.length > 0 && !compositeTypes.includes(drawType)) {
    // Group edges by target consolation node
    const byTarget = new Map<string, TopologyEdge[]>();
    for (const edge of consolationLoserEdges) {
      if (!byTarget.has(edge.targetNodeId)) byTarget.set(edge.targetNodeId, []);
      byTarget.get(edge.targetNodeId)!.push(edge);
    }

    for (const [targetId, edges] of byTarget) {
      const consNode = consolationNodes.find((n) => n.id === targetId);
      if (!consNode) continue;

      const links = edges.map((edge) => ({
        sourceRoundNumber: edge.sourceRoundNumber || 1,
        targetRoundNumber: edge.targetRoundNumber || 1
      }));

      postGenerationMethods.push({
        method: 'attachConsolationStructures',
        params: {
          structureName: consNode.structureName,
          structureType: consNode.structureType,
          drawSize: consNode.drawSize,
          matchUpFormat: consNode.matchUpFormat || undefined,
          structureOptions: consNode.structureOptions || undefined,
          links
        }
      });
    }
  }

  // Post-generation methods for playoff structures
  const isMainRR = mainNode.structureType === ROUND_ROBIN;

  // Collect POSITION edges from the main RR node to playoff nodes
  const rrPositionEdges = isMainRR
    ? state.edges.filter(
        (e) =>
          e.sourceNodeId === mainNode.id && e.linkType === POSITION && playoffNodes.some((p) => p.id === e.targetNodeId)
      )
    : [];

  if (isMainRR && rrPositionEdges.length > 0) {
    // RR → playoff via POSITION links: use playoffGroups in structureOptions
    const byTarget = new Map<string, TopologyEdge[]>();
    for (const edge of rrPositionEdges) {
      if (!byTarget.has(edge.targetNodeId)) byTarget.set(edge.targetNodeId, []);
      byTarget.get(edge.targetNodeId)!.push(edge);
    }

    const playoffGroups: any[] = [];
    for (const [targetId, edges] of byTarget) {
      const playoffNode = playoffNodes.find((n) => n.id === targetId);
      if (!playoffNode) continue;

      const finishingPositions = Array.from(new Set(edges.flatMap((e) => e.finishingPositions || []))).sort();
      const playoffDrawType = playoffNode.structureOptions?.playoffDrawType || SINGLE_ELIMINATION;

      const group: any = {
        finishingPositions,
        structureName: playoffNode.structureName,
        drawType: playoffDrawType
      };

      // Pass through structureOptions for nested draw types (e.g., RR groupSize)
      if (playoffDrawType === ROUND_ROBIN && playoffNode.structureOptions?.groupSize) {
        group.structureOptions = { groupSize: playoffNode.structureOptions.groupSize };
      }

      playoffGroups.push(group);
    }

    if (playoffGroups.length > 0) {
      drawOptions.structureOptions = {
        ...drawOptions.structureOptions,
        playoffGroups
      };
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

function buildPlayoffTree(sourceNodeId: string, playoffNodes: TopologyNode[], edges: TopologyEdge[]): any | undefined {
  // Find LOSER edges FROM this source node TO playoff nodes
  const outEdges = edges.filter(
    (e) => e.sourceNodeId === sourceNodeId && e.linkType === LOSER && playoffNodes.some((n) => n.id === e.targetNodeId)
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
