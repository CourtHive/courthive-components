/**
 * Bare-bones vis-timeline story — no engine, no controller.
 * Purpose: nail the correct options, CSS, and interactions in isolation.
 */

import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import { Timeline } from 'vis-timeline/standalone';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { showModernTimePicker } from '../../components/temporal-grid/ui/modernTimePicker';

export default {
  title: 'Temporal Grid/Vis Timeline Basic',
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
      name: `Court ${i + 1}`,
    })),
  },
  {
    id: 'fac-practice',
    name: 'Practice Center',
    color: 'rgba(33, 96, 200, 0.06)',
    courts: Array.from({ length: 8 }, (_, i) => ({
      id: `court-${i + 9}`,
      name: `Court ${i + 9}`,
    })),
  },
  {
    id: 'fac-outdoor',
    name: 'Outdoor Complex',
    color: 'rgba(156, 39, 176, 0.06)',
    courts: Array.from({ length: 8 }, (_, i) => ({
      id: `court-${i + 17}`,
      name: `Court ${i + 17}`,
    })),
  },
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

// Block type definitions
const BLOCK_TYPES: Record<string, { label: string; bg: string; border: string }> = {
  maintenance: { label: 'Maintenance', bg: '#FF9800', border: '#E65100' },
  practice:    { label: 'Practice',    bg: '#2196F3', border: '#0D47A1' },
  reserved:    { label: 'Reserved',    bg: '#9C27B0', border: '#4A148C' },
  blocked:     { label: 'Blocked',     bg: '#757575', border: '#424242' },
};

function blockStyle(type: string): string {
  const t = BLOCK_TYPES[type] || BLOCK_TYPES.reserved;
  return `background-color: ${t.bg}; border-color: ${t.border}; color: white;`;
}

let nextBlockId = 100;

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
        style: `background: ${fac.color};`,
      });
    }
  }

  return groups;
}

function makeItems(courtIds: Set<string>) {
  // Background segments per court with facility-specific tint
  const bgItems = ALL_COURTS
    .filter((c) => courtIds.has(c.id))
    .map((c) => {
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
        selectable: false,
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
      editable: { updateTime: true, updateGroup: true, remove: false },
    },
    {
      id: 'block-2',
      group: 'court-3',
      content: 'Practice',
      start: new Date('2026-06-15T14:00:00'),
      end: new Date('2026-06-15T16:00:00'),
      type: 'range' as const,
      style: blockStyle('practice'),
      editable: { updateTime: true, updateGroup: true, remove: false },
    },
    {
      id: 'block-3',
      group: 'court-13',
      content: 'Reserved',
      start: new Date('2026-06-15T11:00:00'),
      end: new Date('2026-06-15T13:00:00'),
      type: 'range' as const,
      style: blockStyle('reserved'),
      editable: { updateTime: true, updateGroup: true, remove: false },
    },
  ].filter((b) => courtIds.has(b.group));

  return [...bgItems, ...blocks];
}

// ── Block action popover (tippy.js) ───────────────────────────────────────────

function buildPopoverContent(
  item: any,
  timeline: any,
  onDone: () => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'font-family:sans-serif; font-size:13px; min-width:150px;';

  for (const [key, def] of Object.entries(BLOCK_TYPES)) {
    const btn = document.createElement('div');
    btn.style.cssText =
      'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;';
    btn.innerHTML = `
      <span style="width:10px;height:10px;border-radius:2px;background:${def.bg};display:inline-block;"></span>
      ${def.label}
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; btn.style.color = '#333'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = ''; });
    btn.addEventListener('click', () => {
      timeline.itemsData.update({
        id: item.id,
        content: def.label,
        style: blockStyle(key),
      });
      onDone();
    });
    wrap.appendChild(btn);
  }

  const hr = document.createElement('div');
  hr.style.cssText = 'border-top:1px solid #e0e0e0; margin:4px 0;';
  wrap.appendChild(hr);

  const timeBtn = document.createElement('div');
  timeBtn.style.cssText =
    'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;';
  timeBtn.innerHTML = `<span style="font-size:14px;">&#128339;</span> Adjust Time`;
  timeBtn.addEventListener('mouseenter', () => { timeBtn.style.background = '#f0f0f0'; timeBtn.style.color = '#333'; });
  timeBtn.addEventListener('mouseleave', () => { timeBtn.style.background = 'transparent'; timeBtn.style.color = ''; });
  timeBtn.addEventListener('click', () => {
    onDone();
    const startDate = new Date(item.start);
    const endDate = new Date(item.end);
    showModernTimePicker({
      startTime: toLocalISO(startDate),
      endTime: toLocalISO(endDate),
      dayStartTime: '06:00',
      dayEndTime: '22:00',
      minuteIncrement: 5,
      onConfirm: (startTimeStr: string, endTimeStr: string) => {
        const day = toLocalISO(startDate).slice(0, 10);
        const newStart = new Date(`${day}T${startTimeStr}:00`);
        const newEnd = new Date(`${day}T${endTimeStr}:00`);
        timeline.itemsData.update({ id: item.id, start: newStart, end: newEnd });
      },
      onCancel: () => {},
    });
  });
  wrap.appendChild(timeBtn);

  return wrap;
}

function showBlockPopover(
  targetEl: Element,
  item: any,
  timeline: any,
): void {
  const content = buildPopoverContent(item, timeline, () => {
    tip.destroy();
  });

  const tip: TippyInstance = tippy(targetEl, {
    content,
    allowHTML: true,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom',
    appendTo: document.body,
    onClickOutside: (instance) => instance.destroy(),
  });

  tip.show();
}

// ── Facility tree panel ───────────────────────────────────────────────────────

function buildFacilityTree(
  visibleCourts: Set<string>,
  onChange: () => void,
): HTMLElement {
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

    // Facility header with checkbox
    const facRow = document.createElement('label');
    facRow.style.cssText =
      'display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; font-weight: 600; color: #333;';

    const facCb = document.createElement('input');
    facCb.type = 'checkbox';
    facCb.checked = fac.courts.every((c) => visibleCourts.has(c.id));
    facCb.indeterminate =
      !facCb.checked && fac.courts.some((c) => visibleCourts.has(c.id));
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

    // Court list
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
        if (courtCb.checked) {
          visibleCourts.add(court.id);
        } else {
          visibleCourts.delete(court.id);
        }
        // Update facility checkbox state
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

    // Facility checkbox toggles all courts
    facCb.addEventListener('change', () => {
      for (const court of fac.courts) {
        if (facCb.checked) {
          visibleCourts.add(court.id);
        } else {
          visibleCourts.delete(court.id);
        }
      }
      for (const cb of courtCheckboxes) {
        cb.checked = facCb.checked;
      }
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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// ── Shared timeline options ───────────────────────────────────────────────────

let justDragged = false;

function baseOptions() {
  return {
    start: dayStart,
    end: dayEnd,
    min: dayStart,
    max: weekEnd,
    zoomMin: 60 * 60 * 1000,
    zoomMax: 7 * 24 * 60 * 60 * 1000,
    height: '100%',
    groupHeightMode: 'fixed',
    editable: {
      add: true,
      updateTime: true,
      updateGroup: true,
      remove: false,
    },
    snap: (date: Date) => {
      const ms = date.getTime();
      const fiveMin = 5 * 60 * 1000;
      return new Date(Math.round(ms / fiveMin) * fiveMin);
    },
    onMoving: (item: any, callback: any) => callback(item),
    onMove: (item: any, callback: any) => {
      justDragged = true;
      setTimeout(() => (justDragged = false), 300);
      callback(item);
    },
    orientation: { axis: 'top', item: 'top' },
    stack: false,
    showCurrentTime: false,
    horizontalScroll: true,
    verticalScroll: true,
    zoomKey: 'ctrlKey',
    groupOrder: 'order',
    showTooltips: true,
    format: {
      minorLabels: { minute: 'HH:mm', hour: 'HH:mm' },
      majorLabels: { hour: 'ddd D MMM', day: 'ddd D MMM' },
    },
    timeAxis: { scale: 'hour', step: 1 },
    itemsAlwaysDraggable: { item: true, range: true },
    dataAttributes: ['id'],
  };
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
// View presets
const VIEWS: Record<string, { label: string; days: number; timeAxis: any }> = {
  day:        { label: '1 Day',   days: 1,  timeAxis: { scale: 'hour', step: 1 } },
  tournament: { label: '3 Days',  days: 3,  timeAxis: { scale: 'hour', step: 3 } },
  week:       { label: 'Week',    days: 7,  timeAxis: { scale: 'hour', step: 6 } },
};

function buildToolbar(
  onViewChange: (viewKey: string) => void,
  initialView: string,
): HTMLElement {
  const bar = document.createElement('div');
  bar.style.cssText =
    'display:flex; align-items:center; gap:4px; padding:6px 12px; border-bottom:1px solid #e0e0e0; background:#f8f9fa; font-family:sans-serif; font-size:13px;';

  const label = document.createElement('span');
  label.textContent = 'View:';
  label.style.cssText = 'color:#666; margin-right:4px;';
  bar.appendChild(label);

  const buttons: HTMLButtonElement[] = [];

  for (const [key, view] of Object.entries(VIEWS)) {
    const btn = document.createElement('button');
    btn.textContent = view.label;
    btn.style.cssText =
      'padding:4px 12px; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:13px; background:white; color:#333;';

    if (key === initialView) {
      btn.style.background = '#218D8D';
      btn.style.color = 'white';
      btn.style.borderColor = '#218D8D';
    }

    btn.addEventListener('click', () => {
      for (const b of buttons) {
        b.style.background = 'white';
        b.style.color = '#333';
        b.style.borderColor = '#ddd';
      }
      btn.style.background = '#218D8D';
      btn.style.color = 'white';
      btn.style.borderColor = '#218D8D';
      onViewChange(key);
    });

    buttons.push(btn);
    bar.appendChild(btn);
  }

  return bar;
}

export const Baseline = {
  render: () => {
    const visibleCourts = new Set(ALL_COURTS.map((c) => c.id));
    let currentView = 'day';

    // Root layout: column (toolbar on top, then tree+timeline row)
    const root = document.createElement('div');
    root.style.cssText = 'display:flex; flex-direction:column; width:100%; height:600px; border:1px solid #e0e0e0; border-radius:4px; overflow:hidden;';

    // Main row: tree | timeline
    const mainRow = document.createElement('div');
    mainRow.style.cssText = 'display:flex; flex:1; min-height:0;';

    const timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = 'flex:1; min-width:0;';

    let timeline: any = null;

    const setView = (viewKey: string) => {
      if (!timeline) return;
      currentView = viewKey;
      const view = VIEWS[viewKey];
      const end = new Date(dayStart.getTime() + view.days * 16 * 60 * 60 * 1000); // days × 16h
      timeline.setWindow(dayStart, end);
      timeline.setOptions({ timeAxis: view.timeAxis });
    };

    const refreshTimeline = () => {
      if (!timeline) return;
      const groups = makeGroups(visibleCourts);
      const items = makeItems(visibleCourts);
      timeline.setGroups(groups);
      timeline.setItems(items);
    };

    // Toolbar
    const toolbar = buildToolbar(setView, currentView);
    root.appendChild(toolbar);

    // Facility tree
    const treePanel = buildFacilityTree(visibleCourts, refreshTimeline);

    mainRow.appendChild(treePanel);
    mainRow.appendChild(timelineContainer);
    root.appendChild(mainRow);

    setTimeout(() => {
      timeline = new Timeline(
        timelineContainer,
        makeItems(visibleCourts),
        makeGroups(visibleCourts),
        {
          ...baseOptions(),

          onAdd: (item: any, callback: any) => {
            item.content = item.content || 'New Block';
            item.style = 'background-color: #607D8B; border-color: #37474F; color: white;';
            item.editable = { updateTime: true, updateGroup: true, remove: false };
            callback(item);
          },
        },
      );

      timeline.on('click', (props: any) => {
        if (justDragged) return;
        if (!props.item || props.item.startsWith('avail-')) return;

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
            if (el && updatedItem) showBlockPopover(el, updatedItem, timeline);
          }, 50);
          return;
        }

        // Range item → popover
        const itemEl =
          (props.event?.target as Element)?.closest?.('.vis-item') ??
          timelineContainer.querySelector(`.vis-item[data-id="${props.item}"]`);

        if (itemEl) {
          showBlockPopover(itemEl, item, timeline);
        }
      });
    }, 0);

    return root;
  },
};
