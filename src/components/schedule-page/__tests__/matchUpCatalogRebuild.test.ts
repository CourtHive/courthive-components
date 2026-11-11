import { SchedulePageStore } from '../engine/schedulePageStore';
import { describe, it, expect } from 'vitest';
import {
  allCatalogGroupsCollapsed,
  catalogCardInputs,
  catalogRenderGroups,
  sameCatalogCardInputs
} from '../domain/matchUpCatalogProjections';

import type { CatalogMatchUpItem, SchedulePageState } from '../types';

/**
 * The catalog builds its cards from a handful of state fields, and the store emits on every write.
 * Each card build runs the consumer's `renderCardExtra`, which in TMX grades the matchUp's readiness
 * and rest through the engine — so a rebuild the cards did not need is engine work per card.
 *
 * `buildMatchUpCatalog.update` rebuilds exactly when `sameCatalogCardInputs` says the inputs changed,
 * and then builds `catalogRenderGroups(state)[*].cards`. Both are pure, so the rule is asserted here,
 * in node, against the real store. That the panel keeps its card ELEMENTS across a selection and builds
 * on a header click is asserted in Chromium by `src/stories/schedule-page/MatchUpCatalogTests.stories.ts`.
 */

const item = (matchUpId: string, eventName: string, roundNumber = 1): CatalogMatchUpItem => ({
  matchUpId,
  eventId: eventName,
  eventName,
  drawId: `${eventName}-D`,
  structureId: `${eventName}-S`,
  roundNumber,
  isScheduled: false,
  sides: [{ participantName: `${matchUpId}-a` }, { participantName: `${matchUpId}-b` }]
});

const catalog = [
  item('A1', 'Alpha'),
  item('A2', 'Alpha'),
  item('A3', 'Alpha'),
  item('B1', 'Bravo'),
  item('B2', 'Bravo')
];

/**
 * Watches a store the way the panel does: on each emission, how many cards would be (re)built — zero
 * when the card inputs are unchanged.
 */
function watch(store = new SchedulePageStore({ matchUpCatalog: catalog, scheduleDates: [] })) {
  let builtFrom: unknown[] | null = null;
  let built = 0;
  const observe = (state: SchedulePageState) => {
    const inputs = catalogCardInputs(state);
    if (sameCatalogCardInputs(builtFrom, inputs)) return;
    builtFrom = inputs;
    built += catalogRenderGroups(state).flatMap((group) => group.cards).length;
  };
  store.subscribe(observe);
  observe(store.getState());
  const builds = () => {
    const count = built;
    built = 0;
    return count;
  };
  const cardIds = () =>
    catalogRenderGroups(store.getState())
      .flatMap((group) => group.cards)
      .map((card) => card.matchUpId);
  return { store, builds, cardIds };
}

const collapsedOf = (state: SchedulePageState) =>
  Object.fromEntries(catalogRenderGroups(state).map((group) => [group.groupKey, group.collapsed]));

describe('matchUpCatalog rebuilds', () => {
  it('builds every card once on the first render', () => {
    const { builds, cardIds } = watch();
    expect(builds()).toEqual(catalog.length);
    expect(cardIds()).toEqual(['A1', 'A2', 'A3', 'B1', 'B2']);
  });

  it('does not rebuild on selection', () => {
    const { store, builds } = watch();
    builds();
    store.selectMatchUp(catalog[3]);
    store.selectMatchUp(catalog[0]);
    store.selectMatchUp(null);
    expect(builds()).toEqual(0);
  });

  it('does not rebuild for state the cards do not read', () => {
    const { store, builds } = watch();
    builds();
    store.setInspectorVisible(false);
    store.setActiveStripVisible(false);
    store.setIssues([]);
    expect(builds()).toEqual(0);
  });

  it('rebuilds when the data or the view of it changes', () => {
    const { store, builds } = watch();
    builds();

    store.setMatchUpCatalog([...catalog]);
    expect(builds()).toEqual(catalog.length);

    store.setCatalogSearch('A1');
    expect(builds()).toEqual(1);

    store.setCatalogSearch('');
    store.setCatalogGroupBy('round');
    builds();
    store.setCatalogGroupBy('event');
    expect(builds()).toEqual(catalog.length);

    store.setCatalogFilters({ eventName: 'Bravo' });
    expect(builds()).toEqual(2);
  });

  it('builds no cards for a collapsed group, and builds them on expanding it', () => {
    const { store, builds, cardIds } = watch();
    builds();

    store.toggleCatalogGroupCollapsed('Alpha');
    expect(builds()).toEqual(2);
    expect(cardIds()).toEqual(['B1', 'B2']);
    // The collapsed group still shows its header and count.
    const alpha = catalogRenderGroups(store.getState()).find((group) => group.groupKey === 'Alpha')!;
    expect([alpha.collapsed, alpha.items.length, alpha.cards.length]).toEqual([true, 3, 0]);

    store.toggleCatalogGroupCollapsed('Alpha');
    expect(builds()).toEqual(catalog.length);
    expect(cardIds()).toHaveLength(catalog.length);
  });
});

describe('sameCatalogCardInputs', () => {
  it('forces a build when nothing has been built', () => {
    expect(sameCatalogCardInputs(null, [])).toBe(false);
  });

  it('compares by reference, so a copied catalog array is a change', () => {
    const state = new SchedulePageStore({ matchUpCatalog: catalog, scheduleDates: [] }).getState();
    expect(sameCatalogCardInputs(catalogCardInputs(state), catalogCardInputs({ ...state }))).toBe(true);
    expect(
      sameCatalogCardInputs(catalogCardInputs(state), catalogCardInputs({ ...state, matchUpCatalog: [...catalog] }))
    ).toBe(false);
  });
});

describe('collapsed groups are store state', () => {
  it('collapses every visible group, then expands them all', () => {
    const { store, cardIds } = watch();
    store.setAllCatalogGroupsCollapsed(true);
    expect(store.getState().catalogCollapsedGroups?.sort()).toEqual(['Alpha', 'Bravo']);
    expect(allCatalogGroupsCollapsed(store.getState())).toBe(true);
    expect(cardIds()).toHaveLength(0);

    store.setAllCatalogGroupsCollapsed(false);
    expect(store.getState().catalogCollapsedGroups).toEqual([]);
    expect(cardIds()).toHaveLength(catalog.length);
  });

  it('collapses only what is on screen, and reads "all collapsed" against what is on screen', () => {
    const { store } = watch();
    store.setCatalogFilters({ eventName: 'Bravo' });
    store.setAllCatalogGroupsCollapsed(true);
    expect(store.getState().catalogCollapsedGroups).toEqual(['Bravo']);
    expect(allCatalogGroupsCollapsed(store.getState())).toBe(true);
    // Clearing the filter brings Alpha back expanded, so the catalog is no longer all collapsed.
    store.setCatalogFilters({});
    expect(allCatalogGroupsCollapsed(store.getState())).toBe(false);
  });

  it('is never "all collapsed" when nothing is shown', () => {
    const { store } = watch();
    store.setCatalogSearch('no such player');
    expect(allCatalogGroupsCollapsed(store.getState())).toBe(false);
  });

  it('starts a new grouping fully expanded', () => {
    const { store } = watch();
    store.setAllCatalogGroupsCollapsed(true);
    store.setCatalogGroupBy('round');
    expect(store.getState().catalogCollapsedGroups).toEqual([]);
    // Re-selecting the current mode is not a change and keeps the set.
    store.setAllCatalogGroupsCollapsed(true);
    store.setCatalogGroupBy('round');
    expect(store.getState().catalogCollapsedGroups).toEqual(['Round 1']);
  });

  it('restores collapsed groups from initialCatalogState, as a host remount does', () => {
    const store = new SchedulePageStore({
      matchUpCatalog: catalog,
      scheduleDates: [],
      initialCatalogState: { catalogCollapsedGroups: ['Alpha'] }
    });
    expect(collapsedOf(store.getState())).toEqual({ Alpha: true, Bravo: false });
  });
});
