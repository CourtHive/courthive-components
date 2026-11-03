import { ParticipantActualPressure } from './types';
export type GetActualPressureParams = {
    matchUps: any[];
    matchUpType?: string;
    scaleName?: string;
};
/**
 * Walk every matchUp a participant appears in and describe what they met.
 *
 * Only matchUps whose sides are hydrated contribute — an unplayed later round
 * has empty sides, so it simply produces no entry. That is the correct
 * behaviour: this series exists to show what *happened*.
 */
export declare function getActualPressure(params: GetActualPressureParams): ParticipantActualPressure[];
