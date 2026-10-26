import { entryStatusConstants, matchUpGovernor } from 'tods-competition-factory';
import type { MatchUp, Side } from '../../types';

const {
  DIRECT_ACCEPTANCE,
  WILDCARD,
  QUALIFIER,
  ALTERNATE,
  SPECIAL_EXEMPT,
  JUNIOR_EXEMPT,
  ORGANISER_ACCEPTANCE,
  FEED_IN
} = entryStatusConstants;

/**
 * Entry statuses shown beside the seed, with their abbreviation and full name. LUCKY_LOSER is absent on
 * purpose: the name already carries an `LL` badge. Registration states (CONFIRMED, REGISTERED, ...) are
 * not draw entries and are absent too.
 */
export const ENTRY_STATUS_LABELS: Record<string, { abbr: string; name: string }> = {
  [DIRECT_ACCEPTANCE]: { abbr: 'DA', name: 'Direct acceptance' },
  [WILDCARD]: { abbr: 'WC', name: 'Wildcard' },
  [QUALIFIER]: { abbr: 'Q', name: 'Qualifier' },
  [ALTERNATE]: { abbr: 'ALT', name: 'Alternate' },
  [SPECIAL_EXEMPT]: { abbr: 'SE', name: 'Special exempt' },
  [JUNIOR_EXEMPT]: { abbr: 'JE', name: 'Junior exempt' },
  [ORGANISER_ACCEPTANCE]: { abbr: 'OA', name: 'Organiser acceptance' },
  [FEED_IN]: { abbr: 'FI', name: 'Feed in' }
};

/**
 * The entry-status label to show for a side, or undefined. `setting` is `configuration.entryStatus`:
 * `true` shows every status but direct acceptance, the ordinary case; `'all'` shows that too.
 */
export function entryStatusLabel(
  side: Side | undefined,
  setting: boolean | 'all' | undefined
): { abbr: string; name: string } | undefined {
  const status = side?.participant?.entryStatus;
  if (!setting || !status) return undefined;
  if (status === DIRECT_ACCEPTANCE && setting !== 'all') return undefined;
  return ENTRY_STATUS_LABELS[status];
}

/**
 * A seed beaten in a fully scored result by an unseeded side or a lower seed: `{ winnerSeed, loserSeed, winningSide }`,
 * else undefined. The verdict is the factory's `getMatchUpUpset` (CA, 2026-10-26: upset belongs in the factory, played
 * results only and only fully scored), on its default SEEDING basis.
 */
export function upsetOf(
  matchUp?: MatchUp
): { winnerSeed?: number; loserSeed: number; winningSide: number } | undefined {
  if (!matchUp) return undefined;
  const upset = matchUpGovernor.getMatchUpUpset({ matchUp: matchUp as any });
  if (!upset.isUpset || upset.loserValue === undefined || !upset.winningSide) return undefined;
  return { winnerSeed: upset.winnerValue, loserSeed: upset.loserValue, winningSide: upset.winningSide };
}

export function upsetTitle(upset: { winnerSeed?: number; loserSeed: number }): string {
  const winner = upset.winnerSeed === undefined ? 'An unseeded player' : `Seed ${upset.winnerSeed}`;
  return `Upset: ${winner} beat seed ${upset.loserSeed}`;
}
