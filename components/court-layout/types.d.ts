import { CourtSport } from '../courts/courtSvgUtil';
/**
 * A court as it arrives from the factory / facilities registry. Intentionally loose — it is passed
 * to `mapCourtToCardData`, which does the normalising, so a caller can hand over a TODS `Court`
 * untouched.
 */
export interface CourtLayoutCourt {
    courtId?: string;
    courtName: string;
    courtAbbreviation?: string;
    indoorOutdoor?: string;
    surfaceCategory?: string;
    surfaceType?: string;
    floodlit?: boolean;
    courtOrder?: number;
    [key: string]: unknown;
}
export interface CourtLayoutData {
    venueId?: string;
    venueName?: string;
    courts: CourtLayoutCourt[];
}
/**
 * How the grid is divided.
 *  'none'    — one grid, ordered by courtOrder
 *  'setting' — indoor vs outdoor (the scheduling-relevant split: rain, lights, curfew)
 *  'surface' — hard vs clay vs grass …
 *  'both'    — setting, then surface within it
 */
export type CourtLayoutGrouping = 'none' | 'setting' | 'surface' | 'both';
export interface CourtLayoutConfig {
    grouping: CourtLayoutGrouping;
    /** Sport whose court outline each card draws. */
    sport: CourtSport;
    /** Heading above each group, with its court count. */
    showGroupHeadings: boolean;
    /** One-line "12 courts · 8 outdoor hard, 4 indoor hard" summary above the grid. */
    showSummary: boolean;
    /** Minimum card width; the grid auto-fills to the container. Any CSS length. */
    minCardWidth: string;
    /** Render nothing but a message when `courts` is empty. */
    emptyMessage: string;
}
export interface CourtLayoutCallbacks {
    onCourtClick?: (court: CourtLayoutCourt) => void;
}
