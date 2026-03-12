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
 * - TimeModifiers: NB, NA, AR, FB, TBA and combined modifiers
 * - Conflicts: Conflict states — error, warning, issue, double-booking with hover
 * - SearchHighlight: Search-match purple highlight for finding team members, etc.
 * - BlockedCells: Maintenance, practice, generic blocked
 * - AllFields: All 7 fields enabled across all zones
 * - ConfigPlayground: Interactive buttons to toggle every config option
 * - TypeAhead: Inline autocomplete on empty cell click (activateScheduleCellTypeAhead)
 */

import type { ScheduleCellConfig, ScheduleCellData } from '../../components/schedule-page';
import {
  buildScheduleGridCell,
  activateScheduleCellTypeAhead,
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
  ALL_TIME_MODIFIERS,
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
const STORY_ROOT_STYLE =
  'font-family: ui-sans-serif, system-ui, sans-serif; color: var(--sp-text); padding: 24px; max-width: 900px;';
const STORY_INFO_STYLE = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';
const FLEX_GAP_8 = 'display: flex; gap: 8px; flex-wrap: wrap;';
const FLEX_GAP_12 = 'display: flex; gap: 12px; flex-wrap: wrap;';

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
  grid.style.cssText = FLEX_GAP_8;
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
      STORY_ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = STORY_INFO_STYLE;
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
    grid.style.cssText = FLEX_GAP_12;
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
      STORY_ROOT_STYLE;

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
      row.style.cssText = FLEX_GAP_8;
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
      STORY_ROOT_STYLE;

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
      row.style.cssText = FLEX_GAP_8;
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
      STORY_ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = STORY_INFO_STYLE;
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
    grid.style.cssText = FLEX_GAP_12;
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
// Time Modifiers — NB, NA, AR, FB, TBA and combinations
// ============================================================================

export const TimeModifiers = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = STORY_ROOT_STYLE + ' max-width: 1100px;';

    const info = document.createElement('div');
    info.style.cssText = STORY_INFO_STYLE;
    info.textContent =
      'Time modifiers appear before the scheduled time. NB (Not Before) can combine with NA (Next Available) or AR (After Rest). Mutually-exclusive modifiers (NA, AR, FB, TBA) cannot combine with each other — only with NB.';
    root.appendChild(info);

    const labels = ['NB 14:00', 'NB NA 16:00', 'NB AR 15:00', 'NA (no time)', 'AR (no time)', 'FB (no time)', 'TBA (no time)', 'Court TBA 14:00', 'NB Court TBA 16:00'];
    const cells = ALL_TIME_MODIFIERS.map((data, i) =>
      labeledCell(data, labels[i], undefined, WIDE_CELL),
    );
    const grid = document.createElement('div');
    grid.style.cssText = FLEX_GAP_12;
    for (const c of cells) grid.appendChild(c);
    root.appendChild(grid);

    return root;
  },
};

// ============================================================================
// Conflicts — error, warning, issue, double-booking with hover highlighting
// ============================================================================

export const Conflicts = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText =
      STORY_ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = STORY_INFO_STYLE;
    info.textContent =
      'Conflict states from proConflicts: left-border accent + subtle tint per severity. ERROR (rose), WARNING (amber), ISSUE (blue), CONFLICT/DOUBLE_BOOKING (rose). Hover over double-booking cells to see the related cell highlighted.';
    root.appendChild(info);

    const labels = ['Double Booking', 'Related Cell', 'Warning', 'Error', 'Issue'];
    const cells = ALL_CONFLICTS.map((data, i) => labeledCell(data, labels[i], undefined, WIDE_CELL));
    const grid = document.createElement('div');
    grid.style.cssText = FLEX_GAP_12;
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
      STORY_ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = STORY_INFO_STYLE;
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

// ============================================================================
// TypeAhead — menu-first inline autocomplete on empty cell click
// ============================================================================

import { tipster } from '../../components/popover/tipster';

/** Mock unscheduled matchUps for the typeahead dropdown */
const MOCK_UNSCHEDULED = [
  { label: "Men's Singles QF — Nadal vs Djokovic", value: 'mu-001' },
  { label: "Men's Singles QF — Federer vs Murray", value: 'mu-002' },
  { label: "Women's Singles SF — Swiatek vs Sabalenka", value: 'mu-003' },
  { label: "Women's Singles SF — Gauff vs Rybakina", value: 'mu-004' },
  { label: "Men's Doubles R16 — Bryan/Sock vs Cabal/Farah", value: 'mu-005' },
  { label: "Mixed Doubles QF — Krejcikova/Mektovic vs Dabrowski/Pavic", value: 'mu-006' },
  { label: "Men's Singles R32 — Alcaraz vs Rune", value: 'mu-007' },
  { label: "Women's Singles R16 — Osaka vs Keys", value: 'mu-008' },
];

export const TypeAhead = {
  name: 'TypeAhead',
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = 'padding: 2rem; max-width: 800px; font-family: system-ui, sans-serif;';

    // Description
    const desc = document.createElement('p');
    desc.style.cssText = 'margin: 0 0 1rem; color: #6b7280; font-size: 0.875rem;';
    desc.textContent =
      'Click an empty cell to see a context menu. Select "Assign matchUp" to activate the inline typeahead. ' +
      'Clicking outside the typeahead dismisses it; the next click shows the menu again.';
    root.appendChild(desc);

    // Status log
    const log = document.createElement('div');
    log.style.cssText =
      'margin-bottom: 1rem; padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.75rem; color: #374151; min-height: 1.5em;';
    log.textContent = 'Click an empty cell below...';
    root.appendChild(log);

    // Build a small mock grid: 3 courts × 3 rows, mix of matchUps and empty cells
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText =
      'display: grid; grid-template-columns: 80px repeat(3, 1fr); gap: 1px; background: #e5e7eb; border: 1px solid #e5e7eb; border-radius: 6px; overflow: visible;';

    const courts = ['Court 1', 'Court 2', 'Court 3'];
    const rows = ['Row 1', 'Row 2', 'Row 3'];

    // Grid data: some cells have matchUps, some are empty (clickable for typeahead)
    const gridData: (ScheduleCellData | null)[][] = [
      [SINGLES_TO_BE_PLAYED, null, DOUBLES_TO_BE_PLAYED],
      [null, SINGLES_IN_PROGRESS, null],
      [null, null, null],
    ];

    // Court headers
    const cornerHeader = document.createElement('div');
    cornerHeader.style.cssText = 'padding: 6px; font-size: 0.625rem; font-weight: 700; color: #6b7280; background: #f3f4f6; text-align: center;';
    gridContainer.appendChild(cornerHeader);

    for (const court of courts) {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'padding: 6px; font-size: 0.625rem; font-weight: 700; color: #374151; background: #f3f4f6; text-align: center;';
      hdr.textContent = court;
      gridContainer.appendChild(hdr);
    }

    // Helper: show the empty cell menu (tipster) for a given cell
    const showEmptyCellMenu = (target: HTMLElement, wrapper: HTMLElement, courtLabel: string, rowLabel: string) => {
      const assignMatchUp = () => {
        log.textContent = `TypeAhead activated on ${courtLabel}, ${rowLabel}...`;
        log.style.color = '#2563eb';

        activateScheduleCellTypeAhead({
          cell: wrapper,
          listProvider: () => MOCK_UNSCHEDULED,
          onSelect: (matchUpId: string) => {
            const item = MOCK_UNSCHEDULED.find((m) => m.value === matchUpId);
            log.textContent = `Selected: ${item?.label || matchUpId} → assigned to ${courtLabel}, ${rowLabel}`;
            log.style.color = '#059669';

            // Re-render the cell with a mock "assigned" matchUp
            wrapper.innerHTML = '';
            const assigned = buildScheduleGridCell(
              {
                matchUpId,
                eventName: item?.label.split(' — ')[0] || '',
                roundName: '',
                matchUpType: 'SINGLES',
                matchUpStatus: 'TO_BE_PLAYED',
                sides: [
                  { sideNumber: 1, participantName: (item?.label.split(' — ')[1] || '').split(' vs ')[0]?.trim() },
                  { sideNumber: 2, participantName: (item?.label.split(' — ')[1] || '').split(' vs ')[1]?.trim() },
                ],
                schedule: { courtId: wrapper.getAttribute('data-court-id') || '', courtOrder: 1 },
              } as ScheduleCellData,
              DEFAULT_SCHEDULE_CELL_CONFIG,
            );
            wrapper.appendChild(assigned);
          },
          onCancel: () => {
            log.textContent = `TypeAhead cancelled on ${courtLabel}, ${rowLabel}`;
            log.style.color = '#9ca3af';
          },
        });
      };

      const blockCourt = (rowCount: number, bookingType: string) => {
        log.textContent = `${bookingType} (${rowCount} row${rowCount > 1 ? 's' : ''}) on ${courtLabel}, ${rowLabel}`;
        log.style.color = '#d97706';
      };

      const options = [
        { option: 'Assign matchUp', onClick: assignMatchUp },
        { option: 'Block court (1 row)', onClick: () => blockCourt(1, 'BLOCKED') },
        { option: 'Block court (2 rows)', onClick: () => blockCourt(2, 'BLOCKED') },
        { option: 'Block court (3 rows)', onClick: () => blockCourt(3, 'BLOCKED') },
        { option: 'Mark court for practice (1 row)', onClick: () => blockCourt(1, 'PRACTICE') },
        { option: 'Mark court for maintenance (1 row)', onClick: () => blockCourt(1, 'MAINTENANCE') },
      ];

      tipster({ options, target, config: { placement: 'right' } });
    };

    // Grid rows
    for (let r = 0; r < rows.length; r++) {
      // Row label
      const rowLabelEl = document.createElement('div');
      rowLabelEl.style.cssText = 'padding: 6px; font-size: 0.5625rem; font-weight: 600; color: #6b7280; background: #f9fafb; display: flex; align-items: center; justify-content: center;';
      rowLabelEl.textContent = rows[r];
      gridContainer.appendChild(rowLabelEl);

      for (let c = 0; c < courts.length; c++) {
        const data = gridData[r][c];
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'min-height: 60px; background: white; position: relative;';
        wrapper.setAttribute('data-court-id', `court-${c + 1}`);
        wrapper.setAttribute('data-venue-id', 'venue-1');

        if (data) {
          // Render a matchUp cell
          const cell = buildScheduleGridCell(data, DEFAULT_SCHEDULE_CELL_CONFIG);
          wrapper.appendChild(cell);
        } else {
          // Empty cell — render empty state and attach click handler for menu
          const emptyCell = buildScheduleGridCell({ matchUpId: '' } as ScheduleCellData, DEFAULT_SCHEDULE_CELL_CONFIG);
          emptyCell.style.cursor = 'pointer';
          wrapper.appendChild(emptyCell);

          wrapper.addEventListener('click', (ev) => {
            showEmptyCellMenu(ev.target as HTMLElement, wrapper, courts[c], rows[r]);
          });
        }

        gridContainer.appendChild(wrapper);
      }
    }

    root.appendChild(gridContainer);

    // Instructions
    const hint = document.createElement('p');
    hint.style.cssText = 'margin: 1rem 0 0; color: #9ca3af; font-size: 0.75rem;';
    hint.textContent = 'Tip: Select "Assign matchUp" from the menu, then type to filter. Press Escape or click outside to dismiss. Click the cell again to re-open the menu.';
    root.appendChild(hint);

    return root;
  },
};
