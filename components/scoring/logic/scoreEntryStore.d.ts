import { CreateScoreEntryModelParams, ScoreEntryModel } from './scoreEntryModel';
export type ScoreEntryStore = {
    /** The model as it stands. Never mutated; read it again after any transition. */
    get: () => ScoreEntryModel;
    /** Replace the model. The caller says what must be redrawn. */
    set: (next: ScoreEntryModel) => void;
};
export declare function createScoreEntryStore(params?: CreateScoreEntryModelParams): ScoreEntryStore;
