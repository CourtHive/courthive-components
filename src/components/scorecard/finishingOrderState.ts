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
  score?: { sets?: Array<{ side1Score?: number; side2Score?: number }> };
};

export type FinishingOrderEntry = { matchUpId: string; orderOfFinish: number };

const scored = (line: FinishingOrderLine) =>
  (line.score?.sets ?? []).some(({ side1Score, side2Score }) => !!side1Score || !!side2Score);

/**
 * Whether a line takes a finishing number: played to a result (COMPLETED, RETIRED, or DEFAULTED with a score). The
 * same rule as the factory's; a caller may pass its own.
 */
export function playedToResult(line: FinishingOrderLine): boolean {
  const status = line.matchUpStatus;
  if (status === 'COMPLETED' || status === 'RETIRED') return true;
  return status === 'DEFAULTED' && scored(line);
}

export function createFinishingOrderState(
  lines: FinishingOrderLine[],
  { counts = playedToResult }: { counts?: (line: FinishingOrderLine) => boolean } = {}
) {
  // the number each line holds as recorded; a commit records the current order
  const recorded = new Map(lines.map(({ matchUpId, orderOfFinish }) => [matchUpId, orderOfFinish]));
  const rank = (line: FinishingOrderLine) => line.orderOfFinish ?? Number.MAX_SAFE_INTEGER;
  const initial = lines
    .filter(counts)
    .sort((a, b) => rank(a) - rank(b) || (a.collectionPosition ?? 0) - (b.collectionPosition ?? 0))
    .map(({ matchUpId }) => matchUpId);
  let order = [...initial];
  let saved = [...initial];

  return {
    /** the lines in finishing order */
    order: (): string[] => [...order],
    /** the number a line holds now; undefined for a line not in the order */
    valueOf: (matchUpId: string): number | undefined => {
      const index = order.indexOf(matchUpId);
      return index >= 0 ? index + 1 : undefined;
    },
    isEditable: (matchUpId: string): boolean => order.includes(matchUpId),
    /** move a line to position k (clamped to 1..n); a value that is not a whole number changes nothing */
    setValue(matchUpId: string, value: number): void {
      if (!order.includes(matchUpId) || !Number.isInteger(value)) return;
      const target = Math.min(Math.max(value, 1), order.length) - 1;
      order = order.filter((id) => id !== matchUpId);
      order.splice(target, 0, matchUpId);
    },
    /** back to the order last saved (or recorded, before any save) */
    reset(): void {
      order = [...saved];
    },
    /** the current order is saved: it becomes what the lines hold, so nothing is dirty until the next edit */
    commit(): void {
      saved = [...order];
      order.forEach((matchUpId, index) => recorded.set(matchUpId, index + 1));
    },
    /** the whole order, as `setOrderOfFinish` takes it */
    toFinishingOrder: (): FinishingOrderEntry[] =>
      order.map((matchUpId, index) => ({ matchUpId, orderOfFinish: index + 1 })),
    /** the lines whose number differs from what they hold */
    changes: (): FinishingOrderEntry[] =>
      order
        .map((matchUpId, index) => ({ matchUpId, orderOfFinish: index + 1 }))
        .filter(({ matchUpId, orderOfFinish }) => recorded.get(matchUpId) !== orderOfFinish),
    isDirty: (): boolean => order.some((matchUpId, index) => matchUpId !== saved[index])
  };
}

export type FinishingOrderState = ReturnType<typeof createFinishingOrderState>;
