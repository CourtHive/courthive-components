/**
 * Bare-bones vis-timeline story — no engine, no controller.
 * Purpose: nail the correct options, CSS, and interactions in isolation.
 */

import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import { Timeline } from 'vis-timeline/standalone';
import 'tippy.js/dist/tippy.css';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { TemporalGridEngine } from '../../components/temporal-grid/engine/temporalGridEngine';
import { calculateCapacityStats } from '../../components/temporal-grid/engine/capacityCurve';
import {
  buildResourcesFromTimelines,
  buildEventsFromTimelines,
  buildBlockEvents,
  buildTimelineWindowConfig,
  buildHiddenDates,
  parseResourceId,
  parseBlockEventId
} from '../../components/temporal-grid/controller/viewProjections';
import { createBlockPopoverManager } from '../../components/temporal-grid/ui/blockPopover';
import { buildStatsBar } from '../../components/temporal-grid/ui/statsBar';
import { buildViewToolbar, VIEW_PRESETS } from '../../components/temporal-grid/ui/viewToolbar';
import { showCourtAvailabilityModal } from '../../components/temporal-grid/ui/courtAvailabilityModal';

export default {
  title: 'Temporal Grid/Vis Timeline Basic'
};

// ── Facility / Court data ─────────────────────────────────────────────────────

interface Facility {
  id: string;
  name: string;
  color: string; // light background tint for court rows
  courts: { id: string; name: string }[];
}

const FACILITIES: Facility[] = [
  {
    id: 'fac-main',
    name: 'Main Stadium',
    color: 'rgba(33, 141, 141, 0.06)',
    courts: Array.from({ length: 8 }, (_, i) => ({
      id: `court-${i + 1}`,
      name: `Court ${i + 1}`
    }))
  },
  {
    id: 'fac-practice',
    name: 'Practice Center',
    color: 'rgba(33, 96, 200, 0.06)',
    courts: Array.from({ length: 8 }, (_, i) => ({
      id: `court-${i + 9}`,
      name: `Court ${i + 9}`
    }))
  },
  {
    id: 'fac-outdoor',
    name: 'Outdoor Complex',
    color: 'rgba(156, 39, 176, 0.06)',
    courts: Array.from({ length: 8 }, (_, i) => ({
      id: `court-${i + 17}`,
      name: `Court ${i + 17}`
    }))
  }
];

// Map court id → facility for quick lookup
const COURT_FACILITY = new Map<string, Facility>();
for (const fac of FACILITIES) {
  for (const court of fac.courts) {
    COURT_FACILITY.set(court.id, fac);
  }
}

const ALL_COURTS = FACILITIES.flatMap((f) => f.courts);

const dayStart = new Date('2026-06-15T06:00:00');
const dayEnd = new Date('2026-06-15T22:00:00');
const weekEnd = new Date('2026-06-21T22:00:00');

// Block type definitions (Baseline story only — no engine)
const BLOCK_TYPES: Record<string, { label: string; bg: string; border: string }> = {
  maintenance: { label: 'Maintenance', bg: '#FF9800', border: '#E65100' },
  practice: { label: 'Practice', bg: '#2196F3', border: '#0D47A1' },
  reserved: { label: 'Reserved', bg: '#9C27B0', border: '#4A148C' },
  blocked: { label: 'Blocked', bg: '#757575', border: '#424242' }
};

function blockStyle(type: string): string {
  const t = BLOCK_TYPES[type] || BLOCK_TYPES.reserved;
  return `background-color: ${t.bg}; border-color: ${t.border}; color: white;`;
}

function makeGroups(courtIds: Set<string>) {
  const groups: any[] = [];
  let order = 0;

  for (const fac of FACILITIES) {
    for (const court of fac.courts) {
      if (!courtIds.has(court.id)) continue;
      groups.push({
        id: court.id,
        content: court.name,
        order: order++,
        style: `background: ${fac.color};`
      });
    }
  }

  return groups;
}

function makeItems(courtIds: Set<string>) {
  // Background segments per court with facility-specific tint
  const bgItems = ALL_COURTS.filter((c) => courtIds.has(c.id)).map((c) => {
    const fac = COURT_FACILITY.get(c.id);
    return {
      id: `avail-${c.id}`,
      group: c.id,
      content: '',
      start: dayStart,
      end: dayEnd,
      type: 'background' as const,
      style: `background-color: ${fac?.color || 'rgba(76, 175, 80, 0.06)'};`,
      editable: false,
      selectable: false
    };
  });

  const blocks = [
    {
      id: 'block-1',
      group: 'court-1',
      content: 'Maintenance',
      start: new Date('2026-06-15T08:00:00'),
      end: new Date('2026-06-15T10:00:00'),
      type: 'range' as const,
      style: blockStyle('maintenance'),
      editable: { updateTime: true, updateGroup: true, remove: false }
    },
    {
      id: 'block-2',
      group: 'court-3',
      content: 'Practice',
      start: new Date('2026-06-15T14:00:00'),
      end: new Date('2026-06-15T16:00:00'),
      type: 'range' as const,
      style: blockStyle('practice'),
      editable: { updateTime: true, updateGroup: true, remove: false }
    },
    {
      id: 'block-3',
      group: 'court-13',
      content: 'Reserved',
      start: new Date('2026-06-15T11:00:00'),
      end: new Date('2026-06-15T13:00:00'),
      type: 'range' as const,
      style: blockStyle('reserved'),
      editable: { updateTime: true, updateGroup: true, remove: false }
    }
  ].filter((b) => courtIds.has(b.group));

  return [...bgItems, ...blocks];
}

// ── Facility tree panel ───────────────────────────────────────────────────────

function buildFacilityTree(visibleCourts: Set<string>, onChange: () => void): HTMLElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 220px; flex-shrink: 0; border-right: 1px solid #e0e0e0;
    background: #fafafa; overflow-y: auto; font-family: sans-serif; font-size: 13px;
  `;

  const header = document.createElement('div');
  header.style.cssText =
    'padding: 10px 12px; font-weight: 600; font-size: 14px; color: #333; border-bottom: 1px solid #e0e0e0; background: white;';
  header.textContent = 'Facilities & Courts';
  panel.appendChild(header);

  for (const fac of FACILITIES) {
    const group = document.createElement('div');
    group.style.cssText = 'padding: 4px 0;';

    const facRow = document.createElement('label');
    facRow.style.cssText =
      'display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; font-weight: 600; color: #333;';

    const facCb = document.createElement('input');
    facCb.type = 'checkbox';
    facCb.checked = fac.courts.every((c) => visibleCourts.has(c.id));
    facCb.indeterminate = !facCb.checked && fac.courts.some((c) => visibleCourts.has(c.id));
    facCb.style.cursor = 'pointer';

    const facLabel = document.createElement('span');
    facLabel.textContent = fac.name;

    const courtCount = document.createElement('span');
    courtCount.style.cssText = 'margin-left:auto; color:#999; font-weight:400; font-size:12px;';
    const updateCount = () => {
      const vis = fac.courts.filter((c) => visibleCourts.has(c.id)).length;
      courtCount.textContent = `${vis}/${fac.courts.length}`;
    };
    updateCount();

    facRow.appendChild(facCb);
    facRow.appendChild(facLabel);
    facRow.appendChild(courtCount);
    group.appendChild(facRow);

    const courtList = document.createElement('div');
    courtList.style.cssText = 'padding-left: 28px;';
    const courtCheckboxes: HTMLInputElement[] = [];

    for (const court of fac.courts) {
      const courtRow = document.createElement('label');
      courtRow.style.cssText =
        'display: flex; align-items: center; gap: 6px; padding: 3px 0; cursor: pointer; color: #555;';

      const courtCb = document.createElement('input');
      courtCb.type = 'checkbox';
      courtCb.checked = visibleCourts.has(court.id);
      courtCb.style.cursor = 'pointer';
      courtCb.dataset.courtId = court.id;

      courtCb.addEventListener('change', () => {
        if (courtCb.checked) visibleCourts.add(court.id);
        else visibleCourts.delete(court.id);
        const allChecked = fac.courts.every((c) => visibleCourts.has(c.id));
        const someChecked = fac.courts.some((c) => visibleCourts.has(c.id));
        facCb.checked = allChecked;
        facCb.indeterminate = !allChecked && someChecked;
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

    facCb.addEventListener('change', () => {
      for (const court of fac.courts) {
        if (facCb.checked) visibleCourts.add(court.id);
        else visibleCourts.delete(court.id);
      }
      for (const cb of courtCheckboxes) cb.checked = facCb.checked;
      facCb.indeterminate = false;
      updateCount();
      onChange();
    });

    group.appendChild(courtList);
    panel.appendChild(group);
  }

  return panel;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => n.toString().padStart(2, '0');

function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract day (YYYY-MM-DD) from a Date or string */
function dayOf(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return toLocalISO(date).slice(0, 10);
}

/** Get the currently visible day from a timeline window (center of viewport) */
function getVisibleDay(timeline: any, fallback: string): string {
  if (!timeline) return fallback;
  try {
    const win = timeline.getWindow();
    const center = new Date((new Date(win.start).getTime() + new Date(win.end).getTime()) / 2);
    return dayOf(center);
  } catch {
    return fallback;
  }
}

// ── Shared timeline options ───────────────────────────────────────────────────

let justDragged = false;

// Shared popover manager across stories
const popoverManager = createBlockPopoverManager();

function baseOptions() {
  return {
    start: dayStart,
    end: dayEnd,
    min: dayStart,
    max: weekEnd,
    zoomMin: 60 * 60 * 1000,
    zoomMax: 7 * 24 * 60 * 60 * 1000,
    height: '100%',
    groupHeightMode: 'fixed' as const,
    editable: {
      add: true,
      updateTime: true,
      updateGroup: true,
      remove: false
    },
    snap: (date: Date) => {
      const ms = date.getTime();
      const fiveMin = 5 * 60 * 1000;
      return new Date(Math.round(ms / fiveMin) * fiveMin);
    },
    onMoving: (item: any, callback: any) => {
      popoverManager.destroy();
      callback(item);
    },
    onMove: (item: any, callback: any) => {
      justDragged = true;
      setTimeout(() => (justDragged = false), 300);
      callback(item);
    },
    orientation: { axis: 'top' as const, item: 'top' as const },
    stack: false,
    showCurrentTime: false,
    horizontalScroll: true,
    verticalScroll: true,
    zoomKey: 'ctrlKey' as const,
    groupOrder: 'order',
    showTooltips: true,
    format: {
      minorLabels: { minute: 'HH:mm', hour: 'HH:mm' },
      majorLabels: { hour: 'ddd D MMM', day: 'ddd D MMM' }
    },
    timeAxis: { scale: 'hour' as const, step: 1 },
    itemsAlwaysDraggable: { item: true, range: true },
    dataAttributes: ['id']
  };
}

// ── Parameterized court tree builder (reusable by engine-backed stories) ──────

interface VenueInfo {
  id: string;
  name: string;
  color: string;
  courts: { id: string; name: string }[];
}

function buildCourtTree(venues: VenueInfo[], visibleCourts: Set<string>, onChange: () => void): HTMLElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 220px; flex-shrink: 0; border-right: 1px solid #e0e0e0;
    background: #fafafa; overflow-y: auto; font-family: sans-serif; font-size: 13px;
  `;

  const header = document.createElement('div');
  header.style.cssText =
    'padding: 10px 12px; font-weight: 600; font-size: 14px; color: #333; border-bottom: 1px solid #e0e0e0; background: white;';
  header.textContent = 'Venues & Courts';
  panel.appendChild(header);

  for (const venue of venues) {
    const group = document.createElement('div');
    group.style.cssText = 'padding: 4px 0;';

    const venueRow = document.createElement('label');
    venueRow.style.cssText =
      'display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; font-weight: 600; color: #333;';

    const venueCb = document.createElement('input');
    venueCb.type = 'checkbox';
    venueCb.checked = venue.courts.every((c) => visibleCourts.has(c.id));
    venueCb.indeterminate = !venueCb.checked && venue.courts.some((c) => visibleCourts.has(c.id));
    venueCb.style.cursor = 'pointer';

    const venueLabel = document.createElement('span');
    venueLabel.textContent = venue.name;

    const courtCount = document.createElement('span');
    courtCount.style.cssText = 'margin-left:auto; color:#999; font-weight:400; font-size:12px;';
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
    courtList.style.cssText = 'padding-left: 28px;';
    const courtCheckboxes: HTMLInputElement[] = [];

    for (const court of venue.courts) {
      const courtRow = document.createElement('label');
      courtRow.style.cssText =
        'display: flex; align-items: center; gap: 6px; padding: 3px 0; cursor: pointer; color: #555;';

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

// ── Shared engine setup for FactoryBacked and RoundTrip stories ──────────────

const VENUE_COLORS = ['rgba(33, 141, 141, 0.06)', 'rgba(33, 96, 200, 0.06)', 'rgba(156, 39, 176, 0.06)'];

function createEngineSetup(options?: { includeBookings?: boolean }) {
  const startDate = '2026-06-15';

  const venueProfiles = [
    {
      venueId: 'venue-main',
      venueName: 'Main Stadium',
      venueAbbreviation: 'MS',
      courtsCount: 8,
      startTime: '08:00',
      endTime: '20:00'
    },
    {
      venueId: 'venue-practice',
      venueName: 'Practice Center',
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

  // Use factory methods to add real court-level bookings to the tournament record.
  tournamentEngine.setState(tournamentRecord);

  const mainVenue = tournamentRecord.venues?.find((v: any) => v.venueId === 'venue-main');
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

    if (mainCourts[3]) {
      tournamentEngine.modifyCourtAvailability({
        courtId: mainCourts[3].courtId,
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

  // Retrieve updated tournament record with court-level bookings
  const stateResult = tournamentEngine.getState();
  const recordWithBookings = stateResult?.tournamentRecord ?? tournamentRecord;

  // Engine now loads blocks from tournament record automatically during init()
  const engine = new TemporalGridEngine();
  engine.init(recordWithBookings, {
    dayStartTime: '06:00',
    dayEndTime: '22:00',
    slotMinutes: 5
  });

  // Build court name map from tournament record
  const courtNameMap = new Map<string, string>();
  for (const venue of recordWithBookings.venues || []) {
    for (const court of venue.courts || []) {
      const key = `${engine.getConfig().tournamentId}|${venue.venueId}|${court.courtId}`;
      courtNameMap.set(key, court.courtName || court.courtId);
    }
  }

  // Build venue info for tree
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

// ── Hidden-dates helper ───────────────────────────────────────────────────────

/** Compute the widest time range across ALL tournament days (for multi-day hiddenDates). */
function getWidestTimeRange(engine: TemporalGridEngine, courtRefs?: any[]) {
  const days = engine.getTournamentDays();
  let earliest = '23:59',
    latest = '00:00';
  for (const day of days) {
    const range = engine.getVisibleTimeRange(day, courtRefs);
    if (range.startTime < earliest) earliest = range.startTime;
    if (range.endTime > latest) latest = range.endTime;
  }
  return { startTime: earliest, endTime: latest };
}

// ── Story: Baseline ───────────────────────────────────────────────────────────

/**
 * Baseline vis-timeline with facility tree panel.
 *
 * Timeline interactions:
 * 1) Double-click → native box item with umbilical line
 * 2) Click box item → convert to range + open action popover
 * 3) Click range item → action popover (assign type or adjust time)
 * 4) Drag to move, drag edges to resize
 *
 * Facility tree:
 * - Toggle individual courts on/off
 * - Toggle entire facilities on/off
 * - Indeterminate state when some courts in a facility are hidden
 */
export const Baseline = {
  render: () => {
    const visibleCourts = new Set(ALL_COURTS.map((c) => c.id));
    let currentView = 'day';

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex; flex-direction:column; width:100%; height:600px; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden;';

    const mainRow = document.createElement('div');
    mainRow.style.cssText = 'display:flex; flex:1; min-height:0;';

    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = 'flex:1; min-width:0;';

    let timeline: any = null;

    const setView = (viewKey: string) => {
      if (!timeline) return;
      currentView = viewKey;
      const view = VIEW_PRESETS[viewKey];
      const end = new Date(dayStart.getTime() + view.days * 16 * 60 * 60 * 1000);
      timeline.setWindow(dayStart, end);
      timeline.setOptions({ timeAxis: view.timeAxis });
    };

    // Stats bar (from library)
    const statsBar = buildStatsBar();
    const updateStats = () => {
      const dayHours = 16;
      const courtCount = visibleCourts.size;
      const totalHours = courtCount * dayHours;
      let blockedHours = 0;
      if (timeline?.itemsData) {
        const blocks = timeline.itemsData.get({
          filter: (item: any) => item.type === 'range' && visibleCourts.has(item.group)
        });
        for (const block of blocks) {
          const s = new Date(block.start).getTime();
          const e = new Date(block.end).getTime();
          blockedHours += (e - s) / (1000 * 60 * 60);
        }
      }
      const availableHours = totalHours - blockedHours;
      const avgPerCourt = courtCount > 0 ? availableHours / courtCount : 0;
      statsBar.update({ totalHours, blockedHours, availableHours, avgPerCourt });
    };

    const refreshTimeline = () => {
      if (!timeline) return;
      const groups = makeGroups(visibleCourts);
      const items = makeItems(visibleCourts);
      timeline.setGroups(groups);
      timeline.setItems(items);
      updateStats();
    };

    // Toolbar (from library)
    const toolbar = buildViewToolbar(setView, currentView);
    root.appendChild(toolbar);
    root.appendChild(statsBar.element);

    const treePanel = buildFacilityTree(visibleCourts, refreshTimeline);

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    setTimeout(() => {
      timeline = new Timeline(timelineContainer, makeItems(visibleCourts), makeGroups(visibleCourts), {
        ...baseOptions(),

        onAdd: (item: any, callback: any) => {
          item.content = item.content || 'New Block';
          item.style = 'background-color: #607D8B; border-color: #37474F; color: white;';
          item.editable = { updateTime: true, updateGroup: true, remove: false };
          callback(item);
        }
      });

      timeline.on('click', (props: any) => {
        if (justDragged) return;
        if (!props.item || props.item.startsWith('avail-')) {
          popoverManager.destroy();
          return;
        }

        // Toggle via popover manager
        if (popoverManager.isActiveFor(String(props.item))) {
          popoverManager.destroy();
          return;
        }

        const item = timeline.itemsData.get(props.item);
        if (!item) return;

        // Box/point → convert to range + open popover
        if (item.type !== 'range') {
          const start = new Date(item.start);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          timeline.itemsData.update({ id: item.id, type: 'range', end });
          setTimeout(() => {
            const updatedItem = timeline.itemsData.get(props.item);
            const el =
              timelineContainer.querySelector(`.vis-item[data-id="${props.item}"]`) ??
              (props.event?.target as Element)?.closest?.('.vis-item');
            if (el && updatedItem) {
              popoverManager.show(el as HTMLElement, {
                itemId: String(updatedItem.id),
                blockTypes: Object.entries(BLOCK_TYPES).map(([key, def]) => ({
                  type: key,
                  color: def.bg,
                  label: def.label
                })),
                startTime: toLocalISO(new Date(updatedItem.start)),
                endTime: toLocalISO(new Date(updatedItem.end)),
                onTypeSelected: (type: string) => {
                  timeline.itemsData.update({
                    id: updatedItem.id,
                    content: BLOCK_TYPES[type]?.label || type,
                    style: blockStyle(type)
                  });
                },
                onAdjustTime: (startTimeStr: string, endTimeStr: string) => {
                  const day = toLocalISO(new Date(updatedItem.start)).slice(0, 10);
                  const newStart = new Date(`${day}T${startTimeStr}:00`);
                  const newEnd = new Date(`${day}T${endTimeStr}:00`);
                  timeline.itemsData.update({ id: updatedItem.id, start: newStart, end: newEnd });
                }
              });
            }
          }, 50);
          return;
        }

        // Range item → popover
        const itemEl =
          (props.event?.target as Element)?.closest?.('.vis-item') ??
          timelineContainer.querySelector(`.vis-item[data-id="${props.item}"]`);

        if (itemEl) {
          popoverManager.show(itemEl as HTMLElement, {
            itemId: String(item.id),
            blockTypes: Object.entries(BLOCK_TYPES).map(([key, def]) => ({
              type: key,
              color: def.bg,
              label: def.label
            })),
            startTime: toLocalISO(new Date(item.start)),
            endTime: toLocalISO(new Date(item.end)),
            onTypeSelected: (type: string) => {
              timeline.itemsData.update({
                id: item.id,
                content: BLOCK_TYPES[type]?.label || type,
                style: blockStyle(type)
              });
            },
            onAdjustTime: (startTimeStr: string, endTimeStr: string) => {
              const day = toLocalISO(new Date(item.start)).slice(0, 10);
              const newStart = new Date(`${day}T${startTimeStr}:00`);
              const newEnd = new Date(`${day}T${endTimeStr}:00`);
              timeline.itemsData.update({ id: item.id, start: newStart, end: newEnd });
            }
          });
        }
      });

      // Update stats on any item data change and initially
      timeline.itemsData.on('*', () => updateStats());
      updateStats();
    }, 0);

    return root;
  }
};

// ── Story: FactoryBacked ──────────────────────────────────────────────────────

/**
 * Full engine integration story.
 *
 * Data flow:
 *   mocksEngine.generateTournamentRecord()
 *     → TemporalGridEngine.init(tournamentRecord)
 *     → engine.getDayTimeline() → viewProjections → vis-timeline
 *
 * All block CRUD round-trips through the engine:
 *   Double-click → engine.applyBlock()
 *   Drag/resize  → engine.moveBlock()
 *   Popover type → engine.removeBlock() + applyBlock()
 *   Delete       → engine.removeBlock()
 *
 * Stats bar driven by engine.getCapacityCurve() + calculateCapacityStats().
 */
export const FactoryBacked = {
  render: () => {
    const { engine, startDate, courtNameMap, venueInfos, allCourtIds } = createEngineSetup();
    const visibleCourts = new Set(allCourtIds);
    let timeline: any = null;

    const getGroups = () => {
      const timelines = engine.getDayTimeline(startDate);
      const courtMeta = engine.listCourtMeta();
      const groups = buildResourcesFromTimelines(timelines, courtMeta);
      return groups
        .filter((g) => visibleCourts.has(String(g.id)))
        .map((g, i) => ({
          ...g,
          content: courtNameMap.get(String(g.id)) || g.content,
          order: i,
          style: `background: ${
            venueInfos.find((v: VenueInfo) => v.courts.some((c) => c.id === String(g.id)))?.color || 'transparent'
          };`
        }));
    };

    const tournamentDays = engine.getTournamentDays();

    const getItems = () => {
      const allSegments: any[] = [];
      const allBlocks: any[] = [];
      for (const day of tournamentDays) {
        const timelines = engine.getDayTimeline(day);
        allSegments.push(...buildEventsFromTimelines(timelines));
        allBlocks.push(...buildBlockEvents(engine.getDayBlocks(day)));
      }
      return [
        ...allSegments.filter((item) => visibleCourts.has(String(item.group))),
        ...allBlocks.filter((item) => visibleCourts.has(String(item.group)))
      ];
    };

    // Stats bar (from library)
    const statsBar = buildStatsBar();
    const updateEngineStats = () => {
      const curve = engine.getCapacityCurve(startDate);
      const stats = calculateCapacityStats(curve);
      statsBar.update({
        totalHours: stats.totalCourtHours,
        blockedHours: stats.totalUnavailableHours ?? 0,
        availableHours: stats.totalAvailableHours ?? 0,
        avgPerCourt: (stats.totalCourts ?? 0) > 0 ? (stats.totalAvailableHours ?? 0) / stats.totalCourts! : 0
      });
    };

    const rebuildItems = () => {
      if (!timeline) return;
      timeline.setGroups(getGroups());
      timeline.setItems(getItems());
      updateEngineStats();
    };

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex; flex-direction:column; width:100%; height:600px; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden;';

    let currentView = 'day';
    const setView = (viewKey: string) => {
      if (!timeline) return;
      currentView = viewKey;
      const view = VIEW_PRESETS[viewKey];
      const timeRange = engine.getVisibleTimeRange(startDate);
      const windowStart = new Date(`${startDate}T${timeRange.startTime}:00`);
      const end = new Date(windowStart.getTime() + view.days * 16 * 60 * 60 * 1000);
      timeline.setWindow(windowStart, end);
      timeline.setOptions({ timeAxis: view.timeAxis });
    };

    // Toolbar (from library)
    const toolbar = buildViewToolbar(setView, currentView);
    root.appendChild(toolbar);
    root.appendChild(statsBar.element);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = 'display:flex; flex:1; min-height:0;';

    const treePanel = buildCourtTree(venueInfos, visibleCourts, rebuildItems);
    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = 'flex:1; min-width:0;';

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

      // Compute hidden dates to collapse overnight gaps
      const widestRange = getWidestTimeRange(engine);
      const hiddenDates = buildHiddenDates({
        dayStartTime: widestRange.startTime,
        dayEndTime: widestRange.endTime,
        referenceDay: startDate
      });

      timeline = new Timeline(timelineContainer, getItems(), getGroups(), {
        ...baseOptions(),
        start: windowConfig.start,
        end: windowConfig.end,
        min: windowConfig.min,
        max: weekMax,
        zoomMin: windowConfig.zoomMin,
        zoomMax: 7 * 24 * 60 * 60 * 1000,
        hiddenDates,

        onAdd: (item: any, callback: any) => {
          item.content = item.content || 'New Block';
          item.style = 'background-color: #607D8B; border-color: #37474F; color: white;';
          item.editable = { updateTime: true, updateGroup: true, remove: false };
          callback(item);
        },

        onMoving: (item: any, callback: any) => {
          popoverManager.destroy();
          if (engine && item.group && item.start) {
            const courtRef = parseResourceId(String(item.group));
            if (courtRef) {
              const itemDay = dayOf(item.start);
              const avail = engine.getCourtAvailability(courtRef, itemDay);
              const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
              const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
              if (new Date(item.start) < availStart) item.start = availStart;
              if (new Date(item.end) > availEnd) item.end = availEnd;
            }
          }
          callback(item);
        },

        onMove: (item: any, callback: any) => {
          justDragged = true;
          setTimeout(() => (justDragged = false), 300);

          const blockId = parseBlockEventId(String(item.id));
          const courtRef = parseResourceId(String(item.group));
          if (blockId && courtRef) {
            engine.moveBlock({
              blockId,
              newTimeRange: {
                start: toLocalISO(new Date(item.start)),
                end: toLocalISO(new Date(item.end))
              },
              newCourt: courtRef
            });
            callback(item);
            rebuildItems();
          } else {
            callback(item);
          }
        }
      });

      // Click handler: group-label click for availability, or popover on block
      timeline.on('click', (props: any) => {
        if (justDragged) return;

        // Court name (group label) click → availability modal
        if (props.what === 'group-label' && props.group) {
          const courtRef = parseResourceId(String(props.group));
          if (!courtRef) return;
          const courtName = courtNameMap.get(String(props.group)) || courtRef.courtId;
          const visDay = getVisibleDay(timeline, startDate);
          const avail = engine.getCourtAvailability(courtRef, visDay);
          showCourtAvailabilityModal({
            title: `${courtName} Availability`,
            currentDay: visDay,
            currentStartTime: avail.startTime,
            currentEndTime: avail.endTime,
            onConfirm: ({ startTime, endTime, scope }) => {
              if (scope === 'all-days') {
                engine.setCourtAvailabilityAllDays(courtRef, { startTime, endTime });
              } else {
                engine.setCourtAvailability(courtRef, visDay, { startTime, endTime });
              }
              rebuildItems();
            }
          });
          return;
        }

        if (!props.item) {
          popoverManager.destroy();
          return;
        }

        const item = timeline.itemsData.get(props.item);
        if (!item || item.isSegment || item.type === 'background') {
          popoverManager.destroy();
          return;
        }

        if (popoverManager.isActiveFor(String(props.item))) {
          popoverManager.destroy();
          return;
        }

        // Box/point item (from double-click) → convert to range via engine
        if (item.type !== 'range') {
          const courtRef = parseResourceId(String(item.group));
          if (!courtRef) return;
          const start = toLocalISO(new Date(item.start));
          const itemDay = start.slice(0, 10);
          const endTime = new Date(new Date(item.start).getTime() + 60 * 60 * 1000);
          const result = engine.applyBlock({
            courts: [courtRef],
            timeRange: { start, end: toLocalISO(endTime) },
            type: 'BLOCKED',
            reason: 'New Block'
          });
          rebuildItems();
          if (result.applied.length > 0) {
            const newBlockId = result.applied[0].block.id;
            const newItemId = `block-${newBlockId}`;
            setTimeout(() => {
              const el = timelineContainer.querySelector(`.vis-item[data-id="${newItemId}"]`);
              if (el) {
                popoverManager.showForEngineBlock(el as HTMLElement, {
                  itemId: newItemId,
                  blockId: newBlockId,
                  engine,
                  day: itemDay,
                  onBlockChanged: rebuildItems
                });
              }
            }, 50);
          }
          return;
        }

        // Range item (engine block) → show popover
        const blockId = parseBlockEventId(String(props.item));
        if (!blockId) return;

        const itemEl =
          (props.event?.target as Element)?.closest?.('.vis-item') ??
          timelineContainer.querySelector(`.vis-item[data-id="${props.item}"]`);

        if (itemEl) {
          const itemDay = item.start ? dayOf(item.start) : startDate;
          popoverManager.showForEngineBlock(itemEl as HTMLElement, {
            itemId: String(props.item),
            blockId,
            engine,
            day: itemDay,
            onBlockChanged: rebuildItems
          });
        }
      });

      updateEngineStats();
    }, 0);

    return root;
  }
};

// ── Story: RoundTrip ──────────────────────────────────────────────────────────

/**
 * Extends FactoryBacked with write-back to tournament record.
 *
 * Adds:
 * - "Save to Tournament" button that calls modifyCourtAvailability()
 * - Collapsible "Tournament State" panel showing venue dateAvailability JSON
 * - Panel updates after save to show the new state
 */
export const RoundTrip = {
  render: () => {
    const setup = createEngineSetup({ includeBookings: false });
    const { engine, startDate, courtNameMap, venueInfos, allCourtIds, initialBlockSnapshot } = setup;
    let { tournamentRecord } = setup;
    const visibleCourts = new Set(allCourtIds);
    let timeline: any = null;

    const getGroups = () => {
      const timelines = engine.getDayTimeline(startDate);
      const courtMeta = engine.listCourtMeta();
      const groups = buildResourcesFromTimelines(timelines, courtMeta);
      return groups
        .filter((g) => visibleCourts.has(String(g.id)))
        .map((g, i) => ({
          ...g,
          content: courtNameMap.get(String(g.id)) || g.content,
          order: i,
          style: `background: ${
            venueInfos.find((v: VenueInfo) => v.courts.some((c) => c.id === String(g.id)))?.color || 'transparent'
          };`
        }));
    };

    const tournamentDays = engine.getTournamentDays();

    const getItems = () => {
      const allSegments: any[] = [];
      const allBlocks: any[] = [];
      for (const day of tournamentDays) {
        const timelines = engine.getDayTimeline(day);
        allSegments.push(...buildEventsFromTimelines(timelines));
        allBlocks.push(...buildBlockEvents(engine.getDayBlocks(day)));
      }
      return [
        ...allSegments.filter((item) => visibleCourts.has(String(item.group))),
        ...allBlocks.filter((item) => visibleCourts.has(String(item.group)))
      ];
    };

    // Stats bar (from library)
    const statsBar = buildStatsBar();
    const updateEngineStats = () => {
      const curve = engine.getCapacityCurve(startDate);
      const stats = calculateCapacityStats(curve);
      statsBar.update({
        totalHours: stats.totalCourtHours,
        blockedHours: stats.totalUnavailableHours ?? 0,
        availableHours: stats.totalAvailableHours ?? 0,
        avgPerCourt: (stats.totalCourts ?? 0) > 0 ? (stats.totalAvailableHours ?? 0) / stats.totalCourts! : 0
      });
    };

    // Track current block snapshot for dirty-checking (across all days)
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
      saveBtn.style.cursor = dirty ? 'pointer' : 'not-allowed';
    };

    // Helper: get visible court refs for window calculation
    const getVisibleCourtRefs = () => {
      const refs: any[] = [];
      for (const v of venueInfos) {
        for (const c of v.courts) {
          if (visibleCourts.has(c.id)) {
            const ref = parseResourceId(c.id);
            if (ref) refs.push(ref);
          }
        }
      }
      return refs;
    };

    // Rebuild timeline window + items after availability changes
    const rebuildTimeline = () => {
      if (!timeline) return;
      const visibleRefs = getVisibleCourtRefs();
      const timeRange = engine.getVisibleTimeRange(startDate, visibleRefs);
      const windowConfig = buildTimelineWindowConfig({
        dayStartTime: timeRange.startTime,
        dayEndTime: timeRange.endTime,
        slotMinutes: 5,
        day: startDate
      });
      const weekMax = new Date(`${startDate}T${timeRange.endTime}:00`);
      weekMax.setDate(weekMax.getDate() + 7);

      // Recompute hidden dates after availability change
      const widestRange = getWidestTimeRange(engine, visibleRefs);
      const hiddenDates = buildHiddenDates({
        dayStartTime: widestRange.startTime,
        dayEndTime: widestRange.endTime,
        referenceDay: startDate
      });

      timeline.setOptions({ min: windowConfig.min, max: weekMax, hiddenDates });
      timeline.setWindow(windowConfig.start, windowConfig.end);
      rebuildItems();
    };

    const rebuildItems = () => {
      if (!timeline) return;
      timeline.setGroups(getGroups());
      timeline.setItems(getItems());
      updateEngineStats();
      updateSaveButtonState();
    };

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex; flex-direction:column; width:100%; height:600px; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden;';

    let currentView = 'day';
    const setView = (viewKey: string) => {
      if (!timeline) return;
      currentView = viewKey;
      const view = VIEW_PRESETS[viewKey];
      const timeRange = engine.getVisibleTimeRange(startDate);
      const windowStart = new Date(`${startDate}T${timeRange.startTime}:00`);
      const end = new Date(windowStart.getTime() + view.days * 16 * 60 * 60 * 1000);
      timeline.setWindow(windowStart, end);
      timeline.setOptions({ timeAxis: view.timeAxis });
    };

    // Toolbar (from library) with Save button appended
    const toolbar = buildViewToolbar(setView, currentView);

    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1;';
    toolbar.appendChild(spacer);

    const defaultAvailBtn = document.createElement('button');
    defaultAvailBtn.textContent = 'Set Default Availability';
    defaultAvailBtn.style.cssText =
      'padding:4px 14px; border:1px solid #666; border-radius:4px; cursor:pointer; font-size:13px; background:#666; color:white; font-weight:600; margin-right:8px;';
    defaultAvailBtn.addEventListener('click', () => {
      const visDay = getVisibleDay(timeline, startDate);
      const courts = engine.listCourtMeta();
      const firstRef = courts.length > 0 ? courts[0].ref : undefined;
      const avail = firstRef ? engine.getCourtAvailability(firstRef, visDay) : { startTime: '08:00', endTime: '20:00' };
      showCourtAvailabilityModal({
        title: 'Default Availability (All Courts)',
        currentDay: visDay,
        currentStartTime: avail.startTime,
        currentEndTime: avail.endTime,
        showScopeToggle: false,
        onConfirm: ({ startTime, endTime }) => {
          engine.setAllCourtsDefaultAvailability({ startTime, endTime });
          rebuildTimeline();
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
        if (currentJson === originalSnapshot) {
          return;
        }

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

        // If no blocks for this court, still save empty availability for the start date
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

      // Update snapshot to current state so button disables
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
    mainRow.style.cssText = 'display:flex; flex:1; min-height:0;';

    const treePanel = buildCourtTree(venueInfos, visibleCourts, rebuildItems);
    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = 'flex:1; min-width:0;';

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    setTimeout(() => {
      const visibleRefs = getVisibleCourtRefs();
      const timeRange = engine.getVisibleTimeRange(startDate, visibleRefs);
      const windowConfig = buildTimelineWindowConfig({
        dayStartTime: timeRange.startTime,
        dayEndTime: timeRange.endTime,
        slotMinutes: 5,
        day: startDate
      });

      const weekMax = new Date(`${startDate}T${timeRange.endTime}:00`);
      weekMax.setDate(weekMax.getDate() + 7);

      // Compute hidden dates to collapse overnight gaps
      const widestRange = getWidestTimeRange(engine, visibleRefs);
      const hiddenDates = buildHiddenDates({
        dayStartTime: widestRange.startTime,
        dayEndTime: widestRange.endTime,
        referenceDay: startDate
      });

      timeline = new Timeline(timelineContainer, getItems(), getGroups(), {
        ...baseOptions(),
        start: windowConfig.start,
        end: windowConfig.end,
        min: windowConfig.min,
        max: weekMax,
        zoomMin: windowConfig.zoomMin,
        zoomMax: 7 * 24 * 60 * 60 * 1000,
        hiddenDates,

        onAdd: (item: any, callback: any) => {
          item.content = item.content || 'New Block';
          item.style = 'background-color: #607D8B; border-color: #37474F; color: white;';
          item.editable = { updateTime: true, updateGroup: true, remove: false };
          callback(item);
        },

        onMoving: (item: any, callback: any) => {
          popoverManager.destroy();
          if (engine && item.group) {
            const courtRef = parseResourceId(String(item.group));
            if (courtRef) {
              const itemDay = dayOf(item.start);
              const avail = engine.getCourtAvailability(courtRef, itemDay);
              const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
              const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
              if (new Date(item.start) < availStart) item.start = availStart;
              if (new Date(item.end) > availEnd) item.end = availEnd;
            }
          }
          callback(item);
        },

        onMove: (item: any, callback: any) => {
          justDragged = true;
          setTimeout(() => (justDragged = false), 300);

          const blockId = parseBlockEventId(String(item.id));
          const courtRef = parseResourceId(String(item.group));
          if (blockId && courtRef) {
            engine.moveBlock({
              blockId,
              newTimeRange: {
                start: toLocalISO(new Date(item.start)),
                end: toLocalISO(new Date(item.end))
              },
              newCourt: courtRef
            });
            callback(item);
            rebuildItems();
          } else {
            callback(item);
          }
        }
      });

      timeline.on('click', (props: any) => {
        if (justDragged) return;

        // Court name (group label) click → availability modal
        if (props.what === 'group-label' && props.group) {
          const courtRef = parseResourceId(String(props.group));
          if (!courtRef) return;
          const visibleDay = getVisibleDay(timeline, startDate);
          const courtName = courtNameMap.get(String(props.group)) || courtRef.courtId;
          const avail = engine.getCourtAvailability(courtRef, visibleDay);
          showCourtAvailabilityModal({
            title: `${courtName} Availability`,
            currentDay: visibleDay,
            currentStartTime: avail.startTime,
            currentEndTime: avail.endTime,
            onConfirm: ({ startTime, endTime, scope }) => {
              if (scope === 'all-days') {
                engine.setCourtAvailabilityAllDays(courtRef, { startTime, endTime });
              } else {
                engine.setCourtAvailability(courtRef, visibleDay, { startTime, endTime });
              }
              rebuildTimeline();
            }
          });
          return;
        }

        if (!props.item) {
          popoverManager.destroy();
          return;
        }

        const item = timeline.itemsData.get(props.item);
        if (!item || item.isSegment || item.type === 'background') {
          popoverManager.destroy();
          return;
        }

        if (popoverManager.isActiveFor(String(props.item))) {
          popoverManager.destroy();
          return;
        }

        // Box/point item (from double-click) → convert to range via engine
        if (item.type !== 'range') {
          const courtRef = parseResourceId(String(item.group));
          if (!courtRef) return;
          const itemDay = dayOf(item.start);
          const start = toLocalISO(new Date(item.start));
          const endTime = new Date(new Date(item.start).getTime() + 60 * 60 * 1000);
          const result = engine.applyBlock({
            courts: [courtRef],
            timeRange: { start, end: toLocalISO(endTime) },
            type: 'BLOCKED',
            reason: 'New Block'
          });
          rebuildItems();
          if (result.applied.length > 0) {
            const newBlockId = result.applied[0].block.id;
            const newItemId = `block-${newBlockId}`;
            setTimeout(() => {
              const el = timelineContainer.querySelector(`.vis-item[data-id="${newItemId}"]`);
              if (el) {
                popoverManager.showForEngineBlock(el as HTMLElement, {
                  itemId: newItemId,
                  blockId: newBlockId,
                  engine,
                  day: itemDay,
                  onBlockChanged: rebuildItems
                });
              }
            }, 50);
          }
          return;
        }

        // Range item (engine block) → show popover
        const blockId = parseBlockEventId(String(props.item));
        if (!blockId) return;

        const itemEl =
          (props.event?.target as Element)?.closest?.('.vis-item') ??
          timelineContainer.querySelector(`.vis-item[data-id="${props.item}"]`);

        if (itemEl) {
          const blockDay = item.start ? dayOf(item.start) : getVisibleDay(timeline, startDate);
          popoverManager.showForEngineBlock(itemEl as HTMLElement, {
            itemId: String(props.item),
            blockId,
            engine,
            day: blockDay,
            onBlockChanged: rebuildItems
          });
        }
      });

      updateEngineStats();
    }, 0);

    return root;
  }
};
