/** The engine's situation for the point about to be played, as `ScoringEngine.getScore().situation` reports it. */
export type ScoringSituation = Record<string, boolean | number | undefined>;
/**
 * The situation flags inline scoring shows when `inlineScoring.showSituation` is on: `TB`, `Break`, `Game`,
 * `Set` and `Match`, in that order, joined with " • "; `Complete` once the match is complete; `''` when there
 * is nothing to flag (or no situation yet, before the first point).
 */
export declare function situationFlags(situation: ScoringSituation | undefined, isComplete: boolean): string;
