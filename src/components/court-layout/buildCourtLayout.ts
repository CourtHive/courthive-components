/**
 * Court Layout — DOM Factory.
 *
 * CourtLayoutData + CourtLayoutConfig -> HTMLElement. Fully synchronous: no map, no network, no
 * optional dependency. Each cell is `buildCourtCard`; this component owns ordering, grouping,
 * the summary line and the grid.
 */

import { buildCourtCard, mapCourtToCardData } from '../court-card';
import { CourtCardConfig } from '../court-card/types';
import { mergeCourtLayoutConfig } from './defaultConfig';
import { sortCourtsByOrder } from '../../helpers/cards';
import {
  clEmptyStyle,
  clGridStyle,
  clGroupCountStyle,
  clGroupHeadingStyle,
  clGroupStyle,
  clRootStyle,
  clSummaryCountStyle,
  clSummaryStyle
} from './styles';
import { CourtLayoutCallbacks, CourtLayoutConfig, CourtLayoutCourt, CourtLayoutData } from './types';

const UNKNOWN_SETTING = 'Unspecified';
const UNKNOWN_SURFACE = 'Unspecified surface';

export interface CourtGroup {
  key: string;
  label: string;
  courts: CourtLayoutCourt[];
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function settingOf(court: CourtLayoutCourt): string {
  const value = typeof court.indoorOutdoor === 'string' ? court.indoorOutdoor.trim() : '';
  return value ? titleCase(value) : UNKNOWN_SETTING;
}

export function surfaceOf(court: CourtLayoutCourt): string {
  const value = typeof court.surfaceCategory === 'string' ? court.surfaceCategory.trim() : '';
  return value ? titleCase(value) : UNKNOWN_SURFACE;
}

/**
 * Split courts into display groups. Order within a group is always courtOrder-first; the ORDER OF
 * THE GROUPS follows first appearance in that sorted list, so a venue whose court 1 is outdoor
 * leads with outdoor rather than with whatever sorts first alphabetically.
 */
export function groupCourts(courts: CourtLayoutCourt[], grouping: CourtLayoutConfig['grouping']): CourtGroup[] {
  const ordered = sortCourtsByOrder(courts);
  if (grouping === 'none') return [{ key: 'all', label: 'All courts', courts: ordered }];

  const labelFor = (court: CourtLayoutCourt) => {
    if (grouping === 'setting') return settingOf(court);
    if (grouping === 'surface') return surfaceOf(court);
    return `${settingOf(court)} · ${surfaceOf(court)}`;
  };

  const groups = new Map<string, CourtGroup>();
  for (const court of ordered) {
    const label = labelFor(court);
    const existing = groups.get(label);
    if (existing) existing.courts.push(court);
    else groups.set(label, { key: label, label, courts: [court] });
  }
  return [...groups.values()];
}

/** "8 outdoor hard, 4 indoor hard" — the breakdown, most common first. */
export function summarizeCourts(courts: CourtLayoutCourt[]): string {
  const counts = new Map<string, number>();
  for (const court of courts) {
    const setting = settingOf(court);
    const surface = surfaceOf(court);
    const key = `${setting === UNKNOWN_SETTING ? '' : setting.toLowerCase()} ${
      surface === UNKNOWN_SURFACE ? '' : surface.toLowerCase()
    }`.trim();
    const label = key || 'court';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${count} ${label}`)
    .join(', ');
}

// ============================================================================
// Public Builder
// ============================================================================

export function buildCourtLayout(
  data: CourtLayoutData,
  config?: Partial<CourtLayoutConfig>,
  callbacks?: CourtLayoutCallbacks
): HTMLElement {
  const cfg = mergeCourtLayoutConfig(config);
  const courts = data.courts ?? [];

  const root = document.createElement('div');
  root.className = clRootStyle();
  if (data.venueId) root.dataset.venueId = data.venueId;

  if (!courts.length) {
    const empty = document.createElement('div');
    empty.className = clEmptyStyle();
    empty.textContent = cfg.emptyMessage;
    root.appendChild(empty);
    return root;
  }

  if (cfg.showSummary) root.appendChild(buildSummary(courts));
  for (const group of groupCourts(courts, cfg.grouping)) {
    root.appendChild(buildGroup(group, cfg, callbacks));
  }
  return root;
}

// ============================================================================
// Zones
// ============================================================================

function buildSummary(courts: CourtLayoutCourt[]): HTMLElement {
  const summary = document.createElement('div');
  summary.className = clSummaryStyle();

  const count = document.createElement('span');
  count.className = clSummaryCountStyle();
  count.textContent = `${courts.length} ${courts.length === 1 ? 'court' : 'courts'}`;

  const breakdown = document.createElement('span');
  breakdown.textContent = summarizeCourts(courts);

  summary.append(count, breakdown);
  return summary;
}

function buildGroup(group: CourtGroup, cfg: CourtLayoutConfig, callbacks?: CourtLayoutCallbacks): HTMLElement {
  const section = document.createElement('div');
  section.className = clGroupStyle();
  section.dataset.group = group.key;

  if (cfg.showGroupHeadings && cfg.grouping !== 'none') {
    const heading = document.createElement('div');
    heading.className = clGroupHeadingStyle();
    const label = document.createElement('span');
    label.textContent = group.label;
    const count = document.createElement('span');
    count.className = clGroupCountStyle();
    count.textContent = String(group.courts.length);
    heading.append(label, count);
    section.appendChild(heading);
  }

  const grid = document.createElement('div');
  grid.className = clGridStyle();
  grid.style.setProperty('--chc-cl-min-card', cfg.minCardWidth);
  for (const court of group.courts) grid.appendChild(buildCell(court, cfg, callbacks));
  section.appendChild(grid);

  return section;
}

/**
 * Card config for a cell, given what the group heading already says. Repeating "Outdoor" on every
 * card inside a group headed OUTDOOR is noise, so the redundant corner badge is dropped — but only
 * the redundant one. `floodlit` is never implied by grouping and always survives.
 */
export function cellCardConfig(grouping: CourtLayoutConfig['grouping']): Partial<CourtCardConfig> | undefined {
  const settingImplied = grouping === 'setting' || grouping === 'both';
  if (!settingImplied) return undefined;
  return { cornerBadges: ['floodlit'] };
}

function buildCell(court: CourtLayoutCourt, cfg: CourtLayoutConfig, callbacks?: CourtLayoutCallbacks): HTMLElement {
  const cardData = mapCourtToCardData(court, { sport: cfg.sport });
  const cardCallbacks = callbacks?.onCourtClick ? { onClick: () => callbacks.onCourtClick?.(court) } : undefined;
  return buildCourtCard(cardData, cellCardConfig(cfg.grouping), cardCallbacks);
}
