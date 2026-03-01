/**
 * Topology Canvas — Main canvas with SVG edges layer and HTML nodes layer.
 * Handles link creation interaction via port dragging.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { buildStructureCard, getPortPosition, getCardWidth, getNumRounds } from './structureCard';
import { getFeedRoundCapacities } from '../domain/feedRounds';
import type { RoundAnnotation } from './structureCard';
import type { TopologyState, TopologyEdge, UIPanel } from '../types';

const { WINNER, LOSER, QUALIFYING, ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF } = drawDefinitionConstants;
const POSITION = 'POSITION';

const RR_TYPES = new Set([ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF]);
const isRoundRobin = (drawType: string) => RR_TYPES.has(drawType);

const SVG_NS = 'http://www.w3.org/2000/svg';

const EDGE_COLORS: Record<string, string> = {
  [WINNER]: 'tb-edge--winner',
  [LOSER]: 'tb-edge--loser',
  [POSITION]: 'tb-edge--position',
};

export interface CanvasCallbacks {
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onCreateEdge: (sourceNodeId: string, targetNodeId: string, linkType: 'WINNER' | 'LOSER' | 'POSITION') => void;
  onPortMouseDown: (nodeId: string, portType: 'winner' | 'loser') => void;
}

export function buildTopologyCanvas(callbacks: CanvasCallbacks): UIPanel<TopologyState> {
  const root = document.createElement('div');
  root.className = 'tb-canvas';

  // SVG layer for edges
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('tb-canvas-svg');

  // Arrowhead markers
  const defs = document.createElementNS(SVG_NS, 'defs');
  for (const [type, cls] of Object.entries(EDGE_COLORS)) {
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', `arrowhead-${type}`);
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', '0 0, 8 3, 0 6');
    polygon.setAttribute('class', cls);
    polygon.style.fill = 'currentColor';
    marker.appendChild(polygon);
    defs.appendChild(marker);
  }
  svg.appendChild(defs);

  // Nodes layer
  const nodesLayer = document.createElement('div');
  nodesLayer.className = 'tb-canvas-nodes';

  // Spacer — flow-positioned div that forces scroll area
  const spacer = document.createElement('div');
  spacer.className = 'tb-canvas-spacer';

  root.appendChild(svg);
  root.appendChild(nodesLayer);
  root.appendChild(spacer);

  // Link creation state
  let linkCreation: {
    sourceNodeId: string;
    portType: 'winner' | 'loser';
    tempLine: SVGLineElement | null;
  } | null = null;

  // Drag state — split into pending (before threshold) and active (after threshold)
  const DRAG_THRESHOLD = 4;
  let pendingDrag: {
    nodeId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null = null;
  let activeDrag: typeof pendingDrag = null;
  let justDragged = false;

  let currentState: TopologyState | null = null;

  // Canvas click = deselect (suppressed after drag)
  root.addEventListener('click', () => {
    if (justDragged) return;
    callbacks.onSelectNode(null);
    callbacks.onSelectEdge(null);
  });

  // Mouse move for drag and link creation
  root.addEventListener('mousemove', (e) => {
    // Promote pending drag to active once threshold exceeded
    if (pendingDrag && !activeDrag) {
      const dx = e.clientX - pendingDrag.startX;
      const dy = e.clientY - pendingDrag.startY;
      if (Math.abs(dx) + Math.abs(dy) >= DRAG_THRESHOLD) {
        activeDrag = pendingDrag;
        pendingDrag = null;
      }
    }

    if (activeDrag && currentState) {
      const dx = e.clientX - activeDrag.startX;
      const dy = e.clientY - activeDrag.startY;
      callbacks.onMoveNode(
        activeDrag.nodeId,
        Math.max(0, activeDrag.origX + dx),
        Math.max(0, activeDrag.origY + dy),
      );
    }

    if (linkCreation?.tempLine) {
      const rect = root.getBoundingClientRect();
      linkCreation.tempLine.setAttribute('x2', String(e.clientX - rect.left + root.scrollLeft));
      linkCreation.tempLine.setAttribute('y2', String(e.clientY - rect.top + root.scrollTop));
    }
  });

  // Mouse up for drag and link creation
  root.addEventListener('mouseup', () => {
    if (activeDrag) {
      justDragged = true;
      activeDrag = null;
      // Reset after current event cycle so click handler can read justDragged
      setTimeout(() => { justDragged = false; }, 0);
    }
    pendingDrag = null;
    if (linkCreation?.tempLine) {
      svg.removeChild(linkCreation.tempLine);
      linkCreation = null;
    }
  });

  function update(state: TopologyState): void {
    currentState = state;
    nodesLayer.innerHTML = '';

    // Pre-compute which non-RR nodes already have a winner link
    const nodesWithWinnerLink = new Set(
      state.edges
        .filter((e) => e.linkType === WINNER)
        .map((e) => e.sourceNodeId)
        .filter((id) => {
          const node = state.nodes.find((n) => n.id === id);
          return node && !isRoundRobin(node.drawType);
        }),
    );

    // Pre-compute round annotations per node from edges
    const annotationsByNode = new Map<string, RoundAnnotation[]>();
    for (const edge of state.edges) {
      let srcRound = edge.sourceRoundNumber;
      const tgtRound = edge.targetRoundNumber;
      const sel = edge.id === state.selectedEdgeId;

      // For WINNER links without an explicit sourceRoundNumber, infer
      // the last round of the source structure (the qualifying round)
      if (!srcRound && edge.linkType === WINNER) {
        const sourceNode = state.nodes.find((n) => n.id === edge.sourceNodeId);
        if (sourceNode) {
          srcRound = getNumRounds(sourceNode);
        }
      }

      if (srcRound) {
        if (!annotationsByNode.has(edge.sourceNodeId)) annotationsByNode.set(edge.sourceNodeId, []);
        annotationsByNode.get(edge.sourceNodeId)!.push({
          roundNumber: srcRound,
          linkType: edge.linkType,
          direction: 'source',
          edgeId: edge.id,
          isSelected: sel,
        });
      }
      if (tgtRound) {
        if (!annotationsByNode.has(edge.targetNodeId)) annotationsByNode.set(edge.targetNodeId, []);
        annotationsByNode.get(edge.targetNodeId)!.push({
          roundNumber: tgtRound,
          linkType: edge.linkType,
          direction: 'target',
          edgeId: edge.id,
          isSelected: sel,
        });
      }
    }

    // Pre-compute node warnings: qualifying links targeting round > 1
    // need that round to be a feed round with sufficient capacity.
    const feedEdgesByTarget = new Map<string, { targetRound: number; qp: number; warning: string }[]>();
    for (const edge of state.edges) {
      if (edge.linkType !== WINNER) continue;
      const targetRound = edge.targetRoundNumber || 1;
      if (targetRound <= 1) continue;
      const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
      if (!source || source.stage !== QUALIFYING) continue;
      if (!feedEdgesByTarget.has(edge.targetNodeId)) feedEdgesByTarget.set(edge.targetNodeId, []);
      const qp = source.qualifyingPositions || Math.floor(source.drawSize / 4);
      feedEdgesByTarget.get(edge.targetNodeId)!.push({
        targetRound,
        qp,
        warning: `Round ${targetRound} needs fed drawPositions to accommodate ${source.structureName} link`,
      });
    }
    const nodeWarnings = new Map<string, string[]>();
    for (const [targetId, entries] of feedEdgesByTarget) {
      const target = state.nodes.find((n) => n.id === targetId);
      if (!target) continue;
      const feedCapacities = getFeedRoundCapacities(target.drawSize);
      // Accumulate demand per round
      const demandByRound = new Map<number, number>();
      for (const entry of entries) {
        demandByRound.set(entry.targetRound, (demandByRound.get(entry.targetRound) || 0) + entry.qp);
      }
      const warnings: string[] = [];
      for (const entry of entries) {
        const capacity = feedCapacities.get(entry.targetRound) || 0;
        const demand = demandByRound.get(entry.targetRound) || 0;
        if (capacity < demand) warnings.push(entry.warning);
      }
      if (warnings.length > 0) nodeWarnings.set(targetId, warnings);
    }

    // Render nodes
    for (const node of state.nodes) {
      const card = buildStructureCard(
        node,
        {
          onSelect: (nodeId) => {
            callbacks.onSelectNode(nodeId);
          },
          onSelectEdge: (edgeId) => {
            callbacks.onSelectEdge(edgeId);
          },
          onPortMouseDown: (nodeId, portType) => {
            const sourceNode = state.nodes.find((n) => n.id === nodeId);
            if (!sourceNode) return;
            const pos = getPortPosition(sourceNode, portType);

            const tempLine = document.createElementNS(SVG_NS, 'line');
            tempLine.setAttribute('x1', String(pos.x));
            tempLine.setAttribute('y1', String(pos.y));
            tempLine.setAttribute('x2', String(pos.x));
            tempLine.setAttribute('y2', String(pos.y));
            tempLine.setAttribute('stroke', portType === 'winner' ? 'green' : 'red');
            tempLine.setAttribute('stroke-width', '2');
            tempLine.setAttribute('stroke-dasharray', '4 2');
            svg.appendChild(tempLine);

            linkCreation = { sourceNodeId: nodeId, portType, tempLine };
          },
          onPortMouseUp: (targetNodeId) => {
            if (linkCreation && linkCreation.sourceNodeId !== targetNodeId) {
              let linkType: 'WINNER' | 'LOSER' | 'POSITION';
              if (linkCreation.portType === 'loser') {
                linkType = LOSER;
              } else {
                const sourceNode = state.nodes.find((n) => n.id === linkCreation!.sourceNodeId);
                linkType = sourceNode && isRoundRobin(sourceNode.drawType) ? POSITION : WINNER;
              }
              callbacks.onCreateEdge(linkCreation.sourceNodeId, targetNodeId, linkType);
            }
            if (linkCreation?.tempLine) {
              svg.removeChild(linkCreation.tempLine);
            }
            linkCreation = null;
          },
          onDragStart: (nodeId, startX, startY) => {
            const node = state.nodes.find((n) => n.id === nodeId);
            if (node) {
              pendingDrag = {
                nodeId,
                startX,
                startY,
                origX: node.position.x,
                origY: node.position.y,
              };
            }
          },
        },
        state.selectedNodeId === node.id,
        nodesWithWinnerLink.has(node.id),
        annotationsByNode.get(node.id),
        nodeWarnings.get(node.id),
      );
      nodesLayer.appendChild(card);
    }

    // Render edges (clear old paths, keep defs)
    const existingPaths = svg.querySelectorAll('path, text.tb-edge-label, path.tb-edge-hit');
    existingPaths.forEach((el) => svg.removeChild(el));

    // Group edges by source→target pair to offset overlapping arrows
    const edgeGroups = new Map<string, TopologyEdge[]>();
    for (const edge of state.edges) {
      const key = `${edge.sourceNodeId}:${edge.targetNodeId}`;
      if (!edgeGroups.has(key)) edgeGroups.set(key, []);
      edgeGroups.get(key)!.push(edge);
    }

    for (const group of edgeGroups.values()) {
      const count = group.length;
      group.forEach((edge, index) => {
        // Spread edges vertically when multiple share the same endpoints
        const offset = count > 1 ? (index - (count - 1) / 2) * 14 : 0;
        renderEdge(svg, edge, state, offset);
      });
    }

    // Size layers to fit content; spacer creates scrollable area
    let maxX = 600;
    let maxY = 400;
    for (const node of state.nodes) {
      maxX = Math.max(maxX, node.position.x + getCardWidth(node) + 40);
      maxY = Math.max(maxY, node.position.y + 180);
    }
    svg.setAttribute('width', String(maxX));
    svg.setAttribute('height', String(maxY));
    nodesLayer.style.width = `${maxX}px`;
    nodesLayer.style.height = `${maxY}px`;
    spacer.style.width = `${maxX}px`;
    spacer.style.height = `${maxY}px`;
  }

  function renderEdge(svg: SVGSVGElement, edge: TopologyEdge, state: TopologyState, yOffset = 0): void {
    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    const target = state.nodes.find((n) => n.id === edge.targetNodeId);
    if (!source || !target) return;

    const portType = edge.linkType === LOSER ? 'loser' : 'winner';
    const sp = getPortPosition(source, portType);
    const tp = getPortPosition(target, 'input');

    // Apply vertical offset for overlapping edges
    const sy = sp.y + yOffset;
    const ty = tp.y + yOffset;

    const dx = tp.x - sp.x;
    const d = `M ${sp.x},${sy} C ${sp.x + dx / 2},${sy} ${sp.x + dx / 2},${ty} ${tp.x},${ty}`;

    // Invisible wider hit area for easier clicking
    const hitArea = document.createElementNS(SVG_NS, 'path');
    hitArea.setAttribute('d', d);
    hitArea.classList.add('tb-edge-hit');
    hitArea.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSelectEdge(edge.id);
    });
    svg.appendChild(hitArea);

    // Visible path
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.classList.add(EDGE_COLORS[edge.linkType] || 'tb-edge--winner');
    if (state.selectedEdgeId === edge.id) path.classList.add('tb-edge--selected');
    path.setAttribute('marker-end', `url(#arrowhead-${edge.linkType})`);

    path.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSelectEdge(edge.id);
    });

    svg.appendChild(path);

    // Edge label at midpoint
    if (edge.label) {
      const mx = (sp.x + tp.x) / 2;
      const my = (sy + ty) / 2 - 8;
      const text = document.createElementNS(SVG_NS, 'text');
      text.classList.add('tb-edge-label');
      text.setAttribute('x', String(mx));
      text.setAttribute('y', String(my));
      text.setAttribute('text-anchor', 'middle');
      text.textContent = edge.label;
      svg.appendChild(text);
    }
  }

  return { element: root, update };
}
