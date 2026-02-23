/**
 * Round Catalog — Right panel: searchable/filterable catalog of available rounds.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { ProfileStoreState, UIPanel, CatalogGroupBy } from '../types';
import { filterCatalog, groupCatalog, getPlannedRoundKeys } from '../domain/catalogProjections';
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
  spCatalogItemStyle,
  spCardTitleStyle,
  spCardMetaStyle,
} from './styles';

export interface RoundCatalogCallbacks {
  onSearchChange: (query: string) => void;
  onGroupByChange: (mode: CatalogGroupBy) => void;
}

export function buildRoundCatalog(callbacks: RoundCatalogCallbacks): UIPanel<ProfileStoreState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

  // Header
  const header = document.createElement('div');
  header.className = spPanelHeaderStyle();
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'Round Catalog';
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
  searchInput.placeholder = 'Search rounds...';
  searchInput.className = spInputStyle();
  searchInput.addEventListener('input', () => callbacks.onSearchChange(searchInput.value));

  const groupSelect = document.createElement('select');
  groupSelect.className = spSelectStyle();
  for (const [val, label] of [
    ['event', 'By Event'],
    ['draw', 'By Draw'],
    ['round', 'By Round'],
  ]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    groupSelect.appendChild(opt);
  }
  groupSelect.addEventListener('change', () =>
    callbacks.onGroupByChange(groupSelect.value as CatalogGroupBy),
  );

  toolbar.appendChild(searchInput);
  toolbar.appendChild(groupSelect);
  root.appendChild(toolbar);

  // Body
  const body = document.createElement('div');
  body.className = spCatalogStyle();
  root.appendChild(body);

  function update(state: ProfileStoreState): void {
    const plannedKeys = getPlannedRoundKeys(state.profileDraft);
    const filtered = filterCatalog(state.roundCatalog, state.catalogSearchQuery, plannedKeys);
    const groups = groupCatalog(filtered, state.catalogGroupBy);

    meta.textContent = `${filtered.length} rounds`;

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

      const gh = document.createElement('div');
      gh.className = spGroupHeaderStyle();
      gh.textContent = gk;

      const gb = document.createElement('div');
      gb.className = spGroupBodyStyle();

      for (const item of items) {
        const div = document.createElement('div');
        div.className = spCatalogItemStyle();
        if (item.isPlanned) div.classList.add('dimmed');

        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          e.dataTransfer!.setData(
            'application/json',
            JSON.stringify({ type: 'CATALOG_ROUND', roundRef: item }),
          );
          e.dataTransfer!.effectAllowed = 'copy';
        });

        const t = document.createElement('div');
        t.className = spCardTitleStyle();
        t.textContent = `${item.eventName} \u2014 ${item.roundName ?? 'Round ' + item.roundNumber}`;

        const m = document.createElement('div');
        m.className = spCardMetaStyle();
        const matchInfo = item.matchCountEstimate ? ' \u00b7 est ' + item.matchCountEstimate + ' matches' : '';
        m.textContent = `${item.drawName ?? item.drawId} (${item.drawId}/${item.structureId})${matchInfo}`;

        div.appendChild(t);
        div.appendChild(m);
        gb.appendChild(div);
      }

      group.appendChild(gh);
      group.appendChild(gb);
      body.appendChild(group);
    }
  }

  return { element: root, update };
}
