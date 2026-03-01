/**
 * Custom multi-select dropdown with tag chips and checkbox panel.
 *
 * Visual structure:
 * ┌──────────────────────────────────────┐
 * │ WTN ×  UTR ×                      ▼ │  ← trigger: tags + chevron
 * ├──────────────────────────────────────┤
 * │ ✓ WTN                               │  ← dropdown (checkboxes)
 * │ ✓ UTR                               │
 * │   DUPR                              │
 * └──────────────────────────────────────┘
 *
 * All colors use --chc-* CSS variables for automatic dark-mode support.
 */

import { isFunction } from '../../helpers/typeOf';

interface MultiSelectOption {
  label: string;
  value: string;
  selected?: boolean;
  disabled?: boolean;
}

interface MultiSelectItem {
  options: MultiSelectOption[];
  onChange?: (e: Event, item: any) => void;
  id?: string;
}

type MultiSelectElement = HTMLDivElement & { selectedValues: string[]; value: string };

export function createMultiSelect(item: MultiSelectItem): { container: HTMLDivElement; element: MultiSelectElement } {
  const state = new Set(item.options.filter((o) => o.selected).map((o) => o.value));

  // --- outer wrapper (position context for absolute dropdown) ---
  const container = document.createElement('div');
  container.style.cssText = 'position: relative; width: 100%;';

  // --- trigger bar ---
  const trigger = document.createElement('div');
  trigger.style.cssText =
    'display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-height: 2.5em; padding: 4px 8px; border: 1px solid var(--chc-input-border, #7a7a7a); border-radius: 4px; background: var(--chc-input-bg, #fff); cursor: pointer; box-sizing: border-box';

  // tags area
  const tagsArea = document.createElement('div');
  tagsArea.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0;';

  // chevron
  const chevron = document.createElement('span');
  chevron.textContent = '▾';
  chevron.style.cssText = 'margin-left: auto; padding-left: 8px; user-select: none; color: var(--chc-text-secondary, #666);';

  trigger.appendChild(tagsArea);
  trigger.appendChild(chevron);

  // --- dropdown panel ---
  const dropdown = document.createElement('div');
  dropdown.style.cssText = [
    'display: none',
    'position: absolute',
    'top: 100%',
    'left: 0',
    'right: 0',
    'z-index: 50',
    'max-height: 220px',
    'overflow-y: auto',
    'border: 1px solid var(--chc-border-primary, #dbdbdb)',
    'border-top: none',
    'border-radius: 0 0 4px 4px',
    'background: var(--chc-dropdown-bg, #fff)',
    'box-shadow: 0 4px 8px rgba(0,0,0,0.1)',
  ].join('; ');

  // build rows
  const checkboxes: Map<string, HTMLInputElement> = new Map();

  for (const option of item.options) {
    const row = document.createElement('label');
    row.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 8px',
      'padding: 6px 10px',
      'cursor: pointer',
      'color: var(--chc-text-primary, #363636)',
    ].join('; ');
    row.addEventListener('mouseenter', () => {
      row.style.background = 'var(--chc-hover-bg, #f5f5f5)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = '';
    });

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = option.value;
    cb.checked = !!option.selected;
    if (option.disabled) cb.disabled = true;
    cb.style.cssText = 'margin: 0; cursor: pointer;';

    const span = document.createElement('span');
    span.textContent = option.label;

    row.appendChild(cb);
    row.appendChild(span);
    dropdown.appendChild(row);
    checkboxes.set(option.value, cb);
  }

  container.appendChild(trigger);
  container.appendChild(dropdown);

  // --- helpers ---
  let open = false;

  function toggle() {
    open = !open;
    dropdown.style.display = open ? 'block' : 'none';
  }

  function close() {
    open = false;
    dropdown.style.display = 'none';
  }

  function renderTags() {
    tagsArea.innerHTML = '';
    if (state.size === 0) {
      const placeholder = document.createElement('span');
      placeholder.textContent = 'Select…';
      placeholder.style.cssText = 'color: var(--chc-text-muted, #999); user-select: none;';
      tagsArea.appendChild(placeholder);
      return;
    }
    for (const val of state) {
      const opt = item.options.find((o) => o.value === val);
      if (!opt) continue;
      const tag = document.createElement('span');
      tag.style.cssText = [
        'display: inline-flex',
        'align-items: center',
        'gap: 4px',
        'padding: 2px 6px',
        'border-radius: 3px',
        'background: var(--chc-status-info, blue)',
        'color: var(--chc-text-inverse, #fff)',
        'font-size: 0.85em',
        'white-space: nowrap',
      ].join('; ');
      tag.textContent = opt.label;

      const remove = document.createElement('span');
      remove.textContent = '×';
      remove.style.cssText = 'cursor: pointer; margin-left: 2px; font-weight: bold;';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        state.delete(val);
        const cb = checkboxes.get(val);
        if (cb) cb.checked = false;
        renderTags();
        fireChange();
      });
      tag.appendChild(remove);
      tagsArea.appendChild(tag);
    }
  }

  function fireChange() {
    if (isFunction(item.onChange)) {
      const syntheticEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(syntheticEvent);
      item.onChange(syntheticEvent, item);
    }
  }

  // --- event wiring ---
  trigger.addEventListener('click', () => toggle());

  // click-outside closes dropdown
  document.addEventListener('click', (e) => {
    if (open && !container.contains(e.target as Node)) {
      close();
    }
  });

  // checkbox changes
  for (const [value, cb] of checkboxes) {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        state.add(value);
      } else {
        state.delete(value);
      }
      renderTags();
      fireChange();
    });
  }

  // initial render
  renderTags();

  // --- element proxy ---
  const element = container as MultiSelectElement;
  Object.defineProperty(element, 'selectedValues', {
    get: () => [...state],
    enumerable: true,
  });
  Object.defineProperty(element, 'value', {
    get: () => [...state].join(','),
    enumerable: true,
  });

  return { container, element };
}
