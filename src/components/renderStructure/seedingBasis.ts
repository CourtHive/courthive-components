/**
 * Why a seed exists, for the on-screen draw.
 *
 * `Side.seedingBasis` records the ground on which a seeding was awarded, as distinct from
 * `seedValue`, which says only where it sits in the order. It matters wherever a governing body
 * permits seeds ABOVE the count its policy allows — a protected ranking seeded ALONGSIDE the normal
 * seeds rather than in place of one. Such a seed displaced nobody, and it is the one somebody will
 * ask about.
 *
 * ## Why the bracket is marked here and not on the printed sheet
 *
 * pdf-factory deliberately leaves the bracket alone and footnotes its **seedings table** instead:
 * an entry line there already carries name, nationality and an entry-status badge, and the table
 * exists to answer "why these seeds". The on-screen draw has **no seedings table** — the bracket is
 * the only surface the fact can appear on, so leaving it unmarked leaves it nowhere.
 *
 * The marker is a single character appended inside the seed's own brackets, so it costs no layout;
 * the basis itself goes in a `title`, following the same rule the presence work settled on — the
 * fact is displayed, the detail is on hover.
 *
 * `RANKING` is the ordinary basis and is never marked. An absent basis means the ordinary one, not
 * "unknown", so marking every seed would bury the one that is not.
 */

const MARKER = '†';

const BASIS_LABELS: Record<string, string> = {
  ORGANISER_DISCRETION: 'organiser discretion',
  PROTECTED_RANKING: 'protected ranking',
  RANKING: 'ranking',
  RATING: 'rating'
};

const ORDINARY_BASIS = 'RANKING';

/** The marker to append to a seed display, or `''` where the seed is ordinary. */
export function seedingBasisMarker(seedingBasis?: string): string {
  if (!seedingBasis || seedingBasis === ORDINARY_BASIS) return '';
  return MARKER;
}

/**
 * The hover text for a marked seed, or `undefined` where there is nothing to say.
 *
 * An unrecognised basis is printed verbatim rather than dropped. The factory's basis enum can gain
 * members, and a tooltip that silently omits one it does not know is worse than a tooltip showing
 * an unfamiliar word — the second is a question, the first is a wrong answer.
 */
export function seedingBasisTitle(seedingBasis?: string): string | undefined {
  if (!seedingBasis || seedingBasis === ORDINARY_BASIS) return undefined;
  return `Additional seed — ${BASIS_LABELS[seedingBasis] ?? seedingBasis.toLowerCase()}`;
}
