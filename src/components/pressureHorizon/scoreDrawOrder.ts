/**
 * Score a guessed draw order against the real one.
 *
 * **Why the headline number is structural, not positional.** The obvious score —
 * "how many rows landed in the right slot" — punishes a player for being right.
 * A draw sheet is mirror-symmetric: swapping the top half with the bottom half,
 * or the two quarters inside a half, or the two players inside a first-round
 * pair, produces a bracket with identical structure and a completely different
 * set of slot numbers. A player who reconstructs the pairings perfectly but
 * mirrors one half scores near zero on exact slots while having solved the
 * puzzle.
 *
 * So the score counts **blocks**: at every level of the bracket (pairs, then
 * quarters-of-the-half, then halves), how many of the guessed groupings are real
 * groupings — matched as unordered member sets, anywhere in the guess. That is
 * invariant under every symmetry of the bracket, which is exactly the property
 * the answer key needs.
 *
 * `exact` and `proximity` are still reported, because they are what a player
 * intuitively expects to see and because their gap against `structureScore` is
 * itself the interesting feedback ("you had the draw right and the sheet upside
 * down"). They are not the headline.
 */

export type BlockLevelScore = {
  /** 2 = first-round pairs, 4 = who could meet by round 2, and so on. */
  blockSize: number;
  matched: number;
  total: number;
};

export type SlotResult = {
  slotIndex: number;
  participantId: string;
  /** Where this participant really sits, 0-based. */
  actualIndex: number;
  correct: boolean;
};

export type DrawOrderScore = {
  slots: number;
  /** Rows sitting in exactly the right slot. Symmetry-sensitive — read it with `structureScore`. */
  exact: number;
  /** Sum of |guessed index - actual index| across all rows. */
  displacement: number;
  /** The worst displacement a permutation of this size can achieve. */
  maxDisplacement: number;
  /** 1 - displacement/maxDisplacement. 1 is perfect, 0 is maximally reversed. */
  proximity: number;
  levels: BlockLevelScore[];
  blocksMatched: number;
  blocksTotal: number;
  /** 0-100, the headline. Symmetry-invariant. */
  structureScore: number;
  /** Every block at every level was a real grouping. */
  structurePerfect: boolean;
  /** The guess is the actual order, slot for slot. */
  perfect: boolean;
  slotResults: SlotResult[];
};

/** The block sizes a field of this size actually has. Empty when it does not divide. */
export function blockLevels(slots: number): number[] {
  const levels: number[] = [];
  for (let blockSize = 2; blockSize < slots; blockSize *= 2) {
    if (slots % blockSize !== 0) break;
    levels.push(blockSize);
  }
  return levels;
}

/** A block's identity, independent of the order of its members. */
function blockKey(members: readonly string[]): string {
  return members.toSorted((a, b) => a.localeCompare(b, 'en')).join('|');
}

function blockKeys(order: readonly string[], blockSize: number): string[] {
  const keys: string[] = [];
  for (let start = 0; start < order.length; start += blockSize) {
    keys.push(blockKey(order.slice(start, start + blockSize)));
  }
  return keys;
}

/**
 * How many of the guess's blocks at this size are real blocks — matched anywhere,
 * not slot-for-slot, which is what makes the measure symmetry-invariant.
 */
function matchedBlocks(guess: readonly string[], actual: readonly string[], blockSize: number): number {
  const actualKeys = new Set(blockKeys(actual, blockSize));
  return blockKeys(guess, blockSize).filter((key) => actualKeys.has(key)).length;
}

/**
 * Maximum total displacement over all permutations of n elements.
 * Reversal achieves it, and it evaluates to floor(n^2 / 2).
 */
export function maxDisplacementFor(slots: number): number {
  return Math.floor((slots * slots) / 2);
}

/**
 * @throws when `guess` is not a permutation of `actual` — that is a caller bug,
 * and scoring it would quietly report a number for an impossible board.
 */
export function scoreDrawOrder({ guess, actual }: { guess: string[]; actual: string[] }): DrawOrderScore {
  if (guess.length !== actual.length || new Set(guess).size !== guess.length) {
    throw new Error('scoreDrawOrder: guess must be a permutation of actual');
  }
  const actualIndexById = new Map(actual.map((participantId, index) => [participantId, index]));
  if (guess.some((participantId) => !actualIndexById.has(participantId))) {
    throw new Error('scoreDrawOrder: guess contains a participantId absent from actual');
  }

  const slots = actual.length;
  const slotResults: SlotResult[] = guess.map((participantId, slotIndex) => {
    const actualIndex = actualIndexById.get(participantId) ?? -1;
    return { slotIndex, participantId, actualIndex, correct: actualIndex === slotIndex };
  });

  const exact = slotResults.filter((result) => result.correct).length;
  const displacement = slotResults.reduce(
    (total, result) => total + Math.abs(result.slotIndex - result.actualIndex),
    0
  );
  const maxDisplacement = maxDisplacementFor(slots);
  const proximity = maxDisplacement > 0 ? 1 - displacement / maxDisplacement : 1;

  const levels: BlockLevelScore[] = blockLevels(slots).map((blockSize) => ({
    blockSize,
    matched: matchedBlocks(guess, actual, blockSize),
    total: slots / blockSize
  }));

  const blocksMatched = levels.reduce((total, level) => total + level.matched, 0);
  const blocksTotal = levels.reduce((total, level) => total + level.total, 0);

  // Raw counts, not a mean of per-level rates: the fine-grained levels carry more
  // blocks and are the harder deduction, so summing weights them the way the
  // difficulty already does. A field with no divisible levels (odd sizes, a
  // partial field) falls back to proximity rather than reporting a hollow 100.
  const structureScore =
    blocksTotal > 0 ? Math.round((100 * blocksMatched) / blocksTotal) : Math.round(100 * proximity);

  return {
    slots,
    exact,
    displacement,
    maxDisplacement,
    proximity,
    levels,
    blocksMatched,
    blocksTotal,
    structureScore,
    structurePerfect: blocksTotal > 0 && blocksMatched === blocksTotal,
    perfect: exact === slots,
    slotResults
  };
}
