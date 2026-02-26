/**
 * Card Popover — Singleton Tippy.js popover for card actions.
 *
 * Follows the blockPopover.ts pattern from temporal-grid.
 * Actions: delete round, set notBeforeTime.
 */

import tippy, { type Instance as TippyInstance } from 'tippy.js';
import type { RoundLocator } from '../types';
import {
  spPopoverItemStyle,
  spPopoverDeleteStyle,
  spPopoverDividerStyle,
} from './styles';

export interface CardPopoverCallbacks {
  onDelete: (locator: RoundLocator) => void;
  onSetNotBeforeTime: (locator: RoundLocator) => void;
}

export interface CardPopoverManager {
  show(target: HTMLElement, locator: RoundLocator): void;
  destroy(): void;
  isActiveFor(locator: RoundLocator): boolean;
}

export function createCardPopoverManager(callbacks: CardPopoverCallbacks): CardPopoverManager {
  let activeTip: TippyInstance | null = null;
  let activeLocatorKey: string | null = null;

  function locatorKey(loc: RoundLocator): string {
    return `${loc.date}|${loc.venueId}|${loc.index}`;
  }

  function destroyActive(): void {
    if (activeTip) {
      activeTip.destroy();
      activeTip = null;
      activeLocatorKey = null;
    }
  }

  function buildContent(locator: RoundLocator): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:sans-serif; font-size:13px; min-width:150px;';

    // Set Not Before Time
    const timeBtn = document.createElement('div');
    timeBtn.className = spPopoverItemStyle();
    timeBtn.textContent = 'Set Not Before Time';
    timeBtn.addEventListener('click', () => {
      destroyActive();
      callbacks.onSetNotBeforeTime(locator);
    });
    wrap.appendChild(timeBtn);

    // Divider
    const hr = document.createElement('div');
    hr.className = spPopoverDividerStyle();
    wrap.appendChild(hr);

    // Delete
    const delBtn = document.createElement('div');
    delBtn.className = spPopoverDeleteStyle();
    delBtn.textContent = 'Remove Round';
    delBtn.addEventListener('click', () => {
      destroyActive();
      callbacks.onDelete(locator);
    });
    wrap.appendChild(delBtn);

    return wrap;
  }

  return {
    show(target: HTMLElement, locator: RoundLocator): void {
      const key = locatorKey(locator);

      // Toggle behavior
      if (activeLocatorKey === key) {
        destroyActive();
        return;
      }

      destroyActive();

      const content = buildContent(locator);
      const tip: TippyInstance = tippy(target, {
        content,
        allowHTML: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom',
        appendTo: document.body,
        onHidden: () => {
          activeTip = null;
          activeLocatorKey = null;
        },
      });

      activeTip = tip;
      activeLocatorKey = key;
      tip.show();
    },

    destroy(): void {
      destroyActive();
    },

    isActiveFor(locator: RoundLocator): boolean {
      return activeLocatorKey === locatorKey(locator);
    },
  };
}
