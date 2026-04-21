/**
 * Topology Store — Observable state management for topology builder.
 * Manages nodes, edges, selection, and auto-layout.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { getNodeLosersForRound } from '../domain/feedRounds';
import { getCardWidth } from '../ui/structureCard';
import type { TopologyNode, TopologyEdge, TopologyState, TopologyChangeListener } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, WINNER, LOSER, ROUND_ROBIN } = drawDefinitionConstants;
const POSITION = 'POSITION';

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

/** Largest power of 2 ≤ n (minimum 2). */
function highestPow2(n: number): number {
  let p = 2;
  while (p * 2 <= n) p *= 2;
  return p;
}

const CARD_HEIGHT = 160;
const COLUMN_GAP = 60;
const ROW_GAP = 30;

export class TopologyStore {
  private state: TopologyState;
  private listeners: Set<TopologyChangeListener> = new Set();

  constructor(initialState?: Partial<TopologyState>) {
    this.state = {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      drawName: 'New Draw',
      ...initialState
    };
  }

  getState(): TopologyState {
    return { ...this.state };
  }

  subscribe(listener: TopologyChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  setDrawName(name: string): void {
    this.state.drawName = name;
    this.notify();
  }

  addNode(partial: Omit<TopologyNode, 'id' | 'position'>): TopologyNode {
    const node: TopologyNode = {
      ...partial,
      id: generateId('node'),
      position: this.nextNodePosition()
    };
    this.state.nodes.push(node);
    this.state.templateName = undefined;
    this.notify();
    return node;
  }

  updateNode(nodeId: string, updates: Partial<Omit<TopologyNode, 'id'>>): void {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (node) {
      // Mark as custom if non-position fields changed
      const hasStructuralChange = Object.keys(updates).some((k) => k !== 'position');
      if (hasStructuralChange) this.state.templateName = undefined;
      Object.assign(node, updates);
      this.notify();
    }
  }

  removeNode(nodeId: string): void {
    // Find consolation nodes that will lose inbound edges from the removed node
    const affectedTargets = this.state.edges.filter((e) => e.sourceNodeId === nodeId).map((e) => e.targetNodeId);

    this.state.nodes = this.state.nodes.filter((n) => n.id !== nodeId);
    this.state.edges = this.state.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId);
    if (this.state.selectedNodeId === nodeId) this.state.selectedNodeId = null;
    this.state.templateName = undefined;

    for (const targetId of affectedTargets) {
      this.clampConsolationDrawSize(targetId);
    }
    this.notify();
  }

  addEdge(partial: Omit<TopologyEdge, 'id' | 'label'>): TopologyEdge | null {
    // Only one winner link per source structure
    if (partial.linkType === WINNER) {
      const existing = this.state.edges.find((e) => e.sourceNodeId === partial.sourceNodeId && e.linkType === WINNER);
      if (existing) return null;
    }

    const source = this.state.nodes.find((n) => n.id === partial.sourceNodeId);
    const target = this.state.nodes.find((n) => n.id === partial.targetNodeId);

    // Round Robin sources only produce POSITION links
    if (source?.structureType === ROUND_ROBIN && partial.linkType !== POSITION) {
      return null;
    }

    // Qualifying link constraints:
    // - Qualifying sources can only target QUALIFYING or MAIN
    // - Qualifying targets can only receive from QUALIFYING
    if (source?.stage === QUALIFYING && target && target.stage !== QUALIFYING && target.stage !== MAIN) {
      return null;
    }
    if (target?.stage === QUALIFYING && source && source.stage !== QUALIFYING) {
      return null;
    }

    const edge: TopologyEdge = {
      ...partial,
      id: generateId('edge'),
      targetRoundNumber: partial.targetRoundNumber || 1,
      label: this.computeEdgeLabel(partial)
    };
    this.state.edges.push(edge);
    this.state.templateName = undefined;
    this.clampConsolationDrawSize(edge.targetNodeId);
    this.notify();
    return edge;
  }

  updateEdge(edgeId: string, updates: Partial<Omit<TopologyEdge, 'id'>>): void {
    const edge = this.state.edges.find((e) => e.id === edgeId);
    if (edge) {
      Object.assign(edge, updates);
      edge.label = this.computeEdgeLabel(edge);
      this.state.templateName = undefined;
      this.notify();
    }
  }

  removeEdge(edgeId: string): void {
    const removed = this.state.edges.find((e) => e.id === edgeId);
    this.state.edges = this.state.edges.filter((e) => e.id !== edgeId);
    if (this.state.selectedEdgeId === edgeId) this.state.selectedEdgeId = null;
    this.state.templateName = undefined;
    if (removed) this.clampConsolationDrawSize(removed.targetNodeId);
    this.notify();
  }

  selectNode(nodeId: string | null): void {
    this.state.selectedNodeId = nodeId;
    this.state.selectedEdgeId = null;
    this.notify();
  }

  selectEdge(edgeId: string | null): void {
    this.state.selectedEdgeId = edgeId;
    this.state.selectedNodeId = null;
    this.notify();
  }

  /**
   * If the given node is a consolation structure, clamp its drawSize so it
   * does not exceed the total capacity of inbound links.
   */
  private clampConsolationDrawSize(nodeId: string): void {
    const node = this.state.nodes.find((n) => n.id === nodeId);
    if (!node || node.stage !== CONSOLATION) return;

    const cap = this.inboundCapacity(nodeId);
    if (cap > 0 && node.drawSize > cap) {
      // Round down to the largest power of 2 that fits
      node.drawSize = highestPow2(cap);
    }
  }

  /** Sum of losers that all inbound edges can deliver to a node. */
  private inboundCapacity(nodeId: string): number {
    const inbound = this.state.edges.filter((e) => e.targetNodeId === nodeId);
    let total = 0;
    for (const edge of inbound) {
      const source = this.state.nodes.find((n) => n.id === edge.sourceNodeId);
      if (!source) continue;
      if (edge.linkType === LOSER) {
        const round = edge.sourceRoundNumber || 1;
        total += getNodeLosersForRound(source.structureType, source.drawSize, round);
      } else {
        // WINNER or POSITION links carry qualifyingPositions or drawSize/2
        total += source.qualifyingPositions || Math.floor(source.drawSize / 2);
      }
    }
    return total;
  }

  /** Find a non-overlapping position for a newly added node. */
  private nextNodePosition(): { x: number; y: number } {
    if (this.state.nodes.length === 0) return { x: 40, y: 40 };

    // Place to the right of the rightmost node
    let rightEdge = 0;
    for (const n of this.state.nodes) {
      rightEdge = Math.max(rightEdge, n.position.x + getCardWidth(n));
    }

    return { x: rightEdge + COLUMN_GAP, y: 40 };
  }

  autoLayout(): void {
    const nodes = this.state.nodes;
    const edges = this.state.edges;
    if (!nodes.length) return;

    // Assign each node a column depth based on edge topology.
    // Qualifying structures feed INTO main, so they sit one column
    // to the LEFT.  All other edges (WINNER from Q, LOSER, POSITION)
    // flow LEFT→RIGHT — the target is one column to the right of
    // the source.
    //
    // Strategy: BFS from root nodes (no inbound edges).
    // Qualifying nodes get column = rootCol - 1 (placed before main).
    // All other nodes get column = max(source columns) + 1.

    const inbound = new Map<string, string[]>(); // nodeId → source node ids
    const outbound = new Map<string, string[]>(); // nodeId → target node ids

    for (const edge of edges) {
      if (!outbound.has(edge.sourceNodeId)) outbound.set(edge.sourceNodeId, []);
      outbound.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      if (!inbound.has(edge.targetNodeId)) inbound.set(edge.targetNodeId, []);
      inbound.get(edge.targetNodeId)!.push(edge.sourceNodeId);
    }

    // Find root nodes: MAIN nodes with no inbound, or any node with no inbound
    const roots = nodes.filter((n) => !inbound.has(n.id) || inbound.get(n.id)!.length === 0);

    // If no clear roots, pick MAIN nodes as roots
    if (!roots.length) {
      const mainNodes = nodes.filter((n) => n.stage === MAIN);
      roots.push(...(mainNodes.length ? mainNodes : [nodes[0]]));
    }

    const colOf = new Map<string, number>();

    // First pass: identify qualifying nodes (they feed into another node
    // via WINNER and have stage QUALIFYING). They get column -1 relative
    // to their target.  Start by assigning all roots column 0.
    const qualifyingIds = new Set(nodes.filter((n) => n.stage === QUALIFYING).map((n) => n.id));

    // BFS from roots
    const queue: string[] = [];
    for (const root of roots) {
      if (qualifyingIds.has(root.id)) {
        // Qualifying roots go before main; we'll shift everything later
        colOf.set(root.id, -1);
      } else {
        colOf.set(root.id, 0);
      }
      queue.push(root.id);
    }

    // Guard against infinite loops from cyclic topologies (e.g. Double Elimination
    // where CONSOLATION winner feeds back into MAIN). Limit iterations to
    // N * (N-1) which is the max edges in a complete directed graph.
    const maxIterations = nodes.length * (nodes.length - 1) + nodes.length;
    let iterations = 0;
    while (queue.length && iterations < maxIterations) {
      iterations++;
      const nodeId = queue.shift()!;
      const srcCol = colOf.get(nodeId)!;
      const targets = outbound.get(nodeId) || [];
      for (const tgtId of targets) {
        const newCol = srcCol + 1;
        const existing = colOf.get(tgtId);
        if (existing === undefined || newCol > existing) {
          colOf.set(tgtId, newCol);
          queue.push(tgtId);
        }
      }
    }

    // Assign any unvisited nodes (disconnected) to column 0
    for (const node of nodes) {
      if (!colOf.has(node.id)) colOf.set(node.id, 0);
    }

    // Normalise so minimum column is 0
    const minCol = Math.min(...colOf.values());
    if (minCol < 0) {
      for (const [id, col] of colOf) colOf.set(id, col - minCol);
    }

    // Group nodes by column
    const columns = new Map<number, TopologyNode[]>();
    for (const node of nodes) {
      const col = colOf.get(node.id)!;
      if (!columns.has(col)) columns.set(col, []);
      columns.get(col)!.push(node);
    }

    // Lay out columns left to right
    const sortedCols = [...columns.keys()].sort((a, b) => a - b);
    let xOffset = 40;

    for (const col of sortedCols) {
      const colNodes = columns.get(col)!;
      const maxWidth = Math.max(...colNodes.map((n) => getCardWidth(n)));

      colNodes.forEach((node, rowIndex) => {
        node.position = {
          x: xOffset,
          y: rowIndex * (CARD_HEIGHT + ROW_GAP) + 40
        };
      });

      xOffset += maxWidth + COLUMN_GAP;
    }
  }

  loadState(newState: TopologyState): void {
    this.state = { ...newState };
    this.notify();
  }

  private computeEdgeLabel(edge: Partial<TopologyEdge>): string {
    const typeLabel = edge.linkType || 'LINK';

    let detail = '';
    if (edge.sourceRoundNumber) detail += `R${edge.sourceRoundNumber} `;
    detail += typeLabel.toLowerCase();
    if (edge.targetRoundNumber) detail += ` \u2192 R${edge.targetRoundNumber}`;
    if (edge.qualifyingPositions) detail += ` (${edge.qualifyingPositions}Q)`;
    if (edge.finishingPositions?.length) detail += ` [${edge.finishingPositions.join(',')}]`;

    return detail;
  }
}
