// @vitest-environment happy-dom
/**
 * The `Other…` chip, and what could and could not be measured about it.
 *
 * CA, 2026-09-30: *"The (Other) chip is not working on any of the stories, even the 'Other =>
 * Cancelled and the score it clears' story."*
 *
 * Driven here, it works: the menu opens, it offers the four non-privileged endings, choosing one
 * records it, the menu closes and the chip reads as pressed. So the BEHAVIOUR is not the defect, and
 * this file exists to keep saying so — if it ever stops working for a reason a test can see, that
 * reason will be named here rather than guessed at again.
 *
 * What a test in this repo cannot see is LAYOUT. happy-dom has none, and the cause is layout: the
 * menu is clipped away by the scrolling body it sits in. The fix is in `scoreEntryCard.css`, where it
 * is explained in full; it needs an eye in Storybook, because nothing here can confirm it.
 *
 * One thing that was NOT a defect, checked before being "fixed": `aria-expanded` read `false` on a
 * first probe. The chip sets it correctly — `render()` replaces the button, so the probe was holding
 * the old element. Re-queried, it is right. Asserted below so the same false alarm is not raised
 * twice.
 */
import { describe, expect, it } from 'vitest';

import { matchUpStatusConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const { CANCELLED } = matchUpStatusConstants;

const endings = () => document.querySelector('.chc-sec-endings') as HTMLElement;
const otherChip = () =>
  [...endings().querySelectorAll('button')].find((b) => (b.textContent ?? '').startsWith('Other')) as HTMLButtonElement;
const menu = () => endings().querySelector('.chc-sec-other-menu');
const band = () => document.querySelector('.chc-sec-band')?.textContent ?? '';

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

function open() {
  closeAll();
  openScoreEntryDialog({
    sides: [{ participantName: 'Lower' }, { participantName: 'Upper' }],
    matchUpFormat: 'SET3-S:6/TB7'
  } as any);
}

describe('the Other… chip', () => {
  it('opens a menu of the endings that do not get their own button', () => {
    open();
    expect(menu(), 'closed to begin with').toBeNull();

    otherChip().click();

    const offered = [...endings().querySelectorAll<HTMLElement>('.chc-sec-other-menu button')].map(
      (item) => item.dataset.ending
    );
    expect(offered).toContain(CANCELLED);
    expect(offered.length).toBeGreaterThan(1);

    // Re-queried, because `render()` replaces the chip on every state change. The first probe of this
    // held a stale element and read `false`, which looked like a defect and was not one.
    expect(otherChip().getAttribute('aria-expanded')).toBe('true');

    closeAll();
  });

  it('records the chosen ending, closes, and shows the chip as pressed', () => {
    open();
    otherChip().click();

    endings().querySelector<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${CANCELLED}"]`)!.click();

    expect(band()).toContain('Cancelled');
    expect(menu(), 'the menu closes behind the choice').toBeNull();
    expect(otherChip().getAttribute('aria-pressed'), 'and the chip carries the selection').toBe('true');

    closeAll();
  });

  it('toggles shut when the chip is pressed again', () => {
    open();
    otherChip().click();
    expect(menu()).not.toBeNull();

    otherChip().click();

    expect(menu()).toBeNull();
    expect(otherChip().getAttribute('aria-expanded')).toBe('false');

    closeAll();
  });
});
