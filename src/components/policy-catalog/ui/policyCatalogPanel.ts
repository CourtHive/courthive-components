/**
 * Policy Catalog Panel — Left panel: searchable/filterable catalog of policies.
 *
 * Includes "+" button for creating new policies and per-card actions.
 */

import type { PolicyCatalogState, UIPanel, CatalogGroupBy } from '../types';
import { filterPolicyCatalog, groupPolicyCatalog } from '../domain/catalogProjections';
import { getPolicyTypeMeta, POLICY_TYPE_METADATA } from '../domain/policyDefaults';
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
  onNewPolicy?: (policyType: string) => void;
  onDuplicatePolicy?: (id: string) => void;
  onDeletePolicy?: (id: string) => void;
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

  // "+" New policy button with dropdown
  const newBtnWrap = document.createElement('div');
  newBtnWrap.style.cssText = 'position:relative;flex-shrink:0';

  const newBtn = document.createElement('button');
  newBtn.className = 'sp-btn-icon';
  newBtn.textContent = '+';
  newBtn.title = 'New policy';
  newBtn.style.cssText = 'font-size:1rem;font-weight:700';

  const dropdown = document.createElement('div');
  dropdown.style.cssText =
    'display:none;position:absolute;top:100%;right:0;z-index:100;min-width:180px;' +
    'background:var(--sp-panel-bg);border:1px solid var(--sp-border);border-radius:12px;' +
    'box-shadow:var(--sp-panel-shadow);padding:4px;margin-top:4px';

  // Populate dropdown with policy types that have editors
  const creatableTypes = POLICY_TYPE_METADATA.filter((m) => m.hasEditor);
  for (const typeMeta of creatableTypes) {
    const item = document.createElement('div');
    item.style.cssText =
      'padding:6px 10px;font-size:12px;border-radius:8px;cursor:pointer;color:var(--sp-text)';
    item.textContent = typeMeta.label;
    item.addEventListener('mouseenter', () => { item.style.background = 'var(--sp-hover-bg)'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; });
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      callbacks.onNewPolicy?.(typeMeta.policyType);
    });
    dropdown.appendChild(item);
  }

  newBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => { dropdown.style.display = 'none'; });

  newBtnWrap.appendChild(newBtn);
  newBtnWrap.appendChild(dropdown);

  toolbar.appendChild(searchInput);
  toolbar.appendChild(groupSelect);
  toolbar.appendChild(newBtnWrap);
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

        // Title row with card actions
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;align-items:center;gap:4px';

        const t = document.createElement('div');
        t.className = pcCardTitleStyle();
        t.style.flex = '1';
        t.textContent = item.name;
        titleRow.appendChild(t);

        // Card action buttons
        if (callbacks.onDuplicatePolicy) {
          const dupBtn = document.createElement('span');
          dupBtn.style.cssText = 'font-size:10px;cursor:pointer;color:var(--sp-muted);padding:2px';
          dupBtn.textContent = '\u2398'; // copy icon
          dupBtn.title = 'Duplicate';
          dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onDuplicatePolicy?.(item.id);
          });
          titleRow.appendChild(dupBtn);
        }

        if (item.source === 'user' && callbacks.onDeletePolicy) {
          const delBtn = document.createElement('span');
          delBtn.style.cssText = 'font-size:10px;cursor:pointer;color:var(--sp-muted);padding:2px';
          delBtn.textContent = '\u2715'; // ✕
          delBtn.title = 'Delete';
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onDeletePolicy?.(item.id);
          });
          titleRow.appendChild(delBtn);
        }

        div.appendChild(titleRow);

        const m = document.createElement('div');
        m.className = pcCardMetaStyle();

        const typeMeta2 = getPolicyTypeMeta(item.policyType);
        const typeBadge = document.createElement('span');
        typeBadge.className = pcTypeBadgeStyle();
        typeBadge.textContent = typeMeta2?.label ?? item.policyType;

        const sourceBadge = document.createElement('span');
        sourceBadge.className = `${pcTypeBadgeStyle()} ${item.source}`;
        sourceBadge.textContent = item.source;

        m.appendChild(typeBadge);
        m.appendChild(sourceBadge);

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
