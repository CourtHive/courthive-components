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
import { SP_CSS_VARS } from '../../components/scheduling-profile/ui/styles';

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

const DARK_BG =
  'background: linear-gradient(180deg, #070a0f, #0b1020 40%, #070a0f); min-height: 400px; padding: 20px;';

function applyVars(el: HTMLElement): void {
  for (const [key, value] of Object.entries(SP_CSS_VARS)) {
    el.style.setProperty(key, value);
  }
  el.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
  el.style.color = 'var(--sp-text)';
}

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
    ...overrides,
  };
}

function addStatusLog(container: HTMLElement): (msg: string) => void {
  const log = document.createElement('div');
  log.style.cssText =
    'margin-top: 16px; padding: 12px; background: rgba(15,23,42,0.8); border: 1px solid rgba(148,163,184,0.2); border-radius: 8px; font-size: 12px; color: #94a3b8; max-height: 150px; overflow: auto;';
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
    root.style.cssText = DARK_BG;
    applyVars(root);

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
        round: { ...roundKey, eventName: 'Boys U16 Singles', roundName: 'R32' },
        locator: { date: '2026-06-15', venueId: 'VENUE_A', index: 0, roundKey },
        isSelected: false,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked: ${loc.date} ${loc.venueId} idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Normal', card1));

    // Selected card
    const card2 = buildRoundCard(
      {
        round: { ...roundKey, eventName: 'Boys U16 Singles', roundName: 'R16', roundNumber: 6 },
        locator: { date: '2026-06-15', venueId: 'VENUE_A', index: 1, roundKey: { ...roundKey, roundNumber: 6 } },
        isSelected: true,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked selected card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Selected', card2));

    // Error card
    const card3 = buildRoundCard(
      {
        round: { ...roundKey, eventName: 'Boys U16 Singles', roundName: 'QF', roundNumber: 7 },
        locator: { date: '2026-06-15', venueId: 'VENUE_A', index: 2, roundKey: { ...roundKey, roundNumber: 7 } },
        isSelected: false,
        severity: 'ERROR',
      },
      { onClick: (loc) => logFn(`Clicked error card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Error', card3));

    // Warn card
    const card4 = buildRoundCard(
      {
        round: { ...roundKey, eventName: 'Boys U16 Singles', roundName: 'SF', roundNumber: 8 },
        locator: { date: '2026-06-15', venueId: 'VENUE_A', index: 3, roundKey: { ...roundKey, roundNumber: 8 } },
        isSelected: false,
        severity: 'WARN',
      },
      { onClick: (loc) => logFn(`Clicked warn card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('Warning', card4));

    // Segment card
    const card5 = buildRoundCard(
      {
        round: { ...roundKey, eventName: 'Boys U16 Singles', roundName: 'R32', roundSegment: { segmentNumber: 1, segmentsCount: 2 } },
        locator: { date: '2026-06-15', venueId: 'VENUE_A', index: 4, roundKey, roundSegment: { segmentNumber: 1, segmentsCount: 2 } },
        isSelected: false,
        severity: null,
      },
      { onClick: (loc) => logFn(`Clicked segment card: idx=${loc.index}`) },
    );
    grid.appendChild(labelCard('With Segment', card5));

    // Not-before card
    const card6 = buildRoundCard(
      {
        round: { ...roundKey, eventName: 'Boys U16 Singles', roundName: 'F', roundNumber: 9, notBeforeTime: '14:00' },
        locator: { date: '2026-06-15', venueId: 'VENUE_A', index: 5, roundKey: { ...roundKey, roundNumber: 9 } },
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
  lbl.style.cssText = 'font-size: 11px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;';
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
    root.style.cssText = DARK_BG + 'max-width: 360px;';
    applyVars(root);

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
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

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
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

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
    root.style.cssText = DARK_BG;
    applyVars(root);

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
      onCardContextMenu: (locator, _target) => {
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
    root.style.cssText = DARK_BG;
    applyVars(root);

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
    root.style.cssText = DARK_BG;
    applyVars(root);

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
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

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
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 12px; color: #94a3b8; margin-bottom: 12px;';
    heading.textContent = 'Planned rounds are dimmed in the catalog. Try dragging a round.';
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
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

    const panel = buildInspectorPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  },
};

export const InspectorWithSelection = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

    const store = new ProfileStore(makeBaseConfig({ initialProfile: VALID_PROFILE }));

    // Select the first card
    store.selectCard({
      date: '2026-06-15',
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
    root.style.cssText = DARK_BG + 'max-width: 400px;';
    applyVars(root);

    const store = new ProfileStore(makeBaseConfig({ initialProfile: ERROR_PROFILE }));

    // Select a card that has errors
    store.selectCard({
      date: '2026-06-15',
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
