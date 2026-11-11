/**
 * Schedule Page — MatchUp Catalog card lifecycle, in a real DOM.
 *
 * Which store writes rebuild the cards is unit-tested in `__tests__/matchUpCatalogRebuild.test.ts`
 * (`sameCatalogCardInputs`, `catalogRenderGroups`). These plays pin what a node test cannot: that a
 * selection moves the highlight on the SAME card elements (and runs no `renderCardExtra`), and that a
 * real click on a group header collapses it through the store, with `aria-expanded` following.
 *
 * Run as tests: `pnpm test:stories src/stories/schedule-page/MatchUpCatalogTests.stories.ts`
 */
import { buildMatchUpCatalog } from '../../components/schedule-page/ui/matchUpCatalog';
import { SchedulePageStore } from '../../components/schedule-page';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, waitFor } from 'storybook/test';
import { user } from '../helpers/trustedUser';

import type { CatalogMatchUpItem } from '../../components/schedule-page';

const meta: Meta = {
  title: 'Scheduling/Schedule Page/Tests/MatchUp Catalog',
  tags: ['!dev']
};
export default meta;

const item = (matchUpId: string, eventName: string): CatalogMatchUpItem => ({
  matchUpId,
  eventId: eventName,
  eventName,
  drawId: `${eventName}-D`,
  structureId: `${eventName}-S`,
  roundNumber: 1,
  isScheduled: false,
  sides: [{ participantName: `${matchUpId}-a` }, { participantName: `${matchUpId}-b` }]
});

const CATALOG = [
  item('A1', 'Alpha'),
  item('A2', 'Alpha'),
  item('A3', 'Alpha'),
  item('B1', 'Bravo'),
  item('B2', 'Bravo')
];
const ARIA_EXPANDED = 'aria-expanded';
const HOST_STYLE = 'height: 640px; width: 380px; display: flex; flex-direction: column; background: var(--sp-bg);';

let store: SchedulePageStore;
let extras = 0;
/** How many cards were built since the last call: each build runs `renderCardExtra` once. */
const builds = () => {
  const count = extras;
  extras = 0;
  return count;
};

function mountPanel(catalogStore: SchedulePageStore, countBuilds: boolean): HTMLElement {
  const panel = buildMatchUpCatalog({
    onSearchChange: (query) => catalogStore.setCatalogSearch(query),
    onGroupByChange: (mode) => catalogStore.setCatalogGroupBy(mode),
    onFilterChange: (filters) => catalogStore.setCatalogFilters(filters),
    onShowCompletedChange: (show) => catalogStore.setShowCompleted(show),
    onMatchUpSelected: (matchUp) => catalogStore.selectMatchUp(matchUp),
    onToggleGroupCollapsed: (groupKey) => catalogStore.toggleCatalogGroupCollapsed(groupKey),
    renderCardExtra: countBuilds
      ? () => {
          extras += 1;
          return null;
        }
      : undefined
  });
  panel.element.style.cssText = 'flex: 1; min-height: 0;';
  catalogStore.subscribe((state) => panel.update(state));
  panel.update(catalogStore.getState());
  const host = document.createElement('div');
  host.style.cssText = HOST_STYLE;
  host.appendChild(panel.element);
  return host;
}

const cards = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-match-up-id]')];
const selectedIds = (root: HTMLElement) =>
  cards(root)
    .filter((card) => card.classList.contains('selected'))
    .map((card) => card.dataset.matchUpId);
const groupHeader = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLElement>('button.sp-group-header')].find((el) =>
    el.lastElementChild?.textContent?.startsWith(`${name} (`)
  )!;

export const SelectionKeepsCards: StoryObj = {
  render: () => {
    extras = 0;
    store = new SchedulePageStore({ matchUpCatalog: CATALOG, scheduleDates: [] });
    return mountPanel(store, true);
  },
  play: async ({ canvasElement }) => {
    await expect(builds()).toBe(CATALOG.length);
    const before = cards(canvasElement);
    await expect(before.map((card) => card.dataset.matchUpId)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2']);

    await user.click(before[3]);
    await waitFor(() => expect(selectedIds(canvasElement)).toEqual(['B1']));
    await expect(store.getState().selectedMatchUp?.matchUpId).toBe('B1');
    // The same elements, highlighted in place: no card was rebuilt.
    await expect(cards(canvasElement)).toEqual(before);
    await expect(builds()).toBe(0);

    await user.click(before[0]);
    await waitFor(() => expect(selectedIds(canvasElement)).toEqual(['A1']));
    store.selectMatchUp(null);
    await expect(selectedIds(canvasElement)).toEqual([]);
    await expect(cards(canvasElement)).toEqual(before);
    await expect(builds()).toBe(0);
  }
};

export const HeaderClickCollapses: StoryObj = {
  render: () => {
    extras = 0;
    store = new SchedulePageStore({ matchUpCatalog: CATALOG, scheduleDates: [] });
    return mountPanel(store, true);
  },
  play: async ({ canvasElement }) => {
    builds();
    await expect(groupHeader(canvasElement, 'Alpha').getAttribute(ARIA_EXPANDED)).toBe('true');

    await user.click(groupHeader(canvasElement, 'Alpha'));
    await waitFor(() => expect(groupHeader(canvasElement, 'Alpha').getAttribute(ARIA_EXPANDED)).toBe('false'));
    await expect(store.getState().catalogCollapsedGroups).toEqual(['Alpha']);
    await expect(cards(canvasElement).map((card) => card.dataset.matchUpId)).toEqual(['B1', 'B2']);
    await expect(builds()).toBe(2);
    // The header itself stays, with its count, so the group can be reopened.
    await expect(groupHeader(canvasElement, 'Alpha')).toBeVisible();
    await expect(groupHeader(canvasElement, 'Alpha').lastElementChild?.textContent).toBe('Alpha (3)');

    await user.click(groupHeader(canvasElement, 'Alpha'));
    await waitFor(() => expect(groupHeader(canvasElement, 'Alpha').getAttribute(ARIA_EXPANDED)).toBe('true'));
    await expect(builds()).toBe(CATALOG.length);
    for (const card of cards(canvasElement)) await expect(card).toBeVisible();
  }
};

export const RestoresCollapsedGroups: StoryObj = {
  render: () =>
    mountPanel(
      new SchedulePageStore({
        matchUpCatalog: CATALOG,
        scheduleDates: [],
        initialCatalogState: { catalogCollapsedGroups: ['Alpha'] }
      }),
      false
    ),
  play: async ({ canvasElement }) => {
    await expect(groupHeader(canvasElement, 'Alpha').getAttribute(ARIA_EXPANDED)).toBe('false');
    await expect(groupHeader(canvasElement, 'Bravo').getAttribute(ARIA_EXPANDED)).toBe('true');
    await expect(cards(canvasElement).map((card) => card.dataset.matchUpId)).toEqual(['B1', 'B2']);
  }
};
