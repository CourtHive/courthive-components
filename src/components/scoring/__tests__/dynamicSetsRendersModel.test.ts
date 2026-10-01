// @vitest-environment happy-dom
/**
 * Dynamic Sets renders the MODEL — S3 of the state-engine extraction.
 *
 * Three things this phase changed that the behavioural suite could not see, pinned here:
 *
 *   1. the caret: two digits typed into one cell, with no re-focus between them, land in the SAME
 *      element — the `onChange` seam that keeps the input alive is still there;
 *   2. the two decisions that used to be read from the DOM — "is this cell empty", for the complement
 *      path and for Backspace — now come from the model. Proved by making the DOM lie: a field whose
 *      text disagrees with the model is decided by the model;
 *   3. note 9's ghost set is gone by construction: a cleared set 1 beside a typed set 2 shows both.
 */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { isComplete } from '../logic/scoreEntrySelectors';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

const STANDARD = 'SET3-S:6/TB7';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

function mount(over: { matchUpFormat?: string; sets?: any[]; smartComplements?: boolean } = {}) {
  document.body.innerHTML = '';
  const matchUpFormat = over.matchUpFormat ?? STANDARD;
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sideNames: [SIDES[0].participantName, SIDES[1].participantName],
    sets: over.sets,
    smartComplements: over.smartComplements,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);
  const cell = (side: number, set: number) => q<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

  /** Type into a cell the way a browser does: set the value, dispatch `input`. */
  const type = (side: number, set: number, value: string) => {
    const input = cell(side, set);
    if (!input) throw new Error(`no cell for side ${side} set ${set}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  };

  const press = (input: HTMLInputElement, code: string, key = code.slice(-1)) => {
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
  };

  return { card, region, q, cell, type, press, band: () => q<HTMLElement>('.chc-sec-band') };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the caret survives two digits in one cell', () => {
  it('types a second digit into the same element, with no re-focus between them', () => {
    // A timed bolt, where two digits are the ordinary case and no complement reveals a column.
    const h = mount({ matchUpFormat: 'SET3X-S:T10' });
    const first = h.cell(2, 1)!;

    h.type(2, 1, '2');
    h.type(2, 1, '22');

    expect(h.cell(2, 1), 'the element is the one the operator is typing into').toBe(first);
    expect(first.value).toBe('22');
    expect(h.region.getSets()).toEqual([]);
  });

  it('refuses the second digit where the format cannot reach it, and leaves the element alone', () => {
    const h = mount({ smartComplements: false });
    const first = h.cell(2, 1)!;

    h.type(2, 1, '1');
    h.type(2, 1, '10');

    expect(h.cell(2, 1)).toBe(first);
    expect(first.value, 'a set to six cannot hold a ten').toBe('1');
  });
});

describe('"is this cell empty" is the model\'s answer, not the field\'s', () => {
  it('a digit typed into a cell the MODEL holds empty complements, though the field shows stale text', () => {
    const h = mount();
    const first = h.cell(1, 1)!;

    // The DOM lies: text in the field that never reached the model through an input event.
    first.value = '6';
    h.press(first, 'Digit3');

    // The model said empty, so the keystroke was the first digit into the set: 3, complemented to 6.
    expect(h.cell(1, 1)!.value).toBe('3');
    expect(h.cell(2, 1)!.value).toBe('6');
  });

  it('Backspace steps back only when the MODEL holds the cell empty', () => {
    const h = mount({ smartComplements: false });
    h.type(2, 1, '4');
    h.type(1, 1, '6');

    // The model holds 6 here. Empty the field WITHOUT an input event, so only the DOM thinks it is empty.
    const upper = h.cell(1, 1)!;
    upper.value = '';
    h.press(upper, 'Backspace', 'Backspace');
    expect(document.activeElement, 'the model holds a 6, so Backspace does not jump').toBe(upper);

    // Now the model really is empty, and the field shows stale text instead.
    h.type(1, 1, '');
    upper.value = '6';
    h.press(upper, 'Backspace', 'Backspace');
    expect(document.activeElement, 'the model holds nothing, so Backspace steps back').toBe(h.cell(2, 1));
  });
});

describe('note 9 — a cleared set no longer hides the one typed after it', () => {
  it('clearing set 1 of 6-2 6-2 leaves both columns on screen, with set 2 still holding its score', () => {
    const h = mount({ smartComplements: false });
    h.type(1, 1, '6');
    h.type(2, 1, '2');
    h.type(1, 2, '6');
    h.type(2, 2, '2');
    expect(h.band()?.textContent).toContain('Rosalind Lem def.');

    h.type(1, 1, '');
    h.type(2, 1, '');

    expect(h.cell(1, 2), 'the second set is still on screen').toBeTruthy();
    expect(h.cell(1, 2)!.value).toBe('6');
    expect(h.cell(2, 2)!.value).toBe('2');
    // And nothing claims a finished result: the first set has no score, and the band says so.
    expect(h.region.error?.()).toBe('1st set: has no score');
    expect(isComplete(h.region.store.get())).toBe(false);
    expect(h.band()?.textContent).not.toContain('def.');
  });
});
