/**
 * Topology Builder Control — Orchestrator class.
 * Creates store, all UI panels, wires callbacks, subscribes to state changes.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { TopologyStore } from '../engine/topologyStore';
import type { CardSize } from '../engine/topologyStore';
import { buildTopologyCanvas } from '../ui/topologyCanvas';
import { buildNodeEditor } from '../ui/nodeEditor';
import { buildEdgeEditor } from '../ui/edgeEditor';
import { buildToolbar } from '../ui/toolbar';
import { buildTopologyBuilderLayout } from '../ui/topologyBuilderLayout';
import { fitByNode, fitKey, ledgerText, steppedDrawSize, steppedQualifiers, takesEntries } from '../domain/drawFit';
import { buildFooter } from '../ui/footer';
import { standardTemplates } from '../domain/templates';
import { validateTopology } from '../domain/topologyValidator';
import { getNodeTotalRounds } from '../domain/feedRounds';
import { getCardWidth } from '../ui/structureCard';
import type {
  TopologyBuilderConfig,
  TopologyState,
  TopologyNode,
  TopologyEdge,
  TopologyMode,
  PlayoffOffer,
  StructureFit,
  DrawFit,
  UIPanel
} from '../types';
import type { FooterPanel } from '../ui/footer';
import type { ModeToggle } from '../ui/toolbar';
import type { FitLever, NodeFit } from '../ui/structureCard';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF, SINGLE_ELIMINATION, LUCKY_DRAW, WINNER, LOSER } =
  drawDefinitionConstants;
const POSITION = 'POSITION';

export class TopologyBuilderControl {
  private readonly store: TopologyStore;
  private readonly layout: UIPanel<TopologyState>;
  private readonly unsubscribe: () => void;
  private readonly config: TopologyBuilderConfig;
  private readonly footer?: FooterPanel;

  constructor(config: TopologyBuilderConfig = {}) {
    this.config = config;
    this.store = new TopologyStore({
      ...config.initialState,
      ...(config.mode && { mode: config.mode })
    });

    const allTemplates = [...standardTemplates, ...(config.templates || [])];
    const isReadOnly = !!config.readOnly;

    const toolbar = this.buildToolbarPanel(allTemplates, isReadOnly);
    const canvas = this.buildCanvasPanel(isReadOnly);

    const { nodeEditor, edgeEditor } = this.buildEditorPanels(isReadOnly);
    this.footer = config.footer ? this.buildFooterPanel() : undefined;

    this.layout = buildTopologyBuilderLayout({
      toolbar,
      canvas,
      nodeEditor,
      edgeEditor,
      footer: this.footer
    });

    this.unsubscribe = this.store.subscribe((state) => {
      this.layout.update(state);
    });

    this.layout.update(this.store.getState());
  }

  private buildEditorPanels(isReadOnly: boolean) {
    const nodeEditor = buildNodeEditor({
      onUpdateNode: isReadOnly ? () => {} : (nodeId, updates) => this.store.updateNode(nodeId, updates),
      onUpdateEdge: isReadOnly ? () => {} : (edgeId, updates) => this.store.updateEdge(edgeId, updates),
      onDeleteNode: isReadOnly ? () => {} : (nodeId) => this.store.removeNode(nodeId),
      readOnly: isReadOnly,
      hideDelete: this.config.hideDelete
    });
    const edgeEditor = buildEdgeEditor({
      onUpdateEdge: isReadOnly ? () => {} : (edgeId, updates) => this.store.updateEdge(edgeId, updates),
      onDeleteEdge: isReadOnly ? () => {} : (edgeId) => this.store.removeEdge(edgeId),
      readOnly: isReadOnly
    });
    return { nodeEditor, edgeEditor };
  }

  private buildFooterPanel(): FooterPanel {
    const countPlayoffOffers = this.offersPlayoffs() ? (state: TopologyState) => this.countOffers(state) : undefined;
    const fitLedger = this.config.drawFit ? (state: TopologyState) => ledgerText(this.currentFit(state)) : undefined;
    return buildFooter({ countPlayoffOffers, fitLedger });
  }

  /** The modes the host has given the topology what it needs for. */
  private modeToggles(): ModeToggle[] {
    const toggles: ModeToggle[] = [];
    if (this.offersPlayoffs()) {
      toggles.push({
        mode: 'addPlayoffs',
        label: 'Add playoffs',
        unavailable: (state) =>
          this.countOffers(state) ? undefined : 'Every finishing position is already played off',
        offTitle: 'Show the playoffs each structure can still feed',
        onTitle: 'Done adding playoffs'
      });
    }
    if (this.config.drawFit) {
      toggles.push({
        mode: 'fit',
        label: 'Fit',
        unavailable: (state) =>
          state.nodes.some((node) => node.stage === MAIN) ? undefined : 'Add a main structure to fit the entries to',
        offTitle: "Show how the event's entries fill the draw",
        onTitle: 'Done fitting'
      });
    }
    return toggles;
  }

  // ── Fit mode ──────────────────────────────────────────────────────────

  private fitCache?: { key: string; fit: DrawFit | undefined; byNode: Map<string, StructureFit> };

  /**
   * The host's fit for the topology as it stands, asked again only when its fit-relevant shape changes (`fitKey`):
   * the host regenerates a draw to answer, and a card dragged across the canvas must not do that on every frame.
   */
  private currentFit(state: TopologyState): DrawFit | undefined {
    return this.fitEntry(state)?.fit;
  }

  private fitEntry(state: TopologyState) {
    if (!this.config.drawFit) return undefined;
    const key = fitKey(state);
    if (this.fitCache?.key === key) return this.fitCache;
    let fit: DrawFit | undefined;
    try {
      fit = this.config.drawFit(state);
    } catch (error) {
      // a topology the converter cannot read yet (no main structure, a link mid-edit) has no fit to show
      fit = { error };
    }
    this.fitCache = { key, fit, byNode: fitByNode(state, fit) };
    return this.fitCache;
  }

  private fitFor(nodeId: string): NodeFit {
    const state = this.store.getState();
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node || !takesEntries(node, state)) return { takesEntries: false };
    const fit = this.fitEntry(state)?.byNode.get(nodeId);
    return {
      takesEntries: true,
      fit,
      canResize: { down: steppedDrawSize(node, -1) !== undefined, up: steppedDrawSize(node, 1) !== undefined },
      ...(node.stage === QUALIFYING && {
        canQualify: { down: steppedQualifiers(node, -1) !== undefined, up: steppedQualifiers(node, 1) !== undefined }
      })
    };
  }

  /** A Fit mode lever: the topology changes, and the next render asks the host for the new fit. */
  private applyFitLever(nodeId: string, lever: FitLever, direction: 1 | -1): void {
    const node = this.store.getState().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (lever === 'size') {
      const drawSize = steppedDrawSize(node, direction);
      if (drawSize !== undefined) this.store.updateNode(nodeId, { drawSize });
      return;
    }
    const qualifyingPositions = steppedQualifiers(node, direction);
    if (qualifyingPositions !== undefined) this.store.updateNode(nodeId, { qualifyingPositions });
  }

  private buildToolbarPanel(allTemplates: any[], isReadOnly: boolean) {
    return buildToolbar(
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
          this.store.autoLayout(this.renderedSizes());
          const state = this.store.getState();
          this.store.loadState(state);
        },
        onGenerate: () => this.handleGenerate(),
        onSaveTemplate: this.config.onSaveTemplate
          ? () => this.config.onSaveTemplate(this.store.getState())
          : undefined,
        onClear: this.config.onClear,
        ...(this.modeToggles().length && {
          onSetMode: (mode: TopologyMode) => this.setMode(mode),
          modes: this.modeToggles()
        })
      },
      allTemplates,
      { hideTemplates: this.config.hideTemplates, hideGenerate: this.config.hideGenerate, readOnly: isReadOnly }
    );
  }

  private buildCanvasPanel(isReadOnly: boolean) {
    return buildTopologyCanvas({
      onSelectNode: (nodeId) => this.store.selectNode(nodeId),
      onSelectEdge: (edgeId) => this.store.selectEdge(edgeId),
      onDoubleClickNode: this.config.onDoubleClickNode
        ? (nodeId) => {
            const state = this.store.getState();
            const node = state.nodes.find((n) => n.id === nodeId);
            if (node) this.config.onDoubleClickNode(node, state);
          }
        : undefined,
      onMoveNode: (nodeId, x, y) => this.store.updateNode(nodeId, { position: { x, y } }),
      onCreateEdge: isReadOnly
        ? () => {}
        : (sourceNodeId, targetNodeId, linkType) => {
            this.handleCreateEdge(sourceNodeId, targetNodeId, linkType);
          },
      onPortMouseDown: () => {},
      ...(this.config.drawFit && {
        fitFor: (nodeId: string) => this.fitFor(nodeId),
        onFitLever: isReadOnly
          ? undefined
          : (nodeId: string, lever: FitLever, direction: 1 | -1) => this.applyFitLever(nodeId, lever, direction)
      }),
      ...(this.offersPlayoffs() && {
        playoffOffers: (nodeId: string) => {
          const node = this.store.getState().nodes.find((n) => n.id === nodeId);
          return node ? this.offersFor(node) : undefined;
        },
        onAddPlayoff: (nodeId: string, offer: PlayoffOffer) => {
          const node = this.store.getState().nodes.find((n) => n.id === nodeId);
          if (node) this.config.onAddPlayoff!(node, offer);
        }
      })
    });
  }

  /** The Add playoffs mode needs both halves from the host: the live offers, and what to do with a chosen one. */
  private offersPlayoffs(): boolean {
    return !!this.config.playoffOffers && !!this.config.onAddPlayoff;
  }

  private offersFor(node: TopologyNode): PlayoffOffer[] | undefined {
    return this.config.playoffOffers?.(node);
  }

  private countOffers(state: TopologyState): number {
    return state.nodes.reduce((count, node) => count + (this.offersFor(node)?.length ?? 0), 0);
  }

  /** The footer's slot for the host's own controls, when the control was built with `footer`. */
  getFooterSlot(): HTMLElement | undefined {
    return this.footer?.slot;
  }

  /** Change what the canvas is for. Leaving a mode with nothing to do in it is always possible. */
  setMode(mode: TopologyMode): void {
    if ((this.store.getState().mode ?? 'view') === mode) return;
    this.store.setMode(mode);
    this.config.onModeChange?.(mode);
  }

  getMode(): TopologyMode {
    return this.store.getState().mode ?? 'view';
  }

  private handleCreateEdge(sourceNodeId: string, targetNodeId: string, linkType: TopologyEdge['linkType']): void {
    const source = this.store.getState().nodes.find((n) => n.id === sourceNodeId);

    if (linkType === POSITION) {
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
    } else if (linkType === LOSER) {
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
      const isQualifyingWinner = linkType === WINNER && source?.stage === QUALIFYING;
      this.store.addEdge({
        sourceNodeId,
        targetNodeId,
        linkType,
        ...(isQualifyingWinner && { targetRoundNumber: 1 })
      });
    }
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
    this.store.autoLayout(this.renderedSizes());
    const state = this.store.getState();
    this.store.loadState(state);
  }

  getState(): TopologyState {
    return this.store.getState();
  }

  /** Each card's size as rendered, for `autoLayout`; nothing for a card with no layout to measure. */
  private renderedSizes(): (nodeId: string) => CardSize | undefined {
    const sizes = new Map<string, CardSize>();
    for (const card of this.layout.element.querySelectorAll<HTMLElement>('.tb-card[data-node-id]')) {
      if (card.offsetHeight) {
        sizes.set(card.dataset.nodeId as string, { width: card.offsetWidth, height: card.offsetHeight });
      }
    }
    return (nodeId) => sizes.get(nodeId);
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
