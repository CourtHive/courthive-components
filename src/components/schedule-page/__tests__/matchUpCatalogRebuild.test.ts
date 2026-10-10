// @vitest-environment happy-dom
import { buildMatchUpCatalog } from '../ui/matchUpCatalog';
import { SchedulePageStore } from '../engine/schedulePageStore';
import { describe, it, expect } from 'vitest';
import type { CatalogMatchUpItem } from '../types';

/**
 * The catalog builds its cards from a handful of state fields, and the store emits on every write.
 * Each card build runs the consumer's `renderCardExtra`, which in TMX grades the matchUp's readiness
 * and rest through the engine — so a rebuild the cards did not need is engine work per card.
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

function mount() {
  const store = new SchedulePageStore({ matchUpCatalog: catalog, scheduleDates: [] });
  let extras = 0;
  const panel = buildMatchUpCatalog({
    onSearchChange: (query) => store.setCatalogSearch(query),
    onGroupByChange: (mode) => store.setCatalogGroupBy(mode),
    onFilterChange: (filters) => store.setCatalogFilters(filters),
    onShowCompletedChange: (show) => store.setShowCompleted(show),
    renderCardExtra: () => {
      extras += 1;
      return null;
    }
  });
  document.body.appendChild(panel.element);
  store.subscribe((state) => panel.update(state));
  panel.update(store.getState());
  const builds = () => {
    const count = extras;
    extras = 0;
    return count;
  };
  const cards = () => Array.from(panel.element.querySelectorAll<HTMLElement>('[data-match-up-id]'));
  return { store, panel, builds, cards };
}

describe('matchUpCatalog rebuilds', () => {
  it('builds every card once on the first render', () => {
    const { builds, cards } = mount();
    expect(builds()).toEqual(catalog.length);
    expect(cards().map((card) => card.dataset.matchUpId)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2']);
  });

  it('moves the highlight on selection without rebuilding a card', () => {
    const { store, builds, cards } = mount();
    builds();
    const before = cards();

    store.selectMatchUp(catalog[3]);
    expect(builds()).toEqual(0);
    expect(cards()).toEqual(before);
    expect(
      cards()
        .filter((card) => card.classList.contains('selected'))
        .map((c) => c.dataset.matchUpId)
    ).toEqual(['B1']);

    store.selectMatchUp(catalog[0]);
    expect(
      cards()
        .filter((card) => card.classList.contains('selected'))
        .map((c) => c.dataset.matchUpId)
    ).toEqual(['A1']);
    store.selectMatchUp(null);
    expect(cards().some((card) => card.classList.contains('selected'))).toBe(false);
  });

  it('does not rebuild for state the cards do not read', () => {
    const { store, builds } = mount();
    builds();
    store.setInspectorVisible(false);
    store.setActiveStripVisible(false);
    store.setIssues([]);
    expect(builds()).toEqual(0);
  });

  it('rebuilds when the data or the view of it changes', () => {
    const { store, builds } = mount();
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
    const { panel, builds, cards } = mount();
    builds();
    const header = (name: string) =>
      Array.from(panel.element.querySelectorAll<HTMLElement>('div')).find((el) =>
        el.lastElementChild?.textContent?.startsWith(`${name} (`)
      )!;

    header('Alpha').click();
    expect(builds()).toEqual(2);
    expect(cards().map((card) => card.dataset.matchUpId)).toEqual(['B1', 'B2']);

    header('Alpha').click();
    expect(builds()).toEqual(catalog.length);
    expect(cards()).toHaveLength(catalog.length);
  });
});
