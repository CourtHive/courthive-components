import { CellRef, ScoreEntryModel } from './scoreEntryModel';
import { SideNumber } from './scoreEntryState';
/**
 * A field's text as digits only, without leading zeros on a longer number: `6a` and `a6` are `6`, `07`
 * is `7`, and a lone `0` stays — a set lost to love is a score.
 */
export declare function cleanDigits(text: string): string;
/**
 * The model with `cell` cleared and `digits` typed back into it one keystroke at a time.
 *
 * The first refused digit stops the replay rather than being skipped, so `44` in a set to six is `4`
 * (the second 4 is past the ceiling) and an `8` there is nothing at all.
 */
export declare function replayDigits(model: ScoreEntryModel, cell: CellRef, digits: string, complement: boolean): ScoreEntryModel;
export type ComplementPolicy = {
    /** The Smart toggle. */
    smart: boolean;
    /** The sets whose games complement has already fired once. */
    used: ReadonlySet<number>;
};
/**
 * Whether a keystroke into `cell` may derive the opposite cell.
 *
 * Never with Smart off. A tiebreak cell and a tiebreak-only set always may — their complement is the
 * points the format implies, which a correction re-derives. A games cell may only ONCE per set, so a
 * correction by hand is not complemented in turn.
 */
export declare function offersComplement(model: ScoreEntryModel, cell: CellRef, policy: ComplementPolicy): boolean;
/** Whether a games keystroke moved the OPPOSITE games cell — that is, whether the complement fired. */
export declare function complementFired(before: ScoreEntryModel, after: ScoreEntryModel, cell: CellRef): boolean;
/**
 * The tiebreak points to raise beside a side's games, or `undefined`.
 *
 * Only the LOWER of the two shows — `7-6³` means the loser took three — and when only one side's points
 * are in, they show on that side, so what was just typed stays in view. The rule is `lowerTiebreakPoints`;
 * the draw cell raises by the same rule but only once both values are in (`settledTiebreakPoints`).
 */
export declare function raisedTiebreakPoints(model: ScoreEntryModel, setIndex: number, side: SideNumber): number | undefined;
