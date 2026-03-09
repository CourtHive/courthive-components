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
  SchedulePageDragPayload,
} from '../types';
import { filterMatchUpCatalog, groupMatchUpCatalog } from '../domain/matchUpCatalogProjections';
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
  spGroupChevronStyle,
} from './styles';

export interface MatchUpCatalogCallbacks {
  onSearchChange: (query: string) => void;
  onGroupByChange: (mode: MatchUpCatalogGroupBy) => void;
  onMatchUpSelected?: (matchUp: CatalogMatchUpItem) => void;
  onDropRemove?: (matchUpId: string) => void;
}

export function buildMatchUpCatalog(callbacks: MatchUpCatalogCallbacks): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

  const CATALOG_DROP_OVER = 'spl-catalog-drop-over';
  const collapsedGroups = new Set<string>();
  let lastState: SchedulePageState | null = null;

  // ── Entire panel is a drop target for returning matchUps ──

  root.addEventListener('dragover', (e) => {
    e.preventDefault();
    root.classList.add(CATALOG_DROP_OVER);
    e.dataTransfer!.dropEffect = 'move';
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
      payload = JSON.parse(e.dataTransfer!.getData('application/json'));
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
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'MatchUp Catalog';
  const meta = document.createElement('div');
  meta.className = spPanelMetaStyle();
  header.appendChild(title);
  header.appendChild(meta);
  root.appendChild(header);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = spCatalogToolbarStyle();

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search matchUps...';
  searchInput.className = spInputStyle();
  searchInput.addEventListener('input', () => callbacks.onSearchChange(searchInput.value));

  const groupSelect = document.createElement('select');
  groupSelect.className = spSelectStyle();
  for (const [val, label] of [
    ['event', 'By Event'],
    ['draw', 'By Draw'],
    ['round', 'By Round'],
    ['structure', 'By Structure'],
  ] as const) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    groupSelect.appendChild(opt);
  }
  groupSelect.addEventListener('change', () =>
    callbacks.onGroupByChange(groupSelect.value as MatchUpCatalogGroupBy),
  );

  toolbar.appendChild(searchInput);
  toolbar.appendChild(groupSelect);
  root.appendChild(toolbar);

  // Body (scrollable catalog content)
  const body = document.createElement('div');
  body.className = spCatalogStyle();
  root.appendChild(body);

  function update(state: SchedulePageState): void {
    lastState = state;
    const behavior = state.scheduledBehavior;
    const filtered = filterMatchUpCatalog(state.matchUpCatalog, state.catalogSearchQuery, behavior);
    const groups = groupMatchUpCatalog(filtered, state.catalogGroupBy);

    const unscheduledCount = filtered.filter((m) => !m.isScheduled).length;
    meta.textContent = `${unscheduledCount} unscheduled`;

    // Sync controls
    if (searchInput.value !== state.catalogSearchQuery) {
      searchInput.value = state.catalogSearchQuery;
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
        const card = buildMatchUpCard(item, {
          onClick: (m) => callbacks.onMatchUpSelected?.(m),
        });

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
