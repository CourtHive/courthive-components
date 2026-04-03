/**
 * Topology Validator — Validates topology state for correctness.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { getFeedRoundCapacities, getNodeTotalRounds, getNodeLosersForRound } from './feedRounds';
import type { TopologyState } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, WINNER, LOSER, SINGLE_ELIMINATION, ROUND_ROBIN, AD_HOC } =
  drawDefinitionConstants;

const POSITION = 'POSITION';

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export function validateTopology(state: TopologyState): ValidationError[] {
  const errors: ValidationError[] = [];

  const mainNodes = validateMainNodes(state, errors);
  const nodesWithFeedLinks = computeNodesWithFeedLinks(state);

  validateDrawSizes(state, nodesWithFeedLinks, errors);
  validateEdgeRoundNumbers(state, errors);
  validateWinnerLinks(state, errors);
  validateDuplicateSourceRounds(state, errors);
  validateQualifyingStructures(state, mainNodes, errors);
  validateQualifyingFeedCapacity(state, errors);
  validateLoserLinkFeedCapacity(state, errors);
  validateConsolationDrawSizes(state, errors);
  validatePositionLinks(state, errors);

  if (hasCircularDependency(state)) {
    errors.push({ severity: 'error', message: 'Circular dependency detected between structures' });
  }

  return errors;
}

function validateMainNodes(state: TopologyState, errors: ValidationError[]): TopologyState['nodes'] {
  const mainNodes = state.nodes.filter((n) => n.stage === MAIN);
  if (mainNodes.length === 0) {
    errors.push({ severity: 'error', message: 'A main draw structure is required' });
  } else if (mainNodes.length > 1) {
    errors.push({ severity: 'error', message: 'Only one main draw structure is allowed' });
  }
  return mainNodes;
}

function computeNodesWithFeedLinks(state: TopologyState): Set<string> {
  const nodesWithFeedLinks = new Set<string>();
  for (const edge of state.edges) {
    if (edge.linkType === WINNER && (edge.targetRoundNumber || 1) > 1) {
      const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
      if (source?.stage === QUALIFYING) nodesWithFeedLinks.add(edge.targetNodeId);
    }
  }
  const loserLinkCountByTarget = new Map<string, number>();
  for (const edge of state.edges) {
    if (edge.linkType === LOSER) {
      loserLinkCountByTarget.set(edge.targetNodeId, (loserLinkCountByTarget.get(edge.targetNodeId) || 0) + 1);
    }
  }
  for (const [nodeId, count] of loserLinkCountByTarget) {
    if (count > 1) nodesWithFeedLinks.add(nodeId);
  }
  return nodesWithFeedLinks;
}

function validateDrawSizes(state: TopologyState, nodesWithFeedLinks: Set<string>, errors: ValidationError[]): void {
  for (const node of state.nodes) {
    if (node.structureType === SINGLE_ELIMINATION && !nodesWithFeedLinks.has(node.id)) {
      const isTarget = state.edges.some((e) => e.targetNodeId === node.id);
      const isMainOrQualifying = node.stage === MAIN || node.stage === QUALIFYING;
      if (isMainOrQualifying && !isTarget) {
        const isPow2 = node.drawSize > 0 && (node.drawSize & (node.drawSize - 1)) === 0;
        if (!isPow2) {
          errors.push({
            severity: 'error',
            message: `"${node.structureName}" draw size must be a power of 2`,
            nodeId: node.id
          });
        }
      }
    }

    const minDrawSize = node.structureType === AD_HOC ? 0 : 2;
    if (node.drawSize < minDrawSize) {
      errors.push({
        message: `"${node.structureName}" draw size must be at least ${minDrawSize}`,
        severity: 'error',
        nodeId: node.id
      });
    }
  }
}

function validateEdgeRoundNumbers(state: TopologyState, errors: ValidationError[]): void {
  for (const edge of state.edges) {
    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    const target = state.nodes.find((n) => n.id === edge.targetNodeId);

    if (!source) {
      errors.push({ severity: 'error', message: 'Edge references missing source node', edgeId: edge.id });
    }
    if (!target) {
      errors.push({ severity: 'error', message: 'Edge references missing target node', edgeId: edge.id });
    }

    if (source && edge.sourceRoundNumber) {
      const maxRound = getNodeTotalRounds(source.structureType, source.drawSize, source.structureOptions);
      if (edge.sourceRoundNumber > maxRound || edge.sourceRoundNumber < 1) {
        errors.push({
          severity: 'warning',
          message: `Edge source round ${edge.sourceRoundNumber} is outside "${source.structureName}" range (1-${maxRound})`,
          edgeId: edge.id
        });
      }
    }

    if (target && edge.targetRoundNumber) {
      const maxRound = getNodeTotalRounds(target.structureType, target.drawSize, target.structureOptions);
      if (edge.targetRoundNumber > maxRound || edge.targetRoundNumber < 1) {
        errors.push({
          severity: 'warning',
          message: `Edge target round ${edge.targetRoundNumber} is outside "${target.structureName}" range (1-${maxRound})`,
          edgeId: edge.id
        });
      }
    }
  }
}

function validateWinnerLinks(state: TopologyState, errors: ValidationError[]): void {
  const winnerEdgesBySource = new Map<string, string[]>();
  for (const edge of state.edges) {
    if (edge.linkType !== WINNER) continue;
    if (!winnerEdgesBySource.has(edge.sourceNodeId)) winnerEdgesBySource.set(edge.sourceNodeId, []);
    winnerEdgesBySource.get(edge.sourceNodeId)!.push(edge.id);
  }
  for (const [sourceId, edgeIds] of winnerEdgesBySource) {
    if (edgeIds.length > 1) {
      const sourceName = state.nodes.find((n) => n.id === sourceId)?.structureName || 'Unknown';
      for (const edgeId of edgeIds) {
        errors.push({
          severity: 'error',
          message: `"${sourceName}" has multiple winner links (only one allowed)`,
          edgeId
        });
      }
    }
  }
}

function validateDuplicateSourceRounds(state: TopologyState, errors: ValidationError[]): void {
  const edgesBySource = new Map<string, { round: number; edgeId: string }[]>();
  for (const edge of state.edges) {
    if (!edge.sourceRoundNumber) continue;
    if (!edgesBySource.has(edge.sourceNodeId)) edgesBySource.set(edge.sourceNodeId, []);
    edgesBySource.get(edge.sourceNodeId)!.push({ round: edge.sourceRoundNumber, edgeId: edge.id });
  }
  for (const [sourceId, entries] of edgesBySource) {
    const seen = new Map<number, string>();
    const sourceName = state.nodes.find((n) => n.id === sourceId)?.structureName || 'Unknown';
    for (const { round, edgeId } of entries) {
      if (seen.has(round)) {
        errors.push({
          severity: 'error',
          message: `"${sourceName}" has multiple links from round ${round}`,
          edgeId
        });
      } else {
        seen.set(round, edgeId);
      }
    }
  }
}

function validateQualifyingStructures(
  state: TopologyState,
  mainNodes: TopologyState['nodes'],
  errors: ValidationError[]
): void {
  const qualifyingNodes = state.nodes.filter((n) => n.stage === QUALIFYING);

  for (const qNode of qualifyingNodes) {
    const winnerEdge = state.edges.find(
      (e) => e.sourceNodeId === qNode.id && e.linkType === WINNER && mainNodes.some((m) => m.id === e.targetNodeId)
    );

    if (!winnerEdge) {
      errors.push({
        severity: 'warning',
        message: `Qualifying structure "${qNode.structureName}" has no winner link to a main structure`,
        nodeId: qNode.id
      });
    }

    if (winnerEdge?.qualifyingPositions) {
      const maxPositions = Math.floor(qNode.drawSize / 2);
      if (winnerEdge.qualifyingPositions > maxPositions) {
        errors.push({
          severity: 'warning',
          message: `Qualifying positions (${winnerEdge.qualifyingPositions}) exceeds half of "${qNode.structureName}" draw size (${maxPositions})`,
          edgeId: winnerEdge.id
        });
      }
    }
  }
}

function validateQualifyingFeedCapacity(state: TopologyState, errors: ValidationError[]): void {
  const feedEdgesByTarget = new Map<
    string,
    { edgeId: string; targetRound: number; qp: number; sourceName: string }[]
  >();
  for (const edge of state.edges) {
    if (edge.linkType !== WINNER) continue;
    const targetRound = edge.targetRoundNumber || 1;
    if (targetRound <= 1) continue;
    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    if (!source || source.stage !== QUALIFYING) continue;
    if (!feedEdgesByTarget.has(edge.targetNodeId)) feedEdgesByTarget.set(edge.targetNodeId, []);
    const qp = source.qualifyingPositions || Math.floor(source.drawSize / 4);
    feedEdgesByTarget
      .get(edge.targetNodeId)!
      .push({ edgeId: edge.id, targetRound, qp, sourceName: source.structureName });
  }
  for (const [targetId, entries] of feedEdgesByTarget) {
    const target = state.nodes.find((n) => n.id === targetId);
    if (!target) continue;
    const feedCapacities = getFeedRoundCapacities(target.drawSize);
    const demandByRound = new Map<number, number>();
    for (const entry of entries) {
      demandByRound.set(entry.targetRound, (demandByRound.get(entry.targetRound) || 0) + entry.qp);
    }
    for (const { edgeId, targetRound, sourceName } of entries) {
      const capacity = feedCapacities.get(targetRound) || 0;
      const demand = demandByRound.get(targetRound) || 0;
      if (capacity < demand) {
        errors.push({
          severity: 'warning',
          message: `"${target.structureName}" round ${targetRound} is not a feed round or has insufficient capacity for ${sourceName} link`,
          nodeId: targetId,
          edgeId
        });
      }
    }
  }
}

function validateLoserLinkFeedCapacity(state: TopologyState, errors: ValidationError[]): void {
  for (const edge of state.edges) {
    if (edge.linkType !== LOSER) continue;
    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    const target = state.nodes.find((n) => n.id === edge.targetNodeId);
    if (!source || !target) continue;

    const sourceRound = edge.sourceRoundNumber || 1;
    const targetRound = edge.targetRoundNumber || 1;

    const losersProduced = getNodeLosersForRound(source.structureType, source.drawSize, sourceRound);
    const feedCapacities = getFeedRoundCapacities(target.drawSize);

    if (targetRound !== 1) {
      validateLoserFeedRound(feedCapacities, targetRound, losersProduced, source, target, sourceRound, edge.id, errors);
    }
  }
}

function validateLoserFeedRound(
  feedCapacities: Map<number, number>,
  targetRound: number,
  losersProduced: number,
  source: TopologyState['nodes'][number],
  target: TopologyState['nodes'][number],
  sourceRound: number,
  edgeId: string,
  errors: ValidationError[]
): void {
  const feedCap = feedCapacities.get(targetRound);
  if (feedCap === undefined) {
    errors.push({
      severity: 'error',
      message: `"${target.structureName}" R${targetRound} is not a feed round — cannot receive ${losersProduced} losers from "${source.structureName}" R${sourceRound}`,
      edgeId
    });
  } else if (losersProduced > feedCap) {
    errors.push({
      severity: 'error',
      message: `"${source.structureName}" R${sourceRound} produces ${losersProduced} losers but "${target.structureName}" R${targetRound} only has ${feedCap} feed positions`,
      edgeId
    });
  } else if (losersProduced < feedCap) {
    errors.push({
      severity: 'warning',
      message: `"${source.structureName}" R${sourceRound} produces ${losersProduced} losers but "${
        target.structureName
      }" R${targetRound} has ${feedCap} feed positions — ${feedCap - losersProduced} will be empty`,
      edgeId
    });
  }
}

function validateConsolationDrawSizes(state: TopologyState, errors: ValidationError[]): void {
  const consolationNodes = state.nodes.filter((n) => n.stage === CONSOLATION);
  for (const cNode of consolationNodes) {
    const inbound = state.edges.filter((e) => e.targetNodeId === cNode.id);
    if (inbound.length === 0) continue;

    let capacity = 0;
    for (const edge of inbound) {
      const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
      if (!source) continue;
      if (edge.linkType === LOSER) {
        const round = edge.sourceRoundNumber || 1;
        capacity += getNodeLosersForRound(source.structureType, source.drawSize, round);
      } else {
        capacity += source.qualifyingPositions || Math.floor(source.drawSize / 2);
      }
    }

    if (capacity > 0 && cNode.drawSize > capacity) {
      errors.push({
        severity: 'warning',
        message: `"${cNode.structureName}" draw size (${cNode.drawSize}) exceeds inbound capacity (${capacity})`,
        nodeId: cNode.id
      });
    }

    if (capacity > 0 && capacity > cNode.drawSize) {
      errors.push({
        severity: 'error',
        message: `"${cNode.structureName}" receives ${capacity} participants but only has ${cNode.drawSize} positions`,
        nodeId: cNode.id
      });
    }
  }
}

function validatePositionLinks(state: TopologyState, errors: ValidationError[]): void {
  const positionEdgesBySource = new Map<string, { edgeId: string; positions: number[] }[]>();
  for (const edge of state.edges) {
    if (edge.linkType !== POSITION) continue;
    if (!positionEdgesBySource.has(edge.sourceNodeId)) positionEdgesBySource.set(edge.sourceNodeId, []);
    positionEdgesBySource.get(edge.sourceNodeId)!.push({ edgeId: edge.id, positions: edge.finishingPositions || [] });

    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    if (source && source.structureType === ROUND_ROBIN) {
      const groupSize = source.structureOptions?.groupSize || 4;
      for (const pos of edge.finishingPositions || []) {
        if (pos < 1 || pos > groupSize) {
          errors.push({
            severity: 'error',
            message: `Position ${pos} is outside valid range (1-${groupSize}) for "${source.structureName}"`,
            edgeId: edge.id
          });
        }
      }
    }
  }

  for (const [sourceId, entries] of positionEdgesBySource) {
    if (entries.length < 2) continue;
    const sourceName = state.nodes.find((n) => n.id === sourceId)?.structureName || 'Unknown';
    const seen = new Map<number, string>();
    for (const { edgeId, positions } of entries) {
      for (const pos of positions) {
        if (seen.has(pos)) {
          errors.push({
            severity: 'warning',
            message: `Position ${pos} from "${sourceName}" is used by multiple POSITION links`,
            edgeId
          });
        } else {
          seen.set(pos, edgeId);
        }
      }
    }
  }
}

function hasCircularDependency(state: TopologyState): boolean {
  const adjList = new Map<string, string[]>();
  for (const node of state.nodes) {
    adjList.set(node.id, []);
  }
  for (const edge of state.edges) {
    const targets = adjList.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adjList.get(nodeId) || []) {
      if (dfs(neighbor)) return true;
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of state.nodes) {
    if (dfs(node.id)) return true;
  }

  return false;
}
