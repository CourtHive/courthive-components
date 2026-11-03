import { Tournament } from 'tods-competition-factory';
import { Participant } from '../types';
export type RenderCallback = () => void;
export type DrawAssignmentMethod = 'assignDrawPosition' | 'assignDrawPositionBye' | 'removeDrawPositionAssignment';
export interface DrawAssignmentParams {
    drawId: string;
    structureId: string;
    drawPosition: number;
    participantId?: string;
    qualifier?: boolean;
}
export interface DrawAssignmentResult {
    success?: boolean;
    error?: unknown;
    /** The host accepted an asynchronous request; no assignment has been acknowledged yet. */
    pending?: boolean;
}
export interface DrawStateAdapter {
    /** Query current state on every use; never reinstall an opening snapshot. */
    getTournamentRecord: () => Tournament | undefined;
    /** Apply once, then acknowledge. Only a successful acknowledgement changes focus/renders. */
    mutate: (method: DrawAssignmentMethod, params: DrawAssignmentParams, callback: (result: DrawAssignmentResult) => void) => void;
}
export declare class DrawStateManager {
    private readonly adapter;
    private readonly drawId;
    private readonly structureId;
    private readonly eventId?;
    private renderCallback?;
    private focusDrawPosition?;
    constructor({ tournamentRecord, adapter, drawId, structureId, eventId }: {
        tournamentRecord?: Tournament;
        adapter?: DrawStateAdapter;
        drawId: string;
        structureId: string;
        eventId?: string;
    });
    setRenderCallback(callback: RenderCallback): void;
    private context;
    getAllParticipants(): Participant[];
    getAvailableParticipants(): Participant[];
    /** A request is pending until the host acknowledges it. Refusals do not advance focus or render. */
    private request;
    /** Factory validation controls replacement, including assignments with recorded scores. */
    assignParticipant(params: {
        drawPosition: number;
        participantId: string;
    }): DrawAssignmentResult;
    assignBye(params: {
        drawPosition: number;
    }): DrawAssignmentResult;
    assignQualifier(params: {
        drawPosition: number;
    }): DrawAssignmentResult;
    removeAssignment(params: {
        drawPosition: number;
    }): DrawAssignmentResult;
    getAndClearFocusDrawPosition(): number | undefined;
    getMatchUps(): any[];
    /** A copy of the current record. Asynchronous hosts are queried at call time. */
    getState(): Tournament | undefined;
    getContext(): {
        drawId: string;
        structureId: string;
    };
}
