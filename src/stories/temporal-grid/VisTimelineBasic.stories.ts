/**
 * Bare-bones vis-timeline stories — no engine, no controller.
 * Purpose: nail the correct options, CSS, and interactions in isolation.
 *
 * Three variants to isolate which options cause the "infinite loop in redraw" warning:
 *   1. Minimal        — fixed pixel height, no scroll options, day view, 8 courts
 *   2. WithScroll      — week view, 24 courts to force both H and V scrolling
 *   3. FullInteraction — editable, drag, resize, double-click to add, 5-min snap
 */

import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import { Timeline } from 'vis-timeline/standalone';

export default {
  title: 'Temporal Grid/Vis Timeline Basic',
};

// ── Shared test data ──────────────────────────────────────────────────────────

const smallGroups = [
  { id: 'court-1', content: 'Court 1' },
  { id: 'court-2', content: 'Court 2' },
  { id: 'court-3', content: 'Court 3' },
  { id: 'court-4', content: 'Court 4' },
  { id: 'court-5', content: 'Court 5' },
  { id: 'court-6', content: 'Court 6' },
  { id: 'court-7', content: 'Court 7' },
  { id: 'court-8', content: 'Court 8' },
];

const largeGroups = Array.from({ length: 24 }, (_, i) => ({
  id: `court-${i + 1}`,
  content: `Court ${i + 1}`,
}));

const dayStart = new Date('2026-06-15T06:00:00');
const dayEnd = new Date('2026-06-15T22:00:00');
const weekStart = new Date('2026-06-15T06:00:00');
const weekEnd = new Date('2026-06-21T22:00:00');

function makeItems(groups: { id: string; content: string }[]) {
  return [
    // Background segments (availability shading)
    ...groups.map((g) => ({
      id: `avail-${g.id}`,
      group: g.id,
      content: '',
      start: dayStart,
      end: dayEnd,
      type: 'background' as const,
      style: 'background-color: rgba(76, 175, 80, 0.1);',
      editable: false,
      selectable: false,
    })),

    // Draggable range blocks spread across courts
    {
      id: 'block-1',
      group: 'court-1',
      content: 'Maintenance',
      start: new Date('2026-06-15T08:00:00'),
      end: new Date('2026-06-15T10:00:00'),
      type: 'range' as const,
      style: 'background-color: #FF9800; border-color: #E65100; color: white;',
      editable: { updateTime: true, updateGroup: true, remove: false },
    },
    {
      id: 'block-2',
      group: 'court-3',
      content: 'Practice',
      start: new Date('2026-06-15T14:00:00'),
      end: new Date('2026-06-15T16:00:00'),
      type: 'range' as const,
      style: 'background-color: #2196F3; border-color: #0D47A1; color: white;',
      editable: { updateTime: true, updateGroup: true, remove: false },
    },
    {
      id: 'block-3',
      group: 'court-5',
      content: 'Reserved',
      start: new Date('2026-06-15T11:00:00'),
      end: new Date('2026-06-15T13:00:00'),
      type: 'range' as const,
      style: 'background-color: #9C27B0; border-color: #4A148C; color: white;',
      editable: { updateTime: true, updateGroup: true, remove: false },
    },
  ];
}

// ── Story 1: Minimal ──────────────────────────────────────────────────────────

/**
 * Absolute minimum — fixed pixel height, no scrolling options, no editing.
 * 8 courts, single day view.
 */
export const Minimal = {
  render: () => {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '600px';

    setTimeout(() => {
      const timeline = new Timeline(container, makeItems(smallGroups), smallGroups, {
        start: dayStart,
        end: dayEnd,
        min: dayStart,
        max: dayEnd,
        height: '600px',
        orientation: { axis: 'top', item: 'top' },
        stack: false,
        showCurrentTime: false,
        groupOrder: 'content',
      });

      timeline.on('click', (props: any) => console.log('click:', props));
    }, 0);

    return container;
  },
};

// ── Story 2: WithScroll ───────────────────────────────────────────────────────

/**
 * Week view with 24 courts — forces both horizontal and vertical scrolling.
 * Ctrl+scroll to zoom, click+hold+drag to pan horizontally.
 */
export const WithScroll = {
  render: () => {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '600px';

    setTimeout(() => {
      const timeline = new Timeline(container, makeItems(largeGroups), largeGroups, {
        start: weekStart,
        end: dayEnd,           // visible window = 1 day
        min: weekStart,
        max: weekEnd,          // scrollable range = full week
        height: '600px',
        orientation: { axis: 'top', item: 'top' },
        stack: false,
        showCurrentTime: false,
        groupOrder: 'content',
        horizontalScroll: true,
        verticalScroll: true,
        zoomKey: 'ctrlKey',
      });

      timeline.on('click', (props: any) => console.log('click:', props));
    }, 0);

    return container;
  },
};

// ── Story 3: FullInteraction ──────────────────────────────────────────────────

/**
 * Full editing: drag, resize, double-click to add, 5-min snap.
 * 24 courts, week view. This is the target config for the real controller.
 */
export const FullInteraction = {
  render: () => {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '600px';

    setTimeout(() => {
      const timeline = new Timeline(container, makeItems(largeGroups), largeGroups, {
        start: weekStart,
        end: dayEnd,           // visible window = 1 day
        min: weekStart,
        max: weekEnd,          // scrollable range = full week
        zoomMin: 60 * 60 * 1000,
        zoomMax: 7 * 24 * 60 * 60 * 1000,
        height: '600px',

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

        onAdd: (item: any, callback: any) => {
          console.log('onAdd fired:', item);
          callback(item); // accept the add — block appears on the timeline
        },

        onMove: (item: any, callback: any) => {
          console.log('onMove fired:', item);
          callback(item); // accept the move
        },

        onMoving: (item: any, callback: any) => {
          callback(item); // allow visual drag feedback
        },

        orientation: { axis: 'top', item: 'top' },
        stack: false,
        showCurrentTime: false,
        horizontalScroll: true,
        verticalScroll: true,
        zoomKey: 'ctrlKey',
        groupOrder: 'content',
        showTooltips: true,

        format: {
          minorLabels: {
            minute: 'HH:mm',
            hour: 'HH:mm',
          },
          majorLabels: {
            hour: 'ddd D MMM',
            day: 'ddd D MMM',
          },
        },

        itemsAlwaysDraggable: {
          item: true,
          range: true,
        },
      });

      timeline.on('click', (props: any) => console.log('click:', props));
      timeline.on('doubleClick', (props: any) =>
        console.log('doubleClick:', props),
      );
    }, 0);

    return container;
  },
};
