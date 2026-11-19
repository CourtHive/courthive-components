/**
 * Topology Validator — Validates topology state for correctness.
 */
import { carriesQualifiers, isRoundWinnerEdge, traversesByFinishingPosition } from './edgeTraversal';
import { getFeedRoundCapacities, getNodeTotalRounds, getNodeLosersForRound } from './feedRounds';
import { PARALLEL_QUALIFYING_WARNING, parallelQualifying } from './qualifyingPaths';
import { defaultProblemMessage } from '../../roundProfile/roundProfileEditor';
import { validateRoundProfile } from '../../roundProfile/roundProfileLogic';
import { qualifiersOf } from './qualifierCounts';

// constants and types
import { drawDefinitionConstants } from 'tods-competition-factory';
import type { TopologyState } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, LOSER, SINGLE_ELIMINATION, ROUND_ROBIN, AD_HOC, LUCKY_DRAW } =
  drawDefinitionConstants;

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export function validateTopology(state: TopologyState): ValidationError[] {
  const errors: ValidationError[] = [];

  const mainNodes = validateMainNodes(state, errors);
  validateDrawSizes(state, errors);
  validateEdgeRoundNumbers(state, errors);
  validateWinnerLinks(state, errors);
  validateDuplicateSourceRounds(state, errors);
  validateQualifyingStructures(state, mainNodes, errors);
  validateQualifyingFeedCapacity(state, errors);
  validateLoserLinkFeedCapacity(state, errors);
  validateConsolationDrawSizes(state, errors);
  validatePositionLinks(state, errors);
  validateRoundProfiles(state, errors);
  validateParallelQualifying(state, errors);

  if (hasCircularDependency(state)) {
    errors.push({ severity: 'error', message: 'Circular dependency detected between structures' });
  }

  return errors;
}

/**
 * A second qualifying chain into the same MAIN round: its entries' path is the first chain's, so the builder cannot
 * tell which structure each belongs to (CA, 2026-11-18). One card is a draw with sections; raise its qualifiers.
 */
function validateParallelQualifying(state: TopologyState, errors: ValidationError[]): void {
  for (const node of parallelQualifying(state)) {
    errors.push({
      severity: 'warning',
      message: PARALLEL_QUALIFYING_WARNING(node.structureName),
      nodeId: node.id
    });
  }
}

/**
 * A lucky draw's explicit round profile must be one the factory generates. An invalid one would silently play the
 * default cascade instead (the counts and the draw options both ignore it), so it is an error, on its node.
 */
function validateRoundProfiles(state: TopologyState, errors: ValidationError[]): void {
  for (const node of state.nodes) {
    const roundProfile = node.structureOptions?.roundProfile;
    if (node.structureType !== LUCKY_DRAW || !Array.isArray(roundProfile)) continue;
    const problem = validateRoundProfile(roundProfile, node.drawSize);
    if (problem) {
      errors.push({
        severity: 'error',
        message: `${node.structureName}: ${defaultProblemMessage(problem)}`,
        nodeId: node.id
      });
    }
  }
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

function validateDrawSizes(state: TopologyState, errors: ValidationError[]): void {
  for (const node of state.nodes) {
    // A qualifying elimination is any size: the factory plays it at its qualifiers × 2ⁿ, the rest BYEs (40 entrants for
    // 8 qualifiers: 64 positions, rounds 32, 16, 8, 24 BYEs — qualifierCounts.ts). The rule held qualifying to a power of
    // 2, and blocked Generate on a topology the cards, the fit and the factory all build (CA, 2026-11-18).
    //
    // A single elimination MAIN is a power of 2, whatever links into it: a draw of another size is a Feed-in draw, and
    // the director says so by choosing Feed-in (CA, 2026-11-18). Lucky, adaptive, round robin and ad hoc MAINs are their
    // own types. The rule was skipped for a MAIN with anything linked into it, which then generated as a Feed-in nobody
    // chose.
    if (node.stage === MAIN && node.structureType === SINGLE_ELIMINATION) {
      const isPow2 = node.drawSize > 0 && (node.drawSize & (node.drawSize - 1)) === 0;
      if (!isPow2) {
        errors.push({
          severity: 'error',
          message: `"${node.structureName}" is a single elimination of ${node.drawSize}: choose a power of 2, or Feed-in for a draw of ${node.drawSize}`,
          nodeId: node.id
        });
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

    // a finishing-position edge leaves by tally: its sourceRoundNumber decides nothing, so it is not checked
    if (source && edge.sourceRoundNumber && !traversesByFinishingPosition(edge, state.nodes)) {
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
    if (!isRoundWinnerEdge(edge, state.nodes)) continue;
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
    if (!edge.sourceRoundNumber || traversesByFinishingPosition(edge, state.nodes)) continue;
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
      (e) =>
        e.sourceNodeId === qNode.id &&
        carriesQualifiers(e, state.nodes) &&
        mainNodes.some((m) => m.id === e.targetNodeId)
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
    if (!carriesQualifiers(edge, state.nodes)) continue;
    const targetRound = edge.targetRoundNumber || 1;
    if (targetRound <= 1) continue;
    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    if (!source || source.stage !== QUALIFYING) continue;
    if (!feedEdgesByTarget.has(edge.targetNodeId)) feedEdgesByTarget.set(edge.targetNodeId, []);
    const qp = qualifiersOf(source);
    feedEdgesByTarget
      .get(edge.targetNodeId)!
      .push({ edgeId: edge.id, targetRound, qp, sourceName: source.structureName });
  }
  for (const [targetId, entries] of feedEdgesByTarget) {
    const target = state.nodes.find((n) => n.id === targetId);
    if (!target) continue;
    const feedCapacities = getFeedRoundCapacities(target.drawSize, target.structureOptions);
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

    const losersProduced = getNodeLosersForRound(
      source.structureType,
      source.drawSize,
      sourceRound,
      source.structureOptions
    );
    const feedCapacities = getFeedRoundCapacities(target.drawSize, target.structureOptions);

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
        capacity += getNodeLosersForRound(source.structureType, source.drawSize, round, source.structureOptions);
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
    if (!traversesByFinishingPosition(edge, state.nodes)) continue;
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
            message: `Position ${pos} from "${sourceName}" is used by multiple finishing-position links`,
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
