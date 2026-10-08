// @vitest-environment happy-dom
/**
 * The Dial Pad does not move on from a set that is not finished (CA, 2026-10-08).
 *
 * Under `SET3-S:6/TB7` the keypad accepted `5-1 1-4 3-3`: Submit rightly refused it, but every tap after
 * the `5-1` was wasted work the operator could not see was wasted. Now a finished set is the condition
 * for starting the next one, and the Tiebreak key is offered only once a set's games can carry one.
 */
import { createDialPadRegion } from '../regions/dialPadRegion';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

const FORMAT = 'SET3-S:6/TB7';
const TIEBREAK = 'button[data-action="tiebreak"]';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

function dialPad(matchUpFormat = FORMAT) {
  document.body.innerHTML = '';
  const region = createDialPadRegion({ matchUpFormat, onChange: () => card.refresh() });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  document.body.append(card.element);
  const q = <T extends Element>(s: string) => card.element.querySelector<T>(s);
  return {
    press: (digit: number) => q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click(),
    tiebreak: () => q<HTMLButtonElement>(TIEBREAK),
    band: () => q<HTMLElement>('.chc-sec-band')?.textContent ?? '',
    readout: (side: number) => q<HTMLElement>(`[data-readout-side="${side}"]`)?.textContent ?? '',
    submit: () => q<HTMLButtonElement>('button[data-action="submit"]')
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the Dial Pad holds on an unfinished set', () => {
  it('after 5-1 the keypad goes quiet: no second set starts', () => {
    const h = dialPad();
    h.press(1);
    h.press(5);
    expect(h.band()).toContain('5-1');

    // the taps that used to begin set two
    h.press(4);
    h.press(1);
    expect(h.band()).toContain('5-1');
    expect(h.band()).not.toContain('1-4');
    expect(h.readout(1)).not.toContain('1');
  });

  it('6-7 waits for its tiebreak before the next set can start', () => {
    const h = dialPad();
    h.press(7); // lower row
    h.press(6); // upper row: 6-7, a tiebreak set with no points yet
    expect(h.band()).toContain('6-7');

    h.press(3);
    expect(h.band()).not.toContain('3');

    h.tiebreak()?.click();
    h.press(4); // the loser's points: 6-7(4)
    expect(h.band()).toContain('6-7(4)');
    // tiebreak mode stays on (points can run to two digits); leaving it is the operator's toggle
    h.tiebreak()?.click();
    h.press(4);
    h.press(6);
    expect(h.band()).toContain('6-7(4) 6-4');
  });

  it('a finished set still lets the next one start', () => {
    const h = dialPad();
    for (const digit of [4, 6, 3, 6]) h.press(digit);
    expect(h.band()).toContain('6-4');
    expect(h.band()).toContain('6-3');
    expect(h.submit()?.disabled).toBe(false);
  });
});

describe('the Tiebreak key is offered only when a set can carry one', () => {
  it('is disabled with no games, after 5-1, after a finished 6-4 and at 6-6; enabled at 7-6', () => {
    const h = dialPad();
    expect(h.tiebreak()?.disabled).toBe(true);

    h.press(1);
    h.press(5);
    expect(h.tiebreak()?.disabled).toBe(true);

    document.body.innerHTML = '';
    const g = dialPad();
    g.press(4);
    g.press(6);
    expect(g.tiebreak()?.disabled).toBe(true);

    document.body.innerHTML = '';
    const t = dialPad();
    t.press(6);
    t.press(7);
    expect(t.tiebreak()?.disabled).toBe(false);

    document.body.innerHTML = '';
    // at six-all the tiebreak is being PLAYED: there is no result to type yet (the Dynamic Sets rule)
    const level = dialPad();
    level.press(6);
    level.press(6);
    expect(level.tiebreak()?.disabled).toBe(true);
  });

  it('a match tiebreak set never offers the key: its cells are the points', () => {
    const h = dialPad('SET1-S:TB10');
    expect(h.tiebreak()?.disabled).toBe(true);
  });
});
