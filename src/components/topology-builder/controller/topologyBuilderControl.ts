/**
 * Topology Builder Control — Orchestrator class.
 * Creates store, all UI panels, wires callbacks, subscribes to state changes.
 */
import { fitByNode, fitKey, ledgerText, steppedDrawSize, steppedQualifiers, takesEntries } from '../domain/drawFit';
import { journeyEdgeIds, journeySummary, stepsByNode } from '../domain/journey';
import { buildTopologyBuilderLayout } from '../ui/topologyBuilderLayout';
import { drawDefinitionConstants } from 'tods-competition-factory';
import { validateTopology } from '../domain/topologyValidator';
import { buildTopologyCanvas } from '../ui/topologyCanvas';
import { getNodeTotalRounds } from '../domain/feedRounds';
import { TopologyStore } from '../engine/topologyStore';
import { standardTemplates } from '../domain/templates';
import { buildNodeEditor } from '../ui/nodeEditor';
import { buildEdgeEditor } from '../ui/edgeEditor';
import { getCardWidth } from '../ui/structureCard';
import { buildToolbar } from '../ui/toolbar';
import { buildFooter } from '../ui/footer';
import {
  changesKey,
  clampCut,
  currentCut,
  heldEntries,
  linePool,
  stageAcceptanceEntries,
  stageEntryChanges
} from '../domain/acceptanceLine';

// constants and types
import type { FitLever, NodeFit, NodeJourney } from '../ui/structureCard';
import type { CardSize } from '../engine/topologyStore';
import type { FooterPanel } from '../ui/footer';
import type { ModeToggle } from '../ui/toolbar';
import type {
  TopologyBuilderConfig,
  TopologyState,
  TopologyNode,
  TopologyEdge,
  TopologyMode,
  PlayoffOffer,
  StructureFit,
  JourneyStep,
  DrawFit,
  UIPanel,
  AcceptanceEntry,
  EntryChange,
  FitProposal
} from '../types';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF, SINGLE_ELIMINATION, FEED_IN, ROUND_ROBIN, LUCKY_DRAW, WINNER, LOSER } =
  drawDefinitionConstants;
const POSITION = 'POSITION';
const FIT_DRAW_TYPES = new Set<string>([SINGLE_ELIMINATION, FEED_IN, ROUND_ROBIN]);

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
    const journey = this.config.journey
      ? {
          search: (query: string) => this.config.journey!.search(query),
          choose: (participantId: string) => this.showJourney(participantId),
          summary: (state: TopologyState) =>
            state.journeyParticipantId ? journeySummary(state, this.journeyEntry(state).steps) : ''
        }
      : undefined;
    const acceptance =
      this.config.acceptance && this.config.drawFit && !this.config.readOnly
        ? ([MAIN, QUALIFYING] as const).map((stage) => ({
            stage,
            visible: (state: TopologyState) =>
              stage === MAIN ||
              state.nodes.some((node) => node.stage === QUALIFYING) ||
              this.acceptanceEntries(stage).length > 0,
            pool: () => this.acceptancePool(stage),
            held: () => heldEntries(this.acceptanceEntries(stage)),
            cut: (state: TopologyState) =>
              state.acceptanceCuts?.[stage] ??
              (stage === MAIN ? state.acceptanceCut : undefined) ??
              currentCut(this.acceptancePool(stage)),
            changes: (state: TopologyState) =>
              this.entryChanges(state).filter(
                (change) =>
                  (stage === MAIN ? (change.fromStage ?? MAIN) : (change.toStage ?? change.fromStage ?? MAIN)) === stage
              ),
            summary: (state: TopologyState) => (stage === MAIN ? this.entryChanges(state) : []),
            setCut: (cut: number) => this.setAcceptanceCut(cut, stage),
            discard: () => this.discardEntryChanges()
          }))
        : undefined;
    const proposals =
      this.config.fitProposals && !this.config.readOnly
        ? {
            proposals: (state: TopologyState) => this.currentProposals(state),
            choose: (proposal: FitProposal) => this.applyFitProposal(proposal)
          }
        : undefined;
    const sanctionLimits =
      this.config.sanctionLimits && !this.config.readOnly
        ? {
            read: this.config.sanctionLimits,
            change: (constraintOverrides: TopologyState['constraintOverrides']) =>
              this.store.loadState({ ...this.store.getState(), constraintOverrides })
          }
        : undefined;
    return buildFooter({ countPlayoffOffers, fitLedger, journey, acceptance, proposals, sanctionLimits });
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
    if (this.config.journey) {
      toggles.push({
        mode: 'journey',
        label: 'Player journey',
        unavailable: (state) => (state.nodes.length > 1 ? undefined : 'A single structure has no journey to follow'),
        offTitle: 'Follow one participant through every connected structure',
        onTitle: 'Done following'
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

  // ── Journey mode ──────────────────────────────────────────────────────

  /** Show one participant's journey: the mode, and whose. TMX's "See player journey" opens the topology this way. */
  showJourney(participantId: string): void {
    this.store.setJourneyParticipant(participantId);
    this.setMode('journey');
  }

  private journeyCache?: { key: string; steps: JourneyStep[]; edges: Set<string>; byNode: Map<string, JourneyStep[]> };

  /** The chosen participant's steps, asked of the host once per participant and topology, not on every render. */
  private journeyEntry(state: TopologyState) {
    const participantId = state.journeyParticipantId;
    const key = `${participantId ?? ''}|${state.nodes.map((n) => n.id).join(',')}|${state.edges.length}`;
    if (this.journeyCache?.key === key) return this.journeyCache;
    const steps = participantId && this.config.journey ? this.config.journey.stepsFor(participantId) : [];
    this.journeyCache = { key, steps, edges: journeyEdgeIds(state, steps), byNode: stepsByNode(steps) };
    return this.journeyCache;
  }

  private journeyFor(nodeId: string): NodeJourney | undefined {
    const state = this.store.getState();
    if (!state.journeyParticipantId) return undefined;
    return { steps: this.journeyEntry(state).byNode.get(nodeId) ?? [], onStep: this.config.journey?.onStep };
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
    // the acceptance line's changes are part of the question: moving the line asks for the fit again
    const entryChanges = this.entryChanges(state);
    const key = `${fitKey(state)}|${changesKey(entryChanges)}`;
    if (this.fitCache?.key === key) return this.fitCache;
    let fit: DrawFit | undefined;
    try {
      fit = this.config.drawFit(state, entryChanges.length ? { entryChanges } : undefined);
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
    const limits = this.effectiveLimits();
    const nextSize = steppedDrawSize(node, 1);
    const nextQualifiers = steppedQualifiers(node, 1);
    return {
      takesEntries: true,
      fit,
      canResize: {
        down: steppedDrawSize(node, -1) !== undefined,
        up:
          nextSize !== undefined &&
          (node.stage !== MAIN || limits?.drawSize === undefined || nextSize <= limits.drawSize)
      },
      ...(node.stage === QUALIFYING && {
        canQualify: {
          down: steppedQualifiers(node, -1) !== undefined,
          up:
            nextQualifiers !== undefined &&
            (limits?.maxQualifiers === undefined || nextQualifiers <= limits.maxQualifiers)
        }
      })
    };
  }

  // ── Fit mode: the acceptance line ─────────────────────────────────────

  private originalAcceptanceEntries(): AcceptanceEntry[] {
    return ([MAIN, QUALIFYING] as const).flatMap((stage) =>
      (this.config.acceptance?.entries(stage) ?? []).filter((entry) => (entry.entryStage ?? MAIN) === stage)
    );
  }

  private acceptanceEntries(stage: 'MAIN' | 'QUALIFYING'): AcceptanceEntry[] {
    return stageAcceptanceEntries(this.originalAcceptanceEntries(), this.store.getState(), stage);
  }

  private acceptancePool(stage: 'MAIN' | 'QUALIFYING' = MAIN): AcceptanceEntry[] {
    return linePool(this.acceptanceEntries(stage));
  }

  private entryChanges(state: TopologyState): EntryChange[] {
    return this.config.acceptance
      ? stageEntryChanges(this.originalAcceptanceEntries(), state)
      : (state.proposalEntryChanges ?? []);
  }

  /** Each stage's line adjusts the pending proposal; Generate remains the only write. */
  setAcceptanceCut(cut: number, stage: 'MAIN' | 'QUALIFYING' = MAIN): void {
    const pool = this.acceptancePool(stage);
    const bounded = clampCut(pool, cut);
    const state = this.store.getState();
    const entries = this.originalAcceptanceEntries();
    const atCut = (value?: number): TopologyState => ({
      ...state,
      ...(stage === MAIN && { acceptanceCut: value }),
      acceptanceCuts: { ...state.acceptanceCuts, [stage]: value }
    });
    const next =
      changesKey(stageEntryChanges(entries, atCut(bounded))) === changesKey(stageEntryChanges(entries, atCut()))
        ? undefined
        : bounded;
    this.store.loadState({
      ...state,
      ...(stage === MAIN && { acceptanceCut: next }),
      acceptanceCuts: { ...state.acceptanceCuts, [stage]: next }
    });
    this.config.onEntryChanges?.(this.getEntryChanges());
  }

  /** The entry changes the acceptance line makes now — for the host to apply together with the generation. */
  getEntryChanges(): EntryChange[] {
    return this.entryChanges(this.store.getState());
  }

  /** The acceptance line back to today's statuses. */
  discardEntryChanges(): void {
    this.store.loadState({
      ...this.store.getState(),
      acceptanceCut: undefined,
      acceptanceCuts: undefined,
      proposalEntryChanges: undefined
    });
    this.config.onEntryChanges?.([]);
  }

  private proposalCache?: { key: string; result: ReturnType<NonNullable<TopologyBuilderConfig['fitProposals']>> };

  private currentProposals(state: TopologyState): ReturnType<NonNullable<TopologyBuilderConfig['fitProposals']>> {
    const entryChanges = this.entryChanges(state);
    const key = `${fitKey(state)}:${changesKey(entryChanges)}`;
    if (this.proposalCache?.key === key) return this.proposalCache.result;
    const result = this.config.fitProposals!(state, { entryChanges });
    this.proposalCache = { key, result };
    return result;
  }

  private applyFitProposal(proposal: FitProposal): void {
    const state = this.store.getState();
    const main = state.nodes.find((node) => node.stage === MAIN);
    if (!main) return;
    const pool = this.acceptancePool();
    const statuses = new Map(
      proposal.entryChanges
        .filter((change) => !(change.fromStage && change.fromStage !== MAIN) && !change.toStage)
        .map((change) => [change.participantId, change.to])
    );
    const cut = pool.filter(
      (entry) => (statuses.get(entry.participantId) ?? entry.entryStatus) === 'DIRECT_ACCEPTANCE'
    ).length;
    const isLine =
      !proposal.qualifyingDrawSize &&
      !state.nodes.some((node) => node.stage === QUALIFYING) &&
      !proposal.entryChanges.some((change) => change.toStage) &&
      pool.every(
        (entry, index) =>
          (statuses.get(entry.participantId) ?? entry.entryStatus) === (index < cut ? 'DIRECT_ACCEPTANCE' : 'ALTERNATE')
      );
    let nodes = state.nodes.map((node) =>
      node.id === main.id
        ? {
            ...node,
            drawSize: proposal.drawSize,
            structureType: FIT_DRAW_TYPES.has(proposal.drawType) ? proposal.drawType : node.structureType
          }
        : node
    );
    let edges = state.edges;
    if (proposal.qualifyingDrawSize && proposal.qualifyingPositions) {
      if (nodes.filter((node) => node.stage === QUALIFYING).length > 1) return;
      const existing = nodes.find((node) => node.stage === QUALIFYING);
      const qualifying: TopologyNode = {
        ...(existing ?? {
          id: crypto.randomUUID(),
          stage: QUALIFYING,
          structureName: 'Qualifying',
          position: { x: Math.max(40, main.position.x - 300), y: main.position.y + 160 }
        }),
        structureType: SINGLE_ELIMINATION,
        drawSize: proposal.qualifyingDrawSize,
        qualifyingPositions: proposal.qualifyingPositions
      };
      nodes = [...nodes.filter((node) => node.id !== qualifying.id), qualifying];
      const link = edges.find(
        (edge) => edge.sourceNodeId === qualifying.id && edge.targetNodeId === main.id && edge.linkType === WINNER
      );
      edges = [
        ...edges.filter((edge) => edge.id !== link?.id),
        {
          ...link,
          id: link?.id ?? crypto.randomUUID(),
          sourceNodeId: qualifying.id,
          targetNodeId: main.id,
          linkType: WINNER,
          sourceRoundNumber: Math.log2(proposal.qualifyingDrawSize / proposal.qualifyingPositions),
          targetRoundNumber: 1,
          qualifyingPositions: proposal.qualifyingPositions
        }
      ];
    }
    this.store.loadState({
      ...state,
      nodes,
      edges,
      acceptanceCuts: undefined,
      acceptanceCut: this.config.acceptance && isLine ? cut : undefined,
      proposalEntryChanges: proposal.entryChanges
    });
    if (proposal.qualifyingDrawSize) this.autoLayout();
    this.config.onEntryChanges?.(this.getEntryChanges());
  }

  private effectiveLimits() {
    return { ...this.config.sanctionLimits?.().constraints, ...this.store.getState().constraintOverrides };
  }

  /** A Fit mode lever: the topology changes, and the next render asks the host for the new fit. */
  private applyFitLever(nodeId: string, lever: FitLever, direction: 1 | -1): void {
    const node = this.store.getState().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (lever === 'feedIn') {
      this.store.updateNode(nodeId, {
        structureType: node.structureType === 'FEED_IN' ? SINGLE_ELIMINATION : 'FEED_IN'
      });
      return;
    }
    if (lever === 'size') {
      const drawSize = steppedDrawSize(node, direction);
      if (
        drawSize !== undefined &&
        (node.stage !== MAIN ||
          this.effectiveLimits().drawSize === undefined ||
          drawSize <= this.effectiveLimits().drawSize!)
      )
        this.store.updateNode(nodeId, { drawSize });
      return;
    }
    const qualifyingPositions = steppedQualifiers(node, direction);
    if (
      qualifyingPositions !== undefined &&
      (this.effectiveLimits().maxQualifiers === undefined ||
        qualifyingPositions <= this.effectiveLimits().maxQualifiers!)
    )
      this.store.updateNode(nodeId, { qualifyingPositions });
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
      ...(this.config.journey && {
        journeyFor: (nodeId: string) => this.journeyFor(nodeId),
        journeyEdges: () => this.journeyEntry(this.store.getState()).edges
      }),
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
