import { JourneyStep, TopologyState } from '../types';
/** Each node's steps, keyed by node id. */
export declare function stepsByNode(steps: JourneyStep[]): Map<string, JourneyStep[]>;
/**
 * The links the participant travelled: between consecutive steps in different structures, the edge from the first
 * to the second. Several edges can join two structures (a loser link per round); the one leaving the round the
 * participant left from is preferred when the edge names its source round.
 */
export declare function journeyEdgeIds(state: TopologyState, steps: JourneyStep[]): Set<string>;
/** `Main R1 W · R2 L → Consolation R1 W · R2 …` — structures by name, rounds by number, never the participant. */
export declare function journeySummary(state: TopologyState, steps: JourneyStep[]): string;
/** The fields a journey reads off a matchUp in context. */
export interface JourneyMatchUp {
    matchUpId: string;
    structureId?: string;
    containerStructureId?: string;
    roundNumber?: number;
    matchUpStatus?: string;
    winningSide?: number;
    sides?: {
        sideNumber?: number;
        participantId?: string;
        participant?: {
            participantId?: string;
            individualParticipantIds?: string[];
        };
    }[];
}
/**
 * A participant's journey from a draw's matchUps (in context): one step per matchUp they are in, in the structures'
 * play order (`structureOrder`, the draw's structure ids as `tools.structureSort` orders them) and then by round. A
 * round robin group's matchUp is a step of its container — the node the topology draws.
 */
export declare function journeyStepsFromMatchUps(matchUps: JourneyMatchUp[], participantId: string, structureOrder?: string[]): JourneyStep[];
