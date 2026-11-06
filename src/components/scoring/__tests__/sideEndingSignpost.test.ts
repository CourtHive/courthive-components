// @vitest-environment happy-dom
/**
 * The per-side endings, signposted from the `Other…` menu.
 *
 * CA, 2026-11-05: *"users don't know how to find the walkover, retired, defaulted options... the (Other)
 * button can have those three options but when they're selected they HIGHLIGHT the down carets that are
 * next to the player names"*.
 *
 * The item records NOTHING. It arms a pick: both names highlight and the band asks which player. Clicking a
 * name records the ending against that row and opens its panel, exactly as finding the caret would have.
 */
import { describe, expect, it } from 'vitest';

import { matchUpStatusConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const { WALKOVER, RETIRED, DEFAULTED, CANCELLED } = matchUpStatusConstants;

const endings = () => document.querySelector('.chc-sec-endings') as HTMLElement;
const otherChip = () => endings().querySelector('button[data-action="other"]') as HTMLButtonElement;
const signpost = (status: string) =>
  endings().querySelector<HTMLButtonElement>(`.chc-sec-other-menu button[data-side-ending="${status}"]`);
const opener = (side: number) =>
  document.querySelector<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`)!;
const picking = () => [...document.querySelectorAll('button[data-picking="true"]')];
const rowEnding = () => document.querySelector<HTMLElement>('[data-row-ending]');
const band = () => document.querySelector<HTMLElement>('.chc-sec-band')!;

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

function open(extra: Record<string, unknown> = {}) {
  closeAll();
  openScoreEntryDialog({
    sides: [{ participantName: 'Lower' }, { participantName: 'Upper' }],
    matchUpFormat: 'SET3-S:6/TB7',
    ...extra
  } as any);
}

function arm(status: string) {
  otherChip().click();
  signpost(status)!.click();
}

describe('side endings in Other…', () => {
  it('lists Walkover, Retired and Defaulted above the match endings', () => {
    open();
    otherChip().click();

    const items = [...endings().querySelectorAll<HTMLElement>('.chc-sec-other-menu button')];
    const sideItems = items.filter((item) => item.dataset.sideEnding).map((item) => item.dataset.sideEnding);
    expect(sideItems).toEqual(expect.arrayContaining([WALKOVER, RETIRED, DEFAULTED]));
    // First in the menu, with the match endings after the divider.
    expect(items[0].dataset.sideEnding).toBeTruthy();
    expect(items.some((item) => item.dataset.ending === CANCELLED)).toBe(true);
    expect(endings().querySelector('.chc-sec-other-divider')).not.toBeNull();

    closeAll();
  });

  it('arms a pick: records nothing, highlights both names and asks in the band', () => {
    open();
    arm(WALKOVER);

    expect(endings().querySelector('.chc-sec-other-menu'), 'the menu closes').toBeNull();
    expect(picking()).toHaveLength(2);
    expect(rowEnding(), 'nothing recorded yet').toBeNull();
    expect(band().dataset.tone).toBe('pick');
    expect(band().textContent).toContain('Walkover');
    expect(document.querySelector<HTMLButtonElement>('.chc-sec-btn-primary')!.disabled, 'nothing to submit').toBe(true);
    // The chip does not claim a selection it does not hold.
    expect(otherChip().textContent).toBe('Other…');

    closeAll();
  });

  it('records the ending against the clicked player and opens their panel', () => {
    open();
    arm(WALKOVER);
    opener(2).click();

    expect(picking(), 'the highlight clears').toHaveLength(0);
    expect(rowEnding()?.dataset.rowEnding).toBe(WALKOVER);
    expect(rowEnding()?.closest<HTMLElement>('.chc-sec-row')?.dataset.side).toBe('2');
    const panel = document.querySelector<HTMLElement>('[data-panel-side="2"]');
    expect(panel, "that player's panel is open").not.toBeNull();
    expect(panel!.querySelector(`button[data-ending="${WALKOVER}"]`)?.getAttribute('aria-pressed')).toBe('true');
    expect(band().dataset.tone).not.toBe('pick');

    closeAll();
  });

  it('keeps an ending the clicked row already holds rather than toggling it off', () => {
    open();
    arm(WALKOVER);
    opener(1).click();
    arm(WALKOVER);
    opener(1).click();

    expect(rowEnding()?.dataset.rowEnding).toBe(WALKOVER);

    closeAll();
  });

  it('is abandoned by a click elsewhere, by Escape, or by reopening Other…', () => {
    open();
    arm(DEFAULTED);
    band().click();
    expect(picking()).toHaveLength(0);
    expect(band().dataset.tone).not.toBe('pick');
    expect(rowEnding()).toBeNull();

    arm(DEFAULTED);
    document
      .querySelector('.chc-sec')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(picking()).toHaveLength(0);
    expect(document.querySelector('.chc-sec'), 'Escape cancels the pick, not the dialog').not.toBeNull();

    arm(DEFAULTED);
    otherChip().click();
    expect(picking()).toHaveLength(0);
    expect(endings().querySelector('.chc-sec-other-menu'), 'and the menu opens as usual').not.toBeNull();

    closeAll();
  });

  it('refuses Retired before any score, on the same terms as the panel', () => {
    open();
    otherChip().click();

    expect(signpost(RETIRED)!.disabled).toBe(true);
    expect(signpost(WALKOVER)!.disabled).toBe(false);

    closeAll();
  });

  it('omits an ending the host has put out of scope', () => {
    open({ disabledMatchUpStatuses: [DEFAULTED] });
    otherChip().click();

    expect(signpost(DEFAULTED)).toBeNull();
    expect(signpost(WALKOVER)).not.toBeNull();

    closeAll();
  });
});
