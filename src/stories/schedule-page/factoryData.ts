/**
 * Factory-backed data helpers for Schedule Page stories.
 *
 * Generates a realistic multi-event tournament via mocksEngine and extracts
 * everything needed for SchedulePageConfig. Uses competitionScheduleMatchUps
 * for real court grid data and proConflicts for conflict detection.
 */

import {
  mocksEngine,
  tournamentEngine,
  eventConstants,
  tieFormatConstants,
  scheduleConstants,
  matchUpStatusConstants,
} from 'tods-competition-factory';

import type {
  CatalogMatchUpItem,
  ScheduleDate,
  ScheduleIssue,
  ScheduleIssueSeverity,
  ScheduleCellConfig,
} from '../../components/schedule-page';

import {
  buildScheduleGridCell,
  mapMatchUpToCellData,
  DEFAULT_SCHEDULE_CELL_CONFIG,
} from '../../components/schedule-page';

const { DOMINANT_DUO } = tieFormatConstants;
const { DOUBLES, TEAM } = eventConstants;
const { BYE } = matchUpStatusConstants;
const {
  SCHEDULE_ERROR,
  SCHEDULE_CONFLICT,
  SCHEDULE_WARNING,
  SCHEDULE_ISSUE,
} = scheduleConstants;

// ============================================================================
// Types
// ============================================================================

export interface SchedulePageSetup {
  tournamentId: string;
  startDate: string;
  endDate: string;
  activeDates: string[];
  courts: any[];
  allMatchUps: any[];
}

export interface FactoryGrid {
  element: HTMLElement;
  removeMatchUp: (matchUpId: string) => void;
  rebuild: (date: string) => void;
  setCellConfig: (config: ScheduleCellConfig) => void;
}

interface FactoryGridCallbacks {
  onCellClick?: (courtId: string, courtOrder: number, matchUp: any | null) => void;
  onCellDblClick?: (courtId: string, courtOrder: number, matchUp: any | null) => void;
  onCellRightClick?: (courtId: string, courtOrder: number, matchUp: any | null, event: MouseEvent) => void;
}

// ============================================================================
// Constants
// ============================================================================

const START_DATE = '2026-06-13';
const END_DATE = '2026-06-21';

/** Only weekend days are active */
const ACTIVE_DATES = ['2026-06-13', '2026-06-14', '2026-06-20', '2026-06-21'];

const VENUE_PROFILES = [
  {
    venueName: 'Center Courts',
    venueAbbreviation: 'CC',
    courtsCount: 6,
    startTime: '08:00',
    endTime: '20:00',
  },
  {
    venueName: 'Outer Courts',
    venueAbbreviation: 'OC',
    courtsCount: 6,
    startTime: '08:00',
    endTime: '20:00',
  },
];

const EVENT_PROFILES = [
  {
    eventName: "Men's Singles",
    gender: 'MALE',
    drawProfiles: [{ drawSize: 32 }],
  },
  {
    eventName: "Men's Doubles",
    eventType: DOUBLES,
    gender: 'MALE',
    drawProfiles: [{ drawSize: 16 }],
  },
  {
    eventName: "Women's Singles",
    gender: 'FEMALE',
    drawProfiles: [{ drawSize: 32 }],
  },
  {
    eventName: "Women's Doubles",
    eventType: DOUBLES,
    gender: 'FEMALE',
    drawProfiles: [{ drawSize: 16 }],
  },
  {
    eventName: 'Team',
    eventType: TEAM,
    drawProfiles: [{ drawSize: 8, tieFormatName: DOMINANT_DUO }],
  },
];

// ============================================================================
// Date Helpers
// ============================================================================

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ============================================================================
// Core Setup
// ============================================================================

export function createSchedulePageSetup(): SchedulePageSetup {
  // 1. Generate tournament
  const result = mocksEngine.generateTournamentRecord({
    venueProfiles: VENUE_PROFILES,
    eventProfiles: EVENT_PROFILES,
    startDate: START_DATE,
    endDate: END_DATE,
  });

  const { tournamentRecord } = result;
  if (!tournamentRecord) {
    throw new Error(`Failed to generate tournament: ${JSON.stringify(result.error || 'unknown error')}`);
  }

  tournamentEngine.setState(tournamentRecord);

  // 2. Add court bookings
  const venues = tournamentRecord.venues || [];
  const ccVenue = venues.find((v: any) => v.venueName === 'Center Courts');
  const ocVenue = venues.find((v: any) => v.venueName === 'Outer Courts');

  // MAINTENANCE on CC Court 1 first Saturday morning
  const ccCourts: any[] = ccVenue?.courts || [];
  if (ccCourts[0]) {
    tournamentEngine.addCourtGridBooking({
      courtId: ccCourts[0].courtId,
      scheduledDate: '2026-06-13',
      bookingType: 'MAINTENANCE',
      courtOrder: 1,
      rowCount: 3,
    });
  }

  // PRACTICE on OC Court 3 first Sunday afternoon
  const ocCourts: any[] = ocVenue?.courts || [];
  if (ocCourts[2]) {
    tournamentEngine.addCourtGridBooking({
      courtId: ocCourts[2].courtId,
      scheduledDate: '2026-06-14',
      bookingType: 'PRACTICE',
      courtOrder: 8,
      rowCount: 3,
    });
  }

  // 3. Extract data
  const stateResult = tournamentEngine.getState();
  const record = stateResult?.tournamentRecord ?? tournamentRecord;
  const tournamentId = record.tournamentId;

  const { matchUps: allMatchUps } = tournamentEngine.allTournamentMatchUps({
    inContext: true,
    nextMatchUps: true,
  });

  // Collect all courts across venues
  const courts: any[] = [];
  for (const venue of record.venues || []) {
    for (const court of venue.courts || []) {
      courts.push({ ...court, venueId: venue.venueId, venueName: venue.venueName });
    }
  }

  return {
    tournamentId,
    startDate: START_DATE,
    endDate: END_DATE,
    activeDates: ACTIVE_DATES,
    courts,
    allMatchUps,
  };
}

// ============================================================================
// Catalog Builder
// ============================================================================

export function buildCatalogFromFactory(selectedDate?: string): CatalogMatchUpItem[] {
  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    inContext: true,
    nextMatchUps: true,
  });

  return (matchUps || [])
    .filter((m: any) => m.matchUpStatus !== BYE)
    .map((m: any) => {
      const isScheduled = !!(m.schedule?.courtId && m.schedule?.scheduledDate);
      const onSelectedDate = selectedDate ? m.schedule?.scheduledDate === selectedDate : true;

      return {
        matchUpId: m.matchUpId,
        eventId: m.eventId ?? '',
        eventName: m.eventName ?? '',
        drawId: m.drawId ?? '',
        drawName: m.drawName,
        structureId: m.structureId ?? '',
        roundNumber: m.roundNumber ?? 0,
        roundName: m.roundName,
        matchUpFormat: m.matchUpFormat,
        matchUpType: m.matchUpType,
        sides: (m.sides || []).map((s: any) => ({
          participantName: s.participant?.participantName ?? s.participantName,
          participantId: s.participantId ?? s.participant?.participantId,
          seedNumber: s.seedValue ?? s.seedNumber,
        })),
        isScheduled: isScheduled && onSelectedDate,
        scheduledTime: isScheduled ? m.schedule?.scheduledTime : undefined,
        scheduledCourtName: isScheduled ? m.schedule?.courtName : undefined,
      } satisfies CatalogMatchUpItem;
    });
}

// ============================================================================
// Schedule Dates Builder
// ============================================================================

export function buildScheduleDates(): ScheduleDate[] {
  const allDates = dateRange(START_DATE, END_DATE);

  // Count scheduled matchUps per date
  const { matchUps } = tournamentEngine.allTournamentMatchUps({ inContext: true });
  const dateCounts = new Map<string, number>();
  for (const m of matchUps || []) {
    const d = m.schedule?.scheduledDate;
    if (d) dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
  }

  return allDates.map((date) => ({
    date,
    isActive: ACTIVE_DATES.includes(date),
    matchUpCount: dateCounts.get(date) ?? 0,
  }));
}

// ============================================================================
// Factory Grid Builder
// ============================================================================

export function buildFactoryGrid(
  selectedDate: string,
  callbacks?: FactoryGridCallbacks,
  cellConfig?: ScheduleCellConfig,
): FactoryGrid {
  const MIN_COURT_WIDTH = 110;
  const TIME_COL_WIDTH = 50;

  let activeCellConfig = cellConfig ?? DEFAULT_SCHEDULE_CELL_CONFIG;

  const root = document.createElement('div');
  root.className = 'factory-grid-root';

  function render(date: string): void {
    root.innerHTML = '';

    const scheduleResult = tournamentEngine.competitionScheduleMatchUps({
      matchUpFilters: { scheduledDate: date },
      courtCompletedMatchUps: true,
      withCourtGridRows: true,
      minCourtGridRows: 20,
    });

    const rows: any[] = scheduleResult.rows || [];
    const courtsData: any[] = scheduleResult.courtsData || [];
    const courtPrefix: string = scheduleResult.courtPrefix || 'C|';

    if (!courtsData.length) {
      root.textContent = 'No courts configured for this tournament.';
      return;
    }

    const courtCount = courtsData.length;

    // Grid container
    const grid = document.createElement('div');
    grid.style.cssText = [
      'display: grid',
      'gap: 1px',
      'background: var(--sp-line)',
      `min-width: ${TIME_COL_WIDTH + courtCount * MIN_COURT_WIDTH}px`,
      `grid-template-columns: ${TIME_COL_WIDTH}px repeat(${courtCount}, minmax(${MIN_COURT_WIDTH}px, 1fr))`,
    ].join('; ');

    // ── Styles ──
    const STICKY_HEADER = [
      'position: sticky', 'top: 0', 'z-index: 2',
      'background: var(--sp-panel-bg)', 'padding: 6px 4px',
      'font-size: 10px', 'font-weight: 700', 'text-align: center',
      'white-space: nowrap', 'overflow: hidden', 'text-overflow: ellipsis',
    ].join('; ');

    const STICKY_ROW = [
      'position: sticky', 'left: 0', 'z-index: 1',
      'background: var(--sp-panel-bg)', 'padding: 6px 4px',
      'font-size: 10px', 'font-weight: 600', 'color: var(--sp-muted)',
      'display: flex', 'align-items: center', 'justify-content: center',
    ].join('; ');

    // ── Corner cell ──
    const corner = document.createElement('div');
    corner.style.cssText = STICKY_HEADER + '; left: 0; z-index: 3; color: var(--sp-muted);';
    corner.textContent = 'Row';
    grid.appendChild(corner);

    // ── Court headers ──
    for (let ci = 0; ci < courtCount; ci++) {
      const court = courtsData[ci];
      const th = document.createElement('div');
      th.style.cssText = STICKY_HEADER;
      th.title = court.courtName || `Court ${ci + 1}`;
      th.textContent = court.courtName || `Court ${ci + 1}`;
      grid.appendChild(th);
    }

    // ── Data rows ──
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];

      // Row number cell
      const rowCell = document.createElement('div');
      rowCell.style.cssText = STICKY_ROW;
      rowCell.textContent = String(ri + 1);
      grid.appendChild(rowCell);

      // Court cells
      for (let ci = 0; ci < courtCount; ci++) {
        const cellKey = `${courtPrefix}${ci}`;
        const cellData = row[cellKey];

        const courtInfo = courtsData[ci];
        const courtId = cellData?.schedule?.courtId ?? courtInfo?.courtId ?? '';
        const venueId = cellData?.schedule?.venueId ?? courtInfo?.venueId ?? '';
        const courtOrder = cellData?.schedule?.courtOrder ?? ri + 1;

        // Build the cell content using the configurable renderer
        const cellContent = buildScheduleGridCell(
          mapMatchUpToCellData(cellData || {}),
          activeCellConfig,
        );

        // Wrap in a container that carries grid-level data attributes
        const cell = document.createElement('div');
        cell.setAttribute('data-court-id', courtId);
        cell.setAttribute('data-venue-id', venueId);
        cell.setAttribute('data-court-order', String(courtOrder));
        cell.setAttribute('data-row-index', String(ri));
        cell.setAttribute('data-court-index', String(ci));

        // Transfer data attributes from the rendered cell to the wrapper
        const matchUpId = cellContent.getAttribute('data-matchup-id');
        const drawId = cellContent.getAttribute('data-draw-id');
        if (matchUpId) cell.setAttribute('data-matchup-id', matchUpId);
        if (drawId) cell.setAttribute('data-draw-id', drawId);

        // Append the rendered cell content
        cell.appendChild(cellContent);

        // MatchUp cells are draggable
        if (cellData?.matchUpId) {
          cell.draggable = true;
          cell.style.cursor = 'grab';
          cell.title = `${cellData.eventName || ''} ${cellData.roundName || ''}`.trim();

          cell.addEventListener('dragstart', (e) => {
            e.dataTransfer!.setData(
              'application/json',
              JSON.stringify({
                type: 'GRID_MATCHUP',
                matchUp: {
                  matchUpId: cellData.matchUpId,
                  drawId: cellData.drawId,
                  eventId: cellData.eventId,
                  eventName: cellData.eventName,
                  roundName: cellData.roundName,
                  matchUpType: cellData.matchUpType,
                  sides: (cellData.sides || []).map((s: any) => ({
                    participantName: s.participant?.participantName ?? s.participantName,
                    participantId: s.participantId ?? s.participant?.participantId,
                  })),
                },
              }),
            );
            e.dataTransfer!.effectAllowed = 'move';
            cell.style.opacity = '0.4';
          });
          cell.addEventListener('dragend', () => { cell.style.opacity = ''; });
        }

        // Drop target (only non-blocked cells)
        if (!cellData?.isBlocked) {
          cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.style.outline = '2px solid var(--sp-accent-focus)';
            cell.style.outlineOffset = '-2px';
            e.dataTransfer!.dropEffect = 'move';
          });
          cell.addEventListener('dragleave', () => { cell.style.outline = ''; });
          cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.style.outline = '';
          });
        }

        // Click events
        cell.addEventListener('click', () => {
          const m = cellData?.matchUpId ? cellData : null;
          callbacks?.onCellClick?.(courtId, courtOrder, m);
        });
        cell.addEventListener('dblclick', () => {
          const m = cellData?.matchUpId ? cellData : null;
          callbacks?.onCellDblClick?.(courtId, courtOrder, m);
        });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const m = cellData?.matchUpId ? cellData : null;
          callbacks?.onCellRightClick?.(courtId, courtOrder, m, e);
        });

        grid.appendChild(cell);
      }
    }

    root.appendChild(grid);
  }

  let currentDate = selectedDate;

  // Initial render
  render(selectedDate);

  return {
    element: root,
    removeMatchUp: (matchUpId: string) => {
      const el = root.querySelector(`[data-matchup-id="${matchUpId}"]`) as HTMLElement | null;
      if (el) {
        el.innerHTML = '';
        const emptyCell = buildScheduleGridCell(
          mapMatchUpToCellData({}),
          activeCellConfig,
        );
        el.appendChild(emptyCell);
        el.draggable = false;
        el.style.cursor = '';
        el.removeAttribute('data-matchup-id');
        el.removeAttribute('data-draw-id');
      }
    },
    rebuild: (date: string) => {
      currentDate = date;
      render(date);
    },
    setCellConfig: (config: ScheduleCellConfig) => {
      activeCellConfig = config;
      render(currentDate);
    },
  };
}

// ============================================================================
// Schedule / Unschedule via Factory
// ============================================================================

export function scheduleMatchUpViaFactory(
  matchUpId: string,
  drawId: string,
  courtId: string,
  venueId: string,
  courtOrder: number,
  scheduledDate: string,
): { success?: boolean; error?: any } {
  const result = tournamentEngine.addMatchUpScheduleItems({
    matchUpId,
    drawId,
    schedule: {
      courtId,
      venueId,
      courtOrder,
      scheduledDate,
    },
    removePriorValues: true,
  });
  return result;
}

export function unscheduleMatchUpViaFactory(
  matchUpId: string,
  drawId: string,
): { success?: boolean; error?: any } {
  const result = tournamentEngine.addMatchUpScheduleItems({
    matchUpId,
    drawId,
    schedule: {
      courtId: '',
      venueId: '',
      courtOrder: '',
      scheduledDate: '',
      scheduledTime: '',
    } as any,
    removePriorValues: true,
  });
  return result;
}

// ============================================================================
// Issues / Conflicts Builder
// ============================================================================

export function buildIssuesFromFactory(selectedDate?: string): ScheduleIssue[] {
  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    inContext: true,
    nextMatchUps: true,
  });

  // Filter to scheduled matchUps for the selected date
  const scheduledMatchUps = (matchUps || []).filter((m: any) => {
    if (!m.schedule?.courtId) return false;
    if (selectedDate && m.schedule?.scheduledDate !== selectedDate) return false;
    return true;
  });

  if (!scheduledMatchUps.length) return [];

  const conflictsResult = tournamentEngine.proConflicts({ matchUps: scheduledMatchUps });
  if (conflictsResult.error) return [];

  const issues: ScheduleIssue[] = [];

  const mapSeverity = (issue: string): ScheduleIssueSeverity => {
    if (issue === SCHEDULE_ERROR) return 'ERROR';
    if (issue === SCHEDULE_CONFLICT) return 'ERROR';
    if (issue === SCHEDULE_WARNING) return 'WARN';
    if (issue === SCHEDULE_ISSUE) return 'INFO';
    return 'WARN';
  };

  // Court issues
  for (const [, courtIssues] of Object.entries(conflictsResult.courtIssues || {})) {
    for (const ci of courtIssues as any[]) {
      issues.push({
        severity: mapSeverity(ci.issue),
        message: `${ci.issueType}: ${ci.matchUpId}${ci.issueIds?.length ? ' conflicts with ' + ci.issueIds.join(', ') : ''}`,
        matchUpId: ci.matchUpId,
        date: selectedDate,
      });
    }
  }

  // Row issues
  for (const [rowIdx, rowIssues] of Object.entries(conflictsResult.rowIssues || {})) {
    for (const ri of rowIssues as any[]) {
      issues.push({
        severity: mapSeverity(ri.issue),
        message: `Row ${rowIdx}: ${ri.issueType}: ${ri.matchUpId}${ri.issueIds?.length ? ' conflicts with ' + ri.issueIds.join(', ') : ''}`,
        matchUpId: ri.matchUpId,
        date: selectedDate,
      });
    }
  }

  return issues;
}
