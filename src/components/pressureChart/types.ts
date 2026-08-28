/**
 * Pressure chart — type definitions.
 *
 * "Pressure" here means **path difficulty**: how strong the opponents a
 * participant is likely to meet are, relative to the participant. It is
 * deliberately named `projectedPressure` / `pathDifficulty` rather than
 * `pressureRating`, because the factory already uses that name for two other,
 * unrelated quantities:
 *
 *  1. `calculatePressureRatings` (round-robin tally) — a per-matchUp *share of
 *     combined value* (games won x opponent rating), gated to SINGLES.
 *  2. `processCompetitionMatchUp` — a *cumulative* value accrued per matchUp for
 *     the Swiss / DrawMatic competition policies.
 *
 * Neither is a measure of "how hard is this road", which is what this module
 * computes.
 */

import type { CompetitivenessBucket } from '../competitivenessBar/types';

/** Why a projection could not be produced. Never guess — say which. */
export const PRESSURE_UNSUPPORTED = {
  NO_MATCHUPS: 'NO_MATCHUPS',
  NOT_ELIMINATION: 'NOT_ELIMINATION',
  NO_RATINGS: 'NO_RATINGS',
} as const;

export type PressureUnsupportedReason = (typeof PRESSURE_UNSUPPORTED)[keyof typeof PRESSURE_UNSUPPORTED];

/** A rating resolved onto the common (ELO-equivalent) scale. */
export type ResolvedRating = {
  /** ELO-equivalent value, produced by the same range conversion the factory uses. */
  elo: number;
  /** The scale the value was read from, e.g. 'WTN' / 'UTR' / 'ELO'. */
  scaleName: string;
  /** The raw value as published on that scale, for display. */
  sourceValue: number;
};

/** A participant who could arrive in the opponent slot, with the probability they do. */
export type PossibleOpponent = {
  participantId: string;
  participantName?: string;
  probability: number;
  elo: number | null;
};

/** One round of a participant's projected path. */
export type ProjectedRoundPressure = {
  roundNumber: number;
  /** Probability the participant plays this round at all. Round 1 is 1. */
  reachProbability: number;
  /**
   * Probability-weighted mean opponent rating (ELO-equivalent) over the
   * participants who could arrive from the sibling sub-bracket. `null` when no
   * opponent in that sub-bracket carries a rating.
   */
  expectedOpponentElo: number | null;
  /** [min, max] over opponents whose arrival probability clears the threshold. */
  opponentEloRange: [number, number] | null;
  /** expectedOpponentElo - own rating. Positive = projected to play up. */
  expectedSignedDelta: number | null;
  /** How many distinct participants could arrive from the sibling sub-bracket. */
  possibleOpponentCount: number;
  /**
   * Who could arrive, most-likely first. Drives the hover layer ("possible
   * opponents"), and lets a test assert opponent *identity* rather than only a
   * range — a range can be right by coincidence when sub-brackets are similar.
   */
  possibleOpponents: PossibleOpponent[];
  /** True once exactly one opponent is possible — i.e. the uncertainty has burned off. */
  resolved: boolean;
  /** True when this round is a BYE for the participant: no opponent, no pressure. */
  bye: boolean;
};

/** A participant's full projection across the structure. */
export type ParticipantPressureProjection = {
  participantId: string;
  participantName?: string;
  drawPosition?: number;
  /** The participant's own rating on the common scale, or `null` if unrated. */
  rating: ResolvedRating | null;
  rounds: ProjectedRoundPressure[];
  /**
   * **Experienced** difficulty: the reach-weighted mean of `expectedSignedDelta`.
   * Answers "how hard are the matches this participant should expect to actually
   * play?" — which is legitimately *lower* for a weak player, because the hard
   * late rounds are discounted by their small chance of getting there.
   *
   * Do NOT rank a field on this. It systematically flatters weak players and so
   * hides exactly the draw imbalance the ranked view exists to expose. Use
   * `slotDifficulty` for that.
   */
  pathDifficulty: number | null;
  /**
   * **Slot** difficulty: the unweighted mean of `expectedSignedDelta` across all
   * rounds carrying a rated opponent — i.e. how hard this bracket slot is if you
   * had to walk the whole thing, independent of the occupant's own survival odds.
   *
   * This is the number the ranked "path difficulty" view sorts on, and the one a
   * TD reads as a seeding sanity check.
   */
  slotDifficulty: number | null;
  /** Sum of `reachProbability` across rounds — the expected number of matches played. */
  expectedMatchesPlayed: number;
};

export type ProjectedPressureResult = {
  projections: ParticipantPressureProjection[];
  /** Present only when nothing could be produced. */
  unsupported?: PressureUnsupportedReason;
  /** The scale ratings were read from, when a single scale dominated. */
  scaleName?: string;
  /** Count of entrants with no usable rating — surfaced, never silently defaulted. */
  unratedCount: number;
};

/** One round of a participant's realised path. */
export type ActualRoundPressure = {
  roundNumber: number;
  matchUpId?: string;
  opponentParticipantId?: string;
  opponentParticipantName?: string;
  opponentElo: number | null;
  /** opponentElo - own rating. Positive = played up. */
  signedDelta: number | null;
  /** How close the scoreline was. Undefined until the matchUp has a winner. */
  competitiveness?: CompetitivenessBucket;
  won?: boolean;
  bye: boolean;
};

export type ParticipantActualPressure = {
  participantId: string;
  rating: ResolvedRating | null;
  rounds: ActualRoundPressure[];
  /** Mean `signedDelta` across played rounds carrying a rated opponent. */
  facedDifficulty: number | null;
  matchesPlayed: number;
};

/** Chart-ready merge of the projected and actual series for one participant. */
export type PressureSeries = {
  participantId: string;
  participantName?: string;
  drawPosition?: number;
  rating: ResolvedRating | null;
  /** Reach-weighted expected delta. Do not rank on this — see the projection type. */
  pathDifficulty: number | null;
  /** Unweighted slot difficulty. This is what the ranked view sorts on. */
  slotDifficulty: number | null;
  facedDifficulty: number | null;
  points: PressureSeriesPoint[];
};

export type PressureSeriesPoint = {
  roundNumber: number;
  /** Projected band, in signed-delta space. `null` where the round carries no rated opponent. */
  projected: { expected: number | null; low: number | null; high: number | null };
  reachProbability: number;
  /** Realised signed delta, present only once the round has been played. */
  actual: number | null;
  competitiveness?: CompetitivenessBucket;
  won?: boolean;
  bye: boolean;
  resolved: boolean;
};
