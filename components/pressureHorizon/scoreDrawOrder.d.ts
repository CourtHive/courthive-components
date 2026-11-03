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
export declare function blockLevels(slots: number): number[];
/**
 * Maximum total displacement over all permutations of n elements.
 * Reversal achieves it, and it evaluates to floor(n^2 / 2).
 */
export declare function maxDisplacementFor(slots: number): number;
/**
 * @throws when `guess` is not a permutation of `actual` — that is a caller bug,
 * and scoring it would quietly report a number for an impossible board.
 */
export declare function scoreDrawOrder({ guess, actual }: {
    guess: string[];
    actual: string[];
}): DrawOrderScore;
