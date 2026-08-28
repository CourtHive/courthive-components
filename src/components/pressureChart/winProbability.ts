/**
 * Pairwise win probability on the common (ELO-equivalent) scale.
 *
 * The standard ELO logistic:
 *
 *     P(A beats B) = 1 / (1 + 10 ^ ((eloB - eloA) / divisor))
 *
 * `divisor` is a policy knob rather than a constant so it can be calibrated per
 * federation / discipline. 400 is the ELO convention and the default here.
 *
 * This is an ASSUMPTION until measured. The factory ships
 * `getPredictiveAccuracy` for exactly this purpose — it scores how well a rating
 * scale predicts real outcomes over a corpus. Anything presented to a user as a
 * likelihood should be calibrated against that first; this module only ever
 * feeds *relative* opponent-strength expectations, which are far less sensitive
 * to the divisor than a displayed percentage would be.
 */

export const DEFAULT_ELO_DIVISOR = 400;

export type WinProbabilityModel = {
  divisor?: number;
};

/** Probability that the `elo`-rated side beats the `opponentElo`-rated side. */
export function eloWinProbability(elo: number, opponentElo: number, model?: WinProbabilityModel): number {
  const divisor = model?.divisor ?? DEFAULT_ELO_DIVISOR;
  if (!divisor) return 0.5;
  return 1 / (1 + 10 ** ((opponentElo - elo) / divisor));
}

/**
 * Win probability where either side may be unrated. An unrated participant is
 * treated as a coin flip against anyone — a deliberate, visible choice: it keeps
 * a single unrated entrant from erasing the whole sub-bracket's projection,
 * while `unratedCount` on the result reports how much of the field it applied to.
 */
export function winProbability(elo: number | null, opponentElo: number | null, model?: WinProbabilityModel): number {
  if (elo === null || opponentElo === null) return 0.5;
  return eloWinProbability(elo, opponentElo, model);
}
