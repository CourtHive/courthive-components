/**
 * The deferred outside-click listener behind the format picker's dropdowns and the modal's header
 * popovers, against a plain EventTarget. Whether a cancel left a timer behind is a node question: the
 * 6.4.0 and 6.4.1 publish runs failed on `document is not defined` from a timer that outlived its popover.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listenForOutsideClick } from '../outsideClick';

let target: EventTarget;
const click = () => target.dispatchEvent(new Event('click'));

beforeEach(() => {
  vi.useFakeTimers();
  target = new EventTarget();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('listenForOutsideClick', () => {
  it('hears nothing until the delay has passed, then every click', () => {
    const listener = vi.fn();
    listenForOutsideClick(listener, { target, delay: 100 });

    click();
    vi.advanceTimersByTime(99);
    click();
    expect(listener, 'the opening click and anything inside the delay are ignored').not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    click();
    click();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('defaults to a 100 ms delay', () => {
    const listener = vi.fn();
    listenForOutsideClick(listener, { target });
    vi.advanceTimersByTime(99);
    click();
    expect(listener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    click();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cancelled before the delay, it never attaches and leaves no timer behind', () => {
    const listener = vi.fn();
    const cancel = listenForOutsideClick(listener, { target });
    expect(vi.getTimerCount(), 'control: the attach is pending').toBe(1);

    cancel();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    click();
    expect(listener).not.toHaveBeenCalled();
  });

  it('cancelled after the delay, it stops listening', () => {
    const listener = vi.fn();
    const cancel = listenForOutsideClick(listener, { target });
    vi.advanceTimersByTime(100);
    click();
    expect(listener, 'control: attached').toHaveBeenCalledTimes(1);

    cancel();
    click();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled twice', () => {
    const cancel = listenForOutsideClick(vi.fn(), { target });
    cancel();
    expect(() => cancel()).not.toThrow();
  });

  it('listens in the phase it was asked for, and removes from that phase', () => {
    const add = vi.spyOn(target, 'addEventListener');
    const remove = vi.spyOn(target, 'removeEventListener');
    const cancel = listenForOutsideClick(vi.fn(), { target, capture: true });
    vi.advanceTimersByTime(100);
    cancel();

    expect(add).toHaveBeenCalledWith('click', expect.any(Function), true);
    const added = add.mock.calls[0][1];
    expect(remove).toHaveBeenCalledWith('click', added, true);
  });
});
