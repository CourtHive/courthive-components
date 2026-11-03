/**
 * The team score of a dual while it is being set by hand in the scorecard header. The header shows the sides left and
 * right (swapped when the scorecard is), so edits arrive by position and leave by side number:
 *
 * - the higher score wins; level scores need a winner chosen, and until one is the score cannot be saved;
 * - a score is a whole number, 0 or more;
 * - saving is offered only once the score differs from where it started.
 *
 * Pure: no DOM. The header's editor renders from it.
 */
export type Position = 'left' | 'right';
export type TeamScore = {
    side1Score: number;
    side2Score: number;
    winningSide?: number;
};
export declare function createTeamScoreOverride({ side1Score, side2Score, winningSide, swapSides }: Partial<TeamScore> & {
    swapSides?: boolean;
}): {
    scoreAt: (position: Position) => number;
    setScore(position: Position, value: number): boolean;
    needsWinner: () => boolean;
    chooseWinner(position: Position): void;
    winnerAt: () => Position | undefined;
    isValid: () => boolean;
    isDirty: () => boolean;
    value: () => TeamScore;
    reset(): void;
};
export type TeamScoreOverride = ReturnType<typeof createTeamScoreOverride>;
