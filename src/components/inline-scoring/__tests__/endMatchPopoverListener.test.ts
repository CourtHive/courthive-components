// @vitest-environment happy-dom
/**
 * The inline end-match popover closes on a click outside it, through a document listener attached on
 * the next tick so the opening click does not close it. Closing the popover, by choosing a status or by
 * opening another, must cancel that listener whether it is attached yet or not, so no closed popover
 * attaches one afterwards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderInlineScoringEntry } from '../../scoring/approaches/inlineScoringApproach';

const POPOVER = '.chc-live-chip-popover';
const POPOVER_ITEM = '.chc-live-chip-popover-item';

let attached: Set<unknown>;
const outsideClickListeners = () => attached.size;

function mount(): void {
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderInlineScoringEntry({
    matchUp: {
      matchUpId: 'm1',
      matchUpFormat: 'SET3-S:6/TB7',
      matchUpStatus: 'TO_BE_PLAYED',
      sides: [
        { sideNumber: 1, participant: { participantName: 'Alice' } },
        { sideNumber: 2, participant: { participantName: 'Bob' } }
      ]
    },
    container,
    onScoreChange: () => undefined,
    labels: {}
  } as any);
}

/** Open the end-match popover from a side's status pill. */
function openPopover(): void {
  const live = [...document.querySelectorAll('abbr')].find((abbr) => abbr.textContent === 'LIVE');
  const pill = (live?.closest('div') ?? live) as HTMLElement;
  if (!pill) throw new Error('no LIVE pill to open the popover from');
  pill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  attached = new Set();
  const add = document.addEventListener.bind(document);
  const remove = document.removeEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation((type: string, listener: any, options?: any) => {
    if (type === 'click' && options === undefined) attached.add(listener);
    add(type, listener, options);
  });
  vi.spyOn(document, 'removeEventListener').mockImplementation((type: string, listener: any, options?: any) => {
    if (type === 'click' && options === undefined) attached.delete(listener);
    remove(type, listener, options);
  });
  mount();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('the end-match popover', () => {
  it('control: an open popover listens for an outside click, which closes it and stops listening', () => {
    openPopover();
    vi.advanceTimersByTime(0);
    expect(outsideClickListeners()).toBe(1);
    document.body.click();
    expect(document.querySelector(POPOVER)).toBeNull();
    expect(outsideClickListeners()).toBe(0);
  });

  it('choosing a status before the listener is attached leaves none to attach', () => {
    openPopover();
    document.querySelector<HTMLElement>(POPOVER_ITEM)!.click();
    vi.advanceTimersByTime(0);
    expect(outsideClickListeners()).toBe(0);
  });

  it('opening it again before the listener is attached leaves only the new one', () => {
    openPopover();
    openPopover();
    vi.advanceTimersByTime(0);
    expect(document.querySelectorAll(POPOVER)).toHaveLength(1);
    expect(outsideClickListeners()).toBe(1);
  });
});
