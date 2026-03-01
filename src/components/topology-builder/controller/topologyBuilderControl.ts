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
import type { TopologyState, TopologyBuilderConfig, UIPanel } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF, SINGLE_ELIMINATION, WINNER, LOSER } = drawDefinitionConstants;
const POSITION = 'POSITION';

export class TopologyBuilderControl {
  private store: TopologyStore;
  private layout: UIPanel<TopologyState>;
  private unsubscribe: () => void;
  private config: TopologyBuilderConfig;

  constructor(config: TopologyBuilderConfig = {}) {
    this.config = config;
    this.store = new TopologyStore(config.initialState);

    const allTemplates = [...standardTemplates, ...(config.templates || [])];

    // Build toolbar
    const toolbar = buildToolbar(
      {
        onAddStructure: (stage) => this.addDefaultStructure(stage),
        onLoadTemplate: (template) => {
          this.store.loadState({
            ...template.state,
            selectedNodeId: null,
            selectedEdgeId: null,
            templateName: template.name,
          });
        },
        onAutoLayout: () => {
          this.store.autoLayout();
          // Re-notify
          const state = this.store.getState();
          this.store.loadState(state);
        },
        onGenerate: () => this.handleGenerate(),
        onSaveTemplate: config.onSaveTemplate
          ? () => config.onSaveTemplate!(this.store.getState())
          : undefined,
      },
      allTemplates,
    );

    // Build canvas
    const canvas = buildTopologyCanvas({
      onSelectNode: (nodeId) => this.store.selectNode(nodeId),
      onSelectEdge: (edgeId) => this.store.selectEdge(edgeId),
      onMoveNode: (nodeId, x, y) => this.store.updateNode(nodeId, { position: { x, y } }),
      onCreateEdge: (sourceNodeId, targetNodeId, linkType) => {
        const source = this.store.getState().nodes.find((n) => n.id === sourceNodeId);

        if (linkType === POSITION) {
          this.store.addEdge({
            sourceNodeId,
            targetNodeId,
            linkType,
            finishingPositions: [1],
          });
        } else {
          const isQualifyingWinner = linkType === WINNER && source?.stage === QUALIFYING;
          const sourceLastRound = source ? Math.ceil(Math.log2(source.drawSize)) : undefined;
          this.store.addEdge({
            sourceNodeId,
            targetNodeId,
            linkType,
            ...(sourceLastRound && linkType === LOSER && { sourceRoundNumber: sourceLastRound }),
            ...(isQualifyingWinner && { targetRoundNumber: 1 }),
          });
        }
      },
      onPortMouseDown: () => {},
    });

    // Build editors
    const nodeEditor = buildNodeEditor({
      onUpdateNode: (nodeId, updates) => this.store.updateNode(nodeId, updates),
      onDeleteNode: (nodeId) => this.store.removeNode(nodeId),
    });

    const edgeEditor = buildEdgeEditor({
      onUpdateEdge: (edgeId, updates) => this.store.updateEdge(edgeId, updates),
      onDeleteEdge: (edgeId) => this.store.removeEdge(edgeId),
    });

    // Build layout
    this.layout = buildTopologyBuilderLayout({
      toolbar,
      canvas,
      nodeEditor,
      edgeEditor,
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

  getState(): TopologyState {
    return this.store.getState();
  }

  loadState(state: TopologyState): void {
    this.store.loadState(state);
  }

  private addDefaultStructure(stage: string): void {
    const existingCount = this.store.getState().nodes.filter((n) => n.stage === stage).length;
    const nameMap: Record<string, string> = {
      [MAIN]: 'Main Draw',
      [QUALIFYING]: `Qualifying ${existingCount + 1}`,
      [CONSOLATION]: 'Consolation',
      [PLAY_OFF]: `Playoff ${existingCount + 1}`,
    };
    const sizeMap: Record<string, number> = {
      [MAIN]: 32,
      [QUALIFYING]: 16,
      [CONSOLATION]: 16,
      [PLAY_OFF]: 4,
    };

    this.store.addNode({
      structureName: nameMap[stage] || stage,
      stage: stage as any,
      drawType: SINGLE_ELIMINATION,
      drawSize: sizeMap[stage] || 16,
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
