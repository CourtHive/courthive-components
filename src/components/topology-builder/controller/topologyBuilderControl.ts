/**
 * Topology Builder Control — Orchestrator class.
 * Creates store, all UI panels, wires callbacks, subscribes to state changes.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { TopologyStore } from '../engine/topologyStore';
import { buildTopologyCanvas } from '../ui/topologyCanvas';
import { buildNodeEditor } from '../ui/nodeEditor';
import { buildEdgeEditor } from '../ui/edgeEditor';
import { buildToolbar } from '../ui/toolbar';
import { buildTopologyBuilderLayout } from '../ui/topologyBuilderLayout';
import { standardTemplates } from '../domain/templates';
import { validateTopology } from '../domain/topologyValidator';
import { getNodeTotalRounds } from '../domain/feedRounds';
import { getCardWidth } from '../ui/structureCard';
import type { TopologyState, TopologyNode, TopologyBuilderConfig, UIPanel } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF, SINGLE_ELIMINATION, LUCKY_DRAW, WINNER, LOSER } = drawDefinitionConstants;
const POSITION = 'POSITION';

export class TopologyBuilderControl {
  private readonly store: TopologyStore;
  private readonly layout: UIPanel<TopologyState>;
  private readonly unsubscribe: () => void;
  private readonly config: TopologyBuilderConfig;

  constructor(config: TopologyBuilderConfig = {}) {
    this.config = config;
    this.store = new TopologyStore(config.initialState);

    const allTemplates = [...standardTemplates, ...(config.templates || [])];
    const isReadOnly = !!config.readOnly;

    // Build toolbar
    const toolbar = buildToolbar(
      {
        onAddStructure: (stage, structureType) => this.addDefaultStructure(stage, structureType),
        onLoadTemplate: (template) => {
          this.store.loadState({
            ...template.state,
            selectedNodeId: null,
            selectedEdgeId: null,
            templateName: template.name
          });
        },
        onAutoLayout: () => {
          this.store.autoLayout();
          // Re-notify
          const state = this.store.getState();
          this.store.loadState(state);
        },
        onGenerate: () => this.handleGenerate(),
        onSaveTemplate: config.onSaveTemplate ? () => config.onSaveTemplate(this.store.getState()) : undefined,
        onClear: config.onClear
      },
      allTemplates,
      { hideTemplates: config.hideTemplates, hideGenerate: config.hideGenerate, readOnly: isReadOnly }
    );

    // Build canvas
    const canvas = buildTopologyCanvas({
      onSelectNode: (nodeId) => this.store.selectNode(nodeId),
      onSelectEdge: (edgeId) => this.store.selectEdge(edgeId),
      onDoubleClickNode: config.onDoubleClickNode
        ? (nodeId) => {
            const state = this.store.getState();
            const node = state.nodes.find((n) => n.id === nodeId);
            if (node) config.onDoubleClickNode(node, state);
          }
        : undefined,
      onMoveNode: (nodeId, x, y) => this.store.updateNode(nodeId, { position: { x, y } }),
      onCreateEdge: isReadOnly
        ? () => {}
        : (sourceNodeId, targetNodeId, linkType) => {
            const source = this.store.getState().nodes.find((n) => n.id === sourceNodeId);

            if (linkType === POSITION) {
              // Pick the first unclaimed finishing position
              const existingEdges = this.store
                .getState()
                .edges.filter((e) => e.sourceNodeId === sourceNodeId && e.linkType === POSITION);
              const claimed = new Set(existingEdges.flatMap((e) => e.finishingPositions || []));
              const groupSize = source?.structureOptions?.groupSize || 4;
              let defaultPos = 1;
              for (let p = 1; p <= groupSize; p++) {
                if (!claimed.has(p)) {
                  defaultPos = p;
                  break;
                }
              }
              this.store.addEdge({
                sourceNodeId,
                targetNodeId,
                linkType,
                finishingPositions: [defaultPos]
              });
            } else {
              const isQualifyingWinner = linkType === WINNER && source?.stage === QUALIFYING;
              if (linkType === LOSER) {
                // Default to the first unclaimed source round
                const existingLoserEdges = this.store
                  .getState()
                  .edges.filter((e) => e.sourceNodeId === sourceNodeId && e.linkType === LOSER);
                const claimedRounds = new Set(existingLoserEdges.map((e) => e.sourceRoundNumber));
                const maxRound = source ? getNodeTotalRounds(source.structureType, source.drawSize, source.structureOptions) : 1;
                let defaultRound = 1;
                for (let r = 1; r <= maxRound; r++) {
                  if (!claimedRounds.has(r)) {
                    defaultRound = r;
                    break;
                  }
                }
                this.store.addEdge({
                  sourceNodeId,
                  targetNodeId,
                  linkType,
                  sourceRoundNumber: defaultRound
                });
              } else {
                this.store.addEdge({
                  sourceNodeId,
                  targetNodeId,
                  linkType,
                  ...(isQualifyingWinner && { targetRoundNumber: 1 })
                });
              }
            }
          },
      onPortMouseDown: () => {}
    });

    // Build editors
    const nodeEditor = buildNodeEditor({
      onUpdateNode: isReadOnly ? () => {} : (nodeId, updates) => this.store.updateNode(nodeId, updates),
      onUpdateEdge: isReadOnly ? () => {} : (edgeId, updates) => this.store.updateEdge(edgeId, updates),
      onDeleteNode: isReadOnly ? () => {} : (nodeId) => this.store.removeNode(nodeId),
      readOnly: isReadOnly,
      hideDelete: config.hideDelete
    });

    const edgeEditor = buildEdgeEditor({
      onUpdateEdge: isReadOnly ? () => {} : (edgeId, updates) => this.store.updateEdge(edgeId, updates),
      onDeleteEdge: isReadOnly ? () => {} : (edgeId) => this.store.removeEdge(edgeId),
      readOnly: isReadOnly
    });

    // Build layout
    this.layout = buildTopologyBuilderLayout({
      toolbar,
      canvas,
      nodeEditor,
      edgeEditor
    });

    // Subscribe to state changes
    this.unsubscribe = this.store.subscribe((state) => {
      this.layout.update(state);
    });

    // Initial render
    this.layout.update(this.store.getState());
  }

  render(container: HTMLElement): void {
    container.appendChild(this.layout.element);
  }

  destroy(): void {
    this.unsubscribe();
    this.layout.destroy?.();
    this.layout.element.remove();
  }

  autoLayout(): void {
    this.store.autoLayout();
    const state = this.store.getState();
    this.store.loadState(state);
  }

  getState(): TopologyState {
    return this.store.getState();
  }

  loadState(state: TopologyState): void {
    this.store.loadState(state);
  }

  private addDefaultStructure(stage: string, structureType?: string): void {
    const isLucky = structureType === LUCKY_DRAW;
    const existingCount = this.store.getState().nodes.filter((n) => n.stage === stage).length;
    const nameMap: Record<string, string> = {
      [MAIN]: isLucky ? 'Lucky Draw' : 'Main Draw',
      [QUALIFYING]: `Qualifying ${existingCount + 1}`,
      [CONSOLATION]: 'Consolation',
      [PLAY_OFF]: `Playoff ${existingCount + 1}`
    };
    const sizeMap: Record<string, number> = {
      [MAIN]: isLucky ? 11 : 32,
      [QUALIFYING]: 16,
      [CONSOLATION]: 16,
      [PLAY_OFF]: 4
    };

    const drawSize = sizeMap[stage] || 16;
    const node = this.store.addNode({
      structureName: nameMap[stage] || stage,
      stage: stage as any,
      structureType: structureType || SINGLE_ELIMINATION,
      drawSize,
      ...(stage === QUALIFYING && { qualifyingPositions: Math.floor(drawSize / 4) })
    });

    this.scrollCanvasToNode(node);
  }

  private scrollCanvasToNode(node: TopologyNode): void {
    const canvasEl = this.layout.element.querySelector('.tb-canvas');
    if (!canvasEl) return;

    requestAnimationFrame(() => {
      const rightEdge = node.position.x + getCardWidth(node) + 40;
      if (rightEdge > canvasEl.scrollLeft + canvasEl.clientWidth) {
        canvasEl.scrollTo({
          left: rightEdge - canvasEl.clientWidth,
          behavior: 'smooth'
        });
      }
    });
  }

  private handleGenerate(): void {
    const state = this.store.getState();
    const errors = validateTopology(state);
    const hasErrors = errors.some((e) => e.severity === 'error');

    if (hasErrors) {
      // Could show validation errors, but let the consumer handle it
      console.warn('Topology validation errors:', errors);
    }

    if (this.config.onGenerate) {
      this.config.onGenerate(state);
    }
  }
}
