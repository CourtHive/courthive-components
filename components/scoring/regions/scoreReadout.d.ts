import { SideNumber } from '../logic/scoreEntryState';
import { SetScore } from '../types';
/** The track width for the readout column, matching the artboards. */
export declare const READOUT_COLUMN_WIDTH = "200px";
export type ScoreReadouts = {
    /** The cell for a side's row. Registers it, so later `update` calls reach it. */
    cell: (sideNumber: SideNumber, sets: SetScore[]) => HTMLElement;
    /** Rewrite every registered readout from the current sets. */
    update: (sets: SetScore[]) => void;
};
export declare function createScoreReadouts(labels?: Record<string, string | undefined>): ScoreReadouts;
