import { TopologyBuilderConfig, TopologyState, TopologyMode } from '../types';
export declare class TopologyBuilderControl {
    private readonly store;
    private readonly layout;
    private readonly unsubscribe;
    private readonly config;
    private readonly footer?;
    constructor(config?: TopologyBuilderConfig);
    private buildEditorPanels;
    private buildFooterPanel;
    /** The modes the host has given the topology what it needs for. */
    private modeToggles;
    /** Show one participant's journey: the mode, and whose. TMX's "See player journey" opens the topology this way. */
    showJourney(participantId: string): void;
    private journeyCache?;
    /** The chosen participant's steps, asked of the host once per participant and topology, not on every render. */
    private journeyEntry;
    private journeyFor;
    private fitCache?;
    /**
     * The host's fit for the topology as it stands, asked again only when its fit-relevant shape changes (`fitKey`):
     * the host regenerates a draw to answer, and a card dragged across the canvas must not do that on every frame.
     */
    private currentFit;
    private fitEntry;
    private fitFor;
    /** A Fit mode lever: the topology changes, and the next render asks the host for the new fit. */
    private applyFitLever;
    private buildToolbarPanel;
    private buildCanvasPanel;
    /** The Add playoffs mode needs both halves from the host: the live offers, and what to do with a chosen one. */
    private offersPlayoffs;
    private offersFor;
    private countOffers;
    /** The footer's slot for the host's own controls, when the control was built with `footer`. */
    getFooterSlot(): HTMLElement | undefined;
    /** Change what the canvas is for. Leaving a mode with nothing to do in it is always possible. */
    setMode(mode: TopologyMode): void;
    getMode(): TopologyMode;
    private handleCreateEdge;
    render(container: HTMLElement): void;
    destroy(): void;
    autoLayout(): void;
    getState(): TopologyState;
    /** Each card's size as rendered, for `autoLayout`; nothing for a card with no layout to measure. */
    private renderedSizes;
    loadState(state: TopologyState): void;
    private addDefaultStructure;
    private scrollCanvasToNode;
    private handleGenerate;
}
