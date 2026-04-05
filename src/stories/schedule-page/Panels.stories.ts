/**
 * Schedule Page — Individual Panel Stories
 *
 * Tests each UI panel in isolation to verify rendering, interactions,
 * and state updates independently before testing the full assembly.
 */

import type { SchedulePageState } from '../../components/schedule-page';
import { SchedulePageStore } from '../../components/schedule-page';
import { buildMatchUpCard } from '../../components/schedule-page/ui/matchUpCard';
import { buildMatchUpCatalog } from '../../components/schedule-page/ui/matchUpCatalog';
import { buildScheduleDateStrip } from '../../components/schedule-page/ui/dateStrip';
import { buildScheduleIssuesPanel } from '../../components/schedule-page/ui/issuesPanel';
import { buildScheduleInspectorPanel } from '../../components/schedule-page/ui/inspectorPanel';
import { buildCourtGridSlot } from '../../components/schedule-page/ui/courtGridSlot';

import {
  MATCHUP_CATALOG,
  MALE_NAMES,
  SCHEDULE_DATES,
  NO_ISSUES,
  SAMPLE_ISSUES,
  makeMockCourtGrid,
  makeConfig
} from './data';

export default {
  title: 'Schedule Page/Panels'
};

// ── Helpers ────────────────────────────────────────────────────────────────

const SP_ROOT =
  'background: var(--sp-bg); min-height: 400px; padding: 20px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';
const SP_ROOT_NARROW = SP_ROOT + ' max-width: 400px;';

function makeStoreState(overrides: Partial<SchedulePageState> = {}): SchedulePageState {
  return {
    matchUpCatalog: MATCHUP_CATALOG,
    scheduleDates: SCHEDULE_DATES,
    issues: NO_ISSUES,
    selectedDate: '2026-06-15',
    selectedMatchUp: null,
    catalogSearchQuery: '',
    catalogGroupBy: 'event',
    catalogFilters: {},
    showCompleted: false,
    showScheduled: false,
    scheduledBehavior: 'dim',
    schedulingMode: 'immediate',
    pendingActions: [],
    hasUnsavedChanges: false,
    leftCollapsed: false,
    hideLeft: false,
    ...overrides
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
// MatchUp Card Variants
// ============================================================================

export const MatchUpCards = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT;

    const heading = document.createElement('h3');
    heading.textContent = 'MatchUp Card Variants';
    heading.style.cssText = 'margin-bottom: 16px; font-size: 14px;';
    root.appendChild(heading);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 900px;';
    root.appendChild(grid);

    const logFn = addStatusLog(root);

    // Unscheduled with sides
    const card1 = buildMatchUpCard(MATCHUP_CATALOG[0], {
      onClick: (m) => logFn(`Clicked: ${m.matchUpId}`)
    });
    grid.appendChild(labelCard('Unscheduled (draggable)', card1));

    // Scheduled (dimmed + checkmark)
    const card2 = buildMatchUpCard(MATCHUP_CATALOG[4], {
      onClick: (m) => logFn(`Clicked scheduled: ${m.matchUpId}`)
    });
    grid.appendChild(labelCard('Scheduled (dimmed)', card2));

    // Doubles (no sides)
    const card3 = buildMatchUpCard(MATCHUP_CATALOG[10], {
      onClick: (m) => logFn(`Clicked doubles: ${m.matchUpId}`)
    });
    grid.appendChild(labelCard('Doubles — No sides', card3));

    // With seed numbers
    const seeded = {
      ...MATCHUP_CATALOG[0],
      sides: [
        { participantName: MALE_NAMES[0], participantId: 'PM0', seedNumber: 1 },
        { participantName: MALE_NAMES[1], participantId: 'PM1', seedNumber: 8 }
      ]
    };
    const card4 = buildMatchUpCard(seeded, {
      onClick: (m) => logFn(`Clicked seeded: ${m.matchUpId}`)
    });
    grid.appendChild(labelCard('With Seeds [1] vs [8]', card4));

    // Scheduled with time + court chips
    const card5 = buildMatchUpCard(MATCHUP_CATALOG[5], {
      onClick: (m) => logFn(`Clicked: ${m.matchUpId}`)
    });
    grid.appendChild(labelCard('Scheduled — Time + Court chips', card5));

    // Selected state
    const card6 = buildMatchUpCard(MATCHUP_CATALOG[2], {
      onClick: (m) => logFn(`Clicked selected: ${m.matchUpId}`)
    });
    card6.classList.add('selected');
    grid.appendChild(labelCard('Selected', card6));

    return root;
  }
};

// ============================================================================
// Date Strip
// ============================================================================

export const DateStrip = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT + ' max-width: 360px;';

    const store = new SchedulePageStore(makeConfig({ issues: SAMPLE_ISSUES }));
    const logFn = addStatusLog(root);

    const panel = buildScheduleDateStrip({
      onDateSelected: (date) => {
        store.selectDate(date);
        panel.update(store.getState());
        logFn(`Selected date: ${date}`);
      }
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  }
};

// ============================================================================
// Issues Panel
// ============================================================================

export const IssuesPanel = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildScheduleIssuesPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState({ issues: SAMPLE_ISSUES }));

    return root;
  }
};

export const IssuesPanelEmpty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildScheduleIssuesPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  }
};

// ============================================================================
// MatchUp Catalog
// ============================================================================

export const MatchUpCatalogByEvent = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new SchedulePageStore(makeConfig());
    const logFn = addStatusLog(root);

    const panel = buildMatchUpCatalog({
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
      onFilterChange: (filters) => {
        store.setCatalogFilters(filters);
        panel.update(store.getState());
        logFn(`Filters: ${JSON.stringify(filters)}`);
      },
      onShowCompletedChange: (show) => {
        store.setShowCompleted(show);
        panel.update(store.getState());
        logFn(`Show completed: ${show}`);
      },
      onMatchUpSelected: (m) => {
        store.selectMatchUp(m);
        panel.update(store.getState());
        logFn(`Selected: ${m.matchUpId}`);
      }
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  }
};

export const MatchUpCatalogWithScheduled = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'background: var(--sp-bg); height: 100vh; max-width: 400px; padding: 20px; display: flex; flex-direction: column; gap: 12px;' +
      ' font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 12px; color: var(--sp-muted); flex-shrink: 0;';
    heading.textContent =
      'Fixed-height (100vh). Scheduled matchUps are dimmed with checkmarks. Expand groups to test scrolling. Drop zone at bottom.';
    root.appendChild(heading);

    const store = new SchedulePageStore(makeConfig());

    const panel = buildMatchUpCatalog({
      onSearchChange: (q) => {
        store.setCatalogSearch(q);
        panel.update(store.getState());
      },
      onGroupByChange: (mode) => {
        store.setCatalogGroupBy(mode);
        panel.update(store.getState());
      },
      onFilterChange: (filters) => {
        store.setCatalogFilters(filters);
        panel.update(store.getState());
      },
      onShowCompletedChange: (show) => {
        store.setShowCompleted(show);
        panel.update(store.getState());
      },
      onMatchUpSelected: (m) => {
        store.selectMatchUp(m);
        panel.update(store.getState());
      },
      onDropRemove: (id) => {
        console.log('Unschedule:', id);
      }
    });

    panel.element.style.flex = '1';
    panel.element.style.minHeight = '0';
    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  }
};

// ============================================================================
// Inspector Panel
// ============================================================================

export const InspectorEmpty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildScheduleInspectorPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  }
};

export const InspectorWithSelection = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildScheduleInspectorPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState({ selectedMatchUp: MATCHUP_CATALOG[0] }));

    return root;
  }
};

export const InspectorScheduledMatchUp = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const panel = buildScheduleInspectorPanel();
    root.appendChild(panel.element);
    panel.update(makeStoreState({ selectedMatchUp: MATCHUP_CATALOG[4] }));

    return root;
  }
};

// ============================================================================
// Court Grid Slot
// ============================================================================

export const CourtGridSlot = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT + ' height: 600px; display: flex; flex-direction: column;';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px; flex-shrink: 0;';
    heading.textContent = 'Court grid slot with a mock 6-court grid. Drag matchUps onto cells.';
    root.appendChild(heading);

    const logFn = addStatusLog(root);

    const panel = buildCourtGridSlot(makeMockCourtGrid(6).element, {
      onMatchUpDrop: (payload, event) => {
        logFn(`Dropped: ${payload.matchUp.matchUpId} at (${event.clientX}, ${event.clientY})`);
      }
    });

    panel.element.style.flex = '1';
    panel.element.style.minHeight = '0';
    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  }
};

export const CourtGridSlotEmpty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT + ' height: 400px; display: flex; flex-direction: column;';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px; flex-shrink: 0;';
    heading.textContent = 'Court grid slot with no injected element — empty center panel.';
    root.appendChild(heading);

    const panel = buildCourtGridSlot(undefined, {});
    panel.element.style.flex = '1';
    panel.element.style.minHeight = '0';
    root.appendChild(panel.element);
    panel.update(makeStoreState());

    return root;
  }
};
