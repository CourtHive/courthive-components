import { MatchUp } from '../../types';
export type ParticipantPath = {
    /** every matchUp the participant appears in */
    played: string[];
    /** the matchUps the participant won: their outgoing connector is part of the path */
    won: string[];
    /** the matchUps ahead while the participant is still alive, by draw position */
    projected: string[];
    /** the matchUps whose outgoing connector leads along the projection: the latest, then each projected but the last */
    leads: string[];
};
/**
 * Index a structure's matchUps by participant, for path highlighting. `projectable` is false for draws whose
 * later rounds are not reached by position (round robin, ad hoc, lucky); their paths are then the matchUps
 * played, with nothing projected.
 */
export declare function buildPathIndex({ roundProfile, projectable, matchUps }: {
    roundProfile?: Record<string, {
        matchUpsCount?: number;
    }>;
    projectable: boolean;
    matchUps: MatchUp[];
}): (participantId: string) => ParticipantPath | undefined;
