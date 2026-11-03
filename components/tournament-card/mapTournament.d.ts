import { TournamentCardData, TournamentStatusPill } from './types';
export interface MapTournamentOptions {
    now?: Date;
    /** Override the resolved status (e.g. surface a `Local Only` pill instead). */
    statusOverride?: TournamentStatusPill | null;
}
export declare function mapTournamentToCardData(tournament: any, options?: MapTournamentOptions): TournamentCardData;
