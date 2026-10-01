// @vitest-environment happy-dom
/**
 * Free Score renders the MODEL — S4 of the state-engine extraction.
 *
 * The region is a boundary: the field keeps its text, the model takes the sets the text parses to.
 * What that brings to typed text, pinned here, is the model's two invariants and its integrity check —
 * none of which the parser applies. And what it must NOT do: destroy a half-typed field, or turn a
 * parsed ending into a selection that locks the field it was typed into.
 */
import { createFreeScoreRegion } from '../regions/freeScoreRegion';
import { isComplete, error } from '../logic/scoreEntrySelectors';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

const FORMAT = 'SET3-S:6/TB7';
const FIELD = 'input[data-free-score]';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

function mount(initialText?: string) {
  document.body.innerHTML = '';
  const region = createFreeScoreRegion({ matchUpFormat: FORMAT, initialText, onChange: () => card.refresh() });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat: FORMAT, region });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);
  const type = (value: string) => {
    const field = q<HTMLInputElement>(FIELD);
    if (!field) throw new Error('no field');
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return field;
  };

  return {
    region,
    q,
    type,
    field: () => q<HTMLInputElement>(FIELD),
    band: () => q<HTMLElement>('.chc-sec-band'),
    submit: () => q<HTMLButtonElement>('button[data-action="submit"]')
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the field keeps its text; the model keeps the sets', () => {
  it('a half-typed ending keeps the text in the field and the sets in the model', () => {
    const h = mount();
    const field = h.type('6-4 re');

    expect(field.value, "the field is the operator's, mid-word").toBe('6-4 re');
    expect(h.region.getSets()).toMatchObject([{ side1Score: 6, side2Score: 4 }]);
    expect(h.region.getText()).toBe('6-4 re');
  });

  it('text that parses to nothing leaves the model empty and the text alone', () => {
    const h = mount();
    h.type('6-4');
    expect(h.region.getSets()).toHaveLength(1);

    const field = h.type('6-');
    expect(field.value).toBe('6-');
    expect(h.region.getSets()).toEqual([]);
    expect(h.region.hasEntry()).toBe(true);
  });

  it('a keystroke that changes no set is not a transition', () => {
    const h = mount();
    h.type('6-4 6-3');
    const before = h.region.getSets();

    h.type('6-4 6-3 ');
    expect(h.region.getSets()).toEqual(before);
  });
});

describe("the model's rules reach typed text", () => {
  it('note 10A: an unfinished set inside a decided match does not submit, though the parser calls it complete', () => {
    // Measured 2026-10-01: `parseScore('4-2 2-6 2-6')` answers `matchComplete: true`. The old region
    // handed that straight to the card.
    const h = mount();
    h.type('4-2 2-6 2-6');

    expect(h.submit()?.disabled).toBe(true);
    expect(error(h.region.store.get())).toBe('1st set: is not finished');
    expect(isComplete(h.region.store.get())).toBe(false);
  });

  it('note 10B: a set beyond the decider is not kept', () => {
    const h = mount();
    h.type('6-2 6-2 6-3');

    expect(h.region.getSets()).toHaveLength(2);
    expect(h.band()?.textContent).toContain('6-2 6-2');
    expect(h.band()?.textContent).not.toContain('6-3');
    expect(h.submit()?.disabled).toBe(false);
  });

  it('a set the format cannot produce is refused in the band, not quietly accepted', () => {
    // The parser accepts `3-7` as a set won by side 2. The factory, through the model, does not.
    const h = mount();
    h.type('3-7');

    expect(error(h.region.store.get())).toMatch(/1st set: .*must be at least 5/);
    expect(h.submit()?.disabled).toBe(true);
  });
});

describe('a parsed ending is reported, not selected', () => {
  it('a typed "wo" does not lock the field it was typed into', () => {
    const h = mount();
    const field = h.type('wo');

    expect(h.region.matchUpStatus?.()).toBe('WALKOVER');
    expect(field.disabled).toBe(false);
    // And it can still be typed over, which a locked field could not be.
    expect(h.type('6-4').value).toBe('6-4');
    expect(h.region.matchUpStatus?.()).toBeUndefined();
  });

  it('a retirement after a finished score keeps the score and reports the ending', () => {
    const h = mount();
    h.type('6-4 6-3 ret');

    expect(h.region.getSets()).toHaveLength(2);
    expect(h.region.matchUpStatus?.()).toBe('RETIRED');
    // The sets are a finished score; the CARD, not the model, applies the parser's rule that a reported
    // ending means the text is not claiming one. The model answers for the score alone.
    expect(isComplete(h.region.store.get())).toBe(true);
  });
});
