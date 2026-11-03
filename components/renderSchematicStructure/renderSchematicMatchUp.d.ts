/**
 * The schematic's geometry and colours. Every value has a default equal to the original fixed rendering, so
 * leaving it out changes nothing. Set on the structure root as CSS variables, which the stylesheet reads.
 */
export interface SchematicOptions {
    /** height in px of one participant slot; a matchUp is two slots and a 1px divider. Default 5 */
    slotHeight?: number;
    /** width in px of the connector between rounds. Default 8 */
    connectorWidth?: number;
    /** width in px of a matchUp. Default 40 */
    matchUpWidth?: number;
    /** corner radius of a slot, any CSS length. Default 1px */
    radius?: string;
    /** connector colour, any CSS colour. Default the structure's connector colour */
    connectorColor?: string;
    /** slot fill, any CSS colour. Default `--chc-border-primary` */
    slotColor?: string;
}
export declare const SCHEMATIC_DEFAULTS: {
    slotHeight: number;
    connectorWidth: number;
    matchUpWidth: number;
};
export interface SchematicMatchUp {
    matchUpId: string;
    roundNumber: number;
    roundPosition?: number;
    drawPositions?: number[];
    finishingRound?: number;
    roundFactor?: number;
    stage?: string;
    isRoundRobin?: boolean;
    preFeedRound?: boolean;
    structureId?: string;
    collectionId?: string;
}
/**
 * Renders a compact matchup: two slots (5px tall by default, `slotHeight`) separated by a 1px divider.
 * Total height 11px by default, vs ~60px for the full renderMatchUp.
 */
export declare function renderSchematicMatchUp({ matchUp, moiety, isFirstRound, isFinalRound, isRoundRobin, roundFactor: roundFactorParam, connectorWidth, slotHeight, isLucky }: {
    matchUp: SchematicMatchUp;
    moiety?: boolean;
    isFirstRound?: boolean;
    isFinalRound?: boolean;
    isRoundRobin?: boolean;
    isLucky?: boolean;
    initialRoundNumber?: number;
    /**
     * Connector scale for THIS render, supplied by `renderSchematicRound`.
     * Falls back to the matchUp's own factor for direct callers.
     */
    roundFactor?: number;
    /** `SchematicOptions.slotHeight`, which the connector heights scale with */
    slotHeight?: number;
    connectorWidth?: number;
}): HTMLElement;
