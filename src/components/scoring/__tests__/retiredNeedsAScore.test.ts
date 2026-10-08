/**
 * @vitest-environment happy-dom
 *
 * Retired is offered only once a score is present (CA, 2026-10-08).
 *
 * A retirement keeps the score that was played; with nothing played there is nothing to keep, and the
 * result would be a walkover wearing the wrong name. The rule lives in the card's `endingOffered`, so
 * all three approaches, the side panel and the `r` shortcut share it. A default stays offered: a player
 * can be defaulted before the first ball.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { createDialPadRegion } from '../regions/dialPadRegion';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

const { RETIRED, WALKOVER, DEFAULTED } = matchUpStatusConstants;
const FORMAT = 'SET3-S:6/TB7';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

function mount() {
  document.body.innerHTML = '';
  const region = createDialPadRegion({ matchUpFormat: FORMAT, onChange: () => card.refresh() });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat: FORMAT, region });
  document.body.append(card.element);
  const q = <T extends Element>(s: string) => card.element.querySelector<T>(s);
  return {
    card,
    press: (digit: number) => q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click(),
    endedEarly: (side: number) =>
      q<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`)?.click(),
    option: (side: number, status: string) =>
      q<HTMLButtonElement>(`[data-panel-side="${side}"] button[data-ending="${status}"]`),
    type: (key: string) =>
      card.element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
    rowEnding: () => q<HTMLElement>('[data-row-ending]')?.dataset.rowEnding,
    clear: () => q<HTMLButtonElement>('button[data-action="clear"]')?.click()
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Retired needs a score', () => {
  it('is disabled with nothing entered, and says why; Walkover and Default stay offered', () => {
    const h = mount();
    h.endedEarly(2);
    expect(h.option(2, RETIRED)?.disabled).toBe(true);
    expect(h.option(2, RETIRED)?.title).toMatch(/no score yet/i);
    expect(h.option(2, WALKOVER)?.disabled).toBe(false);
    expect(h.option(2, DEFAULTED)?.disabled).toBe(false);
  });

  it('the r shortcut records nothing without a score', () => {
    const h = mount();
    h.type('r');
    expect(h.rowEnding()).toBeUndefined();
    expect(h.card.getState().sideEnding).toBeUndefined();
  });

  it('is offered once any games are entered, and records', () => {
    const h = mount();
    h.press(4);
    h.endedEarly(2);
    expect(h.option(2, RETIRED)?.disabled).toBe(false);
    h.option(2, RETIRED)?.click();
    expect(h.rowEnding()).toBe(RETIRED);
  });

  it('is withdrawn again when the score is cleared', () => {
    const h = mount();
    h.press(4);
    h.endedEarly(2);
    expect(h.option(2, RETIRED)?.disabled).toBe(false);
    h.clear();
    if (!h.option(2, RETIRED)) h.endedEarly(2);
    expect(h.option(2, RETIRED)?.disabled).toBe(true);
  });
});
