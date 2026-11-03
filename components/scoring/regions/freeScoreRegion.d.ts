import { ScoreEntryStore } from '../logic/scoreEntryStore';
import { ScoreRegion } from '../scoreEntryCard';
import { SetScore } from '../types';
export type FreeScoreRegionParams = {
    /** The model the card holds. Omit it and the region makes its own from the params below. */
    store?: ScoreEntryStore;
    matchUpFormat?: string;
    /** The score to open with, already formatted (e.g. `'6-4 6-3'`). With a `store`, the model's own line is used. */
    initialText?: string;
    disabledMatchUpStatuses?: string[];
    statusScopeLabels?: Record<string, string>;
    /** Label above the field. Wins over `labels.typeTheScore`. */
    label?: string;
    /** The host's translations (see `SCORE_ENTRY_TEXT`); anything left out reads English. */
    labels?: Record<string, string | undefined>;
    /** Called after any change. Wire to the card's `refresh`. */
    onChange?: () => void;
};
export type FreeScoreRegion = ScoreRegion & {
    store: ScoreEntryStore;
    /** What is currently in the field. */
    getText: () => string;
    /** The entered sets, for a host or a test reading the region directly. The card reads the model. */
    getSets: () => SetScore[];
    /** Text in the field counts as entry the model cannot see; required here. */
    hasEntry: () => boolean;
};
export declare function createFreeScoreRegion(params: FreeScoreRegionParams): FreeScoreRegion;
