// @vitest-environment happy-dom
/**
 * The picker's dropdowns close on a click outside them. That listener is attached 100 ms after opening,
 * so the opening click does not close the dropdown at once. Closing a dropdown must cancel that pending
 * attach: otherwise a dropdown closed within 100 ms still attaches its listener later, which then closes
 * the next dropdown on any click, and in tests the timer fires after the DOM is torn down (the 6.4.0
 * publish run failed on `document is not defined` from exactly this timer).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeCurrentDropdown, createDropdown } from '../dropdowns';

const OPEN = '.dropdown.is-active';

function open(label: string): HTMLElement {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  createDropdown({ target: trigger } as unknown as Event, [{ text: label, onClick: () => undefined }]);
  return document.querySelector<HTMLElement>(OPEN)!;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  closeCurrentDropdown();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('dropdowns', () => {
  it('a click outside closes the open dropdown once its listener is attached', () => {
    open('first');
    vi.advanceTimersByTime(100);
    document.body.click();
    expect(document.querySelector(OPEN)).toBeNull();
  });

  it('closing a dropdown cancels its pending listener, so it cannot close the next one', () => {
    open('first');
    closeCurrentDropdown();
    const second = open('second');
    vi.advanceTimersByTime(100);
    second.click();
    expect(document.querySelector(OPEN), 'a click inside the second dropdown keeps it open').toBe(second);
  });

  it('closing before the listener is attached leaves no timer behind', () => {
    open('first');
    closeCurrentDropdown();
    expect(vi.getTimerCount()).toBe(0);
  });
});
