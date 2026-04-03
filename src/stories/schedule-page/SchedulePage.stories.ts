/**
 * Schedule Page — Full Integration Stories
 *
 * Tests the complete 3-column schedule page with:
 * - Date strip + issues panel (collapsible left)
 * - Court grid slot (center, consumer-injected)
 * - MatchUp catalog + inspector panel (right)
 * - Scheduling modes: immediate and bulk
 *
 * Stories:
 * - Empty: No matchUps, no issues — baseline layout
 * - WithMatchUps: 12 matchUps, mock court grid, search/group/drag
 * - WithIssues: Scheduling conflicts displayed in left panel
 * - BulkMode: Demonstrates bulk scheduling with save/discard
 * - ManyMatchUps: Larger catalog, 7-day schedule, 8-court grid
 * - HideScheduled: scheduledBehavior='hide' filters scheduled matchUps
 * - ProgrammaticControl: Button-driven store manipulation
 * - InteractiveGrid: Drag within grid, drag-back-to-catalog, click/dblclick, max-height
 * - GridCellEvents: Focused demo of click, double-click, and right-click on grid cells
 */

import { createSchedulePage, SchedulePageControl } from '../../components/schedule-page';

import {
  LARGE_CATALOG,
  SCROLLING_CATALOG,
  MATCHUP_CATALOG,
  SCHEDULE_DATES,
  SCHEDULE_DATES_WEEK,
  SAMPLE_ISSUES,
  makeMockCourtGrid,
  makeConfig
} from './data';

import type { ScheduleCellConfig } from '../../components/schedule-page';
import { DEFAULT_SCHEDULE_CELL_CONFIG } from '../../components/schedule-page';

import {
  createSchedulePageSetup,
  buildCatalogFromFactory,
  buildScheduleDates,
  buildFactoryGrid,
  scheduleMatchUpViaFactory,
  unscheduleMatchUpViaFactory,
  buildIssuesFromFactory
} from './factoryData';

import { activateScheduleCellTypeAhead } from '../../components/schedule-page';
import { tipster } from '../../components/popover/tipster';
import { matchUpLabel } from '../../components/schedule-page/domain/utils';

export default {
  title: 'Schedule Page/Full',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' }
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────

const ROOT_STYLE = 'background: var(--sp-bg); height: 100vh; display: flex; flex-direction: column;';
const INFO_STYLE =
  'font-size: 12px; color: var(--sp-muted); padding: 12px 16px; font-family: ui-sans-serif, system-ui, sans-serif; flex-shrink: 0;';
const FLEX_CONTAINER = 'flex: 1; min-height: 0;';

function addFooter(container: HTMLElement, control: SchedulePageControl, extra?: (bar: HTMLElement) => void): void {
  const footer = document.createElement('div');
  footer.style.cssText =
    'padding: 12px 16px; border-top: 1px solid var(--sp-line); font-size: 12px; color: var(--sp-muted); font-family: ui-sans-serif, system-ui, sans-serif; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; flex-shrink: 0;';

  const statusEl = document.createElement('span');
  statusEl.textContent = 'Drag matchUps from the catalog (right) onto the court grid (center).';

  const stateBtn = document.createElement('button');
  stateBtn.textContent = 'Log State (console)';
  stateBtn.style.cssText = btnStyle();
  stateBtn.addEventListener('click', () => {
    console.log('Schedule Page State:', control.getStore().getState());
    statusEl.textContent = 'State logged to console.';
  });

  footer.appendChild(stateBtn);
  if (extra) extra(footer);
  footer.appendChild(statusEl);
  container.appendChild(footer);
}

function btnStyle(): string {
  return 'padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sp-border); background: var(--sp-card-bg); color: var(--sp-text); cursor: pointer; font-size: 12px;';
}

function makeBtn(text: string, handler: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = btnStyle();
  btn.addEventListener('click', handler);
  return btn;
}

function createLogFn(logEl: HTMLElement): (msg: string) => void {
  return (msg: string) => {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  };
}

// ============================================================================
// Empty
// ============================================================================

export const Empty = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Empty schedule page with no matchUps. Shows the 3-column layout with collapsible left panel. Click the arrow button to toggle the sidebar.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(
      makeConfig({
        matchUpCatalog: [],
        scheduleDates: SCHEDULE_DATES,
        courtGridElement: makeMockCourtGrid(4).element
      }),
      container
    );

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// With MatchUps
// ============================================================================

export const WithMatchUps = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      '12 matchUps across 3 events. Drag unscheduled matchUps from the catalog onto the court grid. Search by participant name. Group by event/draw/round/structure. Scheduled matchUps appear dimmed with a checkmark.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(
      makeConfig({
        onDateSelected: (date) => console.log('Date selected:', date),
        onMatchUpDrop: (payload, event) => {
          console.log('MatchUp dropped:', payload.matchUp.matchUpId, event);
        },
        onMatchUpRemove: (id) => console.log('MatchUp unscheduled:', id),
        onMatchUpSelected: (m) => console.log('MatchUp selected:', m?.matchUpId ?? 'none')
      }),
      container
    );

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// With Issues
// ============================================================================

export const WithIssues = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = [
      '<strong>5 scheduling conflicts:</strong>',
      '2 ERRORs (back-to-back, double-booked), 2 WARNs (overloaded court, capacity), 1 INFO (no court assigned).',
      'The Issues panel in the left sidebar shows all conflicts sorted by severity.'
    ].join('<br>');
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(makeConfig({ issues: SAMPLE_ISSUES }), container);

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Bulk Mode
// ============================================================================

export const BulkMode = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Bulk scheduling mode: drops accumulate in a pending queue. Use Save to flush all pending actions, or Discard to cancel. The pending count shows in the footer.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const statusEl = document.createElement('div');
    statusEl.style.cssText =
      'padding: 8px 16px; font-size: 12px; font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-accent); flex-shrink: 0;';
    statusEl.textContent = 'No pending actions.';

    const control = createSchedulePage(
      makeConfig({
        schedulingMode: 'bulk',
        onBulkSave: (actions) => {
          console.log('Bulk save:', actions);
          statusEl.textContent = `Saved ${actions.length} actions! See console.`;
          statusEl.style.color = 'var(--sp-ok-text)';
        }
      }),
      container
    );

    const store = control.getStore();
    store.subscribe((state) => {
      if (state.hasUnsavedChanges) {
        statusEl.textContent = `${state.pendingActions.length} pending actions (unsaved)`;
        statusEl.style.color = 'var(--sp-warn-text)';
      } else {
        statusEl.textContent = 'No pending actions.';
        statusEl.style.color = 'var(--sp-accent)';
      }
    });

    root.appendChild(statusEl);

    addFooter(root, control, (bar) => {
      bar.appendChild(
        makeBtn('Save', () => {
          control.save();
        })
      );
      bar.appendChild(
        makeBtn('Discard', () => {
          control.discardPending();
        })
      );
      bar.appendChild(
        makeBtn('Check hasUnsavedChanges', () => {
          console.log('hasUnsavedChanges:', control.hasUnsavedChanges);
        })
      );
    });

    return root;
  }
};

// ============================================================================
// Many MatchUps (larger catalog, week schedule, 8 courts)
// ============================================================================

export const ManyMatchUps = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      '16 matchUps across 3 events, 7-day schedule, 8-court grid. Tests scrolling in the catalog and a wider court grid layout.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(
      makeConfig({
        matchUpCatalog: LARGE_CATALOG,
        scheduleDates: SCHEDULE_DATES_WEEK,
        issues: SAMPLE_ISSUES.slice(0, 3),
        courtGridElement: makeMockCourtGrid(8).element
      }),
      container
    );

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Hide Scheduled
// ============================================================================

export const HideScheduled = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'scheduledBehavior="hide" — already-scheduled matchUps are filtered out of the catalog entirely, showing only unscheduled items.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(makeConfig({ scheduledBehavior: 'hide' }), container);

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Programmatic Control
// ============================================================================

export const ProgrammaticControl = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Demonstrates programmatic control of the store. Use the buttons to manipulate the schedule page state.';
    root.appendChild(info);

    // Button bar
    const btnBar = document.createElement('div');
    btnBar.style.cssText =
      'display: flex; gap: 8px; padding: 8px 16px; font-family: ui-sans-serif, system-ui, sans-serif; flex-wrap: wrap; flex-shrink: 0;';
    root.appendChild(btnBar);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(makeConfig(), container);
    const store = control.getStore();

    // Status text
    const status = document.createElement('div');
    status.style.cssText =
      'padding: 8px 16px; font-size: 12px; color: var(--sp-accent); font-family: ui-sans-serif, system-ui, sans-serif; flex-shrink: 0;';
    root.appendChild(status);

    function updateStatus(): void {
      const state = store.getState();
      const unscheduled = state.matchUpCatalog.filter((m) => !m.isScheduled).length;
      status.textContent = `MatchUps: ${state.matchUpCatalog.length} total, ${unscheduled} unscheduled | Date: ${state.selectedDate} | Search: "${state.catalogSearchQuery}" | Group: ${state.catalogGroupBy}`;
    }
    store.subscribe(updateStatus);
    updateStatus();

    // Navigation
    btnBar.appendChild(makeBtn('Day 1', () => store.selectDate('2026-06-15')));
    btnBar.appendChild(makeBtn('Day 2', () => store.selectDate('2026-06-16')));
    btnBar.appendChild(makeBtn('Day 3', () => store.selectDate('2026-06-17')));

    // Search
    btnBar.appendChild(makeBtn('Search "alice"', () => store.setCatalogSearch('alice')));
    btnBar.appendChild(makeBtn('Search "doubles"', () => store.setCatalogSearch('doubles')));
    btnBar.appendChild(makeBtn('Clear search', () => store.setCatalogSearch('')));

    // Group by
    btnBar.appendChild(makeBtn('Group: Event', () => store.setCatalogGroupBy('event')));
    btnBar.appendChild(makeBtn('Group: Draw', () => store.setCatalogGroupBy('draw')));
    btnBar.appendChild(makeBtn('Group: Round', () => store.setCatalogGroupBy('round')));
    btnBar.appendChild(makeBtn('Group: Structure', () => store.setCatalogGroupBy('structure')));

    // Toggle sidebar
    btnBar.appendChild(makeBtn('Toggle Sidebar', () => store.toggleLeftPanel()));

    // Push new data
    btnBar.appendChild(
      makeBtn('Add Issues', () => {
        control.setIssues(SAMPLE_ISSUES);
        status.textContent = 'Issues pushed!';
      })
    );
    btnBar.appendChild(
      makeBtn('Clear Issues', () => {
        control.setIssues([]);
        status.textContent = 'Issues cleared.';
      })
    );
    btnBar.appendChild(
      makeBtn(`Load ${LARGE_CATALOG.length} MatchUps`, () => {
        const before = store.getState().matchUpCatalog.length;
        control.setMatchUpCatalog(LARGE_CATALOG);
        status.textContent = `Catalog: ${before} → ${LARGE_CATALOG.length} matchUps (added QF rounds + extra R16 scheduled)`;
      })
    );

    return root;
  }
};

// ============================================================================
// No Court Grid (consumer provides nothing)
// ============================================================================

export const NoCourtGrid = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Schedule page without a court grid element — the center panel is empty. This is the state before the consumer injects a Tabulator table or custom grid.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(makeConfig({ courtGridElement: undefined }), container);

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Interactive Grid — drag within grid, drag-back, click/dblclick, max-height
// ============================================================================

export const InteractiveGrid = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = [
      '<strong>Interactive Grid Demo:</strong>',
      'Drag matchUps from the catalog onto the grid. Once placed, drag them between cells or back to the catalog to unschedule.',
      '<strong>Cell events:</strong> Click, double-click, or right-click any grid cell (empty or filled) — events appear in the log below.',
      'Grid has sticky headers (scroll to verify), max-height of 500px, and 10 courts for horizontal scroll.'
    ].join('<br>');
    root.appendChild(info);

    // Event log panel
    const logEl = document.createElement('div');
    logEl.style.cssText =
      'max-height: 120px; overflow: auto; padding: 8px 16px; font-size: 11px; color: var(--sp-muted); font-family: monospace; background: var(--sp-card-bg); border-top: 1px solid var(--sp-line); flex-shrink: 0;';
    logEl.innerHTML = '<div style="font-weight:700; margin-bottom:4px;">Event Log</div>';

    const log = createLogFn(logEl);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const mockGrid = makeMockCourtGrid(10, {
      onCellClick: (time, court, m) => {
        const detail = m ? m.matchUpId + ': ' + m.eventName : '(empty cell)';
        log(`CLICK: ${court} @ ${time} — ${detail}`);
      },
      onCellDblClick: (time, court, m) => {
        const side1 = m?.sides?.[0]?.participantName ?? 'TBD';
        const side2 = m?.sides?.[1]?.participantName ?? 'TBD';
        const detail = m ? m.matchUpId + ': ' + side1 + ' vs ' + side2 : '(empty cell)';
        log(`DBLCLICK: ${court} @ ${time} — ${detail}`);
      },
      onCellRightClick: (time, court, m) => {
        const detail = m
          ? m.matchUpId + ': context menu for ' + m.eventName
          : '(empty cell — could show "Add matchUp" menu)';
        log(`RIGHT-CLICK: ${court} @ ${time} — ${detail}`);
      }
    });

    const control = createSchedulePage(
      makeConfig({
        courtGridElement: mockGrid.element,
        gridMaxHeight: '500px',
        onMatchUpDrop: (payload) => {
          log(`Drop callback: ${payload.matchUp.matchUpId} (type: ${payload.type})`);
        },
        onMatchUpRemove: (id) => {
          mockGrid.removeMatchUp(id);
          log(`Unschedule callback: ${id} — removed from grid`);
        }
      }),
      container
    );

    root.appendChild(logEl);
    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Scrolling Catalog — 32 matchUps across 5 events, forces vertical scroll
// ============================================================================

export const ScrollingCatalog = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = `${SCROLLING_CATALOG.length} matchUps across 5 events. The matchUp catalog on the right scrolls vertically — header and toolbar stay fixed while the card list scrolls. Expand all groups to see the full list.`;
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    const control = createSchedulePage(
      makeConfig({
        matchUpCatalog: SCROLLING_CATALOG,
        scheduleDates: SCHEDULE_DATES_WEEK,
        issues: SAMPLE_ISSUES,
        courtGridElement: makeMockCourtGrid(6).element
      }),
      container
    );

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Grid Cell Events — focused demo of click, double-click, right-click
// ============================================================================

export const GridCellEvents = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = [
      '<strong>Grid Cell Events:</strong> Try these interactions on the court grid cells below:',
      '&bull; <strong>Click</strong> any cell (empty or filled) — logs cell coordinates and matchUp info',
      '&bull; <strong>Double-click</strong> a cell — logs detailed participant info',
      '&bull; <strong>Right-click</strong> a cell — prevents browser context menu, logs a custom event',
      'Some cells are pre-filled with matchUps so you can try events on both empty and occupied cells.'
    ].join('<br>');
    root.appendChild(info);

    // Event log — placed above the grid for visibility
    const logEl = document.createElement('div');
    logEl.style.cssText =
      'max-height: 150px; overflow: auto; padding: 8px 16px; font-size: 11px; color: var(--sp-muted); font-family: monospace; background: var(--sp-card-bg); border: 1px solid var(--sp-line); margin: 0 16px; border-radius: 8px; flex-shrink: 0;';
    logEl.innerHTML =
      '<div style="font-weight:700; margin-bottom:4px;">Event Log (click, double-click, or right-click any grid cell)</div>';

    const log = createLogFn(logEl);

    root.appendChild(logEl);

    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    // Pre-fill some cells by placing already-scheduled matchUps in the catalog
    const prefilled = MATCHUP_CATALOG.slice(0, 6).map((m, i) => ({
      ...m,
      isScheduled: i < 3 // first 3 are scheduled (dimmed in catalog)
    }));

    const mockGrid = makeMockCourtGrid(4, {
      onCellClick: (time, court, m) => {
        if (m) {
          log(
            `CLICK — ${court} @ ${time}: ${m.eventName} — ${m.sides?.[0]?.participantName ?? 'TBD'} vs ${m.sides?.[1]?.participantName ?? 'TBD'}`
          );
        } else {
          log(`CLICK — ${court} @ ${time}: (empty cell)`);
        }
      },
      onCellDblClick: (time, court, m) => {
        if (m) {
          log(
            `DBLCLICK — ${court} @ ${time}: matchUpId=${m.matchUpId}, format=${m.matchUpFormat}, round=${m.roundName}`
          );
        } else {
          log(`DBLCLICK — ${court} @ ${time}: (empty cell — could open "schedule matchUp" dialog)`);
        }
      },
      onCellRightClick: (time, court, m) => {
        if (m) {
          log(
            `RIGHT-CLICK — ${court} @ ${time}: context menu for ${m.sides?.[0]?.participantName ?? 'TBD'} vs ${m.sides?.[1]?.participantName ?? 'TBD'}`
          );
        } else {
          log(`RIGHT-CLICK — ${court} @ ${time}: (empty cell — could show "Add matchUp" or "Block time" menu)`);
        }
      }
    });

    const control = createSchedulePage(
      makeConfig({
        matchUpCatalog: prefilled,
        courtGridElement: mockGrid.element,
        onMatchUpRemove: (id) => {
          mockGrid.removeMatchUp(id);
          log(`Unscheduled: ${id} — removed from grid`);
        }
      }),
      container
    );

    addFooter(root, control);
    return root;
  }
};

// ============================================================================
// Factory Backed — full scheduling workflow via tods-competition-factory
// ============================================================================

export const FactoryBacked = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    // Info banner
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = [
      '<strong>Factory-Backed Schedule Page</strong> — wired to tods-competition-factory.',
      '5 events (MS 32, MD 16, WS 32, WD 16, Team 8), 2 venues (12 courts), 4 active weekend dates.',
      'Drag matchUps from the catalog onto the grid to schedule. Drag from grid back to catalog to unschedule.',
      'Date navigation rebuilds the grid from factory state. Conflicts appear in the issues panel.',
      '<strong>Cell Config:</strong> Use the buttons below the grid to toggle fields and name formats.'
    ].join('<br>');
    root.appendChild(info);

    // Event log
    const logEl = document.createElement('div');
    logEl.style.cssText =
      'max-height: 100px; overflow: auto; padding: 6px 16px; font-size: 10px; color: var(--sp-muted); font-family: monospace; background: var(--sp-card-bg); border-top: 1px solid var(--sp-line); flex-shrink: 0;';
    logEl.innerHTML = '<div style="font-weight:700; margin-bottom:2px;">Event Log</div>';

    const log = createLogFn(logEl);

    // Cell config state
    let cellConfig: ScheduleCellConfig = {
      header: [...DEFAULT_SCHEDULE_CELL_CONFIG.header],
      body: [...DEFAULT_SCHEDULE_CELL_CONFIG.body],
      footer: [...DEFAULT_SCHEDULE_CELL_CONFIG.footer],
      participantDisplay: { ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay }
    };

    // 1. Create factory setup
    let setup: ReturnType<typeof createSchedulePageSetup>;
    try {
      setup = createSchedulePageSetup();
      log(
        `Tournament created: ${setup.tournamentId} — ${setup.allMatchUps.length} matchUps, ${setup.courts.length} courts`
      );
    } catch (err: any) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding: 20px; color: red; font-family: monospace;';
      errDiv.textContent = `Factory setup failed: ${err.message}`;
      root.appendChild(errDiv);
      return root;
    }

    // 2. Track selected date
    let selectedDate = setup.activeDates[0];

    // Forward-declare control so callbacks can reference it
    let control: SchedulePageControl;

    // Refresh helper — rebuilds everything from factory state
    function refresh(): void {
      grid.rebuild(selectedDate);
      const catalog = buildCatalogFromFactory(selectedDate);
      const dates = buildScheduleDates();
      const issues = buildIssuesFromFactory(selectedDate);
      control.setMatchUpCatalog(catalog);
      control.setScheduleDates(dates);
      control.setIssues(issues);
    }

    // Show tipster menu on empty cell click, with "Assign matchUp" → typeahead
    function showEmptyCellMenu(
      event: MouseEvent,
      cell: HTMLElement,
      courtId: string,
      venueId: string,
      courtOrder: number
    ): void {
      const assignMatchUp = () => {
        activateScheduleCellTypeAhead({
          cell,
          listProvider: () => {
            const catalog = buildCatalogFromFactory(selectedDate);
            return catalog
              .filter((m) => !m.isScheduled && (m.sides?.length ?? 0) >= 1)
              .map((m) => ({
                label: `${m.eventName} ${m.roundName || ''} — ${matchUpLabel(m)}`.trim(),
                value: m.matchUpId
              }));
          },
          onSelect: (matchUpId: string) => {
            const catalog = buildCatalogFromFactory(selectedDate);
            const item = catalog.find((m) => m.matchUpId === matchUpId);
            const drawId = item?.drawId ?? '';

            log(`Assigning ${matchUpId} → court=${courtId} row=${courtOrder}`);
            const result = scheduleMatchUpViaFactory(matchUpId, drawId, courtId, venueId, courtOrder, selectedDate);

            if (result.error) {
              log(`Assign ERROR: ${JSON.stringify(result.error)}`);
            } else {
              log(`Assigned ${matchUpId} successfully`);
            }

            refresh();
          },
          onCancel: () => {
            log(`TypeAhead cancelled on court=${courtId} row=${courtOrder}`);
          }
        });
      };

      const options = [
        { option: 'Assign matchUp', onClick: assignMatchUp },
        { option: 'Block court (1 row)', onClick: () => log(`Block 1 row on court=${courtId}`) },
        { option: 'Block court (2 rows)', onClick: () => log(`Block 2 rows on court=${courtId}`) }
      ];

      tipster({ options, target: event.target as HTMLElement, config: { placement: 'right' } });
    }

    // 3. Build initial data
    const grid = buildFactoryGrid(
      selectedDate,
      {
        onCellClick: (courtId, courtOrder, m, event, cell) => {
          if (m) {
            log(`CLICK: court=${courtId} row=${courtOrder} ${m.matchUpId}`);
          } else {
            // Empty cell — show menu with typeahead option
            const venueId = cell.getAttribute('data-venue-id') || '';
            showEmptyCellMenu(event, cell, courtId, venueId, courtOrder);
          }
        },
        onCellDblClick: (courtId, courtOrder, m) => {
          log(`DBLCLICK: court=${courtId} row=${courtOrder} ${m ? m.matchUpId : '(empty)'}`);
        },
        onCellRightClick: (courtId, courtOrder, m) => {
          log(`RIGHT-CLICK: court=${courtId} row=${courtOrder} ${m ? m.matchUpId : '(empty)'}`);
        }
      },
      cellConfig
    );

    const initialCatalog = buildCatalogFromFactory(selectedDate);
    const initialDates = buildScheduleDates();
    const initialIssues = buildIssuesFromFactory(selectedDate);

    log(`Initial: ${initialCatalog.length} catalog items, ${initialIssues.length} issues`);

    // 4. Create the schedule page
    const container = document.createElement('div');
    container.style.cssText = FLEX_CONTAINER;
    root.appendChild(container);

    control = createSchedulePage(
      {
        matchUpCatalog: initialCatalog,
        scheduleDates: initialDates,
        issues: initialIssues,
        courtGridElement: grid.element,
        scheduledBehavior: 'dim',

        onDateSelected: (date) => {
          selectedDate = date;
          log(`Date selected: ${date}`);
          refresh();
        },

        onMatchUpDrop: (payload, event) => {
          // Walk up from event.target to find the grid cell with data attributes
          let target = event.target as HTMLElement | null;
          while (target && !target.getAttribute('data-court-id')) {
            target = target.parentElement;
          }

          const courtId = target?.getAttribute('data-court-id');
          const venueId = target?.getAttribute('data-venue-id');
          const courtOrder = target?.getAttribute('data-court-order');

          if (!courtId || !venueId || !courtOrder) {
            log(`Drop failed: missing target attributes`);
            return;
          }

          // If the target cell already has a matchUp, unschedule it first (swap)
          const existingMatchUpId = target?.getAttribute('data-matchup-id');
          const existingDrawId = target?.getAttribute('data-draw-id');
          if (existingMatchUpId) {
            log(`Swapping: unscheduling ${existingMatchUpId} from court=${courtId} row=${courtOrder}`);
            unscheduleMatchUpViaFactory(existingMatchUpId, existingDrawId ?? '');
          }

          // If dragged from another grid cell, unschedule from the source too
          if (payload.type === 'GRID_MATCHUP') {
            const matchUp = payload.matchUp;
            const drawId = (matchUp as any).drawId ?? '';
            log(`Grid move: clearing source for ${matchUp.matchUpId}`);
            unscheduleMatchUpViaFactory(matchUp.matchUpId, drawId);
          }

          const matchUp = payload.matchUp;
          const drawId = (matchUp as any).drawId ?? '';

          log(`Scheduling ${matchUp.matchUpId} → court=${courtId} row=${courtOrder}`);

          const result = scheduleMatchUpViaFactory(
            matchUp.matchUpId,
            drawId,
            courtId,
            venueId,
            parseInt(courtOrder, 10),
            selectedDate
          );

          if (result.error) {
            log(`Schedule ERROR: ${JSON.stringify(result.error)}`);
          } else {
            log(`Scheduled ${matchUp.matchUpId} successfully`);
          }

          refresh();
        },

        onMatchUpRemove: (matchUpId) => {
          // Find the matchUp's drawId
          const catalog = buildCatalogFromFactory();
          const item = catalog.find((m) => m.matchUpId === matchUpId);
          const drawId = item?.drawId ?? '';

          log(`Unscheduling ${matchUpId} (drawId=${drawId})`);
          const result = unscheduleMatchUpViaFactory(matchUpId, drawId);

          if (result.error) {
            log(`Unschedule ERROR: ${JSON.stringify(result.error)}`);
          } else {
            log(`Unscheduled ${matchUpId} successfully`);
          }

          refresh();
        },

        onMatchUpSelected: (m) => {
          if (m) {
            log(`Selected: ${m.matchUpId} — ${m.eventName} ${m.roundName ?? ''}`);
          }
        }
      },
      container
    );

    root.appendChild(logEl);

    // Cell config controls
    const configBar = document.createElement('div');
    configBar.style.cssText =
      'padding: 8px 16px; border-top: 1px solid var(--sp-line); font-size: 11px; color: var(--sp-muted); font-family: ui-sans-serif, system-ui, sans-serif; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0;';

    const configLabel = document.createElement('span');
    configLabel.style.fontWeight = '700';
    configLabel.textContent = 'Cell Config:';
    configBar.appendChild(configLabel);

    type ScheduleCellField =
      | 'time'
      | 'eventRound'
      | 'participants'
      | 'score'
      | 'matchUpStatus'
      | 'matchUpFormat'
      | 'umpire';

    function toggleField(zone: 'header' | 'body' | 'footer', field: ScheduleCellField): void {
      const arr = cellConfig[zone];
      const idx = arr.indexOf(field);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(field);
      }
      grid.setCellConfig({ ...cellConfig });
      log(`Cell config: ${zone}.${field} ${idx >= 0 ? 'removed' : 'added'}`);
    }

    configBar.appendChild(makeBtn('+ Score in header', () => toggleField('header', 'score')));
    configBar.appendChild(makeBtn('+ Format in footer', () => toggleField('footer', 'matchUpFormat')));
    configBar.appendChild(makeBtn('+ Status badge', () => toggleField('footer', 'matchUpStatus')));
    configBar.appendChild(makeBtn('Toggle eventRound', () => toggleField('body', 'eventRound')));

    const nameFormats: Array<'full' | 'last' | 'lastFirst' | 'firstLast'> = ['full', 'last', 'lastFirst', 'firstLast'];
    let nameFormatIdx = 0;
    configBar.appendChild(
      makeBtn('Cycle name format', () => {
        nameFormatIdx = (nameFormatIdx + 1) % nameFormats.length;
        cellConfig.participantDisplay = {
          ...cellConfig.participantDisplay,
          nameFormat: nameFormats[nameFormatIdx]
        };
        grid.setCellConfig({ ...cellConfig });
        log(`Name format: ${nameFormats[nameFormatIdx]}`);
      })
    );

    configBar.appendChild(
      makeBtn('Toggle seeds', () => {
        cellConfig.participantDisplay = {
          ...cellConfig.participantDisplay,
          showSeed: !cellConfig.participantDisplay?.showSeed
        };
        grid.setCellConfig({ ...cellConfig });
        log(`Show seeds: ${cellConfig.participantDisplay.showSeed}`);
      })
    );

    configBar.appendChild(
      makeBtn('Reset config', () => {
        cellConfig = {
          header: [...DEFAULT_SCHEDULE_CELL_CONFIG.header],
          body: [...DEFAULT_SCHEDULE_CELL_CONFIG.body],
          footer: [...DEFAULT_SCHEDULE_CELL_CONFIG.footer],
          participantDisplay: { ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay }
        };
        nameFormatIdx = 0;
        grid.setCellConfig(cellConfig);
        log('Cell config reset to default');
      })
    );

    root.appendChild(configBar);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText =
      'padding: 8px 16px; border-top: 1px solid var(--sp-line); font-size: 11px; color: var(--sp-muted); font-family: ui-sans-serif, system-ui, sans-serif; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex-shrink: 0;';

    const statusEl = document.createElement('span');
    statusEl.textContent = `Factory-backed | ${setup.courts.length} courts | Active dates: ${setup.activeDates.join(', ')}`;
    footer.appendChild(statusEl);

    footer.appendChild(
      makeBtn('Log State', () => {
        console.log('Schedule Page State:', control.getStore().getState());
        log('State logged to console');
      })
    );

    footer.appendChild(
      makeBtn('Refresh', () => {
        refresh();
        log('Manual refresh');
      })
    );

    root.appendChild(footer);
    return root;
  }
};
