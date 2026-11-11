/**
 * The `Other…` chip in the real dialog: its menu opening, recording, renaming and closing, and — what the
 * unit suite could not see — WHERE the menu lands.
 *
 * CA, 2026-09-30: *"The (Other) chip is not working on any of the stories"*. It always worked; it could
 * not be seen. The menu sits in `.chc-sec-body`, which scrolls, inside `.chc-sec`, which clips, so it is
 * placed `position: fixed` against its chip (`placeEndingsMenu`). That placement reads `offsetHeight`,
 * which is 0 without layout, and the unit test could only check the inline `top`/`bottom` it wrote. Here
 * the page is resized to a short viewport and the menu's rendered box is measured against it.
 *
 * The stylesheet half — exactly one `.chc-sec-other-menu` rule, setting no `bottom` — stays a node test
 * in `scoring/__tests__/otherChipRecordsAnEnding.test.ts`.
 */
import { closeAllModals, dialogLauncher, inModal, inModalOrNull, openFrom } from './helpers/scoreEntryDialogLauncher';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

import type { Meta, StoryObj } from '@storybook/html-vite';

const { CANCELLED, SUSPENDED, ABANDONED, INCOMPLETE, DEAD_RUBBER } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Other Chip',
  tags: ['!dev']
};
export default meta;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const MENU = '.chc-sec-other-menu';
const EXPANDED = 'aria-expanded';
const PRESSED = 'aria-pressed';

/**
 * Found by its ACTION, not its text: the chip renames itself to whatever was chosen, so a locator reading
 * "Other" stops finding it the moment the thing under test has worked. Re-queried on every call, because
 * `render()` replaces the chip on each state change — the false alarm of 2026-09-30 was a probe holding the
 * old element and reading its stale `aria-expanded`.
 */
const otherChip = () => inModal<HTMLButtonElement>('.chc-sec-endings button[data-action="other"]');
const menu = () => inModalOrNull<HTMLElement>(MENU);
const menuItem = (status: string) => inModal<HTMLButtonElement>(`${MENU} button[data-ending="${status}"]`);
const band = () => inModal('.chc-sec-band');

const launcher = () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT }));

export const OpensItsMenu: StoryObj = {
  name: 'Opens a menu of the endings that have no button of their own',
  render: launcher,
  play: async ({ canvasElement }) => {
    await openFrom(canvasElement);
    try {
      await expect(menu(), 'closed to begin with').toBeNull();
      await expect(otherChip().getAttribute(EXPANDED)).toBe('false');

      await user.click(otherChip());

      await expect(menu()).toBeVisible();
      await expect(menu()!.checkVisibility()).toBe(true);
      const offered = [...menu()!.querySelectorAll<HTMLElement>('button[data-ending]')].map(
        (item) => item.dataset.ending
      );
      await expect(offered.toSorted((a, b) => a!.localeCompare(b!))).toEqual(
        [CANCELLED, ABANDONED, INCOMPLETE, DEAD_RUBBER].toSorted((a, b) => a.localeCompare(b))
      );
      await expect(otherChip().getAttribute(EXPANDED)).toBe('true');
      // The click re-renders the card and replaces the chip; focus must follow to the new one, or a
      // keyboard operator who opened the menu with Enter is dropped on the body, outside the menu.
      await expect(otherChip()).toHaveFocus();
      await user.tab();
      await expect(menu()!.contains(document.activeElement), 'Tab from the chip enters the menu').toBe(true);
    } finally {
      closeAllModals();
    }
  }
};

export const RecordsClosesAndPresses: StoryObj = {
  name: 'Records the chosen ending, closes, and shows the chip as pressed',
  render: launcher,
  play: async ({ canvasElement }) => {
    const launched = await openFrom(canvasElement);
    try {
      await user.click(otherChip());
      await user.click(menuItem(CANCELLED));

      await expect(band()).toHaveTextContent('Cancelled');
      await expect(menu(), 'the menu closes behind the choice').toBeNull();
      await expect(otherChip().getAttribute(PRESSED), 'and the chip carries the selection').toBe('true');
      await expect(otherChip().getAttribute(EXPANDED)).toBe('false');
      // On the chip that now names the choice, as the `c` shortcut leaves it.
      await expect(otherChip()).toHaveFocus();

      // And it is what Submit sends.
      await user.click(inModal('button[data-action="submit"]'));
      await expect(launched.submitted.at(-1)?.matchUpStatus).toBe(CANCELLED);
    } finally {
      closeAllModals();
    }
  }
};

export const RenamesItself: StoryObj = {
  name: 'Renames itself "Other: Cancelled", with no aria-label, and back — CA, 2026-09-30',
  render: launcher,
  play: async ({ canvasElement }) => {
    await openFrom(canvasElement);
    try {
      await expect(otherChip().textContent).toBe('Other…');

      await user.click(otherChip());
      await user.click(menuItem(CANCELLED));

      await expect(otherChip().textContent).toBe('Other: Cancelled');
      // The text says both what the control is and what is chosen, so the content is the accessible name
      // (WCAG 2.5.3 Label in Name); an override would have to contain the visible label.
      await expect(otherChip().getAttribute('aria-label')).toBeNull();
      await expect(otherChip()).toHaveAccessibleName('Other: Cancelled');

      // Every control in this card is a toggle.
      await user.click(otherChip());
      await user.click(menuItem(CANCELLED));
      await expect(otherChip().textContent).toBe('Other…');
      await expect(otherChip().getAttribute(PRESSED)).toBe('false');
    } finally {
      closeAllModals();
    }
  }
};

export const DoesNotEchoAPrivilegedEnding: StoryObj = {
  name: 'Does not echo an ending that has its own button',
  render: launcher,
  play: async ({ canvasElement }) => {
    await openFrom(canvasElement);
    try {
      // SUSPENDED shows itself on its own chip; an echo here would read as two selections.
      await user.click(inModal(`.chc-sec-endings button[data-ending="${SUSPENDED}"]`));

      await expect(inModal(`.chc-sec-endings button[data-ending="${SUSPENDED}"]`).getAttribute(PRESSED)).toBe('true');
      await expect(otherChip().textContent).toBe('Other…');
      await expect(otherChip().getAttribute(PRESSED)).toBe('false');
    } finally {
      closeAllModals();
    }
  }
};

export const TogglesShut: StoryObj = {
  name: 'Toggles shut when the chip is pressed again',
  render: launcher,
  play: async ({ canvasElement }) => {
    await openFrom(canvasElement);
    try {
      await user.click(otherChip());
      await expect(menu()).toBeVisible();

      await user.click(otherChip());

      await expect(menu()).toBeNull();
      await expect(otherChip().getAttribute(EXPANDED)).toBe('false');
      await expect(band().dataset.tone, 'nothing was recorded on the way').toBe('neutral');
    } finally {
      closeAllModals();
    }
  }
};

/** The menu's whole box inside the viewport, and not collapsed to a sliver between two offsets. */
async function expectWithinViewport(label: string): Promise<DOMRect> {
  const placed = menu();
  await expect(placed, `${label}: no menu`).not.toBeNull();
  const box = placed!.getBoundingClientRect();
  await expect(getComputedStyle(placed!).position, label).toBe('fixed');
  await expect(box.top, `${label}: clipped at the top`).toBeGreaterThanOrEqual(0);
  await expect(box.left, `${label}: clipped at the left`).toBeGreaterThanOrEqual(0);
  await expect(box.bottom, `${label}: clipped at the bottom`).toBeLessThanOrEqual(window.innerHeight);
  await expect(box.right, `${label}: clipped at the right`).toBeLessThanOrEqual(window.innerWidth);
  // Collapsed is what CA saw as "about 2px of the top": every item must have its own height.
  const items = [...placed!.querySelectorAll<HTMLElement>('button')];
  await expect(items.length).toBeGreaterThan(3);
  for (const item of items) await expect(item.getBoundingClientRect().height, label).toBeGreaterThan(20);
  // A capped menu scrolls rather than hiding what does not fit.
  if (placed!.scrollHeight > placed!.clientHeight + 1) {
    await expect(getComputedStyle(placed!).overflowY, `${label}: capped but not scrollable`).toBe('auto');
  }
  return box;
}

/**
 * Tab from the chip through the menu to its last item, which scrolls a capped menu, and check that item is
 * what is DRAWN at its centre — on screen and covered by nothing in the dialog.
 */
async function expectLastItemReachable(label: string): Promise<void> {
  const items = [...menu()!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const last = items.at(-1)!;
  for (let presses = 0; presses < items.length + 2 && document.activeElement !== last; presses += 1) {
    await user.tab();
  }
  await expect(last, `${label}: Tab never reached the last item`).toHaveFocus();
  const box = last.getBoundingClientRect();
  await expect(box.bottom, `${label}: the last item is off screen`).toBeLessThanOrEqual(window.innerHeight);
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  await expect(last.contains(hit), `${label}: the last item is covered`).toBe(true);
}

export const MenuStaysOnScreenNearTheBottom: StoryObj = {
  name: 'On a short viewport, with the chip near the bottom edge, the whole menu stays on screen',
  render: launcher,
  play: async ({ canvasElement, step }) => {
    const before = { width: window.innerWidth, height: window.innerHeight };
    /** Which placements the heights reached, so a run that never exercised the cramped case cannot pass. */
    const reached = new Set<string>();
    try {
      for (const height of [1400, 900, 700, 560, 480, 420]) {
        await step(`${height}px tall`, async () => {
          await user.viewport(1280, height);
          await openFrom(canvasElement);
          const chip = otherChip().getBoundingClientRect();
          await user.click(otherChip());
          const box = await expectWithinViewport(`${height}px`);
          await expectLastItemReachable(`${height}px`);
          // Against its chip on one side or the other: below when there is room, above when not.
          const below = box.top >= chip.bottom;
          await expect(below || box.bottom <= chip.top, `${height}px: the menu overlaps its chip`).toBe(true);
          reached.add(below ? 'below' : 'above');
          if (menu()!.scrollHeight > menu()!.clientHeight + 1) reached.add('capped');
          closeAllModals();
        });
      }
      // 1400px has room below; 900 and 700 only above; from 560 down, neither, so the menu is capped.
      await expect([...reached].toSorted((a, b) => a.localeCompare(b))).toEqual(['above', 'below', 'capped']);
    } finally {
      closeAllModals();
      await user.viewport(before.width, before.height);
    }
  }
};

/**
 * Re-rendering with the menu open must not leave the menu it replaced tracking the window.
 *
 * Changing the format rebuilds the card without closing the menu. A scroll/resize listener that outlived
 * its menu would keep repositioning a detached element on every resize — a leak per dialog opened. So the
 * replaced and the closed menus are each marked, the window is resized for real, and neither is moved,
 * while the menu that is open follows its chip.
 */
/**
 * Resize the page and wait for the window's `resize` to have been delivered. A listener registered here runs
 * after every listener the card registered earlier, so once it has run, a leaked one has had its turn.
 */
async function resizeTo(width: number, height: number): Promise<void> {
  const delivered = new Promise((resolve) => globalThis.addEventListener('resize', resolve, { once: true }));
  await user.viewport(width, height);
  await delivered;
}

export const ReplacedMenusStopTracking: StoryObj = {
  name: 'A menu replaced by a re-render, or closed, is never repositioned again',
  render: launcher,
  play: async ({ canvasElement }) => {
    const before = { width: window.innerWidth, height: window.innerHeight };
    const MARK = '-4321px';
    try {
      await user.viewport(1280, 1400);
      const launched = await openFrom(canvasElement);
      await user.click(otherChip());

      const replaced: HTMLElement[] = [];
      for (const format of ['SET1-S:6/TB7', 'SET3-S:6NOAD/TB7', FORMAT]) {
        replaced.push(menu()!);
        launched.dialog!.setMatchUpFormat(format);
        await expect(menu(), `still open after ${format}`).not.toBeNull();
        await expect(menu()).not.toBe(replaced.at(-1));
      }
      for (const stale of replaced) {
        await expect(stale.isConnected).toBe(false);
        stale.style.top = MARK;
      }

      await resizeTo(1100, 1300);
      // The live one follows its chip: within a pixel of 6px beneath it, at its left edge.
      await waitFor(() => {
        const chip = otherChip().getBoundingClientRect();
        const box = menu()!.getBoundingClientRect();
        expect(Math.abs(box.left - chip.left)).toBeLessThan(1);
        expect(box.top).toBeGreaterThan(chip.bottom);
      });
      for (const stale of replaced) await expect(stale.style.top, 'a replaced menu was moved').toBe(MARK);

      const closed = menu()!;
      await user.click(otherChip());
      await expect(menu()).toBeNull();
      closed.style.top = MARK;
      await resizeTo(1280, 820);
      await expect(closed.style.top, 'the closed menu was moved').toBe(MARK);
    } finally {
      closeAllModals();
      await user.viewport(before.width, before.height);
    }
  }
};
