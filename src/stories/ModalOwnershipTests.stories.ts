/**
 * Which modal a close belongs to, when modals stack.
 *
 * cModal keeps a stack of frames; each footer, click-away and `onClose` belongs to one frame. These plays
 * close modals the ways a user and a host do — a footer button, a click on the area around the dialog, a
 * host's `cModal.close()` — and check the right one goes. Moved from the retired happy-dom
 * `modalOwnership.test.ts`, whose click-away test clicked the PARENT's backdrop while the child modal
 * covered it: a click no pointer can make. Here every click lands where it is drawn.
 */
import { expect, fn, waitFor } from 'storybook/test';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Foundations/Modal/Tests/Ownership',
  tags: ['!dev']
};
export default meta;

const MODAL = 'section[id^="cmdl-"]';
const MENU_DROPDOWN = '.chc-modal-menu-dropdown';
const CLOSE_CHILD = 'Close child';
/** Longer than the 100 ms a header popover waits before listening for an outside click. */
const PAST_THE_LISTENER_DELAY = 200;

const sections = () => [...document.querySelectorAll<HTMLElement>(MODAL)];
const pastTheListenerDelay = () => new Promise((resolve) => setTimeout(resolve, PAST_THE_LISTENER_DELAY));

function closeAll(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>(`${MODAL} button`)].find(
    (candidate) => candidate.textContent === label
  );
  if (!found) throw new Error(`no "${label}" button`);
  return found;
}

/** A point in the area around a modal's dialog: inside its container's padding, outside the dialog. */
const AROUND_THE_DIALOG = { x: 6, y: 6 };
const container = (section: HTMLElement) => section.querySelector<HTMLElement>('.chc-modal-container')!;

const empty = () => document.createElement('div');

export const ReplacementOpenedByOnClose: StoryObj = {
  name: 'A modal opened by onClose stays, and the one closing is gone first',
  render: empty,
  play: async () => {
    closeAll();
    cModal.open({
      content: 'original',
      buttons: [{ label: 'Close original' }],
      onClose: () => cModal.open({ content: 'replacement' })
    });
    await user.click(button('Close original'));

    await expect(sections()).toHaveLength(1);
    await expect(sections()[0]).toHaveTextContent('replacement');
    await expect(sections()[0]).toBeVisible();
    await expect(document.body).not.toHaveTextContent('original');
    closeAll();
  }
};

export const NestedHandleOwnsItsCallback: StoryObj = {
  name: "Updating a nested handle's onClose changes only that modal's callback",
  render: empty,
  play: async () => {
    closeAll();
    const parent = fn();
    const child = fn();
    cModal.open({ content: 'parent', buttons: [{ label: 'Close parent' }], onClose: parent });
    const handle = cModal.open({ content: 'child', buttons: [{ label: CLOSE_CHILD }] });
    handle.update({ onClose: child });

    await user.click(button(CLOSE_CHILD));
    await expect(child).toHaveBeenCalledTimes(1);
    await expect(parent).not.toHaveBeenCalled();

    await user.click(button('Close parent'));
    await expect(parent).toHaveBeenCalledTimes(1);
    await expect(child).toHaveBeenCalledTimes(1);
    await expect(sections()).toHaveLength(0);
  }
};

export const TeardownSurvivesAThrowingCallback: StoryObj = {
  name: "A host's onClose that throws still leaves the page torn down",
  render: empty,
  play: async () => {
    closeAll();
    cModal.open({
      content: 'dialog',
      onClose: () => {
        throw new Error('host error');
      }
    });
    await expect(document.body, 'control: the page is frozen under the modal').toHaveClass('chc-body-freeze');

    // A host's own close, not a click: the error is the host's to catch, and a click would leave it uncaught.
    expect(() => cModal.close()).toThrow('host error');

    await expect(sections()).toHaveLength(0);
    await expect(document.body).not.toHaveClass('chc-body-freeze');
    await expect(document.getElementById('cmdl-backdrop')).not.toBeVisible();
  }
};

export const FooterClosesOnlyItsOwn: StoryObj = {
  name: 'A footer button closes only the modal it is in',
  render: empty,
  play: async () => {
    closeAll();
    cModal.open({ content: 'parent' });
    cModal.open({ content: 'child', buttons: [{ label: CLOSE_CHILD }] });
    await user.click(button(CLOSE_CHILD));

    await expect(sections()).toHaveLength(1);
    await expect(sections()[0]).toHaveTextContent('parent');
    await expect(sections()[0]).toBeVisible();
    closeAll();
  }
};

export const ClickAwayClosesTheTopModal: StoryObj = {
  name: 'A click around the dialog reaches only the top modal, and respects its clickAway',
  render: empty,
  play: async () => {
    closeAll();
    const parentClose = fn();
    const childClose = fn();
    cModal.open({ content: 'parent', onClose: parentClose });
    const child = cModal.open({ content: 'child', config: { clickAway: false }, onClose: childClose });
    const [lower, upper] = sections();

    // What a pointer reaches around the dialog is the TOP modal's container: the parent's is covered.
    const { left, top } = container(upper).getBoundingClientRect();
    const hit = document.elementFromPoint(left + AROUND_THE_DIALOG.x, top + AROUND_THE_DIALOG.y);
    await expect(hit).toBe(container(upper));
    await expect(container(lower).contains(hit)).toBe(false);

    await user.clickAt(container(upper), AROUND_THE_DIALOG);
    await expect(childClose, 'clickAway: false keeps the child').not.toHaveBeenCalled();
    await expect(parentClose).not.toHaveBeenCalled();
    await expect(sections()).toHaveLength(2);

    child.update({ config: { clickAway: true } });
    await user.clickAt(container(upper), AROUND_THE_DIALOG);
    await expect(childClose).toHaveBeenCalledTimes(1);
    await expect(parentClose).not.toHaveBeenCalled();
    await expect(sections()).toEqual([lower]);

    // control: with the child gone the parent's own click-away is reachable, and closes it
    await user.clickAt(container(lower), AROUND_THE_DIALOG);
    await expect(parentClose).toHaveBeenCalledTimes(1);
    await expect(sections()).toHaveLength(0);
  }
};

export const LowerFooterKeepsTheUpperPopover: StoryObj = {
  name: "Closing a lower modal from its footer keeps the upper modal's open menu, and its outside click",
  render: empty,
  play: async () => {
    closeAll();
    cModal.open({ content: 'parent', buttons: [{ label: 'Close lower' }] });
    cModal.open({
      title: 'Upper',
      content: 'upper',
      config: { menu: { menuItems: [{ label: 'Upper action', onClick: () => undefined }] } }
    });
    await user.click(document.querySelector<HTMLElement>('.chc-modal-menu-caret')!);
    await expect(document.querySelector(MENU_DROPDOWN)).toBeVisible();

    // The upper modal covers the lower footer from the pointer, but cModal does not trap focus, so a
    // keyboard user can still reach it. That is the one way this footer is pressed while covered.
    button('Close lower').focus();
    await user.keyboard('{Enter}');

    await expect(sections()).toHaveLength(1);
    await expect(sections()[0]).toHaveTextContent('upper');
    await expect(document.querySelector(MENU_DROPDOWN), "the upper modal's menu is not the lower's").toBeVisible();

    await pastTheListenerDelay();
    await user.click(sections()[0].querySelector('.chc-modal-title')!);
    await waitFor(() => expect(document.querySelector(MENU_DROPDOWN)).toBeNull());
    closeAll();
  }
};
