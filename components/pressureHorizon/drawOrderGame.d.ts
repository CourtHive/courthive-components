import { DrawOrderGameState } from './drawOrderGameState';
import { ProjectedPressureResult, PressureSeries } from '../pressureChart/types';
import { DrawOrderScore } from './scoreDrawOrder';
import { HorizonVariant } from './pressureHorizon';
export type DrawOrderGameOptions = {
    width?: number;
    rowHeight?: number;
    rowGap?: number;
    columnGap?: number;
    bands?: number;
    /**
     * `ribbon` is the gentler board: mirror pairs read as reflected curves, which is
     * far easier to spot than comparing wall depths. `walls` is the hard mode.
     */
    variant?: HorizonVariant;
    /** Enables the weighted fan on the ribbon. Carries no identities, so it cannot leak. */
    projection?: ProjectedPressureResult;
    seed?: number;
    scaleName?: string;
    /** Cap the field so a 128-draw stays a game rather than a chore. */
    limit?: number;
    roundLabels?: (roundNumber: number, index: number, total: number) => string;
    onComplete?: (score: DrawOrderScore, state: DrawOrderGameState) => void;
    emptyMessage?: string;
};
export type DrawOrderGameInstance = {
    element: HTMLElement;
    /** The current state — for a story or a host that wants to drive the board. */
    getState: () => DrawOrderGameState;
    reshuffle: (seed?: number) => void;
    reveal: () => void;
    destroy: () => void;
};
export declare function buildDrawOrderGame(container: HTMLElement, series?: PressureSeries[], options?: DrawOrderGameOptions): DrawOrderGameInstance;
