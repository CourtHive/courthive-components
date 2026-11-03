import { HorizonDirection } from './types';
/**
 * One arm's steps, stepped in depth as well as hue so the ramp reads as ordered.
 *
 * `centred` mirrors the ribbon's geometry — steps grow from the middle rather than
 * from an edge — so the glyph matches the chart it is keying.
 */
export declare function buildArmSwatch(direction: HorizonDirection, bands: number, centred?: boolean): SVGElement;
export declare function buildHorizonLegend({ bands, scaleName, note, variant }: {
    bands: number;
    scaleName?: string;
    note?: string;
    variant?: string;
}): HTMLElement;
