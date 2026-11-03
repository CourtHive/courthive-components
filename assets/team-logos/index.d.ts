export interface TeamLogo {
    name: string;
    src: string;
}
export declare const TEAM_LOGOS: TeamLogo[];
/** Get a team logo by index (wraps around) */
export declare function getTeamLogo(index: number): TeamLogo;
/** Simple hash of a string to get a stable numeric index */
export declare function hashString(str: string): number;
