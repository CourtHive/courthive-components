/**
 * The finishing order of a collection's lines while it is being edited: a sequence of the lines played to a result,
 * whose positions are their numbers. Every edit keeps it a dense 1..n with each number used once, so it is always in
 * a state that can be saved:
 *
 * - entering k for a line moves it to k: the lines between shift by one (typing 1 on the second line makes the first 2);
 * - a played line with no number yet joins the end, after the numbered ones, in collection order;
 * - a line not played to a result is not in the order and cannot be numbered.
 *
 * Pure: no DOM. The collection card's entry mode renders from it.
 */
export type FinishingOrderLine = {
    matchUpId: string;
    matchUpStatus?: string;
    orderOfFinish?: number;
    collectionPosition?: number;
    score?: {
        sets?: Array<{
            side1Score?: number;
            side2Score?: number;
        }>;
    };
};
export type FinishingOrderEntry = {
    matchUpId: string;
    orderOfFinish: number;
};
/**
 * Whether a line takes a finishing number: played to a result (COMPLETED, RETIRED, or DEFAULTED with a score). The
 * same rule as the factory's; a caller may pass its own.
 */
export declare function playedToResult(line: FinishingOrderLine): boolean;
export declare function createFinishingOrderState(lines: FinishingOrderLine[], { counts }?: {
    counts?: (line: FinishingOrderLine) => boolean;
}): {
    /** the lines in finishing order */
    order: () => string[];
    /** the number a line holds now; undefined for a line not in the order */
    valueOf: (matchUpId: string) => number | undefined;
    isEditable: (matchUpId: string) => boolean;
    /** move a line to position k (clamped to 1..n); a value that is not a whole number changes nothing */
    setValue(matchUpId: string, value: number): void;
    /** back to the order last saved (or recorded, before any save) */
    reset(): void;
    /** the current order is saved: it becomes what the lines hold, so nothing is dirty until the next edit */
    commit(): void;
    /** the whole order, as `setOrderOfFinish` takes it */
    toFinishingOrder: () => FinishingOrderEntry[];
    /** the lines whose number differs from what they hold */
    changes: () => FinishingOrderEntry[];
    isDirty: () => boolean;
};
export type FinishingOrderState = ReturnType<typeof createFinishingOrderState>;
