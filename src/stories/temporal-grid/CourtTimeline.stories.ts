/**
 * CourtTimeline stories — custom timeline component
 *
 * Demonstrates:
 * - Engine-backed timeline with full CRUD
 * - Multi-row ghost creation (new feature)
 * - Court filtering via venue tree
 * - Stats bar driven by engine capacity curve
 */

import type { TimelineGroupData, TimelineItemData, MultiRowSpan } from '../../components/temporal-grid/timeline/types';
import { showCourtAvailabilityModal } from '../../components/temporal-grid/ui/courtAvailabilityModal';
import { mocksEngine, tournamentEngine, TemporalEngine, temporal } from 'tods-competition-factory';
import { buildViewToolbar, VIEW_PRESETS } from '../../components/temporal-grid/ui/viewToolbar';
import { createBlockPopoverManager } from '../../components/temporal-grid/ui/blockPopover';
import { CourtTimeline } from '../../components/temporal-grid/timeline/CourtTimeline';
import { buildStatsBar } from '../../components/temporal-grid/ui/statsBar';
import {
  buildResourcesFromTimelines,
  buildEventsFromTimelines,
  buildBlockEvents,
  buildTimelineWindowConfig,
  parseResourceId,
  parseBlockEventId
} from '../../components/temporal-grid/controller/viewProjections';

import { Datepicker } from 'vanillajs-datepicker';
import '../../components/temporal-grid/ui/styles.css';
import 'vanillajs-datepicker/css/datepicker.css';
import 'tippy.js/dist/tippy.css';

const { BLOCK_TYPES, calculateCapacityStats } = temporal;

export default {
  title: 'Temporal Grid/CourtTimeline'
};

// ── Shared constants ─────────────────────────────────────────────────────────

const VENUE_NAME_MAIN = 'Main Stadium';
const VENUE_NAME_PRACTICE = 'Practice Center';
const VENUE_ID_MAIN = 'venue-main';
const STYLE_HEADER =
  'padding: 10px 12px; font-weight: 600; font-size: 14px; color: var(--chc-text-primary); border-bottom: 1px solid var(--chc-border-primary); background: var(--chc-bg-elevated);';
const STYLE_GROUP_ROW = 'padding: 4px 0;';
const STYLE_COURT_LIST = 'padding-left: 28px;';
const STYLE_COURT_ROW =
  'display: flex; align-items: center; gap: 6px; padding: 3px 0; cursor: pointer; color: var(--chc-text-secondary);';
const STYLE_ROOT =
  'display:flex; flex-direction:column; width:100%; height:600px; border:1px solid var(--chc-border-primary); border-radius:4px; overflow:hidden;';
const STYLE_MAIN_ROW = 'display:flex; flex:1; min-height:0;';
const STYLE_TIMELINE_CONTAINER = 'flex:1; min-width:0;';
const VENUE_COLORS = ['rgba(33, 141, 141, 0.06)', 'rgba(33, 96, 200, 0.06)', 'rgba(156, 39, 176, 0.06)'];
const STYLE_VENUE_LABEL = 'font-weight: 600; color: var(--chc-text-primary);';
const DATE_PICKER_FORMAT = 'yyyy-mm-dd';
const CURSOR_NOT_ALLOWED = 'not-allowed';

// ── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => n.toString().padStart(2, '0');

function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

function dayOf(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return toLocalISO(date).slice(0, 10);
}

/** Generate an array of YYYY-MM-DD date strings starting from startDate */
function getDateRange(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(`${startDate}T12:00:00`); // noon to avoid DST issues
  for (let i = 0; i < count; i++) {
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Generate all YYYY-MM-DD from startDate to endDate inclusive */
function getFullDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const d = new Date(`${startDate}T12:00:00`);
  const last = new Date(`${endDate}T12:00:00`);
  while (d <= last) {
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Format YYYY-MM-DD as e.g. "Jun 15, 2026" */
function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Aggregate capacity stats across multiple days */
function computeMultiDayStats(
  engine: TemporalEngine,
  days: string[]
): { totalHours: number; blockedHours: number; availableHours: number; avgPerCourt: number } {
  let totalCourtHours = 0;
  let totalUnavailableHours = 0;
  let totalAvailableHours = 0;
  let totalCourts = 0;

  for (const day of days) {
    const curve = engine.getCapacityCurve(day);
    const stats = calculateCapacityStats(curve);
    totalCourtHours += stats.totalCourtHours;
    totalUnavailableHours += stats.totalUnavailableHours ?? 0;
    totalAvailableHours += stats.totalAvailableHours ?? 0;
    totalCourts = stats.totalCourts ?? 0; // same across days
  }

  return {
    totalHours: totalCourtHours,
    blockedHours: totalUnavailableHours,
    availableHours: totalAvailableHours,
    avgPerCourt: totalCourts > 0 ? totalAvailableHours / totalCourts : 0
  };
}

const MAX_VISIBLE_DAYS = 7;

// ── Venue tree panel ─────────────────────────────────────────────────────────

interface VenueInfo {
  id: string;
  name: string;
  color: string;
  courts: { id: string; name: string }[];
}

// ── Shared engine setup ──────────────────────────────────────────────────────

function createEngineSetup(options?: { includeBookings?: boolean }) {
  const startDate = '2026-06-15';

  const venueProfiles = [
    {
      venueId: VENUE_ID_MAIN,
      venueName: VENUE_NAME_MAIN,
      venueAbbreviation: 'MS',
      courtsCount: 8,
      startTime: '08:00',
      endTime: '20:00'
    },
    {
      venueId: 'venue-practice',
      venueName: VENUE_NAME_PRACTICE,
      venueAbbreviation: 'PC',
      courtsCount: 4,
      startTime: '07:00',
      endTime: '21:00'
    }
  ];

  const result = mocksEngine.generateTournamentRecord({
    venueProfiles,
    drawProfiles: [{ drawSize: 16, seedsCount: 4 }],
    startDate
  });

  const { tournamentRecord } = result;
  if (!tournamentRecord) {
    throw new Error(`Failed to generate tournament: ${JSON.stringify(result.error || 'unknown error')}`);
  }

  // Add some court-level bookings
  tournamentEngine.setState(tournamentRecord);

  const mainVenue = tournamentRecord.venues?.find((v: any) => v.venueId === VENUE_ID_MAIN);
  const mainCourts: any[] = mainVenue?.courts || [];

  if (options?.includeBookings !== false) {
    if (mainCourts[0]) {
      tournamentEngine.modifyCourtAvailability({
        courtId: mainCourts[0].courtId,
        dateAvailability: [
          {
            date: startDate,
            startTime: '08:00',
            endTime: '20:00',
            bookings: [{ startTime: '09:00', endTime: '11:00', bookingType: 'MAINTENANCE' }]
          }
        ]
      });
    }

    if (mainCourts[2]) {
      tournamentEngine.modifyCourtAvailability({
        courtId: mainCourts[2].courtId,
        dateAvailability: [
          {
            date: startDate,
            startTime: '08:00',
            endTime: '20:00',
            bookings: [{ startTime: '14:00', endTime: '16:00', bookingType: 'PRACTICE' }]
          }
        ]
      });
    }
  }

  const stateResult = tournamentEngine.getState();
  const recordWithBookings = stateResult?.tournamentRecord ?? tournamentRecord;

  const engine = new TemporalEngine();
  engine.init(recordWithBookings, {
    dayStartTime: '06:00',
    dayEndTime: '22:00',
    slotMinutes: 5
  });

  const courtNameMap = new Map<string, string>();
  for (const venue of recordWithBookings.venues || []) {
    for (const court of venue.courts || []) {
      const key = `${engine.getConfig().tournamentId}|${venue.venueId}|${court.courtId}`;
      courtNameMap.set(key, court.courtName || court.courtId);
    }
  }

  const venueInfos: VenueInfo[] = (recordWithBookings.venues || []).map((venue: any, i: number) => ({
    id: venue.venueId,
    name: venue.venueName,
    color: VENUE_COLORS[i % VENUE_COLORS.length],
    courts: (venue.courts || []).map((c: any) => ({
      id: `${engine.getConfig().tournamentId}|${venue.venueId}|${c.courtId}`,
      name: c.courtName || c.courtId
    }))
  }));

  const allCourtIds = venueInfos.flatMap((v) => v.courts.map((c) => c.id));

  // Snapshot initial blocks per court for dirty-checking on save
  const initialBlockSnapshot = new Map<string, string>();
  const initialBlocks = engine.getDayBlocks(startDate);
  const initialByCourt = new Map<string, Array<{ start: string; end: string; type: string }>>();
  for (const meta of engine.listCourtMeta()) {
    initialByCourt.set(meta.ref.courtId, []);
  }
  for (const block of initialBlocks) {
    const existing = initialByCourt.get(block.court.courtId) || [];
    existing.push({ start: block.start, end: block.end, type: block.type });
    initialByCourt.set(block.court.courtId, existing);
  }
  initialByCourt.forEach((blocks, courtId) => {
    initialBlockSnapshot.set(courtId, JSON.stringify(blocks));
  });

  return {
    engine,
    tournamentRecord: recordWithBookings,
    startDate,
    courtNameMap,
    venueInfos,
    allCourtIds,
    initialBlockSnapshot
  };
}

/** Parameterized engine setup — accepts start/end dates, no bookings, no initialBlockSnapshot */
function createEngineSetupWithDates({ startDate, endDate }: { startDate: string; endDate: string }) {
  const venueProfiles = [
    {
      venueId: VENUE_ID_MAIN,
      venueName: VENUE_NAME_MAIN,
      venueAbbreviation: 'MS',
      courtsCount: 8,
      startTime: '08:00',
      endTime: '20:00'
    },
    {
      venueId: 'venue-practice',
      venueName: VENUE_NAME_PRACTICE,
      venueAbbreviation: 'PC',
      courtsCount: 4,
      startTime: '07:00',
      endTime: '21:00'
    }
  ];

  const result = mocksEngine.generateTournamentRecord({
    venueProfiles,
    drawProfiles: [{ drawSize: 16, seedsCount: 4 }],
    startDate,
    endDate
  });

  const { tournamentRecord } = result;
  if (!tournamentRecord) {
    throw new Error(`Failed to generate tournament: ${JSON.stringify(result.error || 'unknown error')}`);
  }

  tournamentEngine.setState(tournamentRecord);
  const stateResult = tournamentEngine.getState();
  const recordWithBookings = stateResult?.tournamentRecord ?? tournamentRecord;

  const engine = new TemporalEngine();
  engine.init(recordWithBookings, {
    dayStartTime: '06:00',
    dayEndTime: '22:00',
    slotMinutes: 5
  });

  const courtNameMap = new Map<string, string>();
  for (const venue of recordWithBookings.venues || []) {
    for (const court of venue.courts || []) {
      const key = `${engine.getConfig().tournamentId}|${venue.venueId}|${court.courtId}`;
      courtNameMap.set(key, court.courtName || court.courtId);
    }
  }

  const venueInfos: VenueInfo[] = (recordWithBookings.venues || []).map((venue: any, i: number) => ({
    id: venue.venueId,
    name: venue.venueName,
    color: VENUE_COLORS[i % VENUE_COLORS.length],
    courts: (venue.courts || []).map((c: any) => ({
      id: `${engine.getConfig().tournamentId}|${venue.venueId}|${c.courtId}`,
      name: c.courtName || c.courtId
    }))
  }));

  const allCourtIds = venueInfos.flatMap((v) => v.courts.map((c) => c.id));

  return { engine, tournamentRecord: recordWithBookings, startDate, endDate, courtNameMap, venueInfos, allCourtIds };
}

// ── Venue tree with edit icons ───────────────────────────────────────────────

function buildCourtTreeWithEditIcons(
  venues: VenueInfo[],
  visibleCourts: Set<string>,
  onChange: () => void,
  onVenueEdit: (venueId: string, venueName: string) => void,
  onCourtEdit: (courtResourceId: string, courtName: string) => void
): HTMLElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 220px; flex-shrink: 0; border-right: 1px solid var(--chc-border-primary);
    background: var(--chc-bg-secondary); overflow-y: auto; font-family: sans-serif; font-size: 13px;
  `;

  const header = document.createElement('div');
  header.style.cssText = STYLE_HEADER;
  header.textContent = 'Venues & Courts';
  panel.appendChild(header);

  for (const venue of venues) {
    const group = document.createElement('div');
    group.style.cssText = STYLE_GROUP_ROW;

    const venueRow = document.createElement('div');
    venueRow.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer;';

    const venueCb = document.createElement('input');
    venueCb.type = 'checkbox';
    venueCb.checked = venue.courts.every((c) => visibleCourts.has(c.id));
    venueCb.indeterminate = !venueCb.checked && venue.courts.some((c) => visibleCourts.has(c.id));
    venueCb.style.cursor = 'pointer';

    const venueLabel = document.createElement('span');
    venueLabel.textContent = venue.name;
    venueLabel.style.cssText = STYLE_VENUE_LABEL;

    const venueEditBtn = document.createElement('button');
    venueEditBtn.textContent = '\u270E';
    venueEditBtn.title = `Edit ${venue.name} venue defaults`;
    venueEditBtn.style.cssText =
      'opacity: 0; border: none; background: none; cursor: pointer; font-size: 14px; color: #218D8D; padding: 0 2px; transition: opacity 0.15s;';
    venueEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onVenueEdit(venue.id, venue.name);
    });

    const courtCount = document.createElement('span');
    courtCount.style.cssText = 'margin-left: auto; color: var(--chc-text-muted); font-weight: 400; font-size: 12px;';
    const updateCount = () => {
      const vis = venue.courts.filter((c) => visibleCourts.has(c.id)).length;
      courtCount.textContent = `${vis}/${venue.courts.length}`;
    };
    updateCount();

    venueRow.appendChild(venueCb);
    venueRow.appendChild(venueLabel);
    venueRow.appendChild(venueEditBtn);
    venueRow.appendChild(courtCount);
    group.appendChild(venueRow);

    venueRow.addEventListener('mouseenter', () => {
      venueEditBtn.style.opacity = '1';
    });
    venueRow.addEventListener('mouseleave', () => {
      venueEditBtn.style.opacity = '0';
    });

    const courtList = document.createElement('div');
    courtList.style.cssText = STYLE_COURT_LIST;
    const courtCheckboxes: HTMLInputElement[] = [];

    for (const court of venue.courts) {
      const courtRow = document.createElement('div');
      courtRow.style.cssText = STYLE_COURT_ROW;

      const courtCb = document.createElement('input');
      courtCb.type = 'checkbox';
      courtCb.checked = visibleCourts.has(court.id);
      courtCb.style.cursor = 'pointer';

      courtCb.addEventListener('change', () => {
        if (courtCb.checked) visibleCourts.add(court.id);
        else visibleCourts.delete(court.id);
        const allChecked = venue.courts.every((c) => visibleCourts.has(c.id));
        const someChecked = venue.courts.some((c) => visibleCourts.has(c.id));
        venueCb.checked = allChecked;
        venueCb.indeterminate = !allChecked && someChecked;
        updateCount();
        onChange();
      });
      courtCheckboxes.push(courtCb);

      const courtLabel = document.createElement('span');
      courtLabel.textContent = court.name;

      const courtEditBtn = document.createElement('button');
      courtEditBtn.textContent = '\u270E';
      courtEditBtn.title = `Edit ${court.name} availability`;
      courtEditBtn.style.cssText =
        'opacity: 0; border: none; background: none; cursor: pointer; font-size: 13px; color: #218D8D; padding: 0 2px; transition: opacity 0.15s;';
      courtEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCourtEdit(court.id, court.name);
      });

      courtRow.appendChild(courtCb);
      courtRow.appendChild(courtLabel);
      courtRow.appendChild(courtEditBtn);
      courtList.appendChild(courtRow);

      courtRow.addEventListener('mouseenter', () => {
        courtEditBtn.style.opacity = '1';
      });
      courtRow.addEventListener('mouseleave', () => {
        courtEditBtn.style.opacity = '0';
      });
    }

    venueCb.addEventListener('change', () => {
      for (const court of venue.courts) {
        if (venueCb.checked) visibleCourts.add(court.id);
        else visibleCourts.delete(court.id);
      }
      for (const cb of courtCheckboxes) cb.checked = venueCb.checked;
      venueCb.indeterminate = false;
      updateCount();
      onChange();
    });

    group.appendChild(courtList);
    panel.appendChild(group);
  }

  return panel;
}

// ── Data builders ────────────────────────────────────────────────────────────

function getGroups(
  engine: TemporalEngine,
  startDate: string,
  visibleCourts: Set<string>,
  courtNameMap: Map<string, string>
): TimelineGroupData[] {
  const timelines = engine.getDayTimeline(startDate);
  const courtMeta = engine.listCourtMeta();
  const groups = buildResourcesFromTimelines(timelines, courtMeta);
  return groups
    .filter((g) => visibleCourts.has(String(g.id)))
    .map((g, i) => ({
      id: String(g.id),
      content: courtNameMap.get(String(g.id)) || g.content,
      order: i,
      courtRef: g.courtRef,
      surface: g.surface,
      indoor: g.indoor,
      hasLights: g.hasLights,
      tags: g.tags
    }));
}

function getItems(
  engine: TemporalEngine,
  startDate: string,
  visibleCourts: Set<string>,
  dayCount: number = MAX_VISIBLE_DAYS
): TimelineItemData[] {
  const dates = getDateRange(startDate, dayCount);
  const allSegments: any[] = [];
  const allBlocks: any[] = [];

  for (const day of dates) {
    const timelines = engine.getDayTimeline(day);
    allSegments.push(...buildEventsFromTimelines(timelines));
    allBlocks.push(...buildBlockEvents(engine.getDayBlocks(day)));
  }

  const allItems = [
    ...allSegments.filter((item) => visibleCourts.has(String(item.group))),
    ...allBlocks.filter((item) => visibleCourts.has(String(item.group)))
  ];
  return allItems.map((item) => ({
    id: String(item.id),
    group: String(item.group),
    content: item.content,
    start: item.start,
    end: item.end,
    type: item.type === 'background' ? ('background' as const) : ('range' as const),
    className: item.className,
    style: item.style,
    title: item.title,
    editable: item.editable,
    blockId: item.blockId,
    status: item.status,
    reason: item.reason,
    isBlock: item.isBlock,
    isSegment: item.isSegment,
    isConflict: item.isConflict
  }));
}

// ── Simple court tree (checkboxes, no edit icons) ────────────────────────────

function buildCourtTree(venues: VenueInfo[], visibleCourts: Set<string>, onChange: () => void): HTMLElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 220px; flex-shrink: 0; border-right: 1px solid var(--chc-border-primary);
    background: var(--chc-bg-secondary); overflow-y: auto; font-family: sans-serif; font-size: 13px;
  `;

  const header = document.createElement('div');
  header.style.cssText = STYLE_HEADER;
  header.textContent = 'Venues & Courts';
  panel.appendChild(header);

  for (const venue of venues) {
    const group = document.createElement('div');
    group.style.cssText = STYLE_GROUP_ROW;

    const venueRow = document.createElement('div');
    venueRow.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer;';

    const venueCb = document.createElement('input');
    venueCb.type = 'checkbox';
    venueCb.checked = venue.courts.every((c) => visibleCourts.has(c.id));
    venueCb.indeterminate = !venueCb.checked && venue.courts.some((c) => visibleCourts.has(c.id));
    venueCb.style.cursor = 'pointer';

    const venueLabel = document.createElement('span');
    venueLabel.textContent = venue.name;
    venueLabel.style.cssText = STYLE_VENUE_LABEL;

    const courtCount = document.createElement('span');
    courtCount.style.cssText = 'margin-left: auto; color: var(--chc-text-muted); font-weight: 400; font-size: 12px;';
    const updateCount = () => {
      const vis = venue.courts.filter((c) => visibleCourts.has(c.id)).length;
      courtCount.textContent = `${vis}/${venue.courts.length}`;
    };
    updateCount();

    venueRow.appendChild(venueCb);
    venueRow.appendChild(venueLabel);
    venueRow.appendChild(courtCount);
    group.appendChild(venueRow);

    const courtList = document.createElement('div');
    courtList.style.cssText = STYLE_COURT_LIST;
    const courtCheckboxes: HTMLInputElement[] = [];

    for (const court of venue.courts) {
      const courtRow = document.createElement('div');
      courtRow.style.cssText = STYLE_COURT_ROW;

      const courtCb = document.createElement('input');
      courtCb.type = 'checkbox';
      courtCb.checked = visibleCourts.has(court.id);
      courtCb.style.cursor = 'pointer';

      courtCb.addEventListener('change', () => {
        if (courtCb.checked) visibleCourts.add(court.id);
        else visibleCourts.delete(court.id);
        const allChecked = venue.courts.every((c) => visibleCourts.has(c.id));
        const someChecked = venue.courts.some((c) => visibleCourts.has(c.id));
        venueCb.checked = allChecked;
        venueCb.indeterminate = !allChecked && someChecked;
        updateCount();
        onChange();
      });
      courtCheckboxes.push(courtCb);

      const courtLabel = document.createElement('span');
      courtLabel.textContent = court.name;

      courtRow.appendChild(courtCb);
      courtRow.appendChild(courtLabel);
      courtList.appendChild(courtRow);
    }

    venueCb.addEventListener('change', () => {
      for (const court of venue.courts) {
        if (venueCb.checked) visibleCourts.add(court.id);
        else visibleCourts.delete(court.id);
      }
      for (const cb of courtCheckboxes) cb.checked = venueCb.checked;
      venueCb.indeterminate = false;
      updateCount();
      onChange();
    });

    group.appendChild(courtList);
    panel.appendChild(group);
  }

  return panel;
}

// ── Date controls panel ──────────────────────────────────────────────────────

function buildDateControlsPanel(params: {
  startDate: string;
  endDate: string;
  allDays: string[];
  availableDates: Set<string>;
  currentDay: string;
  onToggleDate: (dateStr: string) => void;
  onApplyRange: (startDate: string, endDate: string) => void;
}): { element: HTMLElement; refreshChips: () => void; initPickers: () => void } {
  const panel = document.createElement('div');
  panel.style.cssText =
    'padding: 8px 12px; border-bottom: 1px solid var(--chc-border-primary); background: var(--chc-bg-secondary); font-family: sans-serif; font-size: 13px;';

  // Row 1: date range inputs
  const row1 = document.createElement('div');
  row1.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;';

  const startLabel = document.createElement('span');
  startLabel.textContent = 'Start:';
  startLabel.style.cssText = 'color: var(--chc-text-secondary);';
  const startInput = document.createElement('input');
  startInput.type = 'text';
  startInput.value = params.startDate;
  startInput.readOnly = true;
  startInput.style.cssText =
    'font-size: 13px; padding: 2px 6px; border: 1px solid var(--chc-border-primary); border-radius: 4px; width: 110px; cursor: pointer; background: var(--chc-bg-elevated); color: var(--chc-text-primary);';

  const endLabel = document.createElement('span');
  endLabel.textContent = 'End:';
  endLabel.style.cssText = 'color: var(--chc-text-secondary);';
  const endInput = document.createElement('input');
  endInput.type = 'text';
  endInput.value = params.endDate;
  endInput.readOnly = true;
  endInput.style.cssText =
    'font-size: 13px; padding: 2px 6px; border: 1px solid var(--chc-border-primary); border-radius: 4px; width: 110px; cursor: pointer; background: var(--chc-bg-elevated); color: var(--chc-text-primary);';

  // Pickers are initialized after DOM attachment via initPickers()
  let startPicker: Datepicker | null = null;
  let endPicker: Datepicker | null = null;

  const initPickers = () => {
    if (startPicker) return; // already initialized
    startPicker = new Datepicker(startInput, { format: DATE_PICKER_FORMAT, autohide: true });
    endPicker = new Datepicker(endInput, { format: DATE_PICKER_FORMAT, autohide: true });
  };

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply Range';
  applyBtn.style.cssText =
    'padding: 3px 12px; border: 1px solid #218D8D; border-radius: 4px; cursor: pointer; font-size: 13px; background: #218D8D; color: white; font-weight: 600;';
  applyBtn.addEventListener('click', () => {
    const s = startInput.value;
    const e = endInput.value;
    if (s && e && s <= e) params.onApplyRange(s, e);
  });

  const summarySpan = document.createElement('span');
  summarySpan.style.cssText = 'color: var(--chc-text-muted); margin-left: 8px;';
  const updateSummary = () => {
    const total = params.allDays.length;
    const avail = params.availableDates.size;
    summarySpan.textContent = `${total} days, ${avail} available`;
  };
  updateSummary();

  row1.appendChild(startLabel);
  row1.appendChild(startInput);
  row1.appendChild(endLabel);
  row1.appendChild(endInput);
  row1.appendChild(applyBtn);
  row1.appendChild(summarySpan);
  panel.appendChild(row1);

  // Row 2: day chips
  const row2 = document.createElement('div');
  row2.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
  panel.appendChild(row2);

  const refreshChips = () => {
    row2.innerHTML = '';
    updateSummary();
    if (startPicker) startPicker.setDate(params.startDate, { clear: true });
    else startInput.value = params.startDate;
    if (endPicker) endPicker.setDate(params.endDate, { clear: true });
    else endInput.value = params.endDate;

    for (const day of params.allDays) {
      const chip = document.createElement('button');
      const shortLabel = new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chip.textContent = shortLabel;
      const isAvailable = params.availableDates.has(day);
      const isCurrent = day === params.currentDay;

      chip.style.cssText = `
        padding: 2px 8px; border-radius: 12px; cursor: pointer; font-size: 12px; position: relative;
        border: ${isAvailable ? '1px solid #218D8D' : '1px dashed #999'};
        background: ${isAvailable ? (isCurrent ? '#218D8D' : 'rgba(33, 141, 141, 0.1)') : 'transparent'};
        color: ${isAvailable ? (isCurrent ? 'white' : '#218D8D') : '#999'};
        font-weight: ${isCurrent ? '700' : '400'};
      `;

      chip.addEventListener('click', () => params.onToggleDate(day));
      row2.appendChild(chip);
    }
  };
  refreshChips();

  return { element: panel, refreshChips, initPickers };
}

// ── Day navigation bar ───────────────────────────────────────────────────────

function buildDayNavBar(params: { onPrev: () => void; onNext: () => void }): {
  element: HTMLElement;
  update: (day: string, sortedAvailable: string[], index: number) => void;
} {
  const bar = document.createElement('div');
  bar.style.cssText =
    'display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid var(--chc-border-primary); background: var(--chc-bg-secondary); font-family: sans-serif; font-size: 13px;';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '\u25C0 Prev';
  prevBtn.style.cssText =
    'padding: 3px 10px; border: 1px solid var(--chc-border-primary); border-radius: 4px; cursor: pointer; font-size: 12px; background: var(--chc-bg-elevated); color: var(--chc-text-primary);';
  prevBtn.addEventListener('click', params.onPrev);

  const dayLabel = document.createElement('span');
  dayLabel.style.cssText = STYLE_VENUE_LABEL;

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next \u25B6';
  nextBtn.style.cssText =
    'padding: 3px 10px; border: 1px solid var(--chc-border-primary); border-radius: 4px; cursor: pointer; font-size: 12px; background: var(--chc-bg-elevated); color: var(--chc-text-primary);';
  nextBtn.addEventListener('click', params.onNext);

  const indexLabel = document.createElement('span');
  indexLabel.style.cssText = 'color: var(--chc-text-muted); font-size: 12px;';

  bar.appendChild(prevBtn);
  bar.appendChild(dayLabel);
  bar.appendChild(nextBtn);
  bar.appendChild(indexLabel);

  const update = (day: string, sortedAvailable: string[], index: number) => {
    dayLabel.textContent = formatDayLabel(day);
    indexLabel.textContent = `(${index + 1} of ${sortedAvailable.length} available)`;
    prevBtn.disabled = index <= 0;
    prevBtn.style.opacity = index <= 0 ? '0.4' : '1';
    prevBtn.style.cursor = index <= 0 ? CURSOR_NOT_ALLOWED : 'pointer';
    nextBtn.disabled = index >= sortedAvailable.length - 1;
    nextBtn.style.opacity = index >= sortedAvailable.length - 1 ? '0.4' : '1';
    nextBtn.style.cursor = index >= sortedAvailable.length - 1 ? CURSOR_NOT_ALLOWED : 'pointer';
  };

  return { element: bar, update };
}

// ── Shared story helpers ─────────────────────────────────────────────────────

interface StoryContext {
  engine: TemporalEngine;
  startDate: string;
  visibleCourts: Set<string>;
  courtNameMap: Map<string, string>;
  statsBar: ReturnType<typeof buildStatsBar>;
  timelineRef: { current: CourtTimeline | null };
  config: ReturnType<TemporalEngine['getConfig']>;
  /** Optional extra work after rebuild (e.g. dirty-check save button) */
  afterRebuild?: () => void;
}

function createUpdateStats(ctx: StoryContext): () => void {
  return () => {
    const curve = ctx.engine.getCapacityCurve(ctx.startDate);
    const stats = calculateCapacityStats(curve);
    ctx.statsBar.update({
      totalHours: stats.totalCourtHours,
      blockedHours: stats.totalUnavailableHours ?? 0,
      availableHours: stats.totalAvailableHours ?? 0,
      avgPerCourt: (stats.totalCourts ?? 0) > 0 ? (stats.totalAvailableHours ?? 0) / stats.totalCourts! : 0
    });
  };
}

function createRebuildItems(ctx: StoryContext, updateStats: () => void): () => void {
  return () => {
    if (!ctx.timelineRef.current) return;
    const groups = getGroups(ctx.engine, ctx.startDate, ctx.visibleCourts, ctx.courtNameMap);
    const items = getItems(ctx.engine, ctx.startDate, ctx.visibleCourts);
    ctx.timelineRef.current.setGroups(groups);
    ctx.timelineRef.current.setItems(items);
    const timeRange = ctx.engine.getVisibleTimeRange(ctx.startDate);
    ctx.timelineRef.current.setDailyBounds(timeRange.startTime, timeRange.endTime);
    updateStats();
    ctx.afterRebuild?.();
  };
}

function createHandleVenueEdit(ctx: StoryContext, rebuildItems: () => void): (venueId: string, venueName: string) => void {
  return (venueId: string, venueName: string) => {
    const avail = ctx.engine.getVenueAvailability(ctx.config.tournamentId, venueId);
    showCourtAvailabilityModal({
      title: `${venueName} \u2014 Venue Defaults`,
      currentDay: ctx.startDate,
      currentStartTime: avail?.startTime || ctx.config.dayStartTime,
      currentEndTime: avail?.endTime || ctx.config.dayEndTime,
      showScopeToggle: false,
      onConfirm: ({ startTime, endTime }) => {
        ctx.engine.setVenueDefaultAvailability(ctx.config.tournamentId, venueId, { startTime, endTime });
        rebuildItems();
      }
    });
  };
}

function createHandleCourtEdit(ctx: StoryContext, rebuildItems: () => void): (courtResourceId: string, courtName: string) => void {
  return (courtResourceId: string, courtName: string) => {
    const courtRef = parseResourceId(courtResourceId);
    if (!courtRef) return;
    const avail = ctx.engine.getCourtAvailability(courtRef, ctx.startDate);
    showCourtAvailabilityModal({
      title: `${courtName} Availability`,
      currentDay: ctx.startDate,
      currentStartTime: avail.startTime,
      currentEndTime: avail.endTime,
      showScopeToggle: true,
      venueBounds: ctx.engine.getVenueAvailability(courtRef.tournamentId, courtRef.venueId) || undefined,
      onConfirm: ({ startTime, endTime, scope }) => {
        if (scope === 'all-days') {
          ctx.engine.setCourtAvailabilityAllDays(courtRef, { startTime, endTime });
        } else {
          ctx.engine.setCourtAvailability(courtRef, ctx.startDate, { startTime, endTime });
        }
        const venueAvail = ctx.engine.getVenueAvailability(courtRef.tournamentId, courtRef.venueId);
        if (venueAvail) {
          const widened = { startTime: venueAvail.startTime, endTime: venueAvail.endTime };
          if (startTime < venueAvail.startTime) widened.startTime = startTime;
          if (endTime > venueAvail.endTime) widened.endTime = endTime;
          if (widened.startTime !== venueAvail.startTime || widened.endTime !== venueAvail.endTime) {
            ctx.engine.setVenueDefaultAvailability(courtRef.tournamentId, courtRef.venueId, widened);
          }
        }
        rebuildItems();
      }
    });
  };
}

function createSetView(ctx: StoryContext): (viewKey: string) => void {
  return (viewKey: string) => {
    if (!ctx.timelineRef.current) return;
    const view = VIEW_PRESETS[viewKey];
    const timeRange = ctx.engine.getVisibleTimeRange(ctx.startDate);
    const windowStart = new Date(`${ctx.startDate}T${timeRange.startTime}:00`);
    const end = new Date(windowStart.getTime() + view.days * 16 * 60 * 60 * 1000);
    ctx.timelineRef.current.setWindow(windowStart, end);
    ctx.timelineRef.current.setOptions({ timeAxis: view.timeAxis });
  };
}

// ── Story: FactoryBacked ─────────────────────────────────────────────────────

/**
 * Full engine integration with CourtTimeline.
 *
 * Data flow:
 *   mocksEngine.generateTournamentRecord()
 *     -> TemporalEngine.init(tournamentRecord)
 *     -> engine.getDayTimeline() -> viewProjections -> CourtTimeline
 *
 * All block CRUD round-trips through the engine:
 *   Double-click -> ghost -> confirm -> engine.applyBlock()
 *   Drag/resize  -> engine.moveBlock()
 *   Popover type -> engine.removeBlock() + applyBlock()
 *   Delete       -> engine.removeBlock()
 */
export const FactoryBacked = {
  render: () => {
    const { engine, startDate, courtNameMap, venueInfos, allCourtIds } = createEngineSetup();
    const visibleCourts = new Set(allCourtIds);

    const popoverManager = createBlockPopoverManager();
    const statsBar = buildStatsBar();
    const config = engine.getConfig();

    const ctx: StoryContext = { engine, startDate, visibleCourts, courtNameMap, statsBar, timelineRef: { current: null }, config };
    const updateStats = createUpdateStats(ctx);
    const rebuildItems = createRebuildItems(ctx, updateStats);
    const handleVenueEdit = createHandleVenueEdit(ctx, rebuildItems);
    const handleCourtEdit = createHandleCourtEdit(ctx, rebuildItems);

    // DOM structure
    const root = document.createElement('div');
    root.style.cssText = STYLE_ROOT;

    const setView = createSetView(ctx);

    const { element: toolbar } = buildViewToolbar(setView, 'day');
    root.appendChild(toolbar);
    root.appendChild(statsBar.element);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = STYLE_MAIN_ROW;

    const treePanel = buildCourtTreeWithEditIcons(
      venueInfos,
      visibleCourts,
      rebuildItems,
      handleVenueEdit,
      handleCourtEdit
    );
    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = STYLE_TIMELINE_CONTAINER;

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    setTimeout(() => {
      const timeRange = engine.getVisibleTimeRange(startDate);
      const windowConfig = buildTimelineWindowConfig({
        dayStartTime: timeRange.startTime,
        dayEndTime: timeRange.endTime,
        slotMinutes: 5,
        day: startDate
      });

      const weekMax = new Date(`${startDate}T${timeRange.endTime}:00`);
      weekMax.setDate(weekMax.getDate() + 7);

      const groups = getGroups(engine, startDate, visibleCourts, courtNameMap);
      const items = getItems(engine, startDate, visibleCourts);

      const timeline = new CourtTimeline(timelineContainer, items, groups, {
        start: windowConfig.start,
        end: windowConfig.end,
        min: windowConfig.min,
        max: weekMax,
        zoomMin: windowConfig.zoomMin,
        zoomMax: 7 * 24 * 60 * 60 * 1000,
        snap: (date: Date) => {
          const ms = date.getTime();
          const fiveMin = 5 * 60 * 1000;
          return new Date(Math.round(ms / fiveMin) * fiveMin);
        },
        height: '100%',
        timeAxis: { scale: 'hour', step: 1 },
        showTooltips: true,
        rowHeight: 40
      });
      ctx.timelineRef.current = timeline;

      // Set daily bounds to collapse overnight gaps
      timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);

      // Wire onMove: drag/resize completes
      timeline.onMove((item) => {
        const blockId = parseBlockEventId(item.id);
        const courtRef = parseResourceId(item.group);
        if (blockId && courtRef) {
          const result = engine.moveBlock({
            blockId,
            newTimeRange: {
              start: toLocalISO(item.start),
              end: toLocalISO(item.end)
            },
            newCourt: courtRef
          });
          if (result.conflicts.some((c) => c.severity === 'ERROR')) {
            return false;
          }
          rebuildItems();
          return true;
        }
        return false;
      });

      // Wire onMoving: live validation during drag
      timeline.onMoving((item) => {
        popoverManager.destroy();
        const courtRef = parseResourceId(item.group);
        if (courtRef) {
          const itemDay = dayOf(item.start);
          const avail = engine.getCourtAvailability(courtRef, itemDay);
          const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
          const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
          const start = item.start < availStart ? availStart : item.start;
          const end = item.end > availEnd ? availEnd : item.end;
          return { start, end };
        }
        return { start: item.start, end: item.end };
      });

      // Wire multi-row ghost creation
      timeline.onMultiRowCreate((span: MultiRowSpan) => {
        const courts: any[] = [];
        for (const groupId of span.groupIds) {
          const court = parseResourceId(groupId);
          if (court) courts.push(court);
        }
        if (courts.length === 0) return;

        const result = engine.applyBlock({
          courts,
          timeRange: {
            start: toLocalISO(span.startTime),
            end: toLocalISO(span.endTime)
          },
          type: BLOCK_TYPES.BLOCKED,
          reason: 'New Block'
        });
        rebuildItems();

        // Show popover on first created block
        if (result.applied.length > 0) {
          const newBlockId = result.applied[0].block.id;
          const newItemId = `block-${newBlockId}`;
          const day = toLocalISO(span.startTime).slice(0, 10);
          setTimeout(() => {
            const el = timelineContainer.querySelector(`[data-item-id="${newItemId}"]`);
            if (el) {
              popoverManager.showForEngineBlock(el as HTMLElement, {
                itemId: newItemId,
                blockId: newBlockId,
                engine,
                day,
                onBlockChanged: rebuildItems
              });
            }
          }, 50);
        }
      });

      // Wire click: show popover for block items
      timeline.on('click', (props: { item: string; event: PointerEvent }) => {
        if (!props.item) {
          popoverManager.destroy();
          return;
        }

        // Find the item in our data
        const allItems = getItems(engine, startDate, visibleCourts);
        const item = allItems.find((i) => i.id === props.item);
        if (!item || item.isSegment || item.type === 'background') {
          popoverManager.destroy();
          return;
        }

        if (popoverManager.isActiveFor(props.item)) {
          popoverManager.destroy();
          return;
        }

        const blockId = parseBlockEventId(props.item);
        if (!blockId) return;

        const itemEl =
          (props.event?.target as Element)?.closest?.('.tg-item') ??
          timelineContainer.querySelector(`[data-item-id="${props.item}"]`);

        if (itemEl) {
          const blockDay = item.start ? dayOf(item.start) : startDate;
          popoverManager.showForEngineBlock(itemEl as HTMLElement, {
            itemId: props.item,
            blockId,
            engine,
            day: blockDay,
            onBlockChanged: rebuildItems
          });
        }
      });

      updateStats();
    }, 0);

    return root;
  }
};

// ── Story: MultiRowCreation ──────────────────────────────────────────────────

/**
 * Demonstrates the multi-row ghost creation feature.
 *
 * Instructions:
 * 1. Double-click on empty area to create a ghost box
 * 2. Drag the bottom edge of the ghost down to span multiple courts
 * 3. Drag left/right edges to adjust time range
 * 4. Click the ghost body to confirm -> creates one block per court
 * 5. Press Escape to cancel
 *
 * The court count badge shows how many courts the ghost spans.
 */
export const MultiRowCreation = {
  render: () => {
    const { engine, startDate, courtNameMap, venueInfos, allCourtIds } = createEngineSetup();
    const visibleCourts = new Set(allCourtIds);

    const popoverManager = createBlockPopoverManager();
    const statsBar = buildStatsBar();
    const config = engine.getConfig();

    const ctx: StoryContext = { engine, startDate, visibleCourts, courtNameMap, statsBar, timelineRef: { current: null }, config };
    const updateStats = createUpdateStats(ctx);
    const rebuildItems = createRebuildItems(ctx, updateStats);
    const handleVenueEdit = createHandleVenueEdit(ctx, rebuildItems);
    const handleCourtEdit = createHandleCourtEdit(ctx, rebuildItems);

    const root = document.createElement('div');
    root.style.cssText = STYLE_ROOT;

    // Instructions banner
    const banner = document.createElement('div');
    banner.style.cssText =
      'padding: 8px 14px; background: rgba(33, 141, 141, 0.08); border-bottom: 1px solid var(--chc-border-primary); font-size: 13px; color: var(--chc-text-primary); font-family: sans-serif;';
    banner.innerHTML =
      '<strong>Multi-Row Creation:</strong> Double-click empty area, drag bottom handle to span courts, click ghost to confirm. Escape to cancel.';
    root.appendChild(banner);

    root.appendChild(statsBar.element);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = STYLE_MAIN_ROW;

    const treePanel = buildCourtTreeWithEditIcons(
      venueInfos,
      visibleCourts,
      rebuildItems,
      handleVenueEdit,
      handleCourtEdit
    );
    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = STYLE_TIMELINE_CONTAINER;

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    // Log panel for multi-row events
    const logPanel = document.createElement('div');
    logPanel.style.cssText =
      'height: 80px; overflow-y: auto; padding: 6px 12px; border-top: 1px solid var(--chc-border-primary); font-family: monospace; font-size: 12px; background: var(--chc-bg-secondary); color: var(--chc-text-secondary);';
    logPanel.textContent = 'Event log:';
    root.appendChild(logPanel);

    const log = (msg: string) => {
      const line = document.createElement('div');
      line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logPanel.appendChild(line);
      logPanel.scrollTop = logPanel.scrollHeight;
    };

    setTimeout(() => {
      const timeRange = engine.getVisibleTimeRange(startDate);
      const windowConfig = buildTimelineWindowConfig({
        dayStartTime: timeRange.startTime,
        dayEndTime: timeRange.endTime,
        slotMinutes: 5,
        day: startDate
      });

      const groups = getGroups(engine, startDate, visibleCourts, courtNameMap);
      const items = getItems(engine, startDate, visibleCourts);

      const timeline = new CourtTimeline(timelineContainer, items, groups, {
        start: windowConfig.start,
        end: windowConfig.end,
        min: windowConfig.min,
        max: windowConfig.max,
        zoomMin: windowConfig.zoomMin,
        zoomMax: windowConfig.zoomMax,
        snap: (date: Date) => {
          const ms = date.getTime();
          const fiveMin = 5 * 60 * 1000;
          return new Date(Math.round(ms / fiveMin) * fiveMin);
        },
        height: '100%',
        timeAxis: { scale: 'hour', step: 1 },
        rowHeight: 40
      });
      ctx.timelineRef.current = timeline;

      // Set daily bounds to collapse overnight gaps
      timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);

      // Wire onMove
      timeline.onMove((item) => {
        const blockId = parseBlockEventId(item.id);
        const courtRef = parseResourceId(item.group);
        if (blockId && courtRef) {
          engine.moveBlock({
            blockId,
            newTimeRange: { start: toLocalISO(item.start), end: toLocalISO(item.end) },
            newCourt: courtRef
          });
          rebuildItems();
          log(`Moved block ${blockId} to ${toLocalISO(item.start)} - ${toLocalISO(item.end)}`);
          return true;
        }
        return false;
      });

      // Wire onMoving
      timeline.onMoving((item) => {
        popoverManager.destroy();
        const courtRef = parseResourceId(item.group);
        if (courtRef) {
          const itemDay = dayOf(item.start);
          const avail = engine.getCourtAvailability(courtRef, itemDay);
          const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
          const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
          return {
            start: item.start < availStart ? availStart : item.start,
            end: item.end > availEnd ? availEnd : item.end
          };
        }
        return { start: item.start, end: item.end };
      });

      // Wire multi-row ghost creation
      timeline.onMultiRowCreate((span: MultiRowSpan) => {
        const courts: any[] = [];
        for (const groupId of span.groupIds) {
          const court = parseResourceId(groupId);
          if (court) courts.push(court);
        }
        if (courts.length === 0) return;

        log(`Multi-row create: ${courts.length} courts, ${toLocalISO(span.startTime)} - ${toLocalISO(span.endTime)}`);

        const result = engine.applyBlock({
          courts,
          timeRange: { start: toLocalISO(span.startTime), end: toLocalISO(span.endTime) },
          type: BLOCK_TYPES.BLOCKED,
          reason: 'New Block'
        });

        log(`Created ${result.applied.length} block(s)`);
        rebuildItems();

        if (result.applied.length > 0) {
          const newBlockId = result.applied[0].block.id;
          const newItemId = `block-${newBlockId}`;
          const day = toLocalISO(span.startTime).slice(0, 10);
          setTimeout(() => {
            const el = timelineContainer.querySelector(`[data-item-id="${newItemId}"]`);
            if (el) {
              popoverManager.showForEngineBlock(el as HTMLElement, {
                itemId: newItemId,
                blockId: newBlockId,
                engine,
                day,
                onBlockChanged: rebuildItems
              });
            }
          }, 50);
        }
      });

      // Wire click
      timeline.on('click', (props: { item: string; event: PointerEvent }) => {
        if (!props.item) {
          popoverManager.destroy();
          return;
        }

        const allItems = getItems(engine, startDate, visibleCourts);
        const item = allItems.find((i) => i.id === props.item);
        if (!item || item.isSegment || item.type === 'background') {
          popoverManager.destroy();
          return;
        }

        if (popoverManager.isActiveFor(props.item)) {
          popoverManager.destroy();
          return;
        }

        const blockId = parseBlockEventId(props.item);
        if (!blockId) return;

        const itemEl =
          (props.event?.target as Element)?.closest?.('.tg-item') ??
          timelineContainer.querySelector(`[data-item-id="${props.item}"]`);

        if (itemEl) {
          popoverManager.showForEngineBlock(itemEl as HTMLElement, {
            itemId: props.item,
            blockId,
            engine,
            day: item.start ? dayOf(item.start) : startDate,
            onBlockChanged: rebuildItems
          });
        }
      });

      updateStats();
    }, 0);

    return root;
  }
};

// ── Story: RoundTrip ─────────────────────────────────────────────────────────

/**
 * Extends FactoryBacked with write-back to tournament record.
 *
 * Adds:
 * - "Set Default Availability" button
 * - "Save to Tournament" button that calls modifyCourtAvailability()
 * - Dirty-check: save button enables only when blocks changed
 * - Venue/court edit icons on the tree panel
 */
export const RoundTrip = {
  render: () => {
    const setup = createEngineSetup({ includeBookings: false });
    const { engine, startDate, courtNameMap, venueInfos, allCourtIds, initialBlockSnapshot } = setup;
    let { tournamentRecord } = setup;
    const visibleCourts = new Set(allCourtIds);

    const popoverManager = createBlockPopoverManager();
    const statsBar = buildStatsBar();
    const config = engine.getConfig();

    // Track current block snapshot for dirty-checking
    let currentBlockSnapshot = new Map(initialBlockSnapshot);

    const hasPendingChanges = (): boolean => {
      const allBlocks = engine.getAllBlocks();
      const blocksByCourt = new Map<string, Array<{ start: string; end: string; type: string }>>();
      for (const meta of engine.listCourtMeta()) {
        blocksByCourt.set(meta.ref.courtId, []);
      }
      for (const block of allBlocks) {
        const courtId = block.court.courtId;
        const existing = blocksByCourt.get(courtId) || [];
        existing.push({ start: block.start, end: block.end, type: block.type });
        blocksByCourt.set(courtId, existing);
      }
      for (const [courtId, courtBlocks] of blocksByCourt) {
        const snap = JSON.stringify(courtBlocks);
        const originalSnapshot = currentBlockSnapshot.get(courtId) || '[]';
        if (snap !== originalSnapshot) return true;
      }
      return false;
    };

    let saveBtn: HTMLButtonElement;

    const updateSaveButtonState = () => {
      if (!saveBtn) return;
      const dirty = hasPendingChanges();
      saveBtn.disabled = !dirty;
      saveBtn.style.opacity = dirty ? '1' : '0.5';
      saveBtn.style.cursor = dirty ? 'pointer' : CURSOR_NOT_ALLOWED;
    };

    const ctx: StoryContext = {
      engine, startDate, visibleCourts, courtNameMap, statsBar,
      timelineRef: { current: null }, config,
      afterRebuild: updateSaveButtonState
    };
    const updateStats = createUpdateStats(ctx);
    const rebuildItems = createRebuildItems(ctx, updateStats);
    const handleVenueEdit = createHandleVenueEdit(ctx, rebuildItems);
    const handleCourtEdit = createHandleCourtEdit(ctx, rebuildItems);

    // DOM structure
    const root = document.createElement('div');
    root.style.cssText = STYLE_ROOT;

    const setView = createSetView(ctx);

    // Toolbar with Save buttons
    const { element: toolbar } = buildViewToolbar(setView, 'day');

    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1;';
    toolbar.appendChild(spacer);

    const defaultAvailBtn = document.createElement('button');
    defaultAvailBtn.textContent = 'Set Default Availability';
    defaultAvailBtn.style.cssText =
      'padding:4px 14px; border:1px solid #666; border-radius:4px; cursor:pointer; font-size:13px; background:#666; color:white; font-weight:600; margin-right:8px;';
    defaultAvailBtn.addEventListener('click', () => {
      // Read from first venue's default (not court availability, which resolves through intersection)
      const firstVenueId = venueInfos[0]?.id;
      const venueAvail = firstVenueId ? engine.getVenueAvailability(config.tournamentId, firstVenueId) : null;
      const avail = venueAvail || { startTime: config.dayStartTime, endTime: config.dayEndTime };
      showCourtAvailabilityModal({
        title: 'Default Availability (All Courts)',
        currentDay: startDate,
        currentStartTime: avail.startTime,
        currentEndTime: avail.endTime,
        showScopeToggle: false,
        onConfirm: ({ startTime, endTime }) => {
          // Set venue defaults for ALL venues (venue level overrides global default)
          for (const venue of venueInfos) {
            engine.setVenueDefaultAvailability(config.tournamentId, venue.id, { startTime, endTime });
          }
          rebuildItems();
        }
      });
    });
    toolbar.appendChild(defaultAvailBtn);

    saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save to Tournament';
    saveBtn.disabled = true;
    saveBtn.style.cssText =
      'padding:4px 14px; border:1px solid #218D8D; border-radius:4px; cursor:not-allowed; font-size:13px; background:#218D8D; color:white; font-weight:600; opacity:0.5;';
    saveBtn.addEventListener('click', () => {
      if (saveBtn.disabled) return;
      tournamentEngine.setState(tournamentRecord);

      const allBlocks = engine.getAllBlocks();

      // Group blocks by courtId
      const blocksByCourt = new Map<string, Array<{ start: string; end: string; type: string }>>();
      for (const meta of engine.listCourtMeta()) {
        blocksByCourt.set(meta.ref.courtId, []);
      }
      for (const block of allBlocks) {
        const courtId = block.court.courtId;
        const existing = blocksByCourt.get(courtId) || [];
        existing.push({ start: block.start, end: block.end, type: block.type });
        blocksByCourt.set(courtId, existing);
      }

      // Group blocks by courtId+day for dateAvailability format
      const blocksByCourtDay = new Map<string, Map<string, Array<{ start: string; end: string; type: string }>>>();
      for (const block of allBlocks) {
        const courtId = block.court.courtId;
        const day = block.start.slice(0, 10);
        if (!blocksByCourtDay.has(courtId)) blocksByCourtDay.set(courtId, new Map());
        const dayMap = blocksByCourtDay.get(courtId)!;
        if (!dayMap.has(day)) dayMap.set(day, []);
        dayMap.get(day)!.push({ start: block.start, end: block.end, type: block.type });
      }

      let modifiedCount = 0;
      console.group('[RoundTrip] Save to Tournament');
      blocksByCourt.forEach((courtBlocks, courtId) => {
        const currentJson = JSON.stringify(courtBlocks);
        const originalSnapshot = currentBlockSnapshot.get(courtId) || '[]';
        if (currentJson === originalSnapshot) return;

        modifiedCount++;
        const dayMap = blocksByCourtDay.get(courtId) || new Map();
        const dateAvailability = Array.from(dayMap.entries()).map(([day, blocks]) => ({
          date: day,
          startTime: '06:00',
          endTime: '22:00',
          bookings: blocks.map((b) => ({
            startTime: b.start.slice(11, 16),
            endTime: b.end.slice(11, 16),
            bookingType: b.type
          }))
        }));

        if (dateAvailability.length === 0) {
          dateAvailability.push({ date: startDate, startTime: '06:00', endTime: '22:00', bookings: [] });
        }

        const params = { courtId, dateAvailability };
        console.log(`modifyCourtAvailability(${courtId}):`, params);
        tournamentEngine.modifyCourtAvailability(params);
      });
      console.log(`[RoundTrip] ${modifiedCount} court(s) modified, ${blocksByCourt.size - modifiedCount} unchanged`);
      console.groupEnd();

      const { tournamentRecord: updated } = tournamentEngine.getState() || {};
      tournamentRecord = updated;

      // Update snapshot so button disables
      currentBlockSnapshot = new Map<string, string>();
      blocksByCourt.forEach((courtBlocks, courtId) => {
        currentBlockSnapshot.set(courtId, JSON.stringify(courtBlocks));
      });

      saveBtn.textContent = 'Saved!';
      saveBtn.style.background = '#27ae60';
      saveBtn.style.borderColor = '#27ae60';
      setTimeout(() => {
        saveBtn.textContent = 'Save to Tournament';
        saveBtn.style.background = '#218D8D';
        saveBtn.style.borderColor = '#218D8D';
        updateSaveButtonState();
      }, 1500);
    });
    toolbar.appendChild(saveBtn);

    root.appendChild(toolbar);
    root.appendChild(statsBar.element);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = STYLE_MAIN_ROW;

    const treePanel = buildCourtTreeWithEditIcons(
      venueInfos,
      visibleCourts,
      rebuildItems,
      handleVenueEdit,
      handleCourtEdit
    );
    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = STYLE_TIMELINE_CONTAINER;

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    setTimeout(() => {
      const timeRange = engine.getVisibleTimeRange(startDate);
      const windowConfig = buildTimelineWindowConfig({
        dayStartTime: timeRange.startTime,
        dayEndTime: timeRange.endTime,
        slotMinutes: 5,
        day: startDate
      });

      const weekMax = new Date(`${startDate}T${timeRange.endTime}:00`);
      weekMax.setDate(weekMax.getDate() + 7);

      const groups = getGroups(engine, startDate, visibleCourts, courtNameMap);
      const items = getItems(engine, startDate, visibleCourts);

      const timeline = new CourtTimeline(timelineContainer, items, groups, {
        start: windowConfig.start,
        end: windowConfig.end,
        min: windowConfig.min,
        max: weekMax,
        zoomMin: windowConfig.zoomMin,
        zoomMax: 7 * 24 * 60 * 60 * 1000,
        snap: (date: Date) => {
          const ms = date.getTime();
          const fiveMin = 5 * 60 * 1000;
          return new Date(Math.round(ms / fiveMin) * fiveMin);
        },
        height: '100%',
        timeAxis: { scale: 'hour', step: 1 },
        showTooltips: true,
        rowHeight: 40
      });
      ctx.timelineRef.current = timeline;

      // Set daily bounds to collapse overnight gaps
      timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);

      // Wire onMove
      timeline.onMove((item) => {
        const blockId = parseBlockEventId(item.id);
        const courtRef = parseResourceId(item.group);
        if (blockId && courtRef) {
          const result = engine.moveBlock({
            blockId,
            newTimeRange: { start: toLocalISO(item.start), end: toLocalISO(item.end) },
            newCourt: courtRef
          });
          if (result.conflicts.some((c) => c.severity === 'ERROR')) return false;
          rebuildItems();
          return true;
        }
        return false;
      });

      // Wire onMoving
      timeline.onMoving((item) => {
        popoverManager.destroy();
        const courtRef = parseResourceId(item.group);
        if (courtRef) {
          const itemDay = dayOf(item.start);
          const avail = engine.getCourtAvailability(courtRef, itemDay);
          const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
          const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
          return {
            start: item.start < availStart ? availStart : item.start,
            end: item.end > availEnd ? availEnd : item.end
          };
        }
        return { start: item.start, end: item.end };
      });

      // Wire multi-row ghost creation
      timeline.onMultiRowCreate((span: MultiRowSpan) => {
        const courts: any[] = [];
        for (const groupId of span.groupIds) {
          const court = parseResourceId(groupId);
          if (court) courts.push(court);
        }
        if (courts.length === 0) return;

        const result = engine.applyBlock({
          courts,
          timeRange: { start: toLocalISO(span.startTime), end: toLocalISO(span.endTime) },
          type: BLOCK_TYPES.BLOCKED,
          reason: 'New Block'
        });
        rebuildItems();

        if (result.applied.length > 0) {
          const newBlockId = result.applied[0].block.id;
          const newItemId = `block-${newBlockId}`;
          const day = toLocalISO(span.startTime).slice(0, 10);
          setTimeout(() => {
            const el = timelineContainer.querySelector(`[data-item-id="${newItemId}"]`);
            if (el) {
              popoverManager.showForEngineBlock(el as HTMLElement, {
                itemId: newItemId,
                blockId: newBlockId,
                engine,
                day,
                onBlockChanged: rebuildItems
              });
            }
          }, 50);
        }
      });

      // Wire click
      timeline.on('click', (props: { item: string; event: PointerEvent }) => {
        if (!props.item) {
          popoverManager.destroy();
          return;
        }

        const allItems = getItems(engine, startDate, visibleCourts);
        const item = allItems.find((i) => i.id === props.item);
        if (!item || item.isSegment || item.type === 'background') {
          popoverManager.destroy();
          return;
        }

        if (popoverManager.isActiveFor(props.item)) {
          popoverManager.destroy();
          return;
        }

        const blockId = parseBlockEventId(props.item);
        if (!blockId) return;

        const itemEl =
          (props.event?.target as Element)?.closest?.('.tg-item') ??
          timelineContainer.querySelector(`[data-item-id="${props.item}"]`);

        if (itemEl) {
          const blockDay = item.start ? dayOf(item.start) : startDate;
          popoverManager.showForEngineBlock(itemEl as HTMLElement, {
            itemId: props.item,
            blockId,
            engine,
            day: blockDay,
            onBlockChanged: rebuildItems
          });
        }
      });

      updateStats();
    }, 0);

    return root;
  }
};

// ── Story: AvailableDates ────────────────────────────────────────────────────

/**
 * Demonstrates date-skipping and multi-day stats.
 *
 * Features:
 * - Tournament date range picker (start/end)
 * - Clickable day chips to toggle individual dates on/off
 * - Day navigation (Prev/Next) that only visits available dates
 * - View modes: 1 Day, 3 Days, Week, Tournament
 * - Stats bar aggregates across the visible date range
 * - "Apply Range" re-initializes the engine with a new tournament range
 */
export const AvailableDates = {
  render: () => {
    // ── Mutable state ──────────────────────────────────────────────────
    let currentStartDate = '2026-06-15';
    let currentEndDate = '2026-06-21';
    let allDays = getFullDateRange(currentStartDate, currentEndDate);
    const availableDates = new Set(allDays);
    let currentDay = allDays[0];
    let currentView = 'day';

    // Engine refs
    let setup = createEngineSetupWithDates({ startDate: currentStartDate, endDate: currentEndDate });
    let engine = setup.engine;
    let courtNameMap = setup.courtNameMap;
    let venueInfos = setup.venueInfos;
    let allCourtIds = setup.allCourtIds;
    let visibleCourts = new Set(allCourtIds);
    let timeline: CourtTimeline | null = null;

    const popoverManager = createBlockPopoverManager();
    const statsBar = buildStatsBar();

    // ── Derived helpers ────────────────────────────────────────────────
    const getSortedAvailable = () => allDays.filter((d) => availableDates.has(d));

    const getViewDays = (): string[] => {
      const sorted = getSortedAvailable();
      const idx = sorted.indexOf(currentDay);
      if (idx === -1) return sorted.length > 0 ? [sorted[0]] : [];
      switch (currentView) {
        case 'day':
          return [sorted[idx]];
        case '3day':
          return sorted.slice(idx, idx + 3);
        case 'week':
          return sorted.slice(idx, idx + 7);
        case 'tournament':
          return sorted;
        default:
          return [sorted[idx]];
      }
    };

    const updateStats = () => {
      const days = getViewDays();
      if (days.length === 0) return;
      statsBar.update(computeMultiDayStats(engine, days));
    };

    const getMultiDayItems = (days: string[]): TimelineItemData[] => {
      const allSegments: any[] = [];
      const allBlocks: any[] = [];
      for (const day of days) {
        const timelines = engine.getDayTimeline(day);
        allSegments.push(...buildEventsFromTimelines(timelines));
        allBlocks.push(...buildBlockEvents(engine.getDayBlocks(day)));
      }
      const combined = [
        ...allSegments.filter((item) => visibleCourts.has(String(item.group))),
        ...allBlocks.filter((item) => visibleCourts.has(String(item.group)))
      ];
      return combined.map((item) => ({
        id: String(item.id),
        group: String(item.group),
        content: item.content,
        start: item.start,
        end: item.end,
        type: item.type === 'background' ? ('background' as const) : ('range' as const),
        className: item.className,
        style: item.style,
        title: item.title,
        editable: item.editable,
        blockId: item.blockId,
        status: item.status,
        reason: item.reason,
        isBlock: item.isBlock,
        isSegment: item.isSegment,
        isConflict: item.isConflict
      }));
    };

    // ── View application ───────────────────────────────────────────────
    const applyView = () => {
      if (!timeline) return;
      const viewDays = getViewDays();
      if (viewDays.length === 0) return;

      const firstDay = viewDays[0];
      const lastDay = viewDays[viewDays.length - 1];

      const groups = getGroups(engine, firstDay, visibleCourts, courtNameMap);
      const items = getMultiDayItems(viewDays);
      timeline.setGroups(groups);
      timeline.setItems(items);

      const timeRange = engine.getVisibleTimeRange(firstDay);
      timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);

      const windowStart = new Date(`${firstDay}T${timeRange.startTime}:00`);
      const lastTimeRange = engine.getVisibleTimeRange(lastDay);
      const windowEnd = new Date(`${lastDay}T${lastTimeRange.endTime}:00`);
      timeline.setWindow(windowStart, windowEnd);

      const daySpan = viewDays.length;
      if (daySpan <= 1) {
        timeline.setOptions({ timeAxis: { scale: 'hour', step: 1 } });
      } else if (daySpan <= 3) {
        timeline.setOptions({ timeAxis: { scale: 'hour', step: 3 } });
      } else {
        timeline.setOptions({ timeAxis: { scale: 'hour', step: 6 } });
      }

      updateStats();
      updateNavBar();
      dateControls.refreshChips();
      if (viewDatePicker) viewDatePicker.setDate(currentDay, { clear: true });
      else dateInput.value = currentDay;
    };

    // ── Day navigation ─────────────────────────────────────────────────
    const navigatePrev = () => {
      const sorted = getSortedAvailable();
      const idx = sorted.indexOf(currentDay);
      if (idx > 0) {
        currentDay = sorted[idx - 1];
        applyView();
      }
    };

    const navigateNext = () => {
      const sorted = getSortedAvailable();
      const idx = sorted.indexOf(currentDay);
      if (idx < sorted.length - 1) {
        currentDay = sorted[idx + 1];
        applyView();
      }
    };

    const updateNavBar = () => {
      const sorted = getSortedAvailable();
      const idx = sorted.indexOf(currentDay);
      navBar.update(currentDay, sorted, idx >= 0 ? idx : 0);
    };

    // ── DOM structure ──────────────────────────────────────────────────
    const root = document.createElement('div');
    root.style.cssText = STYLE_ROOT;

    let dateControls = buildDateControlsPanel({
      startDate: currentStartDate,
      endDate: currentEndDate,
      allDays,
      availableDates,
      currentDay,
      onToggleDate: (dateStr) => {
        if (availableDates.has(dateStr)) {
          if (availableDates.size <= 1) return;
          availableDates.delete(dateStr);
          if (currentDay === dateStr) {
            const sorted = getSortedAvailable();
            currentDay = sorted[0] || allDays[0];
          }
        } else {
          availableDates.add(dateStr);
        }
        applyView();
      },
      onApplyRange: (s, e) => reinitialize(s, e)
    });
    root.appendChild(dateControls.element);

    const navBar = buildDayNavBar({ onPrev: navigatePrev, onNext: navigateNext });
    root.appendChild(navBar.element);

    // Custom toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText =
      'display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-bottom: 1px solid var(--chc-border-primary); background: var(--chc-bg-secondary); font-family: sans-serif; font-size: 13px;';

    const viewLabel = document.createElement('span');
    viewLabel.textContent = 'View:';
    viewLabel.style.cssText = 'color: var(--chc-text-secondary); margin-right: 4px;';
    toolbar.appendChild(viewLabel);

    const dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.value = currentDay;
    dateInput.readOnly = true;
    dateInput.style.cssText =
      'font-size: 13px; padding: 2px 6px; border: 1px solid var(--chc-border-primary); border-radius: 4px; margin-right: 8px; width: 110px; cursor: pointer; background: var(--chc-bg-elevated); color: var(--chc-text-primary);';
    // viewDatePicker initialized after DOM attachment in constructTimeline()
    let viewDatePicker: Datepicker | null = null;
    dateInput.addEventListener('changeDate', () => {
      const val = dateInput.value;
      if (val && availableDates.has(val)) {
        currentDay = val;
        applyView();
      } else if (val) {
        const sorted = getSortedAvailable();
        if (sorted.length === 0) return;
        const nearest = sorted.reduce(
          (best, d) =>
            Math.abs(new Date(d).getTime() - new Date(val).getTime()) <
            Math.abs(new Date(best).getTime() - new Date(val).getTime())
              ? d
              : best,
          sorted[0]
        );
        currentDay = nearest;
        if (viewDatePicker) viewDatePicker.setDate(nearest, { clear: true });
        else dateInput.value = nearest;
        applyView();
      }
    });
    toolbar.appendChild(dateInput);

    const viewButtons: HTMLButtonElement[] = [];
    const viewConfigs = [
      { key: 'day', label: '1 Day' },
      { key: '3day', label: '3 Days' },
      { key: 'week', label: 'Week' },
      { key: 'tournament', label: 'Tournament' }
    ];

    const setActiveButton = (activeKey: string) => {
      viewButtons.forEach((btn, i) => {
        if (viewConfigs[i].key === activeKey) {
          btn.style.background = '#218D8D';
          btn.style.color = 'white';
          btn.style.borderColor = '#218D8D';
        } else {
          btn.style.background = 'var(--chc-bg-elevated)';
          btn.style.color = 'var(--chc-text-primary)';
          btn.style.borderColor = 'var(--chc-border-primary)';
        }
      });
    };

    for (const vc of viewConfigs) {
      const btn = document.createElement('button');
      btn.textContent = vc.label;
      btn.style.cssText =
        'padding: 4px 12px; border: 1px solid var(--chc-border-primary); border-radius: 4px; cursor: pointer; font-size: 13px; background: var(--chc-bg-elevated); color: var(--chc-text-primary);';
      if (vc.key === currentView) {
        btn.style.background = '#218D8D';
        btn.style.color = 'white';
        btn.style.borderColor = '#218D8D';
      }
      btn.addEventListener('click', () => {
        currentView = vc.key;
        setActiveButton(vc.key);
        applyView();
      });
      viewButtons.push(btn);
      toolbar.appendChild(btn);
    }

    root.appendChild(toolbar);
    root.appendChild(statsBar.element);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = STYLE_MAIN_ROW;

    let treePanel = buildCourtTree(venueInfos, visibleCourts, () => applyView());
    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = STYLE_TIMELINE_CONTAINER;

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    // ── Re-initialization on range change ──────────────────────────────
    const reinitialize = (newStart: string, newEnd: string) => {
      currentStartDate = newStart;
      currentEndDate = newEnd;
      allDays = getFullDateRange(currentStartDate, currentEndDate);
      availableDates.clear();
      for (const d of allDays) availableDates.add(d);
      currentDay = allDays[0];
      currentView = 'day';
      setActiveButton('day');
      if (viewDatePicker) viewDatePicker.setDate(currentDay, { clear: true });
      else dateInput.value = currentDay;

      timeline?.destroy();
      timeline = null;

      setup = createEngineSetupWithDates({ startDate: currentStartDate, endDate: currentEndDate });
      engine = setup.engine;
      courtNameMap = setup.courtNameMap;
      venueInfos = setup.venueInfos;
      allCourtIds = setup.allCourtIds;
      visibleCourts = new Set(allCourtIds);

      const newTree = buildCourtTree(venueInfos, visibleCourts, () => applyView());
      mainRow.replaceChild(newTree, treePanel);
      treePanel = newTree;

      const oldDateControlsEl = dateControls.element;
      dateControls = buildDateControlsPanel({
        startDate: currentStartDate,
        endDate: currentEndDate,
        allDays,
        availableDates,
        currentDay,
        onToggleDate: (dateStr) => {
          if (availableDates.has(dateStr)) {
            if (availableDates.size <= 1) return;
            availableDates.delete(dateStr);
            if (currentDay === dateStr) {
              const sorted = getSortedAvailable();
              currentDay = sorted[0] || allDays[0];
            }
          } else {
            availableDates.add(dateStr);
          }
          applyView();
        },
        onApplyRange: (s, e) => reinitialize(s, e)
      });
      root.replaceChild(dateControls.element, oldDateControlsEl);

      updateNavBar();
      setTimeout(() => constructTimeline(), 0);
    };

    // ── Timeline construction ──────────────────────────────────────────
    const constructTimeline = () => {
      // Initialize datepickers now that elements are in the DOM
      if (!viewDatePicker) {
        viewDatePicker = new Datepicker(dateInput, { format: DATE_PICKER_FORMAT, autohide: true });
      }
      dateControls.initPickers();

      const viewDays = getViewDays();
      if (viewDays.length === 0) return;

      const firstDay = viewDays[0];
      const lastDay = viewDays[viewDays.length - 1];

      const timeRange = engine.getVisibleTimeRange(firstDay);
      const windowStart = new Date(`${firstDay}T${timeRange.startTime}:00`);
      const lastTimeRange = engine.getVisibleTimeRange(lastDay);
      const windowEnd = new Date(`${lastDay}T${lastTimeRange.endTime}:00`);

      const maxStart = new Date(`${allDays[0]}T06:00:00`);
      const maxEnd = new Date(`${allDays[allDays.length - 1]}T22:00:00`);

      const groups = getGroups(engine, firstDay, visibleCourts, courtNameMap);
      const items = getMultiDayItems(viewDays);

      timeline = new CourtTimeline(timelineContainer, items, groups, {
        start: windowStart,
        end: windowEnd,
        min: maxStart,
        max: maxEnd,
        zoomMin: 2 * 60 * 60 * 1000,
        zoomMax: (allDays.length + 1) * 24 * 60 * 60 * 1000,
        snap: (date: Date) => {
          const ms = date.getTime();
          const fiveMin = 5 * 60 * 1000;
          return new Date(Math.round(ms / fiveMin) * fiveMin);
        },
        height: '100%',
        timeAxis: { scale: 'hour', step: 1 },
        showTooltips: true,
        rowHeight: 40
      });

      timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);

      timeline.onMove((item) => {
        const blockId = parseBlockEventId(item.id);
        const courtRef = parseResourceId(item.group);
        if (blockId && courtRef) {
          const result = engine.moveBlock({
            blockId,
            newTimeRange: { start: toLocalISO(item.start), end: toLocalISO(item.end) },
            newCourt: courtRef
          });
          if (result.conflicts.some((c) => c.severity === 'ERROR')) return false;
          applyView();
          return true;
        }
        return false;
      });

      timeline.onMoving((item) => {
        popoverManager.destroy();
        const courtRef = parseResourceId(item.group);
        if (courtRef) {
          const itemDay = dayOf(item.start);
          const avail = engine.getCourtAvailability(courtRef, itemDay);
          const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
          const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
          return {
            start: item.start < availStart ? availStart : item.start,
            end: item.end > availEnd ? availEnd : item.end
          };
        }
        return { start: item.start, end: item.end };
      });

      timeline.onMultiRowCreate((span: MultiRowSpan) => {
        const courts: any[] = [];
        for (const groupId of span.groupIds) {
          const court = parseResourceId(groupId);
          if (court) courts.push(court);
        }
        if (courts.length === 0) return;

        const result = engine.applyBlock({
          courts,
          timeRange: { start: toLocalISO(span.startTime), end: toLocalISO(span.endTime) },
          type: BLOCK_TYPES.BLOCKED,
          reason: 'New Block'
        });
        applyView();

        if (result.applied.length > 0) {
          const newBlockId = result.applied[0].block.id;
          const newItemId = `block-${newBlockId}`;
          const day = toLocalISO(span.startTime).slice(0, 10);
          setTimeout(() => {
            const el = timelineContainer.querySelector(`[data-item-id="${newItemId}"]`);
            if (el) {
              popoverManager.showForEngineBlock(el as HTMLElement, {
                itemId: newItemId,
                blockId: newBlockId,
                engine,
                day,
                onBlockChanged: () => applyView()
              });
            }
          }, 50);
        }
      });

      timeline.on('click', (props: { item: string; event: PointerEvent }) => {
        if (!props.item) {
          popoverManager.destroy();
          return;
        }

        const currentViewDays = getViewDays();
        const clickItems = getMultiDayItems(currentViewDays);
        const item = clickItems.find((i) => i.id === props.item);
        if (!item || item.isSegment || item.type === 'background') {
          popoverManager.destroy();
          return;
        }

        if (popoverManager.isActiveFor(props.item)) {
          popoverManager.destroy();
          return;
        }

        const blockId = parseBlockEventId(props.item);
        if (!blockId) return;

        const itemEl =
          (props.event?.target as Element)?.closest?.('.tg-item') ??
          timelineContainer.querySelector(`[data-item-id="${props.item}"]`);

        if (itemEl) {
          const blockDay = item.start ? dayOf(item.start) : currentDay;
          popoverManager.showForEngineBlock(itemEl as HTMLElement, {
            itemId: props.item,
            blockId,
            engine,
            day: blockDay,
            onBlockChanged: () => applyView()
          });
        }
      });

      updateStats();
      updateNavBar();
    };

    setTimeout(() => constructTimeline(), 0);

    return root;
  }
};
