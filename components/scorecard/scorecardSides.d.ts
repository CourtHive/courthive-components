/**
 * Side swapping for a home/away flip of the scorecard: a matchUp's sides, set scores and winner mirrored.
 */
export declare function swapWinningSide(winningSide?: number): number | undefined;
export declare function swapSetScores(sets?: any[]): any[] | undefined;
export declare function swapMatchUpSides(matchUp: any): any;
/**
 * The aggregate tie score as the header shows it, left then right, with the winner by position: after a
 * swap side 2 is on the left, so its score and its win are too. Undefined when the result has no set.
 */
export declare function tieScoreDisplay(result: any, swapSides?: boolean): {
    left: string;
    right: string;
    winner?: 1 | 2;
} | undefined;
