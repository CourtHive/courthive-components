import { Configuration, MatchUp, SetScore } from '../../types';
/** What one side's cell for one set shows. `renderSideScore`'s `setScore` draws exactly this. */
export interface SetScoreView {
    /** A decided set marks its winning side `winner` and the other side `loser`; an undecided set marks neither. */
    variant: 'winner' | 'loser' | undefined;
    /** The raw value displayed: the game count, or the tiebreak points of a tiebreak set. */
    scoreDisplay: number | undefined;
    /** The cell's text: `scoreDisplay`, or `''` when there is no numeric value. */
    text: string;
    /**
     * The tiebreak superscript's text: the set loser's points, only when both sides' are recorded
     * (`settledTiebreakPoints`); `''` when none, or `undefined` under `gameScoreOnly`, which drops it.
     */
    tiebreak: string | undefined;
    /** `configuration.winnerChevron` stripes odd sets. */
    background: string;
}
export declare function setScoreView({ gameScoreOnly, scoreStripes, sideNumber, set }: {
    gameScoreOnly?: boolean;
    scoreStripes?: boolean;
    sideNumber: number;
    set: SetScore;
}): SetScoreView;
/**
 * Defensive enrichment: the factory persists tiebreakSet final sets with side1Score/side2Score
 * collapsed to 1/0 and the actual tiebreak points only in `scoreStringSide{1,2}` (e.g. "[10-7]"),
 * not on the set object. Without this fallback the per-set renderer has no TB points to display
 * and shows the collapsed 1/0 instead.
 */
export declare function enrichTiebreakSet(set: SetScore, index: number, score?: MatchUp['score']): SetScore;
export interface PointScoreView {
    /** The side's point score in the current game. */
    text: string;
    position: 'leading' | 'trailing';
    inverted: boolean;
    /** The game is still being played (its set is undecided), so inline scoring may increment it. */
    inPlay: boolean;
}
/**
 * The point score of the game in play, read from the LAST set. It renders whenever that set carries point
 * data, whether or not `configuration.gameScore` is set: the config only places it (`trailing` by default)
 * and inverts it (by default).
 */
export declare function pointScoreView(sets: SetScore[], sideNumber: number, gameScore?: Configuration['gameScore']): PointScoreView | undefined;
export type SideScoreCell = {
    kind: 'point';
    point: PointScoreView;
    label?: string;
} | {
    kind: 'set';
    set: SetScore;
    label?: string;
};
/**
 * The cells of one side's score, left to right: the point score (leading or trailing) around the sets, each set
 * enriched by `enrichTiebreakSet`. `resultsInfo` labels each cell (`PTS`, the set number) on side 1 only.
 */
export declare function sideScoreCells({ resultsInfo, sideNumber, gameScore, matchUp }: {
    resultsInfo?: boolean;
    sideNumber: number;
    gameScore?: Configuration['gameScore'];
    matchUp: MatchUp;
}): SideScoreCell[];
