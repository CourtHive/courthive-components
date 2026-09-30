// @vitest-environment happy-dom
/**
 * A walkover carries no score, so while one is selected the score cannot be TYPED.
 *
 * CA, 2026-09-29: *"when I open a modal that already has a WALKOVER I shouldn't also then be able to
 * enter a score, because a WALKOVER by definition can have no score."*
 *
 * The card already knew: it dropped the score at submit and the band said "no score recorded". What
 * it did not do was refuse the entry, so an operator could type a set and watch it be discarded
 * silently. Saying it afterwards is not the same as not accepting it.
 */
import { describe, expect, it } from 'vitest';

import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const FORMAT = 'SET3-S:6/TB7';

const modal = () => [...document.querySelectorAll<HTMLElement>('section[id^="cmdl-"]')].pop();
const inModal = <T extends HTMLElement>(selector: string) => modal()?.querySelector<T>(selector) as T;
const cells = () => [...(modal()?.querySelectorAll<HTMLInputElement>('input.chc-sec-set-input') ?? [])];
const card = () => inModal<HTMLElement>('[data-component="scoreEntryCard"]');

function closeAll() {
  for (let attempt = 0; attempt < 5 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
}

function open(over: Record<string, any> = {}) {
  closeAll();
  return openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, ...over } as any);
}

describe('a selected walkover locks score entry', () => {
  it('opens LOCKED on a recorded walkover', () => {
    open({ matchUp: { matchUpFormat: FORMAT, matchUpStatus: 'WALKOVER', winningSide: 1, score: { sets: [] } } });

    expect(cells().length, 'the cells are still rendered — dimmed, not removed').toBeGreaterThan(0);
    expect(
      cells().every((input) => input.disabled),
      'and every one of them is disabled'
    ).toBe(true);
    expect(card().dataset.scoreLocked).toBe('true');

    closeAll();
  });

  it('locks when a walkover is chosen, and UNLOCKS when it is taken back', () => {
    open();
    expect(
      cells().every((input) => !input.disabled),
      'a blank card is enterable'
    ).toBe(true);

    // `w` records a walkover against the LOWER participant — the card's own shortcut.
    card().dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    expect(card().dataset.scoreLocked).toBe('true');
    expect(cells().every((input) => input.disabled)).toBe(true);

    // The way out. A lock with no way back is a trap, so the ending controls stay live and pressing
    // the same key again clears it.
    card().dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    expect(card().dataset.scoreLocked).toBe('false');
    expect(
      cells().every((input) => !input.disabled),
      'and the score is enterable again'
    ).toBe(true);

    closeAll();
  });

  it('does NOT lock for a retirement, which keeps its score', () => {
    open();

    // `r` is a retirement. It is the whole reason the lock is keyed on "carries no score" rather than
    // on "has an ending": a retirement at 6-4 2-1 must still be typed.
    card().dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));

    expect(card().dataset.scoreLocked).toBe('false');
    expect(cells().every((input) => !input.disabled)).toBe(true);

    closeAll();
  });

  it("does not lock Free Score out of the operator's own sentence", () => {
    open({ approach: 'freeScore' });

    const field = inModal<HTMLInputElement>('.chc-sec-score-region input, .chc-sec-score-region textarea');
    expect(field, 'Free Score has a field').toBeTruthy();

    // A walkover written as text. The region REPORTS the ending, and locking on a reported one would
    // disable the field the operator is typing into — mid-sentence, on what it has parsed so far.
    field.value = 'w/o';
    field.dispatchEvent(new Event('input', { bubbles: true }));

    expect(field.disabled, 'the field the operator is using stays usable').toBe(false);

    closeAll();
  });
});
