/**
 * Block Popover — Tippy-based popover for block actions.
 *
 * Extracted from VisTimelineBasic.stories.ts.
 * Provides type-picker, adjust-time, and delete actions for timeline blocks.
 */

import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { showModernTimePicker } from './modernTimePicker';
import type { TemporalGridEngine } from '../engine/temporalGridEngine';
import type { BlockType } from '../engine/types';
import { DEFAULT_COLOR_SCHEME } from '../controller/viewProjections';

// ============================================================================
// Public Types
// ============================================================================

export interface BlockPopoverOptions {
  itemId: string;
  blockTypes: Array<{ type: string; color: string; label: string }>;
  currentType?: string;
  startTime?: string;
  endTime?: string;
  onTypeSelected: (type: string) => void;
  onAdjustTime?: (startTime: string, endTime: string) => void;
  onDelete?: () => void;
}

export interface EngineBlockPopoverOptions {
  itemId: string;
  blockId: string;
  engine: TemporalGridEngine;
  day: string;
  onBlockChanged: () => void;
}

export interface BlockPopoverManager {
  show(target: HTMLElement, options: BlockPopoverOptions): void;
  showForEngineBlock(target: HTMLElement, options: EngineBlockPopoverOptions): void;
  destroy(): void;
  isActiveFor(itemId: string): boolean;
}

// ============================================================================
// Engine Block Types (type → label mapping)
// ============================================================================

const ENGINE_BLOCK_TYPES: [BlockType, string][] = [
  ['MAINTENANCE', 'Maintenance'],
  ['PRACTICE', 'Practice'],
  ['RESERVED', 'Reserved'],
  ['BLOCKED', 'Blocked'],
];

// ============================================================================
// Implementation
// ============================================================================

export function createBlockPopoverManager(): BlockPopoverManager {
  let activeTip: TippyInstance | null = null;
  let activeItemId: string | null = null;

  function destroyActive(): void {
    if (activeTip) {
      activeTip.destroy();
      activeTip = null;
      activeItemId = null;
    }
  }

  function buildGenericContent(options: BlockPopoverOptions): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:sans-serif; font-size:13px; min-width:150px;';

    for (const bt of options.blockTypes) {
      const btn = document.createElement('div');
      btn.style.cssText =
        'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;';
      btn.innerHTML = `
        <span style="width:10px;height:10px;border-radius:2px;background:${bt.color};display:inline-block;"></span>
        ${bt.label}
      `;
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; btn.style.color = '#333'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = ''; });
      btn.addEventListener('click', () => {
        options.onTypeSelected(bt.type);
        destroyActive();
      });
      wrap.appendChild(btn);
    }

    if (options.onAdjustTime || options.onDelete) {
      const hr = document.createElement('div');
      hr.style.cssText = 'border-top:1px solid #e0e0e0; margin:4px 0;';
      wrap.appendChild(hr);
    }

    if (options.onAdjustTime) {
      const timeBtn = document.createElement('div');
      timeBtn.style.cssText =
        'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;';
      timeBtn.innerHTML = `<span style="font-size:14px;">&#128339;</span> Adjust Time`;
      timeBtn.addEventListener('mouseenter', () => { timeBtn.style.background = '#f0f0f0'; timeBtn.style.color = '#333'; });
      timeBtn.addEventListener('mouseleave', () => { timeBtn.style.background = 'transparent'; timeBtn.style.color = ''; });
      timeBtn.addEventListener('click', () => {
        const onAdjust = options.onAdjustTime!;
        destroyActive();
        if (options.startTime && options.endTime) {
          showModernTimePicker({
            startTime: options.startTime,
            endTime: options.endTime,
            dayStartTime: '06:00',
            dayEndTime: '22:00',
            minuteIncrement: 5,
            onConfirm: (start: string, end: string) => onAdjust(start, end),
            onCancel: () => {},
          });
        }
      });
      wrap.appendChild(timeBtn);
    }

    if (options.onDelete) {
      const delBtn = document.createElement('div');
      delBtn.style.cssText =
        'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; color:#e74c3c;';
      delBtn.innerHTML = `<span style="font-size:14px;">&#128465;</span> Delete`;
      delBtn.addEventListener('mouseenter', () => { delBtn.style.background = '#fdecea'; });
      delBtn.addEventListener('mouseleave', () => { delBtn.style.background = 'transparent'; });
      delBtn.addEventListener('click', () => {
        const onDel = options.onDelete!;
        destroyActive();
        onDel();
      });
      wrap.appendChild(delBtn);
    }

    return wrap;
  }

  function buildEngineContent(opts: EngineBlockPopoverOptions): HTMLElement {
    const { blockId, engine, day, onBlockChanged } = opts;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:sans-serif; font-size:13px; min-width:150px;';

    // Type-picker rows
    for (const [type, label] of ENGINE_BLOCK_TYPES) {
      const color = DEFAULT_COLOR_SCHEME[type];
      const btn = document.createElement('div');
      btn.style.cssText =
        'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;';
      btn.innerHTML = `
        <span style="width:10px;height:10px;border-radius:2px;background:${color};display:inline-block;"></span>
        ${label}
      `;
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; btn.style.color = '#333'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; btn.style.color = ''; });
      btn.addEventListener('click', () => {
        const block = engine.getDayBlocks(day).find((b) => b.id === blockId);
        if (block) {
          engine.removeBlock(blockId);
          engine.applyBlock({
            courts: [block.court],
            timeRange: { start: block.start, end: block.end },
            type,
            reason: label,
          });
          onBlockChanged();
        }
        destroyActive();
      });
      wrap.appendChild(btn);
    }

    const hr = document.createElement('div');
    hr.style.cssText = 'border-top:1px solid #e0e0e0; margin:4px 0;';
    wrap.appendChild(hr);

    // Adjust Time
    const timeBtn = document.createElement('div');
    timeBtn.style.cssText =
      'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;';
    timeBtn.innerHTML = `<span style="font-size:14px;">&#128339;</span> Adjust Time`;
    timeBtn.addEventListener('mouseenter', () => { timeBtn.style.background = '#f0f0f0'; timeBtn.style.color = '#333'; });
    timeBtn.addEventListener('mouseleave', () => { timeBtn.style.background = 'transparent'; timeBtn.style.color = ''; });
    timeBtn.addEventListener('click', () => {
      destroyActive();
      const block = engine.getDayBlocks(day).find((b) => b.id === blockId);
      if (!block) return;
      showModernTimePicker({
        startTime: block.start,
        endTime: block.end,
        dayStartTime: '06:00',
        dayEndTime: '22:00',
        minuteIncrement: 5,
        onConfirm: (startTimeStr: string, endTimeStr: string) => {
          const d = block.start.slice(0, 10);
          engine.resizeBlock({
            blockId,
            newTimeRange: { start: `${d}T${startTimeStr}:00`, end: `${d}T${endTimeStr}:00` },
          });
          onBlockChanged();
        },
        onCancel: () => {},
      });
    });
    wrap.appendChild(timeBtn);

    // Delete
    const delBtn = document.createElement('div');
    delBtn.style.cssText =
      'padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; color:#e74c3c;';
    delBtn.innerHTML = `<span style="font-size:14px;">&#128465;</span> Delete`;
    delBtn.addEventListener('mouseenter', () => { delBtn.style.background = '#fdecea'; });
    delBtn.addEventListener('mouseleave', () => { delBtn.style.background = 'transparent'; });
    delBtn.addEventListener('click', () => {
      engine.removeBlock(blockId);
      onBlockChanged();
      destroyActive();
    });
    wrap.appendChild(delBtn);

    return wrap;
  }

  function showTip(target: HTMLElement, content: HTMLElement, itemId: string): void {
    destroyActive();

    const tip: TippyInstance = tippy(target, {
      content,
      allowHTML: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom',
      appendTo: document.body,
      onHidden: () => { activeTip = null; activeItemId = null; },
    });

    activeTip = tip;
    activeItemId = itemId;
    tip.show();
  }

  return {
    show(target: HTMLElement, options: BlockPopoverOptions): void {
      // Toggle behavior
      if (activeItemId === options.itemId) {
        destroyActive();
        return;
      }
      const content = buildGenericContent(options);
      showTip(target, content, options.itemId);
    },

    showForEngineBlock(target: HTMLElement, options: EngineBlockPopoverOptions): void {
      // Toggle behavior
      if (activeItemId === options.itemId) {
        destroyActive();
        return;
      }
      const content = buildEngineContent(options);
      showTip(target, content, options.itemId);
    },

    destroy(): void {
      destroyActive();
    },

    isActiveFor(itemId: string): boolean {
      return activeItemId === itemId;
    },
  };
}
