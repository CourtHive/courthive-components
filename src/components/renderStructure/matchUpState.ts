import { entryStatusConstants, matchUpStatusConstants } from 'tods-competition-factory';
import type { MatchUp, Side } from '../../types';

const { COMPLETED, RETIRED } = matchUpStatusConstants;
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

// a result decided on court; a walkover or a default beats nobody
const PLAYED_TO_A_RESULT = new Set<string>([COMPLETED, RETIRED]);

/** The side's seed as a number, or undefined when it is unseeded (`~` is an unseeded placeholder). */
export function seedOf(side?: Side): number | undefined {
  const value = side?.seedValue === '~' ? undefined : (side?.seedValue ?? side?.seedNumber);
  const seed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(seed) ? seed : undefined;
}

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
 * A seed beaten on court by an unseeded side or a lower seed: `{ winner, loser }` with their seeds,
 * else undefined. Seeds only. Ratings are left out, because whether higher is better depends on the
 * scale, and a guess would mark upsets that are not.
 */
export function upsetOf(
  matchUp?: MatchUp
): { winnerSeed?: number; loserSeed: number; winningSide: number } | undefined {
  const winningSide = matchUp?.winningSide;
  if (!winningSide || !PLAYED_TO_A_RESULT.has(matchUp?.matchUpStatus ?? '')) return undefined;
  const winner = matchUp?.sides?.find((side) => side.sideNumber === winningSide);
  const loser = matchUp?.sides?.find((side) => side.sideNumber && side.sideNumber !== winningSide);
  const loserSeed = seedOf(loser);
  if (loserSeed === undefined) return undefined;
  const winnerSeed = seedOf(winner);
  if (winnerSeed !== undefined && winnerSeed <= loserSeed) return undefined;
  return { winnerSeed, loserSeed, winningSide };
}

export function upsetTitle(upset: { winnerSeed?: number; loserSeed: number }): string {
  const winner = upset.winnerSeed === undefined ? 'An unseeded player' : `Seed ${upset.winnerSeed}`;
  return `Upset: ${winner} beat seed ${upset.loserSeed}`;
}
