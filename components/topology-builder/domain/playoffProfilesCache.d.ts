export interface PlayoffRoundRange {
    roundNumber: number;
    finishingPositionRange: string;
}
export interface PlayoffFinishingPositionRange {
    finishingPosition: number;
    finishingPositionRange: string;
}
export interface PlayoffProfiles {
    playoffRounds?: number[];
    playoffRoundsRanges?: PlayoffRoundRange[];
    playoffFinishingPositionRanges?: PlayoffFinishingPositionRange[];
    finishingPositionsAvailable?: number[];
}
export declare function getPlayoffProfiles(structureType: string, drawSize: number, groupSize?: number): PlayoffProfiles;
export declare function clearPlayoffProfilesCache(): void;
