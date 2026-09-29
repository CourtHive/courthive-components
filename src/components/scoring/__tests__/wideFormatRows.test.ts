/**
 * @vitest-environment happy-dom
 *
 * Rows wide enough that the names cannot sit beside the scores.
 *
 * CA, 2026-09-28: *"If I have 9 timed Bolts the width will make the entry columns collide with the
 * participant names; in such a case the upper participant name should float to a row above the cells
 * and the lower participant name should float/wrap to a row beneath the cells."*
 *
 * ── What is asserted, in a DOM with no layout engine ──
 *
 * happy-dom computes no geometry, so "collide" cannot be measured here and a threshold read from
 * `getBoundingClientRect` would be zero for every column and silently pick the inline layout. The card
 * therefore decides from the COLUMN COUNT, which is the same answer in the browser as in this suite —
 * and what these tests check is the structure that follows from it: the grid template, the DOM order
 * that puts each name on the correct side of its cells, and the fact that it does not fire for the
 * formats that fit.
 *
 * Order is the whole mechanism — `.chc-sec-participant` spans every track when stacked, so appending it
 * first puts the cells below it and appending it last puts them above. That is checkable here; the
 * `grid-column: 1 / -1` that makes it span is in the stylesheet and is not.
 */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

/** Nine ten-minute bolts — CA's case. `SET9-…` does not parse; the nine-set form is `SET9X`. */
const NINE_BOLTS = 'SET9X-S:T10';
const BEST_OF_FIVE = 'SET5-S:6/TB7';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];

/** Nine finished bolts, so all nine columns are on screen at once. */
const NINE_RECORDED = Array.from({ length: 9 }, (_, index) => ({
  setNumber: index + 1,
  side1Score: 22,
  side2Score: 21,
  winningSide: 1
}));

/** Five finished sets plus a tiebreak column would be six — the most conventional tennis can ask for. */
const FIVE_RECORDED = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 4, side2Score: 6, winningSide: 2 },
  { setNumber: 3, side1Score: 6, side2Score: 3, winningSide: 1 },
  { setNumber: 4, side1Score: 3, side2Score: 6, winningSide: 2 },
  { setNumber: 5, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
];

function mount(matchUpFormat: string, sets?: any[]) {
  document.body.innerHTML = '';
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  document.body.append(card.element);

  const row = (side: number) => card.element.querySelector<HTMLElement>(`.chc-sec-row[data-side="${side}"]`)!;
  return {
    card,
    row,
    head: () => card.element.querySelector<HTMLElement>('.chc-sec-row-head'),
    columnCount: () => card.element.querySelectorAll('.chc-sec-row[data-side="1"] .chc-sec-games-cell').length,
    /** Where the name sits among its row's children — before the cells, or after them. */
    namePosition: (side: number) =>
      [...row(side).children].findIndex((child) => child.classList.contains('chc-sec-participant'))
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('nine bolts — the names move out of the way', () => {
  it('marks both rows stacked', () => {
    const h = mount(NINE_BOLTS, NINE_RECORDED);

    expect(h.columnCount(), 'all nine columns are on screen').toBe(9);
    expect(h.row(1).dataset.stacked).toBe('true');
    expect(h.row(2).dataset.stacked).toBe('true');
  });

  it('drops the name TRACK, so the columns get the whole width', () => {
    // Inline, the template opens with `1fr` for the name. Stacked, it is score tracks only and the name
    // spans them instead.
    const h = mount(NINE_BOLTS, NINE_RECORDED);

    expect(h.row(1).style.gridTemplateColumns.startsWith('1fr')).toBe(false);
    expect(h.head()!.style.gridTemplateColumns.startsWith('1fr')).toBe(false);
  });

  it('puts the UPPER name above its cells and the LOWER name beneath', () => {
    // CA's instruction exactly, and the two directions have to be asserted separately: a card that put
    // both names first would satisfy any assertion about only one of them.
    const h = mount(NINE_BOLTS, NINE_RECORDED);

    expect(h.namePosition(1), 'the upper name comes FIRST, so its cells flow beneath it').toBe(0);
    expect(h.namePosition(2), 'the lower name comes LAST, so its cells flow above it').toBe(
      h.row(2).children.length - 1
    );
  });

  it('drops the PLAYER heading, which would now sit over a score column', () => {
    const h = mount(NINE_BOLTS, NINE_RECORDED);

    expect(h.head()!.textContent).not.toContain('PLAYER');
    expect(h.head()!.children).toHaveLength(9);
  });

  it('still names each row, so nothing is lost in the move', () => {
    const h = mount(NINE_BOLTS, NINE_RECORDED);

    expect(h.row(1).textContent).toContain('Rosalind Lem');
    expect(h.row(2).textContent).toContain('Derrick Ellul');
  });
});

describe('the formats that fit are left alone', () => {
  it.each([
    ['an empty best-of-three', 'SET3-S:6/TB7', undefined],
    ['a completed best-of-FIVE with a tiebreak column', BEST_OF_FIVE, FIVE_RECORDED]
  ])('%s stays inline, with the name in its own track', (_label, format, sets) => {
    // Six columns is the most conventional tennis can ask for — five sets plus one transient tiebreak —
    // so no racquet format should ever stack. This is the control: without it, a threshold set too low
    // would restructure every dialog in the library and every assertion above would still pass.
    const h = mount(format as string, sets as any);

    expect(h.row(1).dataset.stacked).toBe('false');
    expect(h.row(1).style.gridTemplateColumns.startsWith('1fr')).toBe(true);
    expect(h.namePosition(1)).toBe(0);
    expect(h.namePosition(2)).toBe(0);
  });

  it('keeps the PLAYER heading where the name has a column of its own', () => {
    const h = mount(BEST_OF_FIVE, FIVE_RECORDED);

    expect(h.head()!.textContent).toContain('PLAYER');
  });
});
