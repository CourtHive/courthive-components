/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';

import { buildVenueBoard } from '../ui/venueBoard';
import { ProfileStoreState } from '../types';

const HEADER = '.sp-panel-header';
const TITLE = '.sp-panel-title';
const META = '.sp-panel-meta';
const ACTIONS = '.sp-panel-actions';
const BOARD = '.sp-board';

const makeButton = (label: string): HTMLButtonElement => {
  const b = document.createElement('button');
  b.textContent = label;
  return b;
};

const makeState = (overrides: Partial<ProfileStoreState> = {}): ProfileStoreState =>
  ({
    venues: [],
    selectedDate: null,
    schedulableDates: [],
    activeDates: [],
    profileDraft: { dates: [] },
    issueIndex: { counts: { total: { ERROR: 0, WARN: 0, INFO: 0 }, byVenue: {}, byDate: {} }, byKey: {} },
    ruleResults: [],
    selectedLocator: null,
    catalogSearchQuery: '',
    catalogGroupBy: 'event',
    leftCollapsed: false,
    ...overrides
  }) as ProfileStoreState;

const callbacks = {
  onDrop: vi.fn(),
  onCardClick: vi.fn()
};

describe('buildVenueBoard', () => {
  it('renders title with no actions container when headerActions omitted', () => {
    const panel = buildVenueBoard(callbacks);
    const header = panel.element.querySelector(HEADER);
    expect(header).toBeTruthy();
    expect(header?.querySelector(TITLE)?.textContent).toBe('Day Plan');
    expect(header?.querySelector(ACTIONS)).toBeNull();
  });

  it('no longer renders the "Selected: <date>" meta', () => {
    const panel = buildVenueBoard(callbacks);
    panel.update(makeState({ selectedDate: '2026-05-11' }));
    expect(panel.element.querySelector(META)).toBeNull();
  });

  it('renders a single HTMLElement action inside the actions container', () => {
    const btn = makeButton('Save');
    const panel = buildVenueBoard(callbacks, { headerActions: btn });
    const container = panel.element.querySelector(ACTIONS);
    expect(container).toBeTruthy();
    expect(container?.children).toHaveLength(1);
    expect(container?.firstElementChild).toBe(btn);
  });

  it('renders an array of actions in the order provided', () => {
    const a = makeButton('Save');
    const b = makeButton('Apply Times');
    const c = makeButton('Apply Grid');
    const d = makeButton('Clear');
    const panel = buildVenueBoard(callbacks, { headerActions: [a, b, c, d] });
    const container = panel.element.querySelector(ACTIONS);
    expect(container?.children).toHaveLength(4);
    expect(Array.from(container!.children)).toEqual([a, b, c, d]);
  });

  it('still renders the board after update', () => {
    const panel = buildVenueBoard(callbacks);
    panel.update(makeState());
    expect(panel.element.querySelector(BOARD)).toBeTruthy();
  });

  it('update() does not recreate or remove the actions container', () => {
    const btn = makeButton('Save');
    const panel = buildVenueBoard(callbacks, { headerActions: btn });
    const containerBefore = panel.element.querySelector(ACTIONS);
    panel.update(makeState({ selectedDate: '2026-05-11' }));
    const containerAfter = panel.element.querySelector(ACTIONS);
    expect(containerAfter).toBe(containerBefore);
    expect(containerAfter?.firstElementChild).toBe(btn);
  });
});
