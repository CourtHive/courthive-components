import { TournamentStatusPill } from './types';
export interface StatusResolverInput {
    tournamentStatus?: string;
    startDate?: string;
    endDate?: string;
    entriesOpen?: string;
    entriesClose?: string;
    /** IANA zone (e.g. "America/New_York"). Falls back to host local when absent. */
    timeZone?: string;
}
export declare function resolveTournamentStatus(input: StatusResolverInput, now?: Date): TournamentStatusPill | null;
