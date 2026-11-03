import { MatchUp, Side } from '../../types';
/**
 * Entry statuses shown beside the seed, with their abbreviation and full name. LUCKY_LOSER is absent on
 * purpose: the name already carries an `LL` badge. Registration states (CONFIRMED, REGISTERED, ...) are
 * not draw entries and are absent too.
 */
export declare const ENTRY_STATUS_LABELS: Record<string, {
    abbr: string;
    name: string;
}>;
/**
 * The entry-status label to show for a side, or undefined. `setting` is `configuration.entryStatus`:
 * `true` shows every status but direct acceptance, the ordinary case; `'all'` shows that too.
 */
export declare function entryStatusLabel(side: Side | undefined, setting: boolean | 'all' | undefined): {
    abbr: string;
    name: string;
} | undefined;
/**
 * A seed beaten in a fully scored result by an unseeded side or a lower seed: `{ winnerSeed, loserSeed, winningSide }`,
 * else undefined. The verdict is the factory's `getMatchUpUpset` (CA, 2026-10-26: upset belongs in the factory, played
 * results only and only fully scored), on its default SEEDING basis.
 */
export declare function upsetOf(matchUp?: MatchUp): {
    winnerSeed?: number;
    loserSeed: number;
    winningSide: number;
} | undefined;
export declare function upsetTitle(upset: {
    winnerSeed?: number;
    loserSeed: number;
}): string;
