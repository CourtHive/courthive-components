/**
 * The team score of a dual while it is being set by hand in the scorecard header. The header shows the sides left and
 * right (swapped when the scorecard is), so edits arrive by position and leave by side number:
 *
 * - the higher score wins; level scores need a winner chosen and how it was decided (a shootout, a competition rule,
 *   lots or an official decision), and until both are the score cannot be saved. The factory refuses a winner on a level
 *   tie that does not record its decision (`score.overtime` with `decidedIn: 'EXTERNAL'` and `decidedBy`);
 * - a score is a whole number, 0 or more;
 * - saving is offered only once the score differs from where it started.
 *
 * Pure: no DOM. The header's editor renders from it.
 */
export type Position = 'left' | 'right';
/** how a winner on a level score was decided: the factory's `DecidedByMethod` */
export type DecisionMethod = 'SHOOTOUT' | 'COMPETITION_RULE' | 'LOTS' | 'OFFICIAL_DECISION';
export declare const DECISION_METHODS: DecisionMethod[];
/** `decidedBy` is present only on a level score: a score that decides the dual needs no decision */
export type TeamScore = {
    decidedBy?: {
        method: DecisionMethod;
    };
    side1Score: number;
    side2Score: number;
    winningSide?: number;
};
export declare function createTeamScoreOverride({ side1Score, side2Score, winningSide, decidedBy, swapSides }: Partial<TeamScore> & {
    swapSides?: boolean;
}): {
    scoreAt: (position: Position) => number;
    setScore(position: Position, value: number): boolean;
    needsWinner: () => boolean;
    chooseWinner(position: Position): void;
    needsDecision: () => boolean;
    chooseMethod(value: DecisionMethod): void;
    methodChosen: () => DecisionMethod | undefined;
    winnerAt: () => Position | undefined;
    isValid: () => boolean;
    isDirty: () => boolean;
    value: () => TeamScore;
    reset(): void;
};
export type TeamScoreOverride = ReturnType<typeof createTeamScoreOverride>;
