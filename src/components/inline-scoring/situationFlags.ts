/** The engine's situation for the point about to be played, as `ScoringEngine.getScore().situation` reports it. */
export type ScoringSituation = Record<string, boolean | number | undefined>;

/**
 * The situation flags inline scoring shows when `inlineScoring.showSituation` is on: `TB`, `Break`, `Game`,
 * `Set` and `Match`, in that order, joined with " • "; `Complete` once the match is complete; `''` when there
 * is nothing to flag (or no situation yet, before the first point).
 */
export function situationFlags(situation: ScoringSituation | undefined, isComplete: boolean): string {
  if (isComplete) return 'Complete';
  if (!situation) return '';
  return [
    situation.isTiebreak && 'TB',
    situation.isBreakPoint && 'Break',
    situation.isGamePoint && 'Game',
    situation.isSetPoint && 'Set',
    situation.isMatchPoint && 'Match'
  ]
    .filter(Boolean)
    .join(' • ');
}
