import { CompetitivenessBucket } from '../competitivenessBar/types';
/** TODS-aligned draw structure for the sunburst */
export interface SunburstDrawData {
    drawSize: number;
    roundMatchUps: Record<number, SunburstMatchUp[]>;
    seedAssignments?: {
        participantId: string;
        seedNumber: number;
    }[];
}
export interface SunburstMatchUp {
    roundNumber: number;
    roundName?: string;
    matchUpStatus: string;
    winningSide?: number;
    drawPositions: number[];
    scoreString?: string;
    competitiveness?: CompetitivenessBucket;
    sides: SunburstSide[];
}
export interface SunburstSide {
    sideNumber: number;
    drawPosition: number;
    participantName?: string;
    nationalityCode?: string;
    seedNumber?: number;
    entryStatus?: string;
}
export interface HierarchyNode {
    name: string;
    drawPosition?: number;
    seedNumber?: number;
    entryStatus?: string;
    participantName?: string;
    nationalityCode?: string;
    roundName?: string;
    scoreString?: string;
    matchUpStatus?: string;
    competitiveness?: CompetitivenessBucket;
    matchUp?: SunburstMatchUp;
    depth: number;
    value?: number;
    color?: string;
    competitivenessColor?: string;
    children?: HierarchyNode[];
    opponent?: HierarchyNode;
}
export interface SegmentData {
    participantName?: string;
    drawPosition?: number;
    seedNumber?: number;
    entryStatus?: string;
    nationalityCode?: string;
    scoreString?: string;
    matchUpStatus?: string;
    competitiveness?: CompetitivenessBucket;
    roundName?: string;
    depth: number;
    matchUp?: SunburstMatchUp;
}
export interface BurstChartEventHandlers {
    clickSegment?: (data: SegmentData) => void;
    clickCenter?: () => void;
}
/**
 * Determines how segments are filled.
 * - 'default' — seed / entry-status / draw-position coloring (original behavior)
 * - 'competitiveness' — winner-ring segments colored by the competitiveness
 *   bucket of the matchUp they represent; the outer entrant ring stays neutral.
 *
 * Modeled as an open string union so further modes can be added later.
 */
export type BurstColorMode = 'default' | 'competitiveness';
export interface BurstChartOptions {
    width?: number;
    height?: number;
    title?: string;
    colorBySeeds?: boolean;
    /** Initial color mode (default 'default'). Toggle at runtime via instance.setColorMode(). */
    colorMode?: BurstColorMode;
    /** Override the default competitiveness bucket palette. */
    competitivenessColors?: Partial<Record<CompetitivenessBucket, string>>;
    countryCodes?: Record<string, string>;
    eventHandlers?: BurstChartEventHandlers;
    textScaleFactor?: number;
}
/** Handle returned by render() for controlling the chart after rendering */
export interface BurstChartInstance {
    /** Highlight all segments belonging to a player. Returns count of highlighted nodes. Omit name to clear. */
    highlightPlayer: (playerName?: string) => number;
    /** Show or hide the entire chart SVG */
    hide: (hidden: boolean) => void;
    /** Switch the segment coloring mode in place (no re-render). */
    setColorMode: (mode: BurstColorMode) => void;
}
/**
 * Create a BurstChart D3v7 visualization.
 * Accepts the TODS-aligned SunburstDrawData format.
 */
export declare function renderburstChart(container: HTMLElement, drawData: SunburstDrawData, title: string, options?: BurstChartOptions): BurstChartInstance;
/**
 * Factory function to create a burst chart renderer.
 * Accepts either SunburstDrawData (new) or TournamentDraw (legacy, auto-converted).
 */
export declare function burstChart(options?: BurstChartOptions): {
    render: (container: HTMLElement, drawData: SunburstDrawData, title: string) => BurstChartInstance;
};
/**
 * Convert IOC code to emoji flag
 * Matches fixtures.flagISO() from tods-competition-factory
 * @param ioc - IOC nationality code (e.g., "SRB", "GBR", "SUI")
 * @returns Emoji flag
 */
export declare function flagISO(ioc: string): string;
