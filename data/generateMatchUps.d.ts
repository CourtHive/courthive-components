import { MatchUp } from '../types';
export declare function generateMatchUps({ matchUpFormat, randomWinningSide, qualifyingProfiles, participantsCount, completionGoal, drawSize, eventType, outcomes, drawType, withRatings, withAllRatings }?: {
    matchUpFormat?: string;
    randomWinningSide?: boolean;
    qualifyingProfiles?: any;
    participantsCount?: number;
    completionGoal?: number;
    drawSize?: number;
    eventType?: string;
    outcomes?: any;
    drawType?: string;
    withRatings?: {
        scaleName: string;
        scaleType?: string;
        eventType?: string;
    };
    withAllRatings?: Array<{
        scaleName: string;
        accessor: string;
        scaleType?: string;
        eventType?: string;
    }>;
}): {
    matchUps: MatchUp[];
};
