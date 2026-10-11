// @vitest-environment happy-dom
/**
 * The modal's header popovers (info and menu) close on a click outside them, through a document listener
 * attached 100 ms after opening. Closing a popover, by any path, must cancel that listener whether it is
 * attached yet or not. A pending one left behind attaches itself to whatever document exists 100 ms
 * later: the 6.4.1 publish run failed on `document is not defined` from exactly that timer, after a test
 * chose a menu item and its file ended.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cModal } from '../cmodal';

let attached: Set<unknown>;

/** The capture-phase click listeners on the document that came from the popovers and are still attached. */
const outsideClickListeners = () => attached.size;

function openModal(): void {
  cModal.open({
    title: 'Popovers',
    content: 'content',
    config: { info: 'about this dialog', menu: { menuItems: [{ label: 'Rotate', onClick: () => undefined }] } }
  } as any);
}

const caret = () => document.querySelector<HTMLElement>('.chc-modal-menu-caret')!;
const menuItem = () => document.querySelector<HTMLElement>('.chc-modal-menu-item');
const infoIcon = () => [...document.querySelectorAll<HTMLElement>('span')].find((span) => span.textContent === '?')!;

beforeEach(() => {
  vi.useFakeTimers();
  attached = new Set();
  const add = document.addEventListener.bind(document);
  const remove = document.removeEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation((type: string, listener: any, options?: any) => {
    if (type === 'click' && options === true) attached.add(listener);
    add(type, listener, options);
  });
  vi.spyOn(document, 'removeEventListener').mockImplementation((type: string, listener: any, options?: any) => {
    if (type === 'click' && options === true) attached.delete(listener);
    remove(type, listener, options);
  });
  openModal();
});

afterEach(() => {
  cModal.close();
  vi.runOnlyPendingTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('the menu', () => {
  it('control: an open menu listens for an outside click, which closes it and stops listening', () => {
    caret().click();
    vi.advanceTimersByTime(100);
    expect(outsideClickListeners()).toBe(1);
    document.body.click();
    expect(menuItem()).toBeNull();
    expect(outsideClickListeners()).toBe(0);
  });

  it('choosing an item before the listener is attached leaves none to attach', () => {
    caret().click();
    menuItem()!.click();
    vi.advanceTimersByTime(100);
    expect(outsideClickListeners()).toBe(0);
  });

  it('toggling it shut with the caret leaves no listener', () => {
    caret().click();
    caret().click();
    vi.advanceTimersByTime(100);
    expect(outsideClickListeners()).toBe(0);
  });

  it('closing the modal with the menu open leaves no listener, attached or pending', () => {
    caret().click();
    cModal.close();
    vi.advanceTimersByTime(100);
    expect(outsideClickListeners()).toBe(0);
  });
});

describe('the info popover', () => {
  it('toggling it shut before the listener is attached leaves none to attach', () => {
    infoIcon().click();
    infoIcon().click();
    vi.advanceTimersByTime(100);
    expect(outsideClickListeners()).toBe(0);
  });

  it('closing the modal with it open leaves no listener', () => {
    infoIcon().click();
    vi.advanceTimersByTime(100);
    expect(outsideClickListeners()).toBe(1);
    cModal.close();
    expect(outsideClickListeners()).toBe(0);
  });
});
