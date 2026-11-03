import { ScoreRegion } from '../scoreEntryCard';
import { ScoreEntryStore } from '../logic/scoreEntryStore';
import { SetScore } from '../types';
export type DynamicSetsRegionParams = {
    /** The model the card holds. Omit it and the region makes its own from the params below. */
    store?: ScoreEntryStore;
    matchUpFormat?: string;
    /** Participant names, so an integrity message can say who rather than "side 1". */
    sideNames?: [string, string];
    /** Sets already recorded, e.g. from a saved matchUp. */
    sets?: SetScore[];
    /** Whether smart complements starts enabled. Defaults to on. */
    smartComplements?: boolean;
    /** The toggle's word. Wins over `labels.smartComplements`. */
    smartComplementsLabel?: string;
    /** The host's translations (see `SCORE_ENTRY_TEXT`); anything left out reads English. */
    labels?: Record<string, string | undefined>;
    /** Called after a change affecting only the score. Wire to the card's `refresh`. */
    onChange?: () => void;
    /** Called when the COLUMNS change. Wire to the card's `rerender`. */
    onStructureChange?: () => void;
};
export type DynamicSetsRegion = ScoreRegion & {
    store: ScoreEntryStore;
    /** The entered sets, for a host or a test reading the region directly. The card reads the model. */
    getSets: () => SetScore[];
    /** The model's integrity message, named with this region's `sideNames`. The card computes its own. */
    error: () => string | undefined;
    smartComplementsEnabled: () => boolean;
};
export declare function createDynamicSetsRegion(params: DynamicSetsRegionParams): DynamicSetsRegion;
