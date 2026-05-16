/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';

import { buildCourtGridSlot } from '../ui/courtGridSlot';
import { SchedulePageDragPayload, SchedulePageState } from '../types';

const HEADER = '.spl-center-header';
const TITLE = '.spl-center-title';
const ACTIONS = '.spl-center-actions';
const LEADING = '.spl-center-leading';
const GRID_SLOT = '.spl-grid-slot';

const makeButton = (label: string): HTMLButtonElement => {
  const b = document.createElement('button');
  b.textContent = label;
  return b;
};

const makeState = (): SchedulePageState =>
  ({
    selectedDate: '2026-05-11',
  }) as SchedulePageState;

describe('buildCourtGridSlot', () => {
  it('renders title with no actions container when headerActions omitted', () => {
    const panel = buildCourtGridSlot(undefined, {});
    const header = panel.element.querySelector(HEADER);
    expect(header).toBeTruthy();
    expect(header?.querySelector(TITLE)?.textContent).toBe('Court Grid');
    expect(header?.querySelector(ACTIONS)).toBeNull();
  });

  it('renders a single HTMLElement action inside the actions container', () => {
    const btn = makeButton('Print');
    const panel = buildCourtGridSlot(undefined, {}, { headerActions: btn });
    const container = panel.element.querySelector(ACTIONS);
    expect(container).toBeTruthy();
    expect(container?.children).toHaveLength(1);
    expect(container?.firstElementChild).toBe(btn);
  });

  it('renders an array of actions in the order provided', () => {
    const a = makeButton('A');
    const b = makeButton('B');
    const c = makeButton('C');
    const panel = buildCourtGridSlot(undefined, {}, { headerActions: [a, b, c] });
    const container = panel.element.querySelector(ACTIONS);
    expect(container?.children).toHaveLength(3);
    expect(Array.from(container!.children)).toEqual([a, b, c]);
  });

  it('forwards CATALOG_MATCHUP drops to onMatchUpDrop', () => {
    const onMatchUpDrop = vi.fn();
    const panel = buildCourtGridSlot(undefined, { onMatchUpDrop });
    const slot = panel.element.querySelector(GRID_SLOT) as HTMLElement;
    const payload: SchedulePageDragPayload = {
      type: 'CATALOG_MATCHUP',
      matchUp: { matchUpId: 'm1' } as any,
    };
    const dt = {
      getData: vi.fn().mockReturnValue(JSON.stringify(payload)),
      dropEffect: '',
    } as unknown as DataTransfer;
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: dt });
    slot.dispatchEvent(event);
    expect(onMatchUpDrop).toHaveBeenCalledTimes(1);
    expect(onMatchUpDrop.mock.calls[0][0]).toEqual(payload);
  });

  it('forwards GRID_MATCHUP drops to onMatchUpDrop', () => {
    const onMatchUpDrop = vi.fn();
    const panel = buildCourtGridSlot(undefined, { onMatchUpDrop });
    const slot = panel.element.querySelector(GRID_SLOT) as HTMLElement;
    const payload: SchedulePageDragPayload = {
      type: 'GRID_MATCHUP',
      matchUp: { matchUpId: 'm2' } as any,
      sourceCourt: 'c1',
      sourceTime: '09:00',
    };
    const dt = {
      getData: vi.fn().mockReturnValue(JSON.stringify(payload)),
      dropEffect: '',
    } as unknown as DataTransfer;
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: dt });
    slot.dispatchEvent(event);
    expect(onMatchUpDrop).toHaveBeenCalledTimes(1);
  });

  it('ignores drops with unparseable payload', () => {
    const onMatchUpDrop = vi.fn();
    const panel = buildCourtGridSlot(undefined, { onMatchUpDrop });
    const slot = panel.element.querySelector(GRID_SLOT) as HTMLElement;
    const dt = {
      getData: vi.fn().mockReturnValue('not-json'),
      dropEffect: '',
    } as unknown as DataTransfer;
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: dt });
    slot.dispatchEvent(event);
    expect(onMatchUpDrop).not.toHaveBeenCalled();
  });

  it('update(state) is a no-op that does not throw or mutate the header', () => {
    const btn = makeButton('Toggle');
    const panel = buildCourtGridSlot(undefined, {}, { headerActions: btn });
    const headerBefore = panel.element.querySelector(HEADER)?.innerHTML;
    expect(() => panel.update(makeState())).not.toThrow();
    const headerAfter = panel.element.querySelector(HEADER)?.innerHTML;
    expect(headerAfter).toBe(headerBefore);
  });

  it('appends the consumer-provided court grid element into the slot', () => {
    const grid = document.createElement('div');
    grid.dataset.testid = 'grid';
    const panel = buildCourtGridSlot(grid, {});
    expect(panel.element.querySelector('[data-testid="grid"]')).toBe(grid);
  });

  it('renders no leading container when titleLeadingActions omitted', () => {
    const panel = buildCourtGridSlot(undefined, {});
    expect(panel.element.querySelector(LEADING)).toBeNull();
  });

  it('renders titleLeadingActions before the title within a leading container', () => {
    const toggle = makeButton('Catalog');
    const panel = buildCourtGridSlot(undefined, {}, { titleLeadingActions: toggle });
    const leading = panel.element.querySelector(LEADING);
    expect(leading).toBeTruthy();
    expect(leading?.children).toHaveLength(2);
    expect(leading?.firstElementChild).toBe(toggle);
    expect(leading?.lastElementChild?.textContent).toBe('Court Grid');
  });

  it('supports titleLeadingActions and headerActions together', () => {
    const toggle = makeButton('Catalog');
    const print = makeButton('Print');
    const panel = buildCourtGridSlot(
      undefined,
      {},
      { titleLeadingActions: toggle, headerActions: print }
    );
    expect(panel.element.querySelector(LEADING)?.firstElementChild).toBe(toggle);
    expect(panel.element.querySelector(ACTIONS)?.firstElementChild).toBe(print);
  });
});
