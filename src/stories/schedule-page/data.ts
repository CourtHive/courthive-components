/**
 * Shared mock data for Schedule Page stories.
 *
 * Uses mocksEngine to generate realistic gendered participant names:
 * Boys events → MALE names, Girls events → FEMALE names.
 */

import type {
  CatalogMatchUpItem,
  ScheduleDate,
  ScheduleIssue,
  SchedulePageConfig,
} from '../../components/schedule-page';
import { mocksEngine, genderConstants, fixtures } from 'tods-competition-factory';

const { MALE, FEMALE } = genderConstants;
const { FORMAT_STANDARD, FORMAT_ATP_DOUBLES } = fixtures.matchUpFormats;

const BOYS_U16_SINGLES = BOYS_U16_SINGLES;
const GIRLS_U16_SINGLES = GIRLS_U16_SINGLES;
const BOYS_U18_SINGLES = BOYS_U18_SINGLES;
const GIRLS_U18_SINGLES = GIRLS_U18_SINGLES;
const DATE_DAY1 = DATE_DAY1;
const DATE_DAY2 = DATE_DAY2;
const DATA_COURT_ATTR = DATA_COURT_ATTR;

// ============================================================================
// Participant Names (generated via mocksEngine)
// ============================================================================

const { participants: maleParticipants } = mocksEngine.generateParticipants({
  participantsCount: 8,
  sex: MALE,
});
export const MALE_NAMES = maleParticipants.map((p) => p.participantName);

const { participants: femaleParticipants } = mocksEngine.generateParticipants({
  participantsCount: 8,
  sex: FEMALE,
});
export const FEMALE_NAMES = femaleParticipants.map((p) => p.participantName);

// ============================================================================
// MatchUp Catalog — 3 events across 2 draws
// ============================================================================

function maleSides(a: number, b: number) {
  return [
    { participantName: MALE_NAMES[a], participantId: `PM${a}`, seedNumber: a < 4 ? a + 1 : undefined },
    { participantName: MALE_NAMES[b], participantId: `PM${b}`, seedNumber: b < 4 ? b + 1 : undefined },
  ];
}

function femaleSides(a: number, b: number) {
  return [
    { participantName: FEMALE_NAMES[a], participantId: `PF${a}`, seedNumber: a < 4 ? a + 1 : undefined },
    { participantName: FEMALE_NAMES[b], participantId: `PF${b}`, seedNumber: b < 4 ? b + 1 : undefined },
  ];
}

export const MATCHUP_CATALOG: CatalogMatchUpItem[] = [
  // Event 1: Boys U16 Singles — Main Draw, R32 (4 matchUps)
  { matchUpId: 'M01', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: maleSides(0, 1) },
  { matchUpId: 'M02', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: maleSides(2, 3) },
  { matchUpId: 'M03', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: maleSides(4, 5) },
  { matchUpId: 'M04', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: maleSides(6, 7) },

  // Event 1: Boys U16 Singles — Main Draw, R16 (2 matchUps, already scheduled)
  { matchUpId: 'M05', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 2, roundName: 'R16', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: true, scheduledTime: '09:00', scheduledCourtName: 'Court 1', sides: maleSides(0, 2) },
  { matchUpId: 'M06', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 2, roundName: 'R16', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: true, scheduledTime: '09:00', scheduledCourtName: 'Court 2', sides: maleSides(4, 6) },

  // Event 2: Girls U16 Singles — Main Draw, R32 (4 matchUps)
  { matchUpId: 'M07', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: femaleSides(0, 1) },
  { matchUpId: 'M08', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: femaleSides(2, 3) },
  { matchUpId: 'M09', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: femaleSides(4, 5) },
  { matchUpId: 'M10', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: femaleSides(6, 7) },

  // Event 3: Boys U16 Doubles — Main Draw (2 matchUps, no sides yet)
  { matchUpId: 'M11', eventId: 'E3', eventName: 'Boys U16 Doubles', drawId: 'D3', drawName: 'Main', structureId: 'S3', roundNumber: 1, roundName: 'R16', matchUpType: 'DOUBLES', matchUpFormat: FORMAT_ATP_DOUBLES, isScheduled: false },
  { matchUpId: 'M12', eventId: 'E3', eventName: 'Boys U16 Doubles', drawId: 'D3', drawName: 'Main', structureId: 'S3', roundNumber: 1, roundName: 'R16', matchUpType: 'DOUBLES', matchUpFormat: FORMAT_ATP_DOUBLES, isScheduled: false },
];

// ============================================================================
// Larger catalog (for many-matchUps story)
// ============================================================================

export const LARGE_CATALOG: CatalogMatchUpItem[] = [
  ...MATCHUP_CATALOG,
  // Extra QF round
  { matchUpId: 'M13', eventId: 'E1', eventName: BOYS_U16_SINGLES, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 3, roundName: 'QF', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: maleSides(0, 4) },
  { matchUpId: 'M14', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 2, roundName: 'R16', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: true, scheduledTime: '11:00', scheduledCourtName: 'Court 3', sides: femaleSides(0, 2) },
  { matchUpId: 'M15', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 2, roundName: 'R16', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: true, scheduledTime: '11:00', scheduledCourtName: 'Court 4', sides: femaleSides(4, 6) },
  { matchUpId: 'M16', eventId: 'E2', eventName: GIRLS_U16_SINGLES, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 3, roundName: 'QF', matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false, sides: femaleSides(0, 4) },
];

// ============================================================================
// Extra-large catalog (for scrolling demo — 32 matchUps across 5 events)
// ============================================================================

const { participants: extraMales } = mocksEngine.generateParticipants({ participantsCount: 16, sex: MALE });
const EXTRA_MALE = extraMales.map((p) => p.participantName);
const { participants: extraFemales } = mocksEngine.generateParticipants({ participantsCount: 16, sex: FEMALE });
const EXTRA_FEMALE = extraFemales.map((p) => p.participantName);

function xMaleSides(a: number, b: number) {
  return [
    { participantName: EXTRA_MALE[a], participantId: `XM${a}` },
    { participantName: EXTRA_MALE[b], participantId: `XM${b}` },
  ];
}
function xFemaleSides(a: number, b: number) {
  return [
    { participantName: EXTRA_FEMALE[a], participantId: `XF${a}` },
    { participantName: EXTRA_FEMALE[b], participantId: `XF${b}` },
  ];
}

export const SCROLLING_CATALOG: CatalogMatchUpItem[] = [];
let seqId = 1;
// Boys U18 Singles — 8 R32 matchUps
for (let i = 0; i < 8; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E10', eventName: BOYS_U18_SINGLES,
    drawId: 'D10', drawName: 'Main', structureId: 'S10', roundNumber: 1, roundName: 'R32',
    matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false,
    sides: xMaleSides(i * 2, i * 2 + 1),
  });
}
// Girls U18 Singles — 8 R32 matchUps
for (let i = 0; i < 8; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E11', eventName: GIRLS_U18_SINGLES,
    drawId: 'D11', drawName: 'Main', structureId: 'S11', roundNumber: 1, roundName: 'R32',
    matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false,
    sides: xFemaleSides(i * 2, i * 2 + 1),
  });
}
// Boys U18 Singles — 4 R16 matchUps (some scheduled)
for (let i = 0; i < 4; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E10', eventName: BOYS_U18_SINGLES,
    drawId: 'D10', drawName: 'Main', structureId: 'S10', roundNumber: 2, roundName: 'R16',
    matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD,
    isScheduled: i < 2, scheduledTime: i < 2 ? '10:00' : undefined,
    scheduledCourtName: i < 2 ? `Court ${i + 1}` : undefined,
    sides: xMaleSides(i * 2, i * 2 + 1),
  });
}
// Girls U18 Singles — 4 R16 matchUps
for (let i = 0; i < 4; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E11', eventName: GIRLS_U18_SINGLES,
    drawId: 'D11', drawName: 'Main', structureId: 'S11', roundNumber: 2, roundName: 'R16',
    matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false,
    sides: xFemaleSides(i * 2, i * 2 + 1),
  });
}
// Mixed Doubles — 4 R16 matchUps (no sides)
for (let i = 0; i < 4; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E12', eventName: 'Mixed Doubles',
    drawId: 'D12', drawName: 'Main', structureId: 'S12', roundNumber: 1, roundName: 'R16',
    matchUpType: 'DOUBLES', matchUpFormat: FORMAT_ATP_DOUBLES, isScheduled: false,
  });
}
// Boys U18 QF — 2 matchUps
for (let i = 0; i < 2; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E10', eventName: BOYS_U18_SINGLES,
    drawId: 'D10', drawName: 'Main', structureId: 'S10', roundNumber: 3, roundName: 'QF',
    matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false,
    sides: xMaleSides(i * 4, i * 4 + 2),
  });
}
// Girls U18 QF — 2 matchUps
for (let i = 0; i < 2; i++) {
  SCROLLING_CATALOG.push({
    matchUpId: `X${String(seqId++).padStart(2, '0')}`, eventId: 'E11', eventName: GIRLS_U18_SINGLES,
    drawId: 'D11', drawName: 'Main', structureId: 'S11', roundNumber: 3, roundName: 'QF',
    matchUpType: 'SINGLES', matchUpFormat: FORMAT_STANDARD, isScheduled: false,
    sides: xFemaleSides(i * 4, i * 4 + 2),
  });
}

// ============================================================================
// Schedule Dates
// ============================================================================

export const SCHEDULE_DATES: ScheduleDate[] = [
  { date: DATE_DAY1, isActive: true, matchUpCount: 8, issueCount: 0 },
  { date: DATE_DAY2, isActive: true, matchUpCount: 6, issueCount: 2 },
  { date: '2026-06-17', isActive: true, matchUpCount: 4 },
  { date: '2026-06-18', isActive: false },
];

export const SCHEDULE_DATES_WEEK: ScheduleDate[] = [
  { date: DATE_DAY1, isActive: true, matchUpCount: 12, issueCount: 0 },
  { date: DATE_DAY2, isActive: true, matchUpCount: 10, issueCount: 1 },
  { date: '2026-06-17', isActive: true, matchUpCount: 8 },
  { date: '2026-06-18', isActive: true, matchUpCount: 6 },
  { date: '2026-06-19', isActive: true, matchUpCount: 4 },
  { date: '2026-06-20', isActive: true, matchUpCount: 2 },
  { date: '2026-06-21', isActive: true, matchUpCount: 1 },
];

// ============================================================================
// Schedule Issues
// ============================================================================

export const NO_ISSUES: ScheduleIssue[] = [];

export const SAMPLE_ISSUES: ScheduleIssue[] = [
  { severity: 'ERROR', message: `${MALE_NAMES[0]} has back-to-back matches with no recovery time`, matchUpId: 'M01', date: DATE_DAY2 },
  { severity: 'WARN', message: 'Court 1 has 6 consecutive hours of matches \u2014 consider rest window', date: DATE_DAY2 },
  { severity: 'INFO', message: 'Boys U16 Doubles R16 has no assigned court yet', matchUpId: 'M11', date: DATE_DAY1 },
  { severity: 'ERROR', message: `${MALE_NAMES[4]} is scheduled on two courts at the same time`, matchUpId: 'M03', date: DATE_DAY2 },
  { severity: 'WARN', message: 'Girls U16 Singles R32 matchUps exceed available court capacity', date: DATE_DAY1 },
];

// ============================================================================
// Mock Court Grid Element
// ============================================================================

export interface MockGridCallbacks {
  onCellClick?: (time: string, court: string, matchUp: CatalogMatchUpItem | null) => void;
  onCellDblClick?: (time: string, court: string, matchUp: CatalogMatchUpItem | null) => void;
  onCellRightClick?: (time: string, court: string, matchUp: CatalogMatchUpItem | null, event: MouseEvent) => void;
}

export interface MockCourtGrid {
  element: HTMLElement;
  removeMatchUp: (matchUpId: string) => void;
}

export function makeMockCourtGrid(
  courts: number = 6,
  callbacks?: MockGridCallbacks,
): MockCourtGrid {
  const MIN_COURT_WIDTH = 120;
  const TIME_COL_WIDTH = 80;
  const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  // Cell state: maps "time|court" → matchUp data
  const cellData = new Map<string, CatalogMatchUpItem>();

  function cellKey(time: string, court: string): string {
    return `${time}|${court}`;
  }

  function matchUpLabel(m: CatalogMatchUpItem): string {
    if (m.sides?.[0]?.participantName) {
      return `${m.sides[0].participantName} vs ${m.sides[1]?.participantName ?? 'TBD'}`;
    }
    return `${m.eventName} ${m.roundName ?? ''}`.trim();
  }

  // Grid container (determines min-width for horizontal scroll)
  const grid = document.createElement('div');
  grid.style.cssText = [
    'display: grid',
    'gap: 1px',
    'background: var(--sp-line)',
    `min-width: ${TIME_COL_WIDTH + courts * MIN_COURT_WIDTH}px`,
    `grid-template-columns: ${TIME_COL_WIDTH}px repeat(${courts}, minmax(${MIN_COURT_WIDTH}px, 1fr))`,
  ].join('; ');

  // ── Shared styles ──

  const STICKY_HEADER = [
    'position: sticky', 'top: 0', 'z-index: 2',
    'background: var(--sp-panel-bg)', 'padding: 8px',
    'font-size: 11px', 'font-weight: 700', 'text-align: center',
  ].join('; ');

  const STICKY_TIME = [
    'position: sticky', 'left: 0', 'z-index: 1',
    'background: var(--sp-panel-bg)', 'padding: 8px 6px',
    'font-size: 11px', 'font-weight: 600', 'color: var(--sp-muted)',
  ].join('; ');

  const EMPTY_CELL = [
    'background: var(--sp-card-bg)', 'padding: 6px',
    'min-height: 48px', 'font-size: 10px', 'color: var(--sp-muted)',
    'cursor: default',
  ].join('; ');

  const FILLED_CELL = [
    'background: var(--sp-selected-bg)', 'padding: 6px',
    'min-height: 48px', 'font-size: 10px', 'color: var(--sp-text)',
    'font-weight: 600', 'cursor: grab',
  ].join('; ');

  // ── Helper: populate or clear a cell ──

  function fillCell(cell: HTMLElement, m: CatalogMatchUpItem): void {
    const time = cell.getAttribute('data-time')!;
    const court = cell.getAttribute(DATA_COURT_ATTR)!;
    cellData.set(cellKey(time, court), m);
    cell.textContent = matchUpLabel(m);
    cell.style.cssText = FILLED_CELL;
    cell.draggable = true;
  }

  function clearCell(cell: HTMLElement): void {
    const time = cell.getAttribute('data-time')!;
    const court = cell.getAttribute(DATA_COURT_ATTR)!;
    cellData.delete(cellKey(time, court));
    cell.textContent = '';
    cell.style.cssText = EMPTY_CELL;
    cell.draggable = false;
  }

  // ── Corner cell (sticky top + left) ──

  const corner = document.createElement('div');
  corner.style.cssText = STICKY_HEADER + '; left: 0; z-index: 3; color: var(--sp-muted);';
  corner.textContent = 'Time';
  grid.appendChild(corner);

  // ── Court header cells (sticky top) ──

  for (let c = 1; c <= courts; c++) {
    const th = document.createElement('div');
    th.style.cssText = STICKY_HEADER;
    th.textContent = `Court ${c}`;
    grid.appendChild(th);
  }

  // ── Time rows ──

  for (const time of TIMES) {
    // Time cell (sticky left)
    const timeCell = document.createElement('div');
    timeCell.style.cssText = STICKY_TIME;
    timeCell.textContent = time;
    grid.appendChild(timeCell);

    // Court cells
    for (let c = 0; c < courts; c++) {
      const courtName = `Court ${c + 1}`;
      const cell = document.createElement('div');
      cell.style.cssText = EMPTY_CELL;
      cell.setAttribute('data-time', time);
      cell.setAttribute(DATA_COURT_ATTR, courtName);
      cell.draggable = false;

      // ── Drag start (from filled cells) ──
      cell.addEventListener('dragstart', (e) => {
        const m = cellData.get(cellKey(time, courtName));
        if (!m) { e.preventDefault(); return; }
        e.dataTransfer!.setData(
          'application/json',
          JSON.stringify({ type: 'GRID_MATCHUP', matchUp: m, sourceTime: time, sourceCourt: courtName }),
        );
        e.dataTransfer!.effectAllowed = 'move';
        cell.style.opacity = '0.4';
      });
      cell.addEventListener('dragend', () => {
        cell.style.opacity = '';
      });

      // ── Drop target ──
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.style.outline = '2px solid var(--sp-accent-focus)';
        cell.style.outlineOffset = '-2px';
        e.dataTransfer!.dropEffect = 'move';
      });
      cell.addEventListener('dragleave', () => {
        cell.style.outline = '';
      });
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.style.outline = '';
        try {
          const payload = JSON.parse(e.dataTransfer!.getData('application/json'));
          if (payload.type === 'CATALOG_MATCHUP' || payload.type === 'GRID_MATCHUP') {
            // If moving within grid, clear source cell
            if (payload.type === 'GRID_MATCHUP' && payload.sourceTime && payload.sourceCourt) {
              const srcEl = grid.querySelector(
                `[data-time="${payload.sourceTime}"][data-court="${payload.sourceCourt}"]`,
              ) as HTMLElement | null;
              if (srcEl) clearCell(srcEl);
            }
            fillCell(cell, payload.matchUp);
            console.log(`Dropped ${payload.matchUp.matchUpId} → ${courtName} at ${time}`);
          }
        } catch { /* ignore */ }
      });

      // ── Click / Double-click / Right-click ──
      cell.addEventListener('click', () => {
        const m = cellData.get(cellKey(time, courtName)) ?? null;
        callbacks?.onCellClick?.(time, courtName, m);
      });
      cell.addEventListener('dblclick', () => {
        const m = cellData.get(cellKey(time, courtName)) ?? null;
        callbacks?.onCellDblClick?.(time, courtName, m);
      });
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const m = cellData.get(cellKey(time, courtName)) ?? null;
        callbacks?.onCellRightClick?.(time, courtName, m, e);
      });

      grid.appendChild(cell);
    }
  }

  function removeMatchUp(matchUpId: string): void {
    for (const [key, m] of cellData) {
      if (m.matchUpId === matchUpId) {
        const [time, court] = key.split('|');
        const cell = grid.querySelector(`[data-time="${time}"][data-court="${court}"]`) as HTMLElement | null;
        if (cell) clearCell(cell);
        break;
      }
    }
  }

  return { element: grid, removeMatchUp };
}

// ============================================================================
// Config Builders
// ============================================================================

export function makeConfig(overrides: Partial<SchedulePageConfig> = {}): SchedulePageConfig {
  return {
    matchUpCatalog: MATCHUP_CATALOG,
    scheduleDates: SCHEDULE_DATES,
    issues: NO_ISSUES,
    courtGridElement: makeMockCourtGrid().element,
    ...overrides,
  };
}
