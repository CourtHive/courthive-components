/**
 * Scheduling Profile — Individual Panel Stories
 *
 * Tests each UI panel in isolation to verify rendering, interactions,
 * and state updates independently before testing the full assembly.
 */

import 'tippy.js/dist/tippy.css';

import type { ProfileStoreState, IssueIndex } from '../../components/scheduling-profile';
import { ProfileStore } from '../../components/scheduling-profile';
import { buildDateStrip } from '../../components/scheduling-profile/ui/dateStrip';
import { buildIssuesPanel } from '../../components/scheduling-profile/ui/issuesPanel';
import { buildVenueBoard } from '../../components/scheduling-profile/ui/venueBoard';
import { buildRoundCatalog } from '../../components/scheduling-profile/ui/roundCatalog';
import { buildInspectorPanel } from '../../components/scheduling-profile/ui/inspectorPanel';
import { buildRoundCard } from '../../components/scheduling-profile/ui/roundCard';

import {
  VENUES,
  ROUND_CATALOG,
  DATES,
  VALID_PROFILE,
  ERROR_PROFILE,
  makeBaseConfig,
} from './data';

export default {
  title: 'Scheduling Profile/Panels',
};

// ── Helpers ────────────────────────────────────────────────────────────────

const SP_ROOT =
  'background: var(--sp-bg); min-height: 400px; padding: 20px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';
const SP_ROOT_NARROW = SP_ROOT + ' max-width: 400px;';
const EVENT_NAME = 'Boys U16 Singles';
const DAY1 = '2026-06-15';

function makeEmptyIndex(): IssueIndex {
  return {
    all: [],
    bySeverity: { ERROR: [], WARN: [], INFO: [] },
    byDate: {},
    byVenue: {},
    byDraw: {},
    counts: { total: 0, ERROR: 0, WARN: 0, INFO: 0, byDate: {}, byVenue: {}, byDraw: {} },
  };
}

function makeStoreState(overrides: Partial<ProfileStoreState> = {}): ProfileStoreState {
  return {
    profileDraft: [],
    venues: VENUES,
    roundCatalog: ROUND_CATALOG,
    schedulableDates: DATES,
    selectedDate: DATES[0],
    selectedLocator: null,
    ruleResults: [],
    issueIndex: makeEmptyIndex(),
    catalogSearchQuery: '',
    catalogGroupBy: 'event',
    plannedRoundBehavior: 'dim',
    ...overrides,
  };
}

function addStatusLog(container: HTMLElement): (msg: string) => void {
  const log = document.createElement('div');
  log.style.cssText =
    'margin-top: 16px; padding: 12px; background: var(--sp-card-bg); border: 1px solid var(--sp-border-group); border-radius: 8px; font-size: 12px; color: var(--sp-muted); max-height: 150px; overflow: auto;';
  log.innerHTML = '<div style="font-weight:700; margin-bottom:6px;">Event Log</div>';
  container.appendChild(log);

  return (msg: string) => {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };
}

// ============================================================================
// Round Card
// ============================================================================

export const RoundCard = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT;

    const heading = document.createElement('h3');
    heading.textContent = 'Round Card Variants';
    heading.style.cssText = 'margin-bottom: 16px; font-size: 14px;';
    root.appendChild(heading);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 800px;';
    root.appendChild(grid);

    const logFn = addStatusLog(root);

    const roundKey = { tournamentId: 'T1', eventId: 'E_MS_U16', drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 5 };

    // Normal card
    const card1 = buildRoundCard(
      {
        round: { ...roundKey, eventName: EVENT_NAME, roundName: 'R32' },
        locator: { date: DAY1, venueId: 'VENUE_A', index: 0, roundKey },
        isSelected: false,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked: ${loc.date} ${loc.venueId} idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Normal', card1));

    // Selected card
    const card2 = buildRoundCard(
      {
        round: { ...roundKey, eventName: EVENT_NAME, roundName: 'R16', roundNumber: 6 },
        locator: { date: DAY1, venueId: 'VENUE_A', index: 1, roundKey: { ...roundKey, roundNumber: 6 } },
        isSelected: true,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked selected card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Selected', card2));

    // Error card
    const card3 = buildRoundCard(
      {
        round: { ...roundKey, eventName: EVENT_NAME, roundName: 'QF', roundNumber: 7 },
        locator: { date: DAY1, venueId: 'VENUE_A', index: 2, roundKey: { ...roundKey, roundNumber: 7 } },
        isSelected: false,
        severity: 'ERROR',
      },
      { onClick: (loc) => logFn(`Clicked error card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Error', card3));

    // Warn card
    const card4 = buildRoundCard(
      {
        round: { ...roundKey, eventName: EVENT_NAME, roundName: 'SF', roundNumber: 8 },
        locator: { date: DAY1, venueId: 'VENUE_A', index: 3, roundKey: { ...roundKey, roundNumber: 8 } },
        isSelected: false,
        severity: 'WARN',
      },
      { onClick: (loc) => logFn(`Clicked warn card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Warning', card4));

    // Segment card
    const card5 = buildRoundCard(
      {
        round: { ...roundKey, eventName: EVENT_NAME, roundName: 'R32', roundSegment: { segmentNumber: 1, segmentsCount: 2 } },
        locator: { date: DAY1, venueId: 'VENUE_A', index: 4, roundKey, roundSegment: { segmentNumber: 1, segmentsCount: 2 } },
        isSelected: false,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked segment card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('With Segment', card5));

    // Not-before card
    const card6 = buildRoundCard(
      {
        round: { ...roundKey, eventName: EVENT_NAME, roundName: 'F', roundNumber: 9, notBeforeTime: '14:00' },
        locator: { date: DAY1, venueId: 'VENUE_A', index: 5, roundKey: { ...roundKey, roundNumber: 9 } },
        isSelected: false,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked NB card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Not Before Time', card6));

    return root;
  },
};

function labelCard(label: string, card: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  const lbl = document.createElement('div');
  lbl.textContent = label;
  lbl.style.cssText = 'font-size: 11px; color: var(--sp-muted); margin-bottom: 6px; font-weight: 600;';
  wrap.appendChild(lbl);
  wrap.appendChild(card);
  return wrap;
}

// ============================================================================
// Date Strip
// ============================================================================

export const DateStrip = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT + ' max-width: 360px;';

    const store = new ProfileStore(makeBaseConfig({ initialProfile: ERROR_PROFILE }));
    const panel = buildDateStrip({
      onDateSelected: (date) => {
        store.selectDate(date);
        panel.update(store.getState());
        logFn(`Selected date: ${date}`);
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    const logFn = addStatusLog(root);

    return root;
  },
};

// ============================================================================
// Issues Panel
// ============================================================================

export const IssuesPanel = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new ProfileStore(makeBaseConfig({ initialProfile: ERROR_PROFILE }));
    const logFn = addStatusLog(root);

    const panel = buildIssuesPanel({
      onFixAction: (action) => {
        logFn(`Fix action: ${action.kind} — ${action.label}`);
        store.applyFixAction(action);
        panel.update(store.getState());
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

export const IssuesPanelEmpty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildIssuesPanel({
      onFixAction: () => {},
    });

    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  },
};

// ============================================================================
// Venue Board
// ============================================================================

export const VenueBoard = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT;

    const store = new ProfileStore(makeBaseConfig({ initialProfile: VALID_PROFILE }));
    const logFn = addStatusLog(root);

    const panel = buildVenueBoard({
      onDrop: (drag, drop) => {
        const result = store.dropRound(drag, drop);
        if (result.ok) {
          logFn(`Drop OK: ${drop.venueId} idx=${drop.index}`);
        } else {
          logFn(`Drop REJECTED: ${result.errorMessage}`);
        }
        panel.update(store.getState());
      },
      onCardClick: (locator) => {
        store.selectCard(locator);
        panel.update(store.getState());
        logFn(`Selected: ${locator.venueId} idx=${locator.index}`);
      },
      onCardContextMenu: (locator) => {
        logFn(`Context menu: ${locator.venueId} idx=${locator.index}`);
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

export const VenueBoardWithErrors = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT;

    const store = new ProfileStore(makeBaseConfig({ initialProfile: ERROR_PROFILE }));
    const logFn = addStatusLog(root);

    const panel = buildVenueBoard({
      onDrop: (drag, drop) => {
        const result = store.dropRound(drag, drop);
        logFn(result.ok ? `Drop OK` : `Drop REJECTED: ${result.errorMessage}`);
        panel.update(store.getState());
      },
      onCardClick: (locator) => {
        store.selectCard(locator);
        panel.update(store.getState());
        logFn(`Selected: ${locator.venueId} idx=${locator.index}`);
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

export const VenueBoardEmpty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT;

    const panel = buildVenueBoard({
      onDrop: () => {},
      onCardClick: () => {},
    });

    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  },
};

// ============================================================================
// Round Catalog
// ============================================================================

export const RoundCatalogByEvent = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new ProfileStore(makeBaseConfig());
    const logFn = addStatusLog(root);

    const panel = buildRoundCatalog({
      onSearchChange: (q) => {
        store.setCatalogSearch(q);
        panel.update(store.getState());
        logFn(`Search: "${q}"`);
      },
      onGroupByChange: (mode) => {
        store.setCatalogGroupBy(mode);
        panel.update(store.getState());
        logFn(`Group by: ${mode}`);
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

export const RoundCatalogWithPlanned = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'background: var(--sp-bg); ' +
      'height: 100vh; max-width: 400px; padding: 20px; display: flex; flex-direction: column; gap: 12px;' +
      ' font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 12px; color: var(--sp-muted); flex-shrink: 0;';
    heading.textContent =
      'Fixed-height container (100vh). Expand all groups — the catalog body should scroll. ' +
      'Planned rounds are dimmed.';
    root.appendChild(heading);

    const store = new ProfileStore(makeBaseConfig({ initialProfile: VALID_PROFILE }));

    const panel = buildRoundCatalog({
      onSearchChange: (q) => {
        store.setCatalogSearch(q);
        panel.update(store.getState());
      },
      onGroupByChange: (mode) => {
        store.setCatalogGroupBy(mode);
        panel.update(store.getState());
      },
    });

    // Panel fills remaining space in the flex column
    panel.element.style.flex = '1';
    panel.element.style.minHeight = '0';
    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

// ============================================================================
// Inspector Panel
// ============================================================================

export const InspectorEmpty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildInspectorPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  },
};

export const InspectorWithSelection = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new ProfileStore(makeBaseConfig({ initialProfile: VALID_PROFILE }));

    // Select the first card
    store.selectCard({
      date: DAY1,
      venueId: 'VENUE_A',
      index: 0,
      roundKey: { tournamentId: 'T1', eventId: 'E_MS_U16', drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 5 },
    });

    const panel = buildInspectorPanel();
    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

export const InspectorWithErrors = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new ProfileStore(makeBaseConfig({ initialProfile: ERROR_PROFILE }));

    // Select a card that has errors
    store.selectCard({
      date: DAY1,
      venueId: 'VENUE_A',
      index: 0,
      roundKey: { tournamentId: 'T1', eventId: 'E_MS_U16', drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 6 },
    });

    const panel = buildInspectorPanel();
    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};
