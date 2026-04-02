/**
 * Schedule Grid Cell — Configurable cell renderer for schedule grids.
 *
 * Renders a single cell in a court schedule grid. Supports 3 layout zones
 * (header, body, footer) with configurable field content. Handles matchUp cells,
 * blocked cells, and empty cells.
 *
 * Does NOT handle drag events — those are the consumer's responsibility.
 */

import type { ScheduleCellConfig, ScheduleCellData, ScheduleCellSide, ParticipantDisplayConfig } from '../types';

import './schedule-grid-cell.css';

const CONFLICT_HIGHLIGHT = 'spl-cell--conflict-highlight';
const COMPLETED_MATCHUP = 'spl-cell--complete';

// ============================================================================
// Default Config
// ============================================================================

export const DEFAULT_SCHEDULE_CELL_CONFIG: ScheduleCellConfig = {
  header: ['time'],
  body: ['eventRound', 'participants'],
  footer: ['score'],
  participantDisplay: {
    nameFormat: 'full',
    showSeed: false,
    showRanking: false,
    showNationality: false,
    boldWinner: true,
    showPotentials: true
  }
};

// ============================================================================
// Main Builder
// ============================================================================

export function buildScheduleGridCell(data: ScheduleCellData, config?: ScheduleCellConfig): HTMLElement {
  const cfg = config ?? DEFAULT_SCHEDULE_CELL_CONFIG;

  if (data.isBlocked) return buildBlockedCell(data);
  if (data.matchUpId) return buildMatchUpCell(data, cfg);
  return buildEmptyCell();
}

// ============================================================================
// Blocked Cell
// ============================================================================

function buildBlockedCell(data: ScheduleCellData): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'spl-grid-cell spl-cell--blocked';

  const bookingType = data.booking?.bookingType || 'BLOCKED';
  cell.dataset.bookingType = bookingType;

  const label = document.createElement('div');
  label.className = 'spl-grid-cell__block-label';

  const typeEl = document.createElement('div');
  typeEl.className = 'spl-grid-cell__block-type';
  typeEl.textContent = bookingType;
  label.appendChild(typeEl);

  if (data.booking?.rowCount) {
    const rowsEl = document.createElement('div');
    rowsEl.className = 'spl-grid-cell__block-rows';
    rowsEl.textContent = `${data.booking.rowCount} rows`;
    label.appendChild(rowsEl);
  }

  if (data.booking?.notes) {
    const notesEl = document.createElement('div');
    notesEl.className = 'spl-grid-cell__block-notes';
    notesEl.textContent = data.booking.notes;
    label.appendChild(notesEl);
  }

  cell.appendChild(label);
  return cell;
}

// ============================================================================
// Empty Cell
// ============================================================================

function buildEmptyCell(): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'spl-grid-cell spl-cell--empty';
  return cell;
}

// ============================================================================
// MatchUp Cell
// ============================================================================

function buildMatchUpCell(data: ScheduleCellData, cfg: ScheduleCellConfig): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'spl-grid-cell';

  // Data attributes
  cell.dataset.matchupId = data.matchUpId;
  if (data.drawId) cell.dataset.drawId = data.drawId;
  if (data.gender) cell.dataset.gender = data.gender;

  // Status modifier classes
  applyStatusClasses(cell, data);

  // Header zone
  if (cfg.header.length) {
    const header = document.createElement('div');
    header.className = 'spl-grid-cell__header';
    renderFields(header, cfg.header, data, cfg);
    cell.appendChild(header);
  }

  // Body zone
  if (cfg.body.length) {
    const body = document.createElement('div');
    body.className = 'spl-grid-cell__body';
    renderFields(body, cfg.body, data, cfg);
    cell.appendChild(body);
  }

  // Footer zone
  if (cfg.footer.length) {
    const footer = document.createElement('div');
    footer.className = 'spl-grid-cell__footer';
    renderFields(footer, cfg.footer, data, cfg);
    cell.appendChild(footer);
  }

  // Conflict hover
  if (data.issueIds?.length) {
    cell.addEventListener('mouseenter', () => {
      cell.classList.add(CONFLICT_HIGHLIGHT);
      for (const id of data.issueIds) {
        const related = document.querySelectorAll(`[data-matchup-id="${id}"]`);
        related.forEach((el) => el.classList.add(CONFLICT_HIGHLIGHT));
      }
    });
    cell.addEventListener('mouseleave', () => {
      cell.classList.remove(CONFLICT_HIGHLIGHT);
      for (const id of data.issueIds) {
        const related = document.querySelectorAll(`[data-matchup-id="${id}"]`);
        related.forEach((el) => el.classList.remove(CONFLICT_HIGHLIGHT));
      }
    });
  }

  return cell;
}

// ============================================================================
// Status Classes
// ============================================================================

function applyStatusClasses(cell: HTMLElement, data: ScheduleCellData): void {
  const status = data.matchUpStatus?.toUpperCase();

  if (status === 'COMPLETED') cell.classList.add(COMPLETED_MATCHUP);
  else if (status === 'RETIRED') cell.classList.add(COMPLETED_MATCHUP);
  else if (status === 'DEFAULTED') cell.classList.add(COMPLETED_MATCHUP);
  else if (status === 'WALKOVER') cell.classList.add(COMPLETED_MATCHUP);
  else if (status === 'IN_PROGRESS') cell.classList.add('spl-cell--inprogress');
  else if (status === 'ABANDONED') cell.classList.add('spl-cell--abandoned');
  else if (status === 'CANCELLED') cell.classList.add('spl-cell--cancelled');
  else if (status === 'DOUBLE_WALKOVER') cell.classList.add('spl-cell--double-walkover');

  // Schedule state from proConflicts — accept both prefixed ("SCHEDULE_ERROR")
  // and raw factory values ("ERROR", "CONFLICT", "WARNING", "ISSUE")
  const schedState = data.scheduleState?.toUpperCase();
  if (schedState === 'SCHEDULE_ERROR' || schedState === 'ERROR') cell.classList.add('spl-cell--error');
  else if (schedState === 'SCHEDULE_CONFLICT' || schedState === 'CONFLICT') cell.classList.add('spl-cell--conflict');
  else if (schedState === 'SCHEDULE_WARNING' || schedState === 'WARNING') cell.classList.add('spl-cell--warning');
  else if (schedState === 'SCHEDULE_ISSUE' || schedState === 'ISSUE') cell.classList.add('spl-cell--issue');

  if (data.issueType === 'DOUBLE_BOOKING' || data.issueType === 'courtDoubleBooking')
    cell.classList.add('spl-cell--double-booking');
}

// ============================================================================
// Field Rendering
// ============================================================================

function renderFields(
  container: HTMLElement,
  fields: ScheduleCellConfig['header'],
  data: ScheduleCellData,
  cfg: ScheduleCellConfig
): void {
  for (const field of fields) {
    const el = renderField(field, data, cfg);
    if (el) container.appendChild(el);
  }
}

function renderField(field: string, data: ScheduleCellData, cfg: ScheduleCellConfig): HTMLElement | null {
  switch (field) {
    case 'time':
      return renderTime(data);
    case 'eventRound':
      return renderEventRound(data);
    case 'participants':
      return renderParticipants(data, cfg.participantDisplay);
    case 'score':
      return renderScore(data);
    case 'matchUpStatus':
      return renderMatchUpStatus(data);
    case 'matchUpFormat':
      return renderMatchUpFormat(data);
    case 'umpire':
      return renderUmpire(data);
    default:
      return null;
  }
}

// ── Time ──

function renderTime(data: ScheduleCellData): HTMLElement | null {
  const time = data.schedule?.scheduledTime || data.schedule?.startTime;
  const modifiers = data.schedule?.timeModifiers;
  const courtAnnotation = data.schedule?.courtAnnotation;

  if (!time && !modifiers?.length && !courtAnnotation) return null;

  const el = document.createElement('div');
  el.className = 'spl-grid-cell__time';

  const parts: string[] = [];
  if (modifiers?.length) parts.push(modifiers.join(' '));
  if (time) parts.push(time);
  el.textContent = parts.join(' ') || '';

  if (courtAnnotation) {
    const anno = document.createElement('span');
    anno.className = 'spl-grid-cell__court-annotation';
    anno.textContent = ` ${courtAnnotation}`;
    el.appendChild(anno);
  }

  return el;
}

// ── Event / Round ──

function renderEventRound(data: ScheduleCellData): HTMLElement | null {
  const parts = [data.eventName, data.roundName].filter(Boolean);
  if (!parts.length) return null;

  const el = document.createElement('div');
  el.className = 'spl-grid-cell__event-round';
  el.textContent = parts.join(' ');
  return el;
}

// ── Participants ──

function renderParticipants(data: ScheduleCellData, displayConfig?: ParticipantDisplayConfig): HTMLElement | null {
  const dc = displayConfig ?? DEFAULT_SCHEDULE_CELL_CONFIG.participantDisplay;
  const container = document.createElement('div');
  container.className = 'spl-grid-cell__participants';

  const sides = data.sides || [];

  // Check if this is a BYE matchUp
  const isBye = data.matchUpStatus?.toUpperCase() === 'BYE';
  const hasByeSide = sides.some((s) => s.bye);

  if (sides.length === 0 && dc.showPotentials !== false && data.potentialParticipants?.length) {
    // Show potential participants
    for (let i = 0; i < data.potentialParticipants.length; i++) {
      if (i > 0) container.appendChild(buildVsDivider());
      const potentials = data.potentialParticipants[i];
      const names = potentials.map((p: any) => p?.participantName || 'TBD').join(' / ');
      const el = document.createElement('div');
      el.className = 'spl-grid-cell__side spl-grid-cell__potential';
      el.textContent = names || 'TBD';
      container.appendChild(el);
    }
    return container;
  }

  if (sides.length === 0) return null;

  for (let i = 0; i < sides.length; i++) {
    const side = sides[i];
    if (side.bye) {
      // Render BYE marker
      container.appendChild(buildByeMarker());
    } else {
      if (i > 0 && !sides[i - 1]?.bye) container.appendChild(buildVsDivider());
      container.appendChild(buildSideElement(side, data, dc, side.sideNumber ?? i + 1));
    }
  }

  // If BYE matchUp with only one real side, show BYE as the "other" side
  if ((isBye || hasByeSide) && sides.length === 1 && !sides[0].bye) {
    container.appendChild(buildByeMarker());
  }

  return container;
}

function buildSideElement(
  side: ScheduleCellSide,
  data: ScheduleCellData,
  dc: ParticipantDisplayConfig,
  sideNumber: number
): HTMLElement {
  const sideEl = document.createElement('div');
  sideEl.className = 'spl-grid-cell__side';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'spl-grid-cell__name';

  const name = formatName(side.participantName, dc.nameFormat);
  let text = name || 'TBD';

  if (dc.showSeed && side.seedNumber) {
    text += ` [${side.seedNumber}]`;
  }
  if (dc.showRanking && side.ranking) {
    text += ` (#${side.ranking})`;
  }
  if (dc.showNationality && side.nationality) {
    text += ` ${side.nationality}`;
  }

  nameSpan.textContent = text;

  // Bold winner
  if (dc.boldWinner !== false && data.winningSide === sideNumber) {
    nameSpan.style.fontWeight = 'bold';
  }

  sideEl.appendChild(nameSpan);

  // Team name (for individual matchUps within a tie/team event)
  if (side.teamName) {
    const teamEl = document.createElement('div');
    teamEl.className = 'spl-grid-cell__team-name';
    teamEl.textContent = side.teamName;
    sideEl.appendChild(teamEl);
  }

  return sideEl;
}

function buildByeMarker(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'spl-grid-cell__bye';
  el.textContent = 'BYE';
  return el;
}

function buildVsDivider(): HTMLElement {
  const vs = document.createElement('div');
  vs.className = 'spl-grid-cell__vs';
  vs.textContent = 'vs.';
  return vs;
}

function formatName(name: string | undefined, format?: string): string {
  if (!name) return '';

  switch (format) {
    case 'last': {
      // Take last name (first token if "LastName, First" or last token if "First Last")
      if (name.includes(',')) return name.split(',')[0].trim();
      const parts = name.trim().split(/\s+/);
      return parts.at(-1);
    }
    case 'lastFirst': {
      if (name.includes(',')) return name.trim(); // already "Last, First"
      const parts = name.trim().split(/\s+/);
      if (parts.length < 2) return name;
      return `${parts.at(-1)}, ${parts.slice(0, -1).join(' ')}`;
    }
    case 'firstLast': {
      if (!name.includes(',')) return name.trim(); // already "First Last"
      const [last, ...rest] = name.split(',');
      return `${rest.join(',').trim()} ${last.trim()}`;
    }
    case 'full':
    default:
      return name;
  }
}

// ── Score ──

function renderScore(data: ScheduleCellData): HTMLElement | null {
  const score = data.score?.scoreStringSide1;
  const status = data.matchUpStatus?.toUpperCase();

  // Show status text for walkover/default/retired etc.
  const statusText =
    status === 'WALKOVER'
      ? 'WALKOVER'
      : status === 'DEFAULTED'
      ? 'DEFAULT'
      : status === 'RETIRED'
      ? 'RET.'
      : status === 'DOUBLE_WALKOVER'
      ? 'D.W/O'
      : status === 'ABANDONED'
      ? 'ABN.'
      : null;

  if (!score && !statusText) return null;

  const el = document.createElement('div');
  el.className = 'spl-grid-cell__score';
  el.textContent = score || statusText || '';
  return el;
}

// ── MatchUp Status ──

function renderMatchUpStatus(data: ScheduleCellData): HTMLElement | null {
  if (!data.matchUpStatus) return null;

  const el = document.createElement('div');
  el.className = 'spl-grid-cell__status-badge';

  const status = data.matchUpStatus.toUpperCase();
  if (status === 'IN_PROGRESS') {
    el.textContent = 'LIVE';
    el.classList.add('spl-grid-cell__status-badge--live');
  } else if (status === 'COMPLETED' || status === 'RETIRED' || status === 'DEFAULTED' || status === 'WALKOVER') {
    el.textContent = 'DONE';
    el.classList.add('spl-grid-cell__status-badge--done');
  } else {
    el.textContent = data.matchUpStatus.replaceAll('_', ' ');
  }

  return el;
}

// ── MatchUp Format ──

function renderMatchUpFormat(data: ScheduleCellData): HTMLElement | null {
  if (!data.matchUpFormat) return null;

  const el = document.createElement('div');
  el.className = 'spl-grid-cell__format';
  el.textContent = data.matchUpFormat;
  return el;
}

// ── Umpire ──

function renderUmpire(data: ScheduleCellData): HTMLElement | null {
  if (!data.umpire) return null;

  const el = document.createElement('div');
  el.className = 'spl-grid-cell__umpire';
  el.textContent = data.umpire;
  return el;
}

// ============================================================================
// Data Mapper — factory matchUp → ScheduleCellData
// ============================================================================

/**
 * Maps a factory hydrated matchUp object to the flat ScheduleCellData shape.
 * Handles sides[].participant.participantName nesting, schedule.* extraction, etc.
 */
export function mapMatchUpToCellData(matchUp: any): ScheduleCellData {
  if (!matchUp) return { matchUpId: '' };

  // Handle blocked cells
  if (matchUp.isBlocked) {
    return {
      matchUpId: '',
      isBlocked: true,
      booking: matchUp.booking
    };
  }

  const sides: ScheduleCellSide[] = (matchUp.sides || []).map((s: any, i: number) => ({
    sideNumber: s.sideNumber ?? i + 1,
    participantName: s.participant?.participantName ?? s.participantName,
    participantId: s.participantId ?? s.participant?.participantId,
    seedNumber: s.seedValue ?? s.seedNumber,
    ranking: s.ranking,
    nationality: s.participant?.nationalityCode ?? s.participant?.person?.nationalityCode ?? s.nationalityCode,
    teamName: s.teamParticipant?.participantName ?? s.teamName,
    bye: s.bye || undefined
  }));

  return {
    matchUpId: matchUp.matchUpId,
    drawId: matchUp.drawId,
    eventName: matchUp.eventName,
    roundName: matchUp.roundName,
    matchUpFormat: matchUp.matchUpFormat,
    matchUpType: matchUp.matchUpType,
    matchUpStatus: matchUp.matchUpStatus,
    winningSide: matchUp.winningSide,
    gender: matchUp.gender ?? matchUp.eventGender,
    sides,
    potentialParticipants: matchUp.potentialParticipants,
    schedule: matchUp.schedule
      ? {
          scheduledTime: matchUp.schedule.scheduledTime,
          startTime: matchUp.schedule.startTime,
          timeModifiers: matchUp.schedule.timeModifiers,
          courtAnnotation: matchUp.schedule.courtAnnotation,
          courtId: matchUp.schedule.courtId,
          courtOrder: matchUp.schedule.courtOrder,
          venueId: matchUp.schedule.venueId
        }
      : undefined,
    score: matchUp.score
      ? {
          scoreStringSide1: matchUp.score.scoreStringSide1,
          scoreStringSide2: matchUp.score.scoreStringSide2
        }
      : undefined,
    umpire: matchUp.umpire?.participantName ?? matchUp.umpireName,
    scheduleState: matchUp.scheduleState,
    issueType: matchUp.issueType,
    issueIds: matchUp.issueIds
  };
}
