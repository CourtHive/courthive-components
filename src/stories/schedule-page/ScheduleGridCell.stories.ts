/**
 * Schedule Grid Cell — Standalone stories for the configurable cell renderer.
 *
 * Stories:
 * - Default: Default config, various matchUp types in a grid
 * - Statuses: All matchUp status variants side by side
 * - Seeds & Rankings: Participant display with seeds, rankings, nationality
 * - NameFormats: Cycle through full/last/lastFirst/firstLast
 * - Teams: Tie/team event cells showing individual players with team membership
 * - Doubles: Doubles pair names
 * - ByeMatchUps: BYE matchUps (single participant + BYE marker)
 * - Potentials: TBD / potential participant rendering
 * - Conflicts: Conflict states — error, warning, issue, double-booking with hover
 * - SearchHighlight: Search-match purple highlight for finding team members, etc.
 * - BlockedCells: Maintenance, practice, generic blocked
 * - AllFields: All 7 fields enabled across all zones
 * - ConfigPlayground: Interactive buttons to toggle every config option
 */

import type { ScheduleCellConfig, ScheduleCellData } from '../../components/schedule-page';
import {
  buildScheduleGridCell,
  DEFAULT_SCHEDULE_CELL_CONFIG,
} from '../../components/schedule-page';
import { matchUpStatusConstants } from 'tods-competition-factory';

const { TO_BE_PLAYED, IN_PROGRESS, COMPLETED, WALKOVER, RETIRED, DEFAULTED, ABANDONED, DOUBLE_WALKOVER } = matchUpStatusConstants;

import {
  SINGLES_COMPLETED,
  SINGLES_IN_PROGRESS,
  SINGLES_TO_BE_PLAYED,
  BYE_MATCHUP,
  DOUBLES_COMPLETED,
  DOUBLES_TO_BE_PLAYED,
  TIE_SINGLES_COMPLETED,
  TIE_SINGLES_IN_PROGRESS,
  TIE_DOUBLES_TO_BE_PLAYED,
  POTENTIAL_PARTICIPANTS,
  PARTIAL_POTENTIAL,
  WITH_UMPIRE,
  BLOCKED_MAINTENANCE,
  EMPTY_CELL,
  ALL_STATUSES,
  ALL_TEAMS,
  ALL_DOUBLES,
  ALL_BYES,
  ALL_CONFLICTS,
  ALL_BLOCKED,
} from './cellData';

export default {
  title: 'Schedule Page/Grid Cell',
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const CELL_SIZE = { width: '130px', height: '80px' };
const WIDE_CELL = { width: '160px', height: '80px' };

function cellWrapper(
  data: ScheduleCellData,
  config?: ScheduleCellConfig,
  size = CELL_SIZE,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = `width: ${size.width}; height: ${size.height}; border: 1px solid var(--sp-line); border-radius: 4px; overflow: hidden;`;
  wrap.appendChild(buildScheduleGridCell(data, config));
  return wrap;
}

function gridLayout(cells: HTMLElement[], label?: string): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText =
    'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px;';

  if (label) {
    const h = document.createElement('h3');
    h.style.cssText = 'font-size: 14px; margin: 0 0 12px; font-weight: 700;';
    h.textContent = label;
    container.appendChild(h);
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
  for (const c of cells) grid.appendChild(c);
  container.appendChild(grid);

  return container;
}

function labeledCell(
  data: ScheduleCellData,
  label: string,
  config?: ScheduleCellConfig,
  size = CELL_SIZE,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px; align-items: center;';

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size: 10px; color: var(--sp-muted); text-align: center;';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  wrap.appendChild(cellWrapper(data, config, size));
  return wrap;
}

function section(title: string, content: HTMLElement): HTMLElement {
  const sec = document.createElement('div');
  sec.style.cssText = 'margin-bottom: 24px;';

  const h = document.createElement('h3');
  h.style.cssText = 'font-size: 13px; margin: 0 0 8px; font-weight: 700; color: var(--sp-text);';
  h.textContent = title;
  sec.appendChild(h);

  sec.appendChild(content);
  return sec;
}

function btnStyle(): string {
  return 'padding: 5px 10px; border-radius: 6px; border: 1px solid var(--sp-border); background: var(--sp-card-bg); color: var(--sp-text); cursor: pointer; font-size: 11px;';
}

function makeBtn(text: string, handler: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = btnStyle();
  btn.addEventListener('click', handler);
  return btn;
}

// ============================================================================
// Default — shows various matchUp types with default config
// ============================================================================

export const Default = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';
    info.textContent =
      'Default config: header=[time], body=[eventRound, participants], footer=[score]. Shows a range of matchUp types.';
    root.appendChild(info);

    const cells = [
      labeledCell(SINGLES_COMPLETED, 'Completed'),
      labeledCell(SINGLES_IN_PROGRESS, 'In Progress'),
      labeledCell(SINGLES_TO_BE_PLAYED, 'To Be Played'),
      labeledCell(DOUBLES_COMPLETED, 'Doubles', undefined, WIDE_CELL),
      labeledCell(TIE_SINGLES_COMPLETED, 'Tie (Team)'),
      labeledCell(BYE_MATCHUP, 'BYE'),
      labeledCell(BLOCKED_MAINTENANCE, 'Blocked'),
      labeledCell(EMPTY_CELL, 'Empty'),
    ];

    const grid = document.createElement('div');
    grid.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';
    for (const c of cells) grid.appendChild(c);
    root.appendChild(grid);

    return root;
  },
};

// ============================================================================
// Statuses — all matchUp status variants
// ============================================================================

export const Statuses = {
  render: () => {
    const labels = [
      TO_BE_PLAYED, IN_PROGRESS, COMPLETED, WALKOVER,
      RETIRED, DEFAULTED, ABANDONED, DOUBLE_WALKOVER,
    ];
    const cells = ALL_STATUSES.map((data, i) => labeledCell(data, labels[i]));
    return gridLayout(cells, 'MatchUp Status Variants');
  },
};

// ============================================================================
// Seeds & Rankings — show seeds, rankings, nationality
// ============================================================================

export const SeedsAndRankings = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';

    const configs: { label: string; config: ScheduleCellConfig }[] = [
      {
        label: 'Default (no extras)',
        config: { ...DEFAULT_SCHEDULE_CELL_CONFIG },
      },
      {
        label: 'Seeds only',
        config: {
          ...DEFAULT_SCHEDULE_CELL_CONFIG,
          participantDisplay: { ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay, showSeed: true },
        },
      },
      {
        label: 'Seeds + Rankings',
        config: {
          ...DEFAULT_SCHEDULE_CELL_CONFIG,
          participantDisplay: { ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay, showSeed: true, showRanking: true },
        },
      },
      {
        label: 'Seeds + Nationality',
        config: {
          ...DEFAULT_SCHEDULE_CELL_CONFIG,
          participantDisplay: { ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay, showSeed: true, showNationality: true },
        },
      },
    ];

    for (const { label, config } of configs) {
      const cells = [
        cellWrapper(SINGLES_COMPLETED, config, WIDE_CELL),
        cellWrapper(SINGLES_IN_PROGRESS, config, WIDE_CELL),
        cellWrapper(SINGLES_TO_BE_PLAYED, config, WIDE_CELL),
      ];
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
      for (const c of cells) row.appendChild(c);
      root.appendChild(section(label, row));
    }

    return root;
  },
};

// ============================================================================
// NameFormats — cycle through name format options
// ============================================================================

export const NameFormats = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';

    const formats: Array<'full' | 'last' | 'lastFirst' | 'firstLast'> = ['full', 'last', 'lastFirst', 'firstLast'];

    for (const fmt of formats) {
      const config: ScheduleCellConfig = {
        ...DEFAULT_SCHEDULE_CELL_CONFIG,
        participantDisplay: {
          ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay,
          nameFormat: fmt,
          showSeed: true,
        },
      };
      const cells = [
        cellWrapper(SINGLES_COMPLETED, config, WIDE_CELL),
        cellWrapper(DOUBLES_COMPLETED, config, { width: '180px', height: '80px' }),
        cellWrapper(TIE_SINGLES_COMPLETED, config),
      ];
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
      for (const c of cells) row.appendChild(c);
      root.appendChild(section(`nameFormat: '${fmt}'`, row));
    }

    return root;
  },
};

// ============================================================================
// Teams — individual matchUps within a tie/team event, showing team membership
// ============================================================================

export const Teams = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';
    info.textContent =
      'Individual matchUps within a tie/team event (e.g. Davis Cup). Each participant shows their team name beneath their name.';
    root.appendChild(info);

    const config: ScheduleCellConfig = {
      ...DEFAULT_SCHEDULE_CELL_CONFIG,
      participantDisplay: {
        ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay,
        showSeed: true,
        showNationality: true,
      },
    };
    const cells = ALL_TEAMS.map((data) =>
      labeledCell(data, `${data.roundName} — ${data.matchUpStatus}`, config, WIDE_CELL),
    );
    const grid = document.createElement('div');
    grid.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';
    for (const c of cells) grid.appendChild(c);
    root.appendChild(grid);

    return root;
  },
};

// ============================================================================
// Doubles
// ============================================================================

export const Doubles = {
  render: () => {
    const config: ScheduleCellConfig = {
      ...DEFAULT_SCHEDULE_CELL_CONFIG,
      participantDisplay: {
        ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay,
        showSeed: true,
      },
    };
    const cells = ALL_DOUBLES.map((data) =>
      labeledCell(data, `${data.roundName} — ${data.matchUpStatus}`, config, WIDE_CELL),
    );
    return gridLayout(cells, 'Doubles MatchUps');
  },
};

// ============================================================================
// Bye MatchUps — BYE marker shown on cell
// ============================================================================

export const ByeMatchUps = {
  render: () => {
    const config: ScheduleCellConfig = {
      ...DEFAULT_SCHEDULE_CELL_CONFIG,
      participantDisplay: {
        ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay,
        showSeed: true,
        showNationality: true,
      },
    };
    const labels = ['Implicit BYE', 'Explicit BYE side', 'BYE + Team Member'];
    const cells = ALL_BYES.map((data, i) => labeledCell(data, labels[i], config));
    return gridLayout(cells, 'BYE MatchUps — BYE marker rendered on cell');
  },
};

// ============================================================================
// Potentials — TBD participants
// ============================================================================

export const Potentials = {
  render: () => {
    const cells = [
      labeledCell(POTENTIAL_PARTICIPANTS, 'Both sides TBD', undefined, WIDE_CELL),
      labeledCell(PARTIAL_POTENTIAL, 'One side known', undefined, WIDE_CELL),
    ];
    return gridLayout(cells, 'Potential (TBD) Participants');
  },
};

// ============================================================================
// Conflicts — error, warning, issue, double-booking with hover highlighting
// ============================================================================

export const Conflicts = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';
    info.textContent =
      'Conflict states from proConflicts: left-border accent + subtle tint per severity. ERROR (rose), WARNING (amber), ISSUE (blue), CONFLICT/DOUBLE_BOOKING (rose). Hover over double-booking cells to see the related cell highlighted.';
    root.appendChild(info);

    const labels = ['Double Booking', 'Related Cell', 'Warning', 'Error', 'Issue'];
    const cells = ALL_CONFLICTS.map((data, i) => labeledCell(data, labels[i], undefined, WIDE_CELL));
    const grid = document.createElement('div');
    grid.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';
    for (const c of cells) grid.appendChild(c);
    root.appendChild(grid);

    return root;
  },
};

// ============================================================================
// SearchHighlight — purple/pink highlight for search results
// ============================================================================

export const SearchHighlight = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';
    info.textContent =
      'Search highlight applied via .spl-cell--search-match class. Use case: search for a team name to highlight all cells containing members of that team.';
    root.appendChild(info);

    // Build cells — some with search-match applied, some without
    const searchConfig: ScheduleCellConfig = {
      ...DEFAULT_SCHEDULE_CELL_CONFIG,
      participantDisplay: {
        ...DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay,
        showSeed: true,
        showNationality: true,
      },
    };

    // "Spain" team members highlighted; others not
    const teamData: { data: ScheduleCellData; highlight: boolean; label: string }[] = [
      { data: TIE_SINGLES_COMPLETED, highlight: true, label: 'Spain member' },
      { data: TIE_SINGLES_IN_PROGRESS, highlight: false, label: 'No match' },
      { data: TIE_DOUBLES_TO_BE_PLAYED, highlight: true, label: 'Spain member' },
      { data: SINGLES_COMPLETED, highlight: false, label: 'No match' },
      { data: SINGLES_IN_PROGRESS, highlight: false, label: 'No match' },
    ];

    const searchLabel = document.createElement('div');
    searchLabel.style.cssText =
      'font-size: 12px; font-weight: 700; color: var(--sp-text); margin-bottom: 12px; padding: 4px 8px; background: rgba(180, 100, 200, 0.15); border-radius: 6px; display: inline-block;';
    searchLabel.textContent = 'Search: "Spain"';
    root.appendChild(searchLabel);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px;';

    for (const { data, highlight, label } of teamData) {
      const outer = document.createElement('div');
      outer.style.cssText = 'display: flex; flex-direction: column; gap: 4px; align-items: center;';

      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size: 10px; color: var(--sp-muted); text-align: center;';
      lbl.textContent = label;
      outer.appendChild(lbl);

      const wrap = document.createElement('div');
      wrap.style.cssText = `width: ${WIDE_CELL.width}; height: ${WIDE_CELL.height}; border: 1px solid var(--sp-line); border-radius: 4px; overflow: hidden;`;
      const cell = buildScheduleGridCell(data, searchConfig);
      if (highlight) {
        cell.classList.add('spl-cell--search-match');
      }
      wrap.appendChild(cell);
      outer.appendChild(wrap);
      grid.appendChild(outer);
    }

    root.appendChild(grid);

    return root;
  },
};

// ============================================================================
// Blocked Cells
// ============================================================================

export const BlockedCells = {
  render: () => {
    const cells = ALL_BLOCKED.map((data) =>
      labeledCell(data, data.booking?.bookingType || 'BLOCKED'),
    );
    cells.push(labeledCell(EMPTY_CELL, 'Empty'));
    return gridLayout(cells, 'Blocked & Empty Cells');
  },
};

// ============================================================================
// AllFields — all 7 field types enabled
// ============================================================================

export const AllFields = {
  render: () => {
    const config: ScheduleCellConfig = {
      header: ['time', 'matchUpStatus'],
      body: ['eventRound', 'participants'],
      footer: ['score', 'matchUpFormat', 'umpire'],
      participantDisplay: {
        nameFormat: 'last',
        showSeed: true,
        showRanking: true,
        showNationality: true,
        boldWinner: true,
        showPotentials: true,
      },
    };

    const tallCell = { width: '160px', height: '120px' };

    const cells = [
      labeledCell(WITH_UMPIRE, 'Final (all fields)', config, tallCell),
      labeledCell(SINGLES_COMPLETED, 'Completed', config, tallCell),
      labeledCell(SINGLES_IN_PROGRESS, 'In Progress', config, tallCell),
      labeledCell(TIE_SINGLES_IN_PROGRESS, 'Tie (Team)', config, tallCell),
      labeledCell(DOUBLES_COMPLETED, 'Doubles', config, tallCell),
    ];

    return gridLayout(cells, 'All Fields Enabled (header: time+status, body: event+participants, footer: score+format+umpire)');
  },
};

// ============================================================================
// ConfigPlayground — interactive config toggling
// ============================================================================

export const ConfigPlayground = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 1000px;';

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px;';
    info.textContent = 'Toggle fields and participant display options. Cells re-render on each change.';
    root.appendChild(info);

    // Mutable config state
    let config: ScheduleCellConfig = {
      header: ['time'],
      body: ['eventRound', 'participants'],
      footer: ['score'],
      participantDisplay: {
        nameFormat: 'full',
        showSeed: false,
        showRanking: false,
        showNationality: false,
        boldWinner: true,
        showPotentials: true,
      },
    };

    // Config display
    const configDisplay = document.createElement('pre');
    configDisplay.style.cssText =
      'font-size: 10px; background: var(--sp-card-bg); border: 1px solid var(--sp-line); border-radius: 8px; padding: 8px; margin-bottom: 12px; white-space: pre-wrap; color: var(--sp-muted); max-height: 100px; overflow: auto;';

    function updateConfigDisplay(): void {
      configDisplay.textContent = JSON.stringify(config, null, 2);
    }

    // Cell grid container
    const cellGrid = document.createElement('div');
    cellGrid.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;';

    const sampleData: ScheduleCellData[] = [
      SINGLES_COMPLETED,
      SINGLES_IN_PROGRESS,
      TIE_SINGLES_COMPLETED,
      DOUBLES_TO_BE_PLAYED,
      BYE_MATCHUP,
      WITH_UMPIRE,
      POTENTIAL_PARTICIPANTS,
      BLOCKED_MAINTENANCE,
      EMPTY_CELL,
    ];

    function rerenderCells(): void {
      cellGrid.innerHTML = '';
      for (const data of sampleData) {
        const size = data.matchUpType === 'DOUBLES' ? WIDE_CELL : CELL_SIZE;
        cellGrid.appendChild(cellWrapper(data, config, size));
      }
      updateConfigDisplay();
    }

    // Button bar
    const btnBar = document.createElement('div');
    btnBar.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;';

    type CellField = 'time' | 'eventRound' | 'participants' | 'score' | 'matchUpStatus' | 'matchUpFormat' | 'umpire';

    function toggleField(zone: 'header' | 'body' | 'footer', field: CellField): void {
      const arr = config[zone];
      const idx = arr.indexOf(field);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(field);
      config = { ...config };
      rerenderCells();
    }

    // Zone field toggles
    const fieldToggles: { label: string; zone: 'header' | 'body' | 'footer'; field: CellField }[] = [
      { label: 'header: time', zone: 'header', field: 'time' },
      { label: 'header: status', zone: 'header', field: 'matchUpStatus' },
      { label: 'body: eventRound', zone: 'body', field: 'eventRound' },
      { label: 'body: participants', zone: 'body', field: 'participants' },
      { label: 'footer: score', zone: 'footer', field: 'score' },
      { label: 'footer: format', zone: 'footer', field: 'matchUpFormat' },
      { label: 'footer: umpire', zone: 'footer', field: 'umpire' },
    ];

    for (const t of fieldToggles) {
      btnBar.appendChild(makeBtn(t.label, () => toggleField(t.zone, t.field)));
    }

    // Separator
    const sep = document.createElement('div');
    sep.style.cssText = 'width: 1px; background: var(--sp-line); margin: 0 4px;';
    btnBar.appendChild(sep);

    // Participant display toggles
    btnBar.appendChild(makeBtn('seeds', () => {
      config.participantDisplay = {
        ...config.participantDisplay,
        showSeed: !config.participantDisplay?.showSeed,
      };
      rerenderCells();
    }));
    btnBar.appendChild(makeBtn('rankings', () => {
      config.participantDisplay = {
        ...config.participantDisplay,
        showRanking: !config.participantDisplay?.showRanking,
      };
      rerenderCells();
    }));
    btnBar.appendChild(makeBtn('nationality', () => {
      config.participantDisplay = {
        ...config.participantDisplay,
        showNationality: !config.participantDisplay?.showNationality,
      };
      rerenderCells();
    }));
    btnBar.appendChild(makeBtn('bold winner', () => {
      config.participantDisplay = {
        ...config.participantDisplay,
        boldWinner: !config.participantDisplay?.boldWinner,
      };
      rerenderCells();
    }));
    btnBar.appendChild(makeBtn('potentials', () => {
      config.participantDisplay = {
        ...config.participantDisplay,
        showPotentials: !config.participantDisplay?.showPotentials,
      };
      rerenderCells();
    }));

    // Name format cycle
    const nameFormats: Array<'full' | 'last' | 'lastFirst' | 'firstLast'> = ['full', 'last', 'lastFirst', 'firstLast'];
    let nameIdx = 0;
    btnBar.appendChild(makeBtn('cycle name format', () => {
      nameIdx = (nameIdx + 1) % nameFormats.length;
      config.participantDisplay = {
        ...config.participantDisplay,
        nameFormat: nameFormats[nameIdx],
      };
      rerenderCells();
    }));

    // Reset
    btnBar.appendChild(makeBtn('RESET', () => {
      config = {
        header: ['time'],
        body: ['eventRound', 'participants'],
        footer: ['score'],
        participantDisplay: {
          nameFormat: 'full',
          showSeed: false,
          showRanking: false,
          showNationality: false,
          boldWinner: true,
          showPotentials: true,
        },
      };
      nameIdx = 0;
      rerenderCells();
    }));

    root.appendChild(btnBar);
    root.appendChild(configDisplay);
    root.appendChild(cellGrid);

    // Initial render
    rerenderCells();

    return root;
  },
};
