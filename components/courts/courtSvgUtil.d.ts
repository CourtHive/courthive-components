/**
 * Maps sport identifiers to court SVG factories and resolves a sport from
 * factory event / matchUpFormat shapes. Shared by TMX, courthive-public, and
 * any other consumer that wants to render a court SVG image.
 */
export type CourtSport = 'tennis' | 'basketball' | 'baseball' | 'hockey' | 'pickleball' | 'badminton' | 'padel';
export declare const COURT_SVG_RESOURCE_SUB_TYPE = "COURT_SVG";
export declare function sportFromMatchUpFormat(matchUpFormat?: string): CourtSport | undefined;
export declare function resolveCourtSport(event?: any): CourtSport | undefined;
export declare function createCourtSvg(sport: string | undefined, className?: string): SVGSVGElement | undefined;
