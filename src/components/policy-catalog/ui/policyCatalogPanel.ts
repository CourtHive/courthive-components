/**
 * Policy Catalog Panel — Left panel: searchable/filterable catalog of policies.
 *
 * Direct port of roundCatalog.ts visual pattern.
 * Stateless factory pattern: { element, update }.
 */

import type { PolicyCatalogState, UIPanel, CatalogGroupBy } from '../types';
import { filterPolicyCatalog, groupPolicyCatalog } from '../domain/catalogProjections';
import { getPolicyTypeMeta } from '../domain/policyDefaults';
import {
  pcPanelStyle,
  pcPanelHeaderStyle,
  pcPanelTitleStyle,
  pcPanelMetaStyle,
  pcToolbarStyle,
  pcInputStyle,
  pcSelectStyle,
  pcCatalogStyle,
  pcGroupStyle,
  pcGroupHeaderStyle,
  pcGroupChevronStyle,
  pcGroupBodyStyle,
  pcCardStyle,
  pcCardTitleStyle,
  pcCardMetaStyle,
  pcTypeBadgeStyle,
} from './styles';

export interface PolicyCatalogPanelCallbacks {
  onSearchChange: (query: string) => void;
  onGroupByChange: (mode: CatalogGroupBy) => void;
  onSelectPolicy: (id: string) => void;
}

export function buildPolicyCatalogPanel(
  callbacks: PolicyCatalogPanelCallbacks,
): UIPanel<PolicyCatalogState> {
  const root = document.createElement('div');
  root.className = pcPanelStyle();
  root.style.overflowY = 'auto';
  root.style.scrollbarWidth = 'thin';
  root.style.scrollbarColor = 'var(--sp-scrollbar) transparent';

  // Collapsible group state
  const collapsedGroups = new Set<string>();
  let lastState: PolicyCatalogState | null = null;

  // Header
  const header = document.createElement('div');
  header.className = pcPanelHeaderStyle();
  const title = document.createElement('div');
  title.className = pcPanelTitleStyle();
  title.textContent = 'Policy Catalog';
  const meta = document.createElement('div');
  meta.className = pcPanelMetaStyle();
  header.appendChild(title);
  header.appendChild(meta);
  root.appendChild(header);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = pcToolbarStyle();

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search policies...';
  searchInput.className = pcInputStyle();
  searchInput.addEventListener('input', () => callbacks.onSearchChange(searchInput.value));

  const groupSelect = document.createElement('select');
  groupSelect.className = pcSelectStyle();
  for (const [val, label] of [
    ['type', 'By Type'],
    ['source', 'By Source'],
  ] as const) {
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
  body.className = pcCatalogStyle();
  root.appendChild(body);

  function update(state: PolicyCatalogState): void {
    lastState = state;
    const filtered = filterPolicyCatalog(state.catalog, state.searchQuery);
    const groups = groupPolicyCatalog(filtered, state.groupBy);

    meta.textContent = `${filtered.length} policies`;

    // Sync controls
    if (searchInput.value !== state.searchQuery) {
      searchInput.value = state.searchQuery;
    }
    if (groupSelect.value !== state.groupBy) {
      groupSelect.value = state.groupBy;
    }

    body.innerHTML = '';

    for (const [gk, items] of groups) {
      const group = document.createElement('div');
      group.className = pcGroupStyle();

      const isCollapsed = collapsedGroups.has(gk);

      // Group header with chevron toggle
      const gh = document.createElement('div');
      gh.className = pcGroupHeaderStyle();

      const chevron = document.createElement('span');
      chevron.className = pcGroupChevronStyle();
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
      gb.className = pcGroupBodyStyle();
      if (isCollapsed) gb.style.display = 'none';

      for (const item of items) {
        const div = document.createElement('div');
        div.className = pcCardStyle();
        if (item.id === state.selectedId) {
          div.classList.add('active');
        }

        div.addEventListener('click', () => callbacks.onSelectPolicy(item.id));

        const t = document.createElement('div');
        t.className = pcCardTitleStyle();
        t.textContent = item.name;

        const m = document.createElement('div');
        m.className = pcCardMetaStyle();

        const typeMeta = getPolicyTypeMeta(item.policyType);
        const typeBadge = document.createElement('span');
        typeBadge.className = pcTypeBadgeStyle();
        typeBadge.textContent = typeMeta?.label ?? item.policyType;

        const sourceBadge = document.createElement('span');
        sourceBadge.className = `${pcTypeBadgeStyle()} ${item.source}`;
        sourceBadge.textContent = item.source;

        m.appendChild(typeBadge);
        m.appendChild(sourceBadge);

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
