import { TournamentCardConfig } from './types';
export declare const DEFAULT_TOURNAMENT_CARD_CONFIG: TournamentCardConfig;
/**
 * Merge a partial provider config over the default.
 * Arrays are replaced wholesale when present (no element-level merge).
 */
export declare function mergeTournamentCardConfig(override?: Partial<TournamentCardConfig>): TournamentCardConfig;
