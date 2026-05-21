/**
 * Round Catalog — Right panel: searchable/filterable catalog of available rounds.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { ProfileStoreState, UIPanel, CatalogGroupBy, CatalogRoundItem, DragPayload, RoundLocator, RoundSegment, VenueInfo } from '../types';
import {
  filterCatalog,
  groupCatalog,
  getPlannedRoundKeys,
  getPlannedSegmentKeys,
  segmentKeyString,
  buildPlacementIndex,
  getPlacedSegmentsCount,
  type RoundPlacement
} from '../domain/catalogProjections';
import { wrapSearchWithClear, syncClearVisibility } from '../../../helpers/searchClearButton';
import { roundKeyString } from '../domain/utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(s: string): boolean {
  return UUID_RE.test(s);
}
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
  spGroupChevronStyle
} from './styles';

export interface RoundCatalogCallbacks {
  onSearchChange: (query: string) => void;
  onGroupByChange: (mode: CatalogGroupBy) => void;
  onDropRemove?: (locator: RoundLocator) => void;
  onNavigateToPlanned?: (item: CatalogRoundItem) => void;
}

export function buildRoundCatalog(callbacks: RoundCatalogCallbacks): UIPanel<ProfileStoreState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();
  root.style.overflowY = 'auto';
  root.style.scrollbarWidth = 'thin';
  root.style.scrollbarColor = 'var(--sp-scrollbar) transparent';

  // Collapsible group state (persists across update calls)
  const collapsedGroups = new Set<string>();
  // Local split state — keyed by roundKeyString. Value is `segmentsCount`
  // (2 or 4). Rounds not in the map render as a single un-split row.
  const splitState = new Map<string, number>();
  let lastState: ProfileStoreState | null = null;

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
    ['round', 'By Round']
  ]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    groupSelect.appendChild(opt);
  }
  groupSelect.addEventListener('change', () => callbacks.onGroupByChange(groupSelect.value as CatalogGroupBy));

  toolbar.appendChild(searchWrap);
  toolbar.appendChild(groupSelect);
  root.appendChild(toolbar);

  // Body
  const body = document.createElement('div');
  body.className = spCatalogStyle();
  root.appendChild(body);

  // Drop zone on body — drag planned rounds back to remove them
  body.addEventListener('dragover', (e) => {
    e.preventDefault();
    body.classList.add('over');
    e.dataTransfer.dropEffect = 'move';
  });
  body.addEventListener('dragleave', (e) => {
    if (!body.contains(e.relatedTarget as Node)) {
      body.classList.remove('over');
    }
  });
  body.addEventListener('drop', (e) => {
    body.classList.remove('over');
    e.preventDefault();
    if (!callbacks.onDropRemove) return;

    let payload: DragPayload;
    try {
      payload = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }
    if (payload.type === 'PLANNED_ROUND') {
      callbacks.onDropRemove(payload.locator);
    }
  });

  function buildCatalogItem(
    item: CatalogRoundItem & { isPlanned: boolean },
    behavior: string,
    roundSegment: RoundSegment | undefined,
    rerender: () => void,
    placements: RoundPlacement[],
    venueNameMap: Map<string, string>
  ): HTMLElement {
    const div = document.createElement('div');
    div.className = spCatalogItemStyle();
    if (roundSegment) div.classList.add('segment');

    if (item.isPlanned) {
      div.classList.add(behavior === 'navigate' ? 'navigate' : 'dimmed');
      div.draggable = false;
      if (behavior === 'navigate') {
        div.addEventListener('click', () => {
          callbacks.onNavigateToPlanned?.(item);
        });
      }
    } else {
      div.draggable = true;
      div.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setDragImage(div, div.offsetWidth / 2, 20);
        const payload: any = { type: 'CATALOG_ROUND', roundRef: item };
        if (roundSegment) payload.roundSegment = roundSegment;
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'copyMove';
      });
    }

    const t = document.createElement('div');
    t.className = spCardTitleStyle();
    const roundLbl =
      item.roundName && !item.roundName.startsWith('rn=') ? item.roundName : 'Round ' + item.roundNumber;
    const segLbl = roundSegment ? ` \u00b7 Seg ${roundSegment.segmentNumber}/${roundSegment.segmentsCount}` : '';
    t.textContent = `${item.eventName} \u2014 ${roundLbl}${segLbl}`;

    const m = document.createElement('div');
    m.className = spCardMetaStyle();
    const segMatchCount =
      roundSegment && item.matchCountEstimate
        ? Math.round(item.matchCountEstimate / roundSegment.segmentsCount)
        : item.matchCountEstimate;
    const matchInfo = segMatchCount ? ' \u00b7 ' + segMatchCount + ' matches' : '';
    const drawLabel = item.drawName && !isUUID(item.drawName) ? item.drawName : '';
    m.textContent = drawLabel ? `${drawLabel}${matchInfo}` : matchInfo.replace(' \u00b7 ', '') || '';

    div.appendChild(t);
    div.appendChild(m);

    // For planned rows (or rows with stranded placements like orphaned dates),
    // show the placement(s) inline so the operator always knows where their
    // round went. Removal \u00d7 lives on the right edge of the card, mirroring
    // the position of the \u00bd / \u00bc split chips on un-planned rows.
    if (placements.length && behavior !== 'navigate') {
      div.appendChild(buildPlacementList(placements, venueNameMap));
      if (callbacks.onDropRemove) {
        div.appendChild(buildPlacementRemoveStack(placements, callbacks.onDropRemove));
      }
    }

    if (item.isPlanned && behavior !== 'navigate') {
      // Placed rows no longer carry the right-side \u2713 check or split chips \u2014
      // the placement list above is the authoritative readout, and removal
      // happens via the per-placement \u00d7 button.
    } else if (!item.isPlanned) {
      // Right-side split-control chips. For whole rows: "\u00bd" / "\u00bc" to explode.
      // For segment sub-rows: an "\u2715" chip to collapse back to whole.
      const splitCtl = document.createElement('div');
      splitCtl.className = 'sp-split-ctl';
      const rk = roundKeyString(item);
      if (roundSegment) {
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'sp-split-chip sp-split-collapse';
        x.title = 'Collapse to whole round';
        x.textContent = '\u00d7';
        x.addEventListener('click', (e) => {
          e.stopPropagation();
          splitState.delete(rk);
          rerender();
        });
        splitCtl.appendChild(x);
      } else {
        for (const [label, count, title] of [
          ['\u00bd', 2, 'Split into halves'],
          ['\u00bc', 4, 'Split into quarters']
        ] as const) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'sp-split-chip';
          btn.title = title;
          btn.textContent = label;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            splitState.set(rk, count);
            rerender();
          });
          splitCtl.appendChild(btn);
        }
      }
      div.appendChild(splitCtl);
    }
    return div;
  }

  function update(state: ProfileStoreState): void {
    lastState = state;
    const behavior = state.plannedRoundBehavior;
    const plannedKeys = getPlannedRoundKeys(state.profileDraft);
    const plannedSegmentKeys = getPlannedSegmentKeys(state.profileDraft);
    const placementIndex = buildPlacementIndex(state.profileDraft);
    const placedSegmentsCount = getPlacedSegmentsCount(state.profileDraft);
    const venueNameMap = new Map<string, string>(state.venues.map((v: VenueInfo) => [v.venueId, v.name]));
    const filtered = filterCatalog(state.roundCatalog, state.catalogSearchQuery, plannedKeys, behavior);
    const groups = groupCatalog(filtered, state.catalogGroupBy);
    const rerender = () => lastState && update(lastState);

    meta.textContent = `${filtered.length} rounds`;

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

      // Group header with chevron toggle
      const gh = document.createElement('div');
      gh.className = spGroupHeaderStyle();

      const chevron = document.createElement('span');
      chevron.className = spGroupChevronStyle();
      chevron.textContent = isCollapsed ? '\u25B6' : '\u25BC';

      const ghLabel = document.createElement('span');
      ghLabel.textContent = gk;

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
        const rk = roundKeyString(item);
        // Effective split factor: prefer the user's explicit pick from
        // `splitState`, otherwise auto-expand based on already-placed
        // segments so orphaned placements stay visible (and removable) even
        // when the operator hasn't manually clicked ½ / ¼.
        const segmentsCount = splitState.get(rk) ?? placedSegmentsCount.get(rk);
        if (!segmentsCount) {
          const placements = placementIndex.get(rk) ?? [];
          gb.appendChild(buildCatalogItem(item, behavior, undefined, rerender, placements, venueNameMap));
          continue;
        }
        // Whole-round placement claims every segment regardless of split count.
        // Per-segment placements only claim their own segment.
        for (let n = 1; n <= segmentsCount; n++) {
          const seg: RoundSegment = { segmentNumber: n, segmentsCount };
          const isSegPlanned = item.isPlanned || plannedSegmentKeys.has(segmentKeyString(rk, seg));
          if (isSegPlanned && behavior === 'hide') continue;
          const placements = placementIndex.get(segmentKeyString(rk, seg)) ?? [];
          gb.appendChild(
            buildCatalogItem({ ...item, isPlanned: isSegPlanned }, behavior, seg, rerender, placements, venueNameMap)
          );
        }
      }

      group.appendChild(gh);
      group.appendChild(gb);
      body.appendChild(group);
    }
  }

  return { element: root, update };
}

function buildPlacementList(placements: RoundPlacement[], venueNameMap: Map<string, string>): HTMLElement {
  const list = document.createElement('div');
  list.className = 'sp-catalog-placements';
  for (const p of placements) {
    list.appendChild(buildPlacementRow(p, venueNameMap));
  }
  return list;
}

function buildPlacementRow(p: RoundPlacement, venueNameMap: Map<string, string>): HTMLElement {
  const row = document.createElement('div');
  row.className = 'sp-catalog-placement';

  const icon = document.createElement('span');
  icon.className = 'sp-catalog-placement-icon';
  row.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'sp-catalog-placement-label';
  const venueName = venueNameMap.get(p.venueId) || p.venueId;
  const segLabel = p.roundSegment ? ` · Seg ${p.roundSegment.segmentNumber}/${p.roundSegment.segmentsCount}` : '';
  label.textContent = `${formatPlacementDate(p.date)} · ${venueName}${segLabel}`;
  row.appendChild(label);

  return row;
}

function buildPlacementRemoveStack(
  placements: RoundPlacement[],
  onRemove: (locator: RoundLocator) => void
): HTMLElement {
  // Stacked vertically inside the same right-side container the split chips
  // (½ / ¼) live in, so the position of "controls" stays consistent across
  // planned and un-planned catalog rows.
  const ctl = document.createElement('div');
  ctl.className = 'sp-split-ctl sp-split-ctl-stack';
  for (const p of placements) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'sp-split-chip sp-split-collapse';
    remove.title = 'Remove this placement';
    remove.textContent = '×';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove(p.locator);
    });
    ctl.appendChild(remove);
  }
  return ctl;
}

/**
 * "Wed May 20" — compact, locale-aware date stamp for catalog placement
 * chips. Falls back to the raw ISO date if parsing fails so a malformed
 * profile entry never renders blank.
 */
function formatPlacementDate(date: string): string {
  try {
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    return `${weekday} ${month} ${d.getDate()}`;
  } catch {
    return date;
  }
}
