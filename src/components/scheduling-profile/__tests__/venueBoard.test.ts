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
const LEADING = '.sp-panel-leading';
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

  it('renders no leading container when titleLeadingActions omitted', () => {
    const panel = buildVenueBoard(callbacks);
    expect(panel.element.querySelector(LEADING)).toBeNull();
  });

  it('renders titleLeadingActions before the title within a leading container', () => {
    const toggle = makeButton('Catalog');
    const panel = buildVenueBoard(callbacks, { titleLeadingActions: toggle });
    const leading = panel.element.querySelector(LEADING);
    expect(leading).toBeTruthy();
    // The leading container holds [toggle, title] in that order
    expect(leading?.children).toHaveLength(2);
    expect(leading?.firstElementChild).toBe(toggle);
    expect(leading?.lastElementChild?.textContent).toBe('Day Plan');
  });

  it('renders an array of titleLeadingActions in the order provided', () => {
    const a = makeButton('A');
    const b = makeButton('B');
    const panel = buildVenueBoard(callbacks, { titleLeadingActions: [a, b] });
    const leading = panel.element.querySelector(LEADING);
    expect(leading?.children).toHaveLength(3); // a, b, title
    expect(Array.from(leading!.children).slice(0, 2)).toEqual([a, b]);
  });

  it('supports titleLeadingActions and headerActions together', () => {
    const toggle = makeButton('Catalog');
    const save = makeButton('Save');
    const panel = buildVenueBoard(callbacks, {
      titleLeadingActions: toggle,
      headerActions: save
    });
    expect(panel.element.querySelector(LEADING)?.firstElementChild).toBe(toggle);
    expect(panel.element.querySelector(ACTIONS)?.firstElementChild).toBe(save);
  });
});
