/**
 * MatchUp Catalog — Right panel: searchable/groupable matchUp list with drag.
 *
 * Stateless factory pattern: { element, update }.
 * Follows the roundCatalog pattern from scheduling-profile.
 *
 * Dropping any matchUp (from grid or catalog) onto this panel returns it
 * to the catalog (unschedules it).
 */

import type {
  SchedulePageState,
  UIPanel,
  MatchUpCatalogGroupBy,
  CatalogMatchUpItem,
  CatalogFilters,
  SchedulePageDragPayload
} from '../types';
import { filterMatchUpCatalog, groupMatchUpCatalog, isCompletedStatus } from '../domain/matchUpCatalogProjections';
import { wrapSearchWithClear, syncClearVisibility } from '../../../helpers/searchClearButton';
import { buildMatchUpCard } from './matchUpCard';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spPanelMetaStyle,
  spCatalogToolbarStyle,
  spInputStyle,
  spSelectStyle,
  spCatalogStyle,
  spGroupStyle,
  spGroupHeaderStyle,
  spGroupBodyStyle,
  spGroupChevronStyle
} from './styles';

import tippy, { Instance } from 'tippy.js';

export interface MatchUpCatalogCallbacks {
  onSearchChange: (query: string) => void;
  onGroupByChange: (mode: MatchUpCatalogGroupBy) => void;
  onFilterChange: (filters: CatalogFilters) => void;
  onShowCompletedChange: (show: boolean) => void;
  onShowScheduledChange?: (show: boolean) => void;
  onMatchUpSelected?: (matchUp: CatalogMatchUpItem) => void;
  onDropRemove?: (matchUpId: string) => void;
}

/** Extract unique sorted values for a field from the catalog. */
function uniqueValues(catalog: CatalogMatchUpItem[], fn: (m: CatalogMatchUpItem) => string | undefined): string[] {
  const set = new Set<string>();
  for (const m of catalog) {
    const v = fn(m);
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * For each event, returns the lowest `roundNumber` among items that are
 * unscheduled and not completed. Drives the round-emphasis tier on each
 * catalog card — offset 0 means "this round is what should be scheduled
 * next within its event," offset >= 1 deemphasizes future rounds.
 *
 * Computed against the FULL catalog (not the filtered set) so a search /
 * filter that narrows the visible items doesn't shift the priority
 * assignment underneath the operator.
 */
function computeBaseRoundByEvent(catalog: CatalogMatchUpItem[]): Map<string, number> {
  const base = new Map<string, number>();
  for (const item of catalog) {
    if (item.isScheduled) continue;
    if (isCompletedStatus(item.matchUpStatus)) continue;
    const cur = base.get(item.eventId);
    if (cur === undefined || item.roundNumber < cur) base.set(item.eventId, item.roundNumber);
  }
  return base;
}

export function buildMatchUpCatalog(callbacks: MatchUpCatalogCallbacks): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

  const CATALOG_DROP_OVER = 'spl-catalog-drop-over';
  const FILTERING_CLASS = 'is-filtering';
  const collapsedGroups = new Set<string>();
  let lastState: SchedulePageState | null = null;
  let filterTip: Instance | undefined;
  let currentFilters: CatalogFilters = {};

  // ── Entire panel is a drop target for returning matchUps ──

  root.addEventListener('dragover', (e) => {
    e.preventDefault();
    root.classList.add(CATALOG_DROP_OVER);
    e.dataTransfer.dropEffect = 'move';
  });
  root.addEventListener('dragleave', (e) => {
    // Only remove highlight when leaving the panel itself, not child elements
    if (!root.contains(e.relatedTarget as Node)) {
      root.classList.remove(CATALOG_DROP_OVER);
    }
  });
  root.addEventListener('drop', (e) => {
    root.classList.remove(CATALOG_DROP_OVER);
    e.preventDefault();
    if (!callbacks.onDropRemove) return;

    let payload: SchedulePageDragPayload;
    try {
      payload = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }
    if (payload.type === 'CATALOG_MATCHUP' || payload.type === 'GRID_MATCHUP') {
      callbacks.onDropRemove(payload.matchUp.matchUpId);
    }
  });

  // Header
  const header = document.createElement('div');
  header.className = spPanelHeaderStyle();
  const titleRow = document.createElement('div');
  titleRow.className = 'spl-catalog-title-row';
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'MatchUp Catalog';

  const filterBtn = document.createElement('button');
  filterBtn.className = 'spl-catalog-filter-btn';
  filterBtn.title = 'Filter matchUps';
  filterBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>';

  titleRow.appendChild(title);
  titleRow.appendChild(filterBtn);

  const meta = document.createElement('div');
  meta.className = spPanelMetaStyle();
  header.appendChild(titleRow);
  header.appendChild(meta);
  root.appendChild(header);

  // Toolbar (search + group-by) — always visible
  const toolbar = document.createElement('div');
  toolbar.className = spCatalogToolbarStyle();

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search matchUps...';
  searchInput.className = spInputStyle();
  searchInput.addEventListener('input', () => callbacks.onSearchChange(searchInput.value));

  const searchWrap = wrapSearchWithClear(searchInput, () => {
    searchInput.value = '';
    callbacks.onSearchChange('');
    searchInput.focus();
  });

  const groupSelect = document.createElement('select');
  groupSelect.className = spSelectStyle();
  for (const [val, label] of [
    ['event', 'By Event'],
    ['draw', 'By Draw'],
    ['round', 'By Round'],
    ['structure', 'By Structure']
  ] as const) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    groupSelect.appendChild(opt);
  }
  groupSelect.addEventListener('change', () => callbacks.onGroupByChange(groupSelect.value as MatchUpCatalogGroupBy));

  toolbar.appendChild(searchWrap);
  toolbar.appendChild(groupSelect);
  root.appendChild(toolbar);

  // ── Filter Popover ──

  function destroyFilterTip(): void {
    if (filterTip) {
      filterTip.destroy();
      filterTip = undefined;
    }
  }

  function isAnyFilterActive(): boolean {
    return !!(
      currentFilters.eventType ||
      currentFilters.eventName ||
      currentFilters.drawName ||
      currentFilters.gender ||
      currentFilters.roundName
    );
  }

  function updateFilterBadge(): void {
    filterBtn.classList.toggle('active', isAnyFilterActive());
  }

  function buildFilterPopoverContent(): HTMLElement {
    const catalog = lastState?.matchUpCatalog ?? [];
    const container = document.createElement('div');
    container.className = 'spl-filter-popover';

    // Header: Clear All + Close
    const popoverHeader = document.createElement('div');
    popoverHeader.className = 'spl-filter-header';

    const clearAll = document.createElement('button');
    clearAll.className = 'spl-filter-clear-btn';
    clearAll.textContent = 'Clear All';
    clearAll.addEventListener('click', (ev) => {
      ev.stopPropagation();
      currentFilters = {};
      callbacks.onFilterChange(currentFilters);
      updateFilterBadge();
      // Reset all selects in the popover + clear the active-filter highlight
      // on both the select and its preceding label so the user gets a single
      // unambiguous "everything is cleared" snapshot.
      for (const sel of container.querySelectorAll<HTMLSelectElement>('select')) {
        sel.value = '';
        sel.classList.remove(FILTERING_CLASS);
        const lbl = sel.previousElementSibling;
        if (lbl?.classList.contains('spl-filter-label')) lbl.classList.remove(FILTERING_CLASS);
      }
    });
    popoverHeader.appendChild(clearAll);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'spl-filter-close-btn';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      destroyFilterTip();
    });
    popoverHeader.appendChild(closeBtn);

    container.appendChild(popoverHeader);

    // Build filter sections
    const sections: Array<{ label: string; key: keyof CatalogFilters; values: string[] }> = [
      { label: 'All Event Types', key: 'eventType', values: uniqueValues(catalog, (m) => m.matchUpType) },
      { label: 'All Events', key: 'eventName', values: uniqueValues(catalog, (m) => m.eventName) },
      { label: 'All Flights', key: 'drawName', values: uniqueValues(catalog, (m) => m.drawName) },
      { label: 'All Genders', key: 'gender', values: uniqueValues(catalog, (m) => m.gender) },
      { label: 'All Rounds', key: 'roundName', values: uniqueValues(catalog, (m) => m.roundName) }
    ];

    for (const section of sections) {
      if (section.values.length < 2) continue;

      const label = document.createElement('label');
      label.className = 'spl-filter-label';
      label.textContent = section.label;
      container.appendChild(label);

      const select = document.createElement('select');
      select.className = 'spl-filter-select';

      // "All" option (empty value = no filter)
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = section.label;
      select.appendChild(allOpt);

      for (const val of section.values) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }

      // Set current filter value
      select.value = currentFilters[section.key] ?? '';

      // Highlight the select + its label when an actual value (not "All") is
      // chosen. Without this it's hard to spot which dropdown is causing the
      // filter button to pulse, especially when 4+ dropdowns are visible.
      const syncFilteringHighlight = () => {
        const filtering = select.value !== '';
        select.classList.toggle(FILTERING_CLASS, filtering);
        label.classList.toggle(FILTERING_CLASS, filtering);
      };
      syncFilteringHighlight();

      select.addEventListener('change', () => {
        currentFilters = { ...currentFilters, [section.key]: select.value || undefined };
        callbacks.onFilterChange(currentFilters);
        updateFilterBadge();
        syncFilteringHighlight();
      });

      container.appendChild(select);
    }

    // "Show scheduled" toggle
    const scheduledToggleRow = document.createElement('label');
    scheduledToggleRow.className = 'spl-filter-toggle';

    const scheduledCheckbox = document.createElement('input');
    scheduledCheckbox.type = 'checkbox';
    scheduledCheckbox.checked = lastState?.showScheduled ?? false;
    scheduledCheckbox.addEventListener('change', () => {
      callbacks.onShowScheduledChange?.(scheduledCheckbox.checked);
    });
    scheduledToggleRow.appendChild(scheduledCheckbox);
    scheduledToggleRow.appendChild(document.createTextNode(' Show assigned'));
    container.appendChild(scheduledToggleRow);

    // "Show completed" toggle
    const toggleRow = document.createElement('label');
    toggleRow.className = 'spl-filter-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = lastState?.showCompleted ?? false;
    checkbox.addEventListener('change', () => {
      callbacks.onShowCompletedChange(checkbox.checked);
    });
    toggleRow.appendChild(checkbox);
    toggleRow.appendChild(document.createTextNode(' Show completed'));
    container.appendChild(toggleRow);

    return container;
  }

  filterBtn.addEventListener('click', () => {
    destroyFilterTip();

    filterTip = tippy(filterBtn, {
      content: buildFilterPopoverContent(),
      placement: 'bottom-start',
      interactive: true,
      trigger: 'manual',
      appendTo: () => root,
      onClickOutside: () => destroyFilterTip(),
      theme: ''
    });
    filterTip.show();
  });

  // Body (scrollable catalog content)
  const body = document.createElement('div');
  body.className = spCatalogStyle();
  root.appendChild(body);

  function update(state: SchedulePageState): void {
    lastState = state;
    currentFilters = state.catalogFilters ?? {};
    updateFilterBadge();

    // Compute baseRoundByEvent off the FULL catalog (not the filtered set) so
    // the round-emphasis on each card answers "which round of this event
    // should be scheduled next overall," not "which round shows up first
    // under the current search / filter view." A search for one player can
    // dramatically reduce the visible set, but the operator's underlying
    // scheduling priority hasn't changed.
    const baseRoundByEvent = computeBaseRoundByEvent(state.matchUpCatalog);

    const behavior = state.showScheduled ? state.scheduledBehavior : 'hide';
    const filtered = filterMatchUpCatalog(
      state.matchUpCatalog,
      state.catalogSearchQuery,
      behavior,
      state.catalogFilters,
      state.showCompleted
    );
    const groups = groupMatchUpCatalog(filtered, state.catalogGroupBy);

    const unscheduledCount = filtered.filter((m) => !m.isScheduled).length;
    meta.textContent = `${unscheduledCount} unscheduled`;

    // Sync controls
    if (searchInput.value !== state.catalogSearchQuery) {
      searchInput.value = state.catalogSearchQuery;
      syncClearVisibility(searchWrap);
    }
    if (groupSelect.value !== state.catalogGroupBy) {
      groupSelect.value = state.catalogGroupBy;
    }

    body.innerHTML = '';

    for (const [gk, items] of groups) {
      const group = document.createElement('div');
      group.className = spGroupStyle();

      const isCollapsed = collapsedGroups.has(gk);

      // Group header with chevron
      const gh = document.createElement('div');
      gh.className = spGroupHeaderStyle();

      const chevron = document.createElement('span');
      chevron.className = spGroupChevronStyle();
      chevron.textContent = isCollapsed ? '\u25B6' : '\u25BC';

      const ghLabel = document.createElement('span');
      ghLabel.textContent = `${gk} (${items.length})`;

      gh.appendChild(chevron);
      gh.appendChild(ghLabel);

      gh.addEventListener('click', () => {
        if (collapsedGroups.has(gk)) {
          collapsedGroups.delete(gk);
        } else {
          collapsedGroups.add(gk);
        }
        if (lastState) update(lastState);
      });

      const gb = document.createElement('div');
      gb.className = spGroupBodyStyle();
      if (isCollapsed) gb.style.display = 'none';

      for (const item of items) {
        // Round-offset only attached when this event has an eligible base
        // round (i.e. at least one unscheduled, non-completed item exists).
        // Skip for scheduled / completed items — their card class already
        // marks them visually distinct and a round-priority tier on top of
        // that would compete with the scheduled-state styling.
        const base = baseRoundByEvent.get(item.eventId);
        const roundOffset =
          base !== undefined && !item.isScheduled && !isCompletedStatus(item.matchUpStatus)
            ? Math.max(0, item.roundNumber - base)
            : undefined;
        const card = buildMatchUpCard(
          item,
          { onClick: (m) => callbacks.onMatchUpSelected?.(m) },
          { roundOffset }
        );

        if (state.selectedMatchUp?.matchUpId === item.matchUpId) {
          card.classList.add('selected');
        }

        gb.appendChild(card);
      }

      group.appendChild(gh);
      group.appendChild(gb);
      body.appendChild(group);
    }
  }

  return { element: root, update };
}
