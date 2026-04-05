/**
 * Schedule Cell TypeAhead — inline autocomplete for empty grid cells.
 *
 * Activates an Awesomplete typeahead input inside an empty schedule cell.
 * The consumer provides a list of unscheduled matchUps and a selection callback.
 * Reuses the existing createTypeAhead helper (Awesomplete wrapper).
 */

import { createTypeAhead } from '../../../helpers/createTypeAhead';

export interface ScheduleCellTypeAheadOptions {
  /** The grid cell element to activate the typeahead in */
  cell: HTMLElement;
  /** Returns the list of assignable matchUps as { label, value } */
  listProvider: () => Array<{ label: string; value: string }>;
  /** Called when a matchUp is selected — value is the matchUpId */
  onSelect: (matchUpId: string) => void;
  /** Called when the typeahead is dismissed without selection */
  onCancel?: () => void;
}

export function activateScheduleCellTypeAhead({
  cell,
  listProvider,
  onSelect,
  onCancel
}: ScheduleCellTypeAheadOptions): { destroy: () => void } {
  const savedHTML = cell.innerHTML;
  const overflowElements: Array<{ el: HTMLElement; overflow: string; overflowX: string; overflowY: string }> = [];
  let selected = false;
  let destroyed = false;

  // Add active class
  cell.classList.add('spl-cell--typeahead');
  cell.innerHTML = '';

  // Create a wrapper that handles vertical centering without affecting the cell's own display
  const wrapper = document.createElement('div');
  wrapper.className = 'spl-cell--typeahead-wrapper';
  cell.appendChild(wrapper);

  // Create input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search matchUps...';
  input.setAttribute('inputmode', 'search');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('enterkeyhint', 'search');
  input.setAttribute('autocomplete', 'off');
  wrapper.appendChild(input);

  // Fix overflow on ancestors so the Awesomplete dropdown is visible
  let ancestor: HTMLElement | null = cell;
  let level = 0;
  while (ancestor && level < 10) {
    const styles = window.getComputedStyle(ancestor);
    if (styles.overflow !== 'visible' || styles.overflowX !== 'visible' || styles.overflowY !== 'visible') {
      overflowElements.push({
        el: ancestor,
        overflow: ancestor.style.overflow,
        overflowX: ancestor.style.overflowX,
        overflowY: ancestor.style.overflowY
      });
      ancestor.style.setProperty('overflow', 'visible', 'important');
      ancestor.style.setProperty('overflow-x', 'visible', 'important');
      ancestor.style.setProperty('overflow-y', 'visible', 'important');
    }
    ancestor = ancestor.parentElement;
    level++;
  }

  // Initialize typeahead
  const initialList = listProvider();
  createTypeAhead({
    list: initialList,
    element: input,
    listProvider,
    callback: (value: string) => {
      if (value && !destroyed) {
        selected = true;
        cleanup();
        onSelect(value);
      }
    }
  });

  // Escape to cancel
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      onCancel?.();
    }
  });

  // Blur to cancel (with delay for Awesomplete click)
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!selected && !destroyed) {
        cleanup();
        onCancel?.();
      }
    }, 200);
  });

  // Click anywhere outside the input (including cell padding) dismisses
  const onCellMouseDown = (ev: MouseEvent) => {
    if (ev.target !== input && !wrapper.contains(ev.target as Node)) {
      ev.preventDefault();
      input.blur();
    }
  };
  cell.addEventListener('mousedown', onCellMouseDown);

  // Swallow click events while the typeahead is active.
  // This prevents clicks from re-triggering the cell's own click handler
  // (e.g. showing the menu again after a selection).
  // We listen on the wrapper (which contains the Awesomplete dropdown)
  // in bubble phase — Awesomplete's ul handler fires first (target phase),
  // then our handler stops the event from reaching the cell's listener.
  const onWrapperClick = (ev: MouseEvent) => {
    ev.stopPropagation();
  };
  wrapper.addEventListener('click', onWrapperClick);

  // Auto-focus
  setTimeout(() => input.focus(), 0);

  function cleanup(): void {
    if (destroyed) return;
    destroyed = true;

    cell.removeEventListener('mousedown', onCellMouseDown);
    cell.classList.remove('spl-cell--typeahead');
    cell.innerHTML = savedHTML;

    // Restore ancestor overflow
    for (const { el, overflow, overflowX, overflowY } of overflowElements) {
      if (overflow) el.style.overflow = overflow;
      else el.style.removeProperty('overflow');
      if (overflowX) el.style.overflowX = overflowX;
      else el.style.removeProperty('overflow-x');
      if (overflowY) el.style.overflowY = overflowY;
      else el.style.removeProperty('overflow-y');
    }
  }

  return { destroy: cleanup };
}
