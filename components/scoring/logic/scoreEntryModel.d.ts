import { CreateScoreEntryModelParams as FactoryParams, RecordedReason, ScoreEntryModel } from 'tods-competition-factory/score-entry-state';
export { DEFAULT_MATCH_UP_FORMAT, typeDigit, setCell, clearCell, clearScore, clearAll, chooseEnding, changeFormat, switchApproach, replaceSets, readCell, gamesLoser, isEntered, isEmptyEntry, setCountOf, isFinalSetIndex, deciderSetNumberOf, decidingIndex, enteredFactorySets, toFactorySet } from 'tods-competition-factory/score-entry-state';
export type { ScoreEntryApproach, SetEntry, CellRef, ScoreEntryModel, EndingIntent, TypeDigitIntent } from 'tods-competition-factory/score-entry-state';
/** A recorded matchUp the score state hydrates from, with its status held as a string (see `statusBoundary.ts`). */
export type RecordedMatchUpReason = Omit<RecordedReason, 'matchUpStatus'> & {
    matchUpStatus?: string;
};
export type CreateScoreEntryModelParams = Omit<FactoryParams, 'matchUp'> & {
    matchUp?: RecordedMatchUpReason;
};
/** The score state for a matchUp, empty or hydrated from a recorded one. */
export declare function createScoreEntryModel(params?: CreateScoreEntryModelParams): ScoreEntryModel;
