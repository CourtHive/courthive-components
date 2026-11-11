/**
 * Scheduling Profile — Venue Board header play-function tests.
 *
 * The Day Plan header: the title, consumer-owned actions on the right and consumer-owned leading actions
 * before the title. The consumer keeps live refs to its buttons and mutates them directly, so the board
 * must place THOSE elements, keep them across `update()`, and never rebuild the header. Moved from
 * happy-dom, where the same checks ran without layout; here the placement is measured too.
 *
 * Run as tests: `pnpm test:stories src/stories/scheduling-profile/VenueBoardTests.stories.ts`
 */
import { buildVenueBoard } from '../../components/scheduling-profile/ui/venueBoard';
import type { ProfileStoreState } from '../../components/scheduling-profile/types';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn, within } from 'storybook/test';

const meta: Meta = {
  title: 'Scheduling/Scheduling Profile/Tests/Venue Board',
  tags: ['!dev']
};
export default meta;

const HEADER = '.sp-panel-header';
const TITLE = '.sp-panel-title';
const META = '.sp-panel-meta';
const ACTIONS = '.sp-panel-actions';
const LEADING = '.sp-panel-leading';
const BOARD = '.sp-board';

const state = (overrides: Partial<ProfileStoreState> = {}): ProfileStoreState =>
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

const button = (label: string): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  return b;
};

const callbacks = { onDrop: fn(), onCardClick: fn() };

const save = button('Save');
const four = [button('Save'), button('Apply Times'), button('Apply Grid'), button('Clear')];
const toggle = button('Catalog');
const leadingPair = [button('A'), button('B')];
const bothToggle = button('Catalog');
const bothSave = button('Save');

type Board = ReturnType<typeof buildVenueBoard>;
const boards: Record<string, Board> = {};

export const HeaderStructure: StoryObj = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: flex; flex-direction: column; gap: 16px; padding: 16px; background: var(--sp-bg);';
    const variants: Record<string, Board> = {
      bare: buildVenueBoard(callbacks),
      single: buildVenueBoard(callbacks, { headerActions: save }),
      array: buildVenueBoard(callbacks, { headerActions: four }),
      leading: buildVenueBoard(callbacks, { titleLeadingActions: toggle }),
      leadingArray: buildVenueBoard(callbacks, { titleLeadingActions: leadingPair }),
      both: buildVenueBoard(callbacks, { titleLeadingActions: bothToggle, headerActions: bothSave })
    };
    for (const [name, board] of Object.entries(variants)) {
      boards[name] = board;
      board.element.dataset.variant = name;
      board.update(state());
      wrap.appendChild(board.element);
    }
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const header = (name: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-variant="${name}"]`)!.querySelector<HTMLElement>(HEADER)!;
    const left = (el: Element) => el.getBoundingClientRect().left;

    // Bare: the title alone.
    await expect(header('bare').querySelector(TITLE)?.textContent).toBe('Day Plan');
    await expect(within(header('bare')).getByText('Day Plan')).toBeVisible();
    await expect(header('bare').querySelector(ACTIONS)).toBeNull();
    await expect(header('bare').querySelector(LEADING)).toBeNull();

    // The "Selected: <date>" meta is gone, even with a selected date.
    boards.bare.update(state({ selectedDate: '2026-05-11' }));
    await expect(canvasElement.querySelector(`[data-variant="bare"] ${META}`)).toBeNull();

    // One action, kept by identity, right of the title.
    const singleActions = header('single').querySelector<HTMLElement>(ACTIONS)!;
    await expect([...singleActions.children]).toEqual([save]);
    await expect(save).toBeVisible();
    await expect(left(save)).toBeGreaterThan(header('single').querySelector(TITLE)!.getBoundingClientRect().right);

    // Four actions, in the order given, laid out left to right.
    await expect([...header('array').querySelector<HTMLElement>(ACTIONS)!.children]).toEqual(four);
    const lefts = four.map(left);
    await expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);

    // Leading: [toggle, title], the toggle painted first.
    const leading = header('leading').querySelector<HTMLElement>(LEADING)!;
    await expect([...leading.children].map((el) => el.textContent)).toEqual(['Catalog', 'Day Plan']);
    await expect(leading.firstElementChild).toBe(toggle);
    await expect(left(toggle)).toBeLessThan(left(leading.lastElementChild!));

    // An array of leading actions keeps its order, title last.
    const pair = header('leadingArray').querySelector<HTMLElement>(LEADING)!;
    await expect(pair.children).toHaveLength(3);
    await expect([...pair.children].slice(0, 2)).toEqual(leadingPair);

    // Both slots together.
    await expect(header('both').querySelector(LEADING)?.firstElementChild).toBe(bothToggle);
    await expect(header('both').querySelector(ACTIONS)?.firstElementChild).toBe(bothSave);
    await expect(bothToggle).toBeVisible();
    await expect(bothSave).toBeVisible();

    // update() rebuilds the board, never the header: same actions container, same consumer button.
    const containerBefore = header('single').querySelector(ACTIONS);
    const boardBefore = boards.single.element.querySelector(BOARD);
    boards.single.update(state({ selectedDate: '2026-05-11' }));
    await expect(header('single').querySelector(ACTIONS)).toBe(containerBefore);
    await expect(header('single').querySelector(ACTIONS)?.firstElementChild).toBe(save);
    await expect(boards.single.element.querySelector(BOARD)).toBe(boardBefore);
    await expect(boardBefore).not.toBeNull();
  }
};
