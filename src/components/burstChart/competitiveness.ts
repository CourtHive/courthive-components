/**
 * Competitiveness classification + palette for burst-chart segments.
 *
 * Mirrors tods-competition-factory's default competitive-band logic
 * (getScoreComponents + getBand) so the sunburst can classify a matchUp without
 * depending on a factory export that may not be present in every consumer's
 * installed/published build. Thresholds match POLICY_COMPETITIVE_BANDS_DEFAULT
 * (DECISIVE <= 20, ROUTINE <= 50; otherwise COMPETITIVE).
 *
 * Buckets and the default palette are kept in sync with the sibling
 * `competitivenessBar` component so competitiveness reads the same everywhere.
 */

import { scoreGovernor } from 'tods-competition-factory';

import { CompetitivenessBucket } from '../competitivenessBar/types';

// constants and types
export type CompetitiveBands = { DECISIVE: number; ROUTINE: number };

export const DEFAULT_COMPETITIVE_BANDS: CompetitiveBands = { DECISIVE: 20, ROUTINE: 50 };

/** matchUpStatus values that represent a result with no games to measure. */
export const WALKOVER_STATUSES = new Set(['WALKOVER', 'DOUBLE_WALKOVER', 'DEFAULTED', 'DOUBLE_DEFAULT']);

/** Default segment fill per bucket — matches the competitivenessBar/donut palette. */
export const COMPETITIVENESS_COLORS: Record<CompetitivenessBucket, string> = {
  COMPETITIVE: '#16a34a', // --chc-status-success
  ROUTINE: '#3b82f6', // --chc-status-info
  DECISIVE: '#8e44ad',
  WALKOVER: '#6b7280' // --chc-text-muted
};

/** Fill for segments with no measurable result (entrant ring, BYEs, undecided). */
export const NEUTRAL_SEGMENT_COLOR = '#cfd8dc';

const COMPETITIVE: CompetitivenessBucket = 'COMPETITIVE';
const ROUTINE: CompetitivenessBucket = 'ROUTINE';
const DECISIVE: CompetitivenessBucket = 'DECISIVE';
const WALKOVER: CompetitivenessBucket = 'WALKOVER';

interface ScoreSet {
  side1Score?: number;
  side2Score?: number;
  side1TiebreakScore?: number;
  side2TiebreakScore?: number;
}

/**
 * Classify a structured score (array of sets) into a competitiveness bucket.
 * Returns undefined when there is nothing to measure (no sets / no games).
 */
export function getCompetitivenessBand(
  sets: ScoreSet[] | undefined,
  bands: CompetitiveBands = DEFAULT_COMPETITIVE_BANDS
): CompetitivenessBucket | undefined {
  if (!sets?.length) return undefined;

  const games = [0, 0];
  const tiebreaks = [0, 0];
  for (const set of sets) {
    games[0] += set.side1Score || 0;
    games[1] += set.side2Score || 0;
    tiebreaks[0] += set.side1TiebreakScore || 0;
    tiebreaks[1] += set.side2TiebreakScore || 0;
  }
  // a match (super-)tiebreak counts as one extra game for its winner
  if (tiebreaks[0] + tiebreaks[1]) games[tiebreaks[0] > tiebreaks[1] ? 0 : 1] += 1;

  const maxGames = Math.max(games[0], games[1]);
  if (maxGames === 0) return undefined;

  const spread = Math.round((Math.min(games[0], games[1]) / maxGames) * 100);
  if (Number.isNaN(spread)) return WALKOVER;
  if (spread <= bands.DECISIVE) return DECISIVE;
  if (spread <= bands.ROUTINE) return ROUTINE;
  return COMPETITIVE;
}

/**
 * Classify a score string (e.g. "6-2 7-6(2)") into a competitiveness bucket.
 * Used by the legacy-draw adapter where only score strings are available.
 */
export function getCompetitivenessFromScoreString(
  scoreString: string | undefined,
  bands: CompetitiveBands = DEFAULT_COMPETITIVE_BANDS
): CompetitivenessBucket | undefined {
  if (!scoreString) return undefined;
  const sets = scoreGovernor.parseScoreString({ scoreString });
  return getCompetitivenessBand(sets, bands);
}

/**
 * Single classification entry point used by both draw adapters. Prefers the
 * structured score (`sets`); falls back to parsing a `scoreString`. Walkovers /
 * defaults are bucketed by status since they carry no games.
 */
export function competitivenessForMatchUp({
  winningSide,
  matchUpStatus,
  sets,
  scoreString,
  bands
}: {
  winningSide?: number;
  matchUpStatus?: string;
  sets?: ScoreSet[];
  scoreString?: string;
  bands?: CompetitiveBands;
}): CompetitivenessBucket | undefined {
  if (matchUpStatus && WALKOVER_STATUSES.has(matchUpStatus)) return WALKOVER;
  if (!winningSide) return undefined;
  if (sets?.length) return getCompetitivenessBand(sets, bands);
  return getCompetitivenessFromScoreString(scoreString, bands);
}

/** Resolve the fill color for a bucket, honoring per-chart overrides. */
export function competitivenessColor(
  bucket: CompetitivenessBucket | undefined,
  overrides?: Partial<Record<CompetitivenessBucket, string>>
): string {
  if (!bucket) return NEUTRAL_SEGMENT_COLOR;
  return overrides?.[bucket] ?? COMPETITIVENESS_COLORS[bucket];
}
