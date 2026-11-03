import { InlineScoringCallbacks, InlineScoringEngineState } from './inlineScoringTypes';
import { MatchUp } from '../../types';
/**
 * Manages ScoringEngine instances for inline scoring in draw brackets.
 * One engine per matchUpId; lazily created on first interaction.
 */
export declare class InlineScoringManager {
    private engines;
    readonly callbacks: InlineScoringCallbacks;
    constructor(callbacks?: InlineScoringCallbacks);
    /**
     * Get or create a ScoringEngine for a matchUp.
     * If the matchUp has existing score data, initializes the engine with it.
     */
    getOrCreate(matchUpId: string, matchUpFormat: string, existingMatchUp?: MatchUp): InlineScoringEngineState;
    get(matchUpId: string): InlineScoringEngineState | undefined;
    has(matchUpId: string): boolean;
    /**
     * Add a point for a side. Used in 'points' mode.
     * @param winner - 0 for side 1, 1 for side 2
     */
    addPoint(matchUpId: string, winner: 0 | 1, baseMatchUp: MatchUp): MatchUp | undefined;
    /**
     * Add a game for a side. Used in 'games' mode.
     * @param winner - 0 for side 1, 1 for side 2
     */
    addGame(matchUpId: string, winner: 0 | 1, baseMatchUp: MatchUp): MatchUp | undefined;
    /**
     * Add a set score. Used in 'entry' mode.
     *
     * The factory judges the total by its segment's rule and refuses a total that is not a fact (a negative
     * or non-integer score): that refusal records nothing and returns undefined, as input on a completed
     * match does. An input the engine ignores (`recorded: false`) returns undefined too.
     */
    addSet(matchUpId: string, side1Score: number, side2Score: number, baseMatchUp: MatchUp): MatchUp | undefined;
    undo(matchUpId: string, baseMatchUp: MatchUp): MatchUp | undefined;
    redo(matchUpId: string, baseMatchUp: MatchUp): MatchUp | undefined;
    reset(matchUpId: string, baseMatchUp: MatchUp): MatchUp | undefined;
    /**
     * Get the current engine-derived matchUp data.
     */
    getMatchUp(matchUpId: string, baseMatchUp: MatchUp): MatchUp;
    /**
     * Get situation flags (break point, set point, etc.) for display.
     */
    getSituation(matchUpId: string): Record<string, boolean> | undefined;
    canUndo(matchUpId: string): boolean;
    canRedo(matchUpId: string): boolean;
    isComplete(matchUpId: string): boolean;
    /**
     * Whether the set in play takes this input. The factory reports what each segment can be scored with
     * (`getInputLevels`): a segment of outs takes set totals only, a combined-point total has no games.
     */
    accepts(matchUpId: string, level: 'point' | 'game'): boolean;
    remove(matchUpId: string): void;
    clear(): void;
    private notifyAndReturn;
}
