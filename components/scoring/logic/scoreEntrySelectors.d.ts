import { ScoreEntryResolution, SideNumber } from './scoreEntryState';
import { ScoreEntryModel } from './scoreEntryModel';
import { SetScore } from '../types';
/** One visible column: a set's principal cells, or the tiebreak cells beside a set that went to one. */
export type ScoreSlot = {
    kind: 'games' | 'tiebreak';
    setIndex: number;
};
export type ColumnOptions = {
    /**
     * A set the operator has clicked back into, whose tiebreak column stays open though its points are
     * known. Presentation, held by the region — passed in rather than kept in the model.
     */
    editingSet?: number;
};
/** The ending, resolved. The one place `resolveScoreEntry` is asked about a model. */
export declare function resolveEnding(model: ScoreEntryModel): ScoreEntryResolution;
/** Sets with BOTH principal cells in, in factory shape, positioned by `setNumber`. A partial set is not here. */
export declare function enteredSets(model: ScoreEntryModel): SetScore[];
/** The entered sets that are SETTLED — see `isSettled`. A `4-2` is entered; it is not completed. */
export declare function completedSets(model: ScoreEntryModel): SetScore[];
/** Whether ANYTHING has been typed, complete or not — a single digit counts. */
export declare function hasEntry(model: ScoreEntryModel): boolean;
/** The score as it stands, in the factory's own line — or nothing while an ending has set it aside. */
export declare function scoreString(model: ScoreEntryModel): string | undefined;
/** What a score-clearing ending set aside, so the band can name it. Nothing unless one is chosen. */
export declare function discardedScore(model: ScoreEntryModel): string | undefined;
/**
 * Whether the score is a FINISHED result: the factory names a winner, the last set is settled, and
 * nothing is wrong with what came before it. An ending that discards the score makes this false,
 * because there is no result to be finished.
 */
export declare function isComplete(model: ScoreEntryModel): boolean;
/** The winner: the ending's when it names one, otherwise the finished score's. */
export declare function winningSide(model: ScoreEntryModel): SideNumber | undefined;
/** The ending's status when one is chosen; `COMPLETED` for a finished score; nothing otherwise. */
export declare function matchUpStatus(model: ScoreEntryModel): string | undefined;
/**
 * The first thing wrong with the score, in words, or `undefined`.
 *
 * Three checks, in order:
 *
 *   1. a tiebreak that contradicts who won the set, with the participant NAMED — the factory refuses it
 *      too, but "side 1" is not a message an operator can act on;
 *   2. the FACTORY's judgement of each entered set (`validateSetScore` with `allowIncomplete`), which
 *      forgives unfinished games but knows `3-7` cannot be. A set whose tiebreak points are still owed
 *      is skipped, because the card is asking for them and an error at that moment would answer its
 *      own question;
 *   3. invariant 10A: a set before the last entered one that is empty or unfinished.
 *
 * Silent while a score-clearing ending is chosen: nothing typed will be submitted.
 */
export type ErrorOptions = {
    /** Names for the two sides, so a message can say who rather than "side 1". */
    sideNames?: [string, string];
    /** The host's translations (see `SCORE_ENTRY_TEXT`). */
    labels?: Record<string, string | undefined>;
};
export declare function error(model: ScoreEntryModel, options?: ErrorOptions): string | undefined;
/**
 * The visible columns, left to right.
 *
 * Every set that holds anything is shown, whatever came before it — this is the rule that ends the
 * ghost set: a cleared set 1 beside a typed set 2 shows BOTH, one empty and one full, so the operator
 * sees the score the model has. Then one empty set opens after the last holding one, and only when
 * everything before it is settled and the match is not decided; a timed format plays every bolt, so
 * for it the only question is whether one is left. A tiebreak column sits beside a set whose games call
 * for points it does not yet have, or that the operator has reopened.
 */
export declare function columns(model: ScoreEntryModel, options?: ColumnOptions): ScoreSlot[];
/**
 * Whether a set is finished: both principal cells in, no tiebreak half-typed, and the factory accepts
 * it as a COMPLETE legal set.
 *
 * ── A `7-6` with no points is settled (CA, 2026-11-07) ──
 *
 * It read unsettled until then: the next set did not open and Submit stayed dead until the points were
 * in, while the engine had recorded a bare `7-6` since ruling V11 (`TIEBREAK_POINTS_NOT_RECORDED`) and,
 * since 7.33.0, calls it complete on the read surface too. The points are OFFERED, not owed: the column
 * opens and takes focus, and the operator types them or moves on. A pair half-typed — one side's points
 * and not the other's — is still unsettled, as it is mid-keystroke. `unrecordedTiebreakNote` says what
 * was left out, so leniency is never silent.
 *
 * ── Strict `validateSetScore`, and not `analyzeSet`'s winning side ──
 *
 * Measured 2026-09-30, before `#5049(factory)`: `analyzeSet` named a winner for a `3-1` in a match
 * tiebreak to ten, and for a `10-9` — any lead read as a win. Both answers are fixed in 7.4.0, and
 * `dynamicSetsLogic` now asks the factory too. Strict validation stays the rule here all the same: it is
 * the same answer `error` reports, so "settled" and "no error" cannot come apart.
 *
 * A timed set is the exception: any pair of scores ends it, a tie included, so both cells in is the
 * whole test — strict validation refuses a `0-0` bolt, which is unusual but not impossible.
 */
export declare function isSettled(model: ScoreEntryModel, index: number): boolean;
/**
 * Whether the set's games call for a tiebreak whose points are not both in. Where the regions send focus
 * and where the column shows; NOT whether the set is finished — see `isSettled`.
 */
export declare function tiebreakOutstanding(model: ScoreEntryModel, index: number): boolean;
/**
 * The band's note when a set decided by its tiebreak carries no points — `1st set: tiebreak points not
 * recorded` — or nothing. The engine records the set and warns (`TIEBREAK_POINTS_NOT_RECORDED`); the card
 * says so before Submit rather than after, so the leniency is a choice the operator can see.
 */
export declare function unrecordedTiebreakNote(model: ScoreEntryModel, options?: ErrorOptions): string | undefined;
/** The value in one cell. Exported for regions, which render cells from the model and never read them back. */
export declare function cellValue(model: ScoreEntryModel, setIndex: number, side: SideNumber, kind: ScoreSlot['kind']): number | undefined;
