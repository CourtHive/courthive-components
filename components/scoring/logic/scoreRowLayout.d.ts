/**
 * Whether the participant rows take the stacked layout: the name on a line of its own, the score cells
 * keeping their columns.
 *
 * A pure decision over two answers the card reads at render — how many score columns the region
 * supplies, and whether the viewport matches the phone query. What the decision LOOKS like (the name
 * spanning the row, above its cells for the upper participant and beneath them for the lower, each cell
 * keeping its width) is layout, and `WideFormatRowsTests.stories.ts` measures it in Chromium at a real
 * desktop and phone viewport.
 */
/**
 * How many score columns can sit BESIDE the participant names before the names have to move.
 *
 * CA, 2026-09-28: *"If I have 9 timed Bolts the width will make the entry columns collide with the
 * participant names; in such a case the upper participant name should float to a row above the cells
 * and the lower participant name should float/wrap to a row beneath the cells."*
 *
 * Six, and the number is a consequence rather than a taste: conventional tennis never asks for more.
 * Best-of-five is five games columns plus at most one transient tiebreak column, so every racquet
 * format in the ecosystem stays inline and the stacked layout is reserved for the formats that
 * genuinely cannot fit — a nine-bolt timed match needs 558px of columns, which leaves nothing usable
 * for a name inside the dialog's 780.
 *
 * Counted rather than measured because the decision has to be made before there is anything to measure.
 * The rows are built before the card is in the document on its first render, and the layout chosen
 * changes the width the names need, so a `getBoundingClientRect` threshold would be reading a box whose
 * size depends on its own answer. A count is the same at every render; the browser stories then measure
 * what each answer produces.
 */
export declare const MAX_INLINE_SCORE_COLUMNS = 6;
/** Stack the rows once the columns outnumber what fits beside a name, and always on a phone. */
export declare function shouldStack(columnCount: number, isPhone: boolean): boolean;
