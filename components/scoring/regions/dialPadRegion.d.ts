import { ScoreEntryStore } from '../logic/scoreEntryStore';
import { ScoreRegion } from '../scoreEntryCard';
import { SetScore } from '../types';
export type DialPadRegionParams = {
    /** The model the card holds. Omit it and the region makes its own from the params below. */
    store?: ScoreEntryStore;
    matchUpFormat?: string;
    /** Sets already recorded, e.g. from a saved matchUp. Read only when no `store` is given. */
    sets?: SetScore[];
    /** The host's translations (see `SCORE_ENTRY_TEXT`); anything left out reads English. */
    labels?: Record<string, string | undefined>;
    onChange?: () => void;
};
export type DialPadRegion = ScoreRegion & {
    store: ScoreEntryStore;
    /** The entered sets, for a host or a test reading the region directly. The card reads the model. */
    getSets: () => SetScore[];
};
export declare function createDialPadRegion(params: DialPadRegionParams): DialPadRegion;
