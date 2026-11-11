/**
 * The modal's header popovers (info and menu) close on a click outside them, through a document listener
 * attached 100 ms after opening. Closing a popover, by any path, must cancel that listener whether it is
 * attached yet or not: a pending one attaches itself to whatever document exists 100 ms later (the 6.4.1
 * publish run failed on `document is not defined` from exactly that timer).
 *
 * Behaviour first — an outside click closes, and a click inside the dialog still counts as outside the
 * popover, which a capture-phase listener is for. What a leaked listener changes is invisible, so the
 * close paths are also checked by counting the popovers' capture-phase document listeners still attached
 * once the delay has passed. Moved from the retired happy-dom `popoverListeners.test.ts`; the timing rule
 * itself is a node test of `helpers/outsideClick.ts`.
 */
import { expect, spyOn, waitFor } from 'storybook/test';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Foundations/Modal/Tests/Popovers',
  tags: ['!dev']
};
export default meta;

const MODAL = 'section[id^="cmdl-"]';
/** Longer than the 100 ms a popover waits before listening for an outside click. */
const PAST_THE_LISTENER_DELAY = 200;
const INFO = 'about this dialog';

const pastTheListenerDelay = () => new Promise((resolve) => setTimeout(resolve, PAST_THE_LISTENER_DELAY));

function closeAll(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

function openModal(): void {
  closeAll();
  cModal.open({
    title: 'Popovers',
    content: 'content',
    buttons: [{ label: 'Done' }],
    config: { info: INFO, menu: { menuItems: [{ label: 'Rotate', onClick: () => undefined }] } }
  } as any);
}

const caret = () => document.querySelector<HTMLElement>('.chc-modal-menu-caret')!;
const menu = () => document.querySelector<HTMLElement>('.chc-modal-menu-dropdown');
const menuItem = () => document.querySelector<HTMLElement>('.chc-modal-menu-item')!;
const infoIcon = () => [...document.querySelectorAll<HTMLElement>(`${MODAL} span`)].find((s) => s.textContent === '?')!;
const infoPopover = () =>
  [...document.querySelectorAll<HTMLElement>('[data-modal-popover]')].find((p) => p.textContent?.includes(INFO));
const title = () => document.querySelector<HTMLElement>(`${MODAL} .chc-modal-title`)!;
const done = () =>
  [...document.querySelectorAll<HTMLButtonElement>(`${MODAL} button`)].find((b) => b.textContent === 'Done')!;

/**
 * The capture-phase click listeners added to the document while `run` goes, and not yet removed. The
 * popovers are the only capture-phase click listeners a modal adds.
 */
async function stillListening(run: () => Promise<void>): Promise<number> {
  const add = spyOn(document, 'addEventListener');
  const remove = spyOn(document, 'removeEventListener');
  try {
    await run();
    await pastTheListenerDelay();
    const captureClicks = (calls: unknown[][]) =>
      calls.filter(([type, , options]) => type === 'click' && options === true).map(([, listener]) => listener);
    const removed = new Set(captureClicks(remove.mock.calls));
    return captureClicks(add.mock.calls).filter((listener) => !removed.has(listener)).length;
  } finally {
    add.mockRestore();
    remove.mockRestore();
  }
}

const empty = () => document.createElement('div');

export const OutsideClickClosesTheMenu: StoryObj = {
  name: 'An open menu closes on a click elsewhere in the dialog, and stops listening',
  render: empty,
  play: async () => {
    openModal();
    let attached = await stillListening(async () => {
      await user.click(caret());
      await expect(menu(), 'the opening click does not close it').toBeVisible();
    });
    await expect(attached, 'control: an open menu listens').toBe(1);

    attached = await stillListening(async () => {
      // Inside the dialog, which stops the click bubbling: only a capture-phase listener hears it.
      await user.click(title());
      await waitFor(() => expect(menu()).toBeNull());
    });
    await expect(attached).toBe(0);
    closeAll();
  }
};

export const OutsideClickClosesTheInfo: StoryObj = {
  name: 'The info popover closes on a click elsewhere in the dialog',
  render: empty,
  play: async () => {
    openModal();
    await user.click(infoIcon());
    await expect(infoPopover()).toBeVisible();
    await pastTheListenerDelay();
    await user.click(title());
    await waitFor(() => expect(infoPopover()).toBeUndefined());
    closeAll();
  }
};

export const EveryCloseStopsListening: StoryObj = {
  name: 'Every way a popover closes leaves no listener behind, attached or pending',
  render: empty,
  play: async () => {
    openModal();
    await expect(
      await stillListening(async () => {
        await user.click(caret());
        await user.click(menuItem());
        await expect(menu()).toBeNull();
      }),
      'choosing a menu item'
    ).toBe(0);

    await expect(
      await stillListening(async () => {
        await user.click(caret());
        await user.click(caret());
        await expect(menu()).toBeNull();
      }),
      'toggling the menu shut with its caret'
    ).toBe(0);

    await expect(
      await stillListening(async () => {
        await user.click(infoIcon());
        await user.click(infoIcon());
        await expect(infoPopover()).toBeUndefined();
      }),
      'toggling the info shut with its icon'
    ).toBe(0);

    await expect(
      await stillListening(async () => {
        await user.click(caret());
        await user.click(done());
        await expect(document.querySelector(MODAL)).toBeNull();
      }),
      'closing the modal with the menu open'
    ).toBe(0);
    await expect(menu(), 'the menu went with its modal').toBeNull();

    openModal();
    await expect(
      await stillListening(async () => {
        await user.click(infoIcon());
        await pastTheListenerDelay();
        await user.click(done());
      }),
      'closing the modal with the info open, its listener attached'
    ).toBe(0);
    await expect(infoPopover(), 'the info went with its modal').toBeUndefined();
  }
};
