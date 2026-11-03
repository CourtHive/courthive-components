import { SunburstDrawData } from './burstChart';
/**
 * Pick the structure the progression sunburst should render from a draw's
 * `getEventData().drawsData[i].structures`. A composite draw (round-robin
 * qualifying → single-elimination main, or round-robin main → elimination
 * playoff) must render its ELIMINATION structure, never the round-robin one.
 * Returns the elimination structure (MAIN preferred, else the first), or
 * `undefined` when the draw has no bracket (pure round-robin).
 */
export declare function pickProgressionStructure(structures?: any[]): any | undefined;
/**
 * Convert a tods-competition-factory `getEventData().drawsData[i].structures[0]`
 * object into the TODS-aligned SunburstDrawData that the sunburst consumes.
 */
export declare function fromFactoryDrawData(structure: any): SunburstDrawData;
/**
 * Convert a legacy TournamentDraw (with R128/R64/.../F/W round keys)
 * into the TODS-aligned SunburstDrawData.
 */
export declare function fromLegacyDraw(tournamentDraw: any): SunburstDrawData;
