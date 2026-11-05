import { hydrateScoreEntryState, ScoreEntryState, SideNumber } from './scoreEntryState';
import { MatchUpConfig } from './dynamicSetsLogic';
import { SetScore } from '../types';
/** The three ways of typing a score. The dialog's own union of the same three names is re-pointed here in S5. */
export type ScoreEntryApproach = 'dynamicSets' | 'freeScore' | 'dialPad';
/**
 * One set as ENTERED, cell by cell. Any cell may be empty, which is how a half-entered set is kept.
 *
 * `side1` / `side2` are the set's principal score — games, or the POINTS of a tiebreak-only set, exactly
 * as the regions' cells hold them. `tiebreak1` / `tiebreak2` are the points that decided an ordinary set
 * that went to a tiebreak.
 */
export type SetEntry = {
    side1?: number;
    side2?: number;
    tiebreak1?: number;
    tiebreak2?: number;
};
/** Which cell of which set an intent is aimed at. A tiebreak-only set has no `tiebreak` cells. */
export type CellRef = {
    setIndex: number;
    side: SideNumber;
    kind: 'games' | 'tiebreak';
};
export type ScoreEntryModel = {
    matchUpFormat: string;
    approach: ScoreEntryApproach;
    /** Exactly the set count the format plays, every entry possibly empty. */
    sets: readonly SetEntry[];
    /** The existing pure ending engine, folded in unchanged. */
    ending: ScoreEntryState;
};
/** The ways an ending is chosen, one per transition in `scoreEntryState.ts`. */
export type EndingIntent = {
    kind: 'side';
    sideNumber: SideNumber;
    status: string;
} | {
    kind: 'match';
    status: string;
} | {
    kind: 'bothSidesOut';
} | {
    kind: 'reasonCode';
    code: string | undefined;
};
export type CreateScoreEntryModelParams = {
    matchUpFormat?: string;
    approach?: ScoreEntryApproach;
    /** A saved score to open with, in factory shape. */
    sets?: SetScore[];
    /** A saved matchUp whose outcome hydrates the ending — see `hydrateScoreEntryState`. */
    matchUp?: Parameters<typeof hydrateScoreEntryState>[0];
};
/** What a model with no format opens under. The same fallback `freeScoreRegion` and `matchUpConfigFor` use. */
export declare const DEFAULT_MATCH_UP_FORMAT = "SET3-S:6/TB7";
export declare function createScoreEntryModel(params?: CreateScoreEntryModelParams): ScoreEntryModel;
export type TypeDigitIntent = {
    cell: CellRef;
    digit: number;
    /**
     * Derive the OTHER side from what was typed, where the format makes that a single answer.
     *
     * For a games cell this is the smart complement — a `4` typed into an EMPTY cell writes `6` opposite,
     * over whatever the other cell held: the inference is about the pair. Whether to offer it again for
     * the same set is the caller's policy. For an ordinary tiebreak it derives the
     * winner's points from the loser's, and fires only from the games LOSER's cell, because a winner's 7
     * could have beaten anything. For a tiebreak-only set it derives the other side from the one typed —
     * CA's rule for the Dial Pad, which always asks; Dynamic Sets asks while its Smart toggle is on.
     */
    complement?: boolean;
};
/**
 * Append a digit to a cell, as a keystroke does.
 *
 * Refused — the same model comes back — when the digit could not become a legal score: past the
 * ceiling for a games cell, or past two digits where no ceiling exists. Refusal is what lets a keypad
 * move on to the next cell rather than the model guessing.
 *
 * The ceiling is `getMaxSetScore`'s, given the OPPONENT's games where they are in: 7 in a set to six,
 * tightened to 6 for a side facing 3 — 7 is reachable only through a tiebreak at six-all — and left at
 * 7 for a side facing 5, since 7-5 needs no tiebreak. That last answer is `#5043(factory)`, merged
 * 2026-09-30; this module is written to the fixed factory, and a `7` typed against a `5` is pinned.
 */
export declare function typeDigit(model: ScoreEntryModel, intent: TypeDigitIntent): ScoreEntryModel;
/**
 * Write a whole value into a cell, as setting an input's value does. `undefined` empties it.
 *
 * Nothing is clamped or derived: the value recorded is the value given, and whether it is legal is
 * `error`'s question. A keystroke goes through `typeDigit`, which is where the derivations live.
 */
export declare function setCell(model: ScoreEntryModel, cell: CellRef, value: number | undefined): ScoreEntryModel;
export declare function clearCell(model: ScoreEntryModel, cell: CellRef): ScoreEntryModel;
/**
 * Empty every set and keep the ending: what a score-clearing ending does to the cells.
 *
 * CA, 2026-09-30: *"when I enter set score(s) and then select (Walkover) the set score(s) should
 * clear."* The card calls this when the chosen ending carries no score, having first read `scoreString`
 * for the band. Final, like `[Clear]`: un-choosing the walkover does not bring the score back, because a
 * remembered score that silently reappears on an approach switch was the worse bug.
 */
export declare function clearScore(model: ScoreEntryModel): ScoreEntryModel;
/** Empty every set and un-choose the ending: the card's `[Clear]`. Format and approach stay. */
export declare function clearAll(model: ScoreEntryModel): ScoreEntryModel;
/**
 * Choose (or un-choose) an ending, delegating to `scoreEntryState.ts` — every control there is a
 * toggle, and that is preserved.
 *
 * The SETS are left exactly as they are, even for an ending that carries no score. The card today
 * clears the region on a walkover and keeps the string aside for the band; here the selectors suppress
 * the score while such an ending is chosen (`scoreString` answers nothing, `discardedScore` names what
 * was typed) and it comes back if the ending is un-chosen. Keeping the keystrokes is the point of the
 * model; whether the card should ALSO clear explicitly is S5's decision, and `clearAll` is there for it.
 */
export declare function chooseEnding(model: ScoreEntryModel, intent: EndingIntent): ScoreEntryModel;
/**
 * Move to another format, keeping what the new format has not invalidated.
 *
 * `retainScoreForFormat` decides, given both formats: a set whose position keeps the same rule survives
 * finished or not, a set whose rule changed must stand as a complete legal set, and everything after the
 * first casualty goes with it. It keeps a PREFIX, so the entries are cut to its length rather than
 * rebuilt from its output — the operator's cells survive untouched. The array is then resized to the
 * new format's set count.
 */
export declare function changeFormat(model: ScoreEntryModel, matchUpFormat: string): ScoreEntryModel;
/** Change how the score is typed. A no-op on the score itself: the sets are the sets whichever region shows them. */
export declare function switchApproach(model: ScoreEntryModel, approach: ScoreEntryApproach): ScoreEntryModel;
/**
 * The index of the set that decides the match, or `undefined` while nothing does.
 *
 * Asked of the factory prefix by prefix, so that a decision reached at set 2 is found even when a stale
 * set 3 would make the whole array read as undecided — measured: `analyzeMatchUp` on `6-2 6-2 6-3` with
 * three winning sides answers NO winner, because three is not `setsToWin`.
 */
export declare function decidingIndex(sets: readonly SetEntry[], config: MatchUpConfig): number | undefined;
/** The sets with BOTH principal cells in, as the factory reads them, positioned by `setNumber`. */
export declare function enteredFactorySets(sets: readonly SetEntry[], config: MatchUpConfig): SetScore[];
/**
 * One entry in the factory's shape.
 *
 * `buildSetScore` derives the winning side and the tiebreak pair from the loser's points, which is the
 * contract this module keeps: the lower of two tiebreak cells is the loser's. A cell that is empty stays
 * empty in the output — it is not read as 0, which is what let a half-entered set claim `6-0`.
 *
 * A tiebreak-only set is built here rather than by `buildSetScore`. When this was written that function's
 * winner rule was a hand-rolled "both sides above zero and unequal" (a `3-1` won, a `10-0` not); it asks
 * the factory now too, and this path simply never left. The set's winner is `analyzeSet`'s, given the
 * points AS points — `getSetWinner` would hand them over as games, which a tiebreak-only format has no
 * rule for.
 */
export declare function toFactorySet(entry: SetEntry, index: number, config: MatchUpConfig): SetScore;
/**
 * Replace every set from a factory-shaped array: the Free Score boundary, where TEXT becomes sets.
 *
 * Free Score keeps the text as the field's own value while it is being typed — a half-typed `6-4 re` is
 * nothing the model can represent — and commits here at the points where the text parses to sets. The
 * same seeding and the same invariants as opening a saved score: a set past the decider is trimmed.
 * The same model comes back when nothing changed, so a keystroke inside a word is not a transition.
 */
export declare function replaceSets(model: ScoreEntryModel, sets: SetScore[]): ScoreEntryModel;
export declare function readCell(entry: SetEntry, cell: CellRef): number | undefined;
/** The side that lost the set on games, or `undefined` while the games are level or not both in. */
export declare function gamesLoser(entry: SetEntry): SideNumber | undefined;
/** Whether both principal cells are in — the regions' `bothEntered`. */
export declare function isEntered(entry: SetEntry): boolean;
/** Whether the set holds anything at all, in any cell. */
export declare function isEmptyEntry(entry: SetEntry): boolean;
/**
 * How many sets the format can hold: every set of an `exactly` format, otherwise the best-of. An
 * aggregate format with a final tiebreak holds one more, its sudden-death decider, which is set N + 1
 * and never one of the N (factory #5166; CA, 2026-10-04). It opens only on a level total.
 *
 * An overtime format holds regulation, its overtime ceiling and its decider; under unlimited overtime
 * this is regulation's count, and the array grows one set at a time (`withOvertimeRoom`).
 */
export declare function setCountOf(config: MatchUpConfig): number;
/** Whether the set at `index` is the one the final-set format (`-F:`) governs, as `validateSetScore` asks. */
export declare function isFinalSetIndex(index: number, config: MatchUpConfig): boolean;
/** The set number of an aggregate format's final-tiebreak decider, or `undefined` when it has none. */
export declare function deciderSetNumberOf(config: MatchUpConfig): number | undefined;
