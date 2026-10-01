// @vitest-environment happy-dom
/**
 * Notes 11/12 — the tiebreak as a RAISED digit, and a finished set as its result.
 *
 * CA, 2026-09-30: *"when a set is complete ... not show the entry fields and show the tiebreak score
 * 7-6(3) on the low score side as 6^3 (the 3 is superscript) ... This is how the Tournament Desk
 * score entry modal behaves"*; *"the free score and dial pad should be using superscript for the
 * tiebreak score (and only show the lower tiebreak score via superscript)"*; and on the way back in,
 * *"the way back in is simply clicking the completed representation of the set."* Go-ahead to build
 * it, with the harness changes it implies, 2026-10-01.
 *
 * A render over a model that already knows which sets are settled; no new state. The set UNDER EDIT
 * never folds, which is what keeps a bolt's second digit landing in the cell being typed into.
 */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../regions/freeScoreRegion';
import { createDialPadRegion } from '../regions/dialPadRegion';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

const FORMAT = 'SET3-S:6/TB7';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

function mountSets(over: { matchUpFormat?: string; sets?: any[] } = {}) {
  document.body.innerHTML = '';
  const matchUpFormat = over.matchUpFormat ?? FORMAT;
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets: over.sets,
    smartComplements: false,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);
  const cell = (side: number, set: number) => q<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
  const done = (side: number, set: number) =>
    q<HTMLButtonElement>(`button[data-done-side="${side}"][data-done-set="${set}"]`);
  const type = (side: number, set: number, value: string) => {
    const input = cell(side, set);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const tb = (side: number, set: number) =>
    q<HTMLInputElement>(`input[data-tiebreak-side="${side}"][data-tiebreak-set="${set}"]`);
  const typeTb = (side: number, set: number, value: string) => {
    const input = tb(side, set)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return { card, q, cell, done, type, tb, typeTb };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a finished set shows its result, not its fields', () => {
  it('folds the moment its tiebreak is known: 7 above 6 with a raised 3, inputs hidden', () => {
    const h = mountSets();
    h.type(1, 1, '7');
    h.type(2, 1, '6');
    h.typeTb(1, 1, '7');
    // Mid-tiebreak the set is still the operator's: fields showing, nothing folded.
    expect(h.done(1, 1)?.hidden).toBe(true);
    expect(h.cell(1, 1).hidden).toBe(false);

    h.typeTb(2, 1, '3');

    expect(h.done(1, 1)?.textContent).toBe('7');
    expect(h.done(2, 1)?.textContent, 'the games with the raised points').toBe('63');
    expect(h.done(2, 1)?.querySelector('sup')?.textContent).toBe('3');
    expect(h.done(1, 1)?.querySelector('sup'), 'nothing raised beside the winner').toBeNull();
    expect(h.cell(1, 1).hidden).toBe(true);
    expect(h.cell(2, 1).hidden).toBe(true);
    expect(h.done(2, 1)?.getAttribute('aria-label')).toContain('tiebreak 3');
  });

  it('opens on a saved score already folded, with the set in progress open', () => {
    const h = mountSets({
      sets: [
        { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 },
        { setNumber: 2, side1Score: 2, side2Score: 1 }
      ]
    });

    expect(h.done(2, 1)?.textContent).toBe('63');
    expect(h.done(1, 2)?.hidden, 'an unfinished set keeps its fields').toBe(true);
    expect(h.cell(1, 2).hidden).toBe(false);
  });

  it('clicking the completed representation is the way back in', () => {
    const h = mountSets({
      sets: [
        { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
      ]
    });
    expect(h.done(2, 1)?.hidden).toBe(false);

    h.done(2, 1)?.click();

    expect(h.done(2, 1)?.hidden, 'folded no more').toBe(true);
    expect(h.cell(2, 1).hidden).toBe(false);
    expect(h.cell(2, 1).value).toBe('6');
    expect(h.tb(1, 1), 'and its tiebreak column is back for correction').toBeTruthy();
    expect(document.activeElement).toBe(h.cell(2, 1));
  });

  it('never folds the set under edit, so a timed bolt takes its second digit', () => {
    const h = mountSets({ matchUpFormat: 'SET3X-S:T10' });
    h.type(2, 1, '21');
    h.type(1, 1, '2');
    // 2-21 is a finished bolt by the format's lights; it is also the one being typed into.
    expect(h.done(1, 1)?.hidden).toBe(true);

    h.type(1, 1, '22');
    expect(h.cell(1, 1).value).toBe('22');
    expect(h.cell(1, 1).hidden).toBe(false);
  });

  it('a set with no tiebreak folds to its games alone', () => {
    const h = mountSets();
    h.type(1, 1, '6');
    h.type(2, 1, '4');
    h.type(2, 2, '1');

    expect(h.done(1, 1)?.textContent).toBe('6');
    expect(h.done(2, 1)?.textContent).toBe('4');
    expect(h.done(2, 1)?.querySelector('sup')).toBeNull();
  });
});

describe('the readouts raise only the LOWER points', () => {
  const SEVEN_SIX_THREE = [
    { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
  ];

  function readouts(region: any, matchUpFormat = FORMAT) {
    document.body.innerHTML = '';
    const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
    document.body.append(card.element);
    return (side: number) => card.element.querySelector<HTMLElement>(`[data-readout-side="${side}"]`);
  }

  it('Dial Pad: 7 above 6 with a raised 3, and nothing beside the 7', () => {
    const readout = readouts(createDialPadRegion({ matchUpFormat: FORMAT, sets: SEVEN_SIX_THREE }));

    expect(readout(1)?.textContent).toBe('7');
    expect(readout(2)?.textContent).toBe('63');
    expect(readout(2)?.querySelector('sup')?.textContent).toBe('3');
    expect(readout(1)?.querySelector('sup')).toBeNull();
    expect(readout(2)?.getAttribute('aria-label')).toBe('Side 2: 6 tiebreak 3');
  });

  it('Free Score: the same, from typed text', () => {
    const readout = readouts(createFreeScoreRegion({ matchUpFormat: FORMAT, initialText: '7-6(3) 6-4' }));

    expect(readout(2)?.textContent).toBe('63  4');
    expect(readout(2)?.querySelector('sup')?.textContent).toBe('3');
    expect(readout(1)?.textContent).toBe('7  6');
  });

  it('a match tiebreak reads plainly — its cells ARE the points', () => {
    const readout = readouts(
      createDialPadRegion({
        matchUpFormat: 'SET1-S:TB10',
        sets: [
          { setNumber: 1, side1Score: 0, side2Score: 0, side1TiebreakScore: 10, side2TiebreakScore: 8, winningSide: 1 }
        ]
      }),
      'SET1-S:TB10'
    );

    expect(readout(1)?.textContent).toBe('10');
    expect(readout(2)?.textContent).toBe('8');
    expect(readout(2)?.querySelector('sup')).toBeNull();
  });
});
