/**
 * The modal body is the dialog's one scrolling region (`.chc-modal-body { overflow-y: auto }`), and a
 * scrolling element clips everything absolutely positioned inside it. The datepicker's calendar and a
 * type-ahead's suggestion list are both absolutely positioned popups mounted next to their input, so
 * inside a modal they were cut off at the body's edge and drawn UNDER the footer: the calendar on
 * tournament dates, the suggestions on "Select provider".
 *
 * `draw.css` makes both popups `position: fixed` inside a modal body. A fixed element escapes the
 * clipping (nothing above it has a transform, filter or containment), but it is positioned against the
 * viewport, so this module supplies the coordinates the library does not:
 *
 * - The datepicker places itself from `getBoundingClientRect()` and, with no offset parent, adds the
 *   window's scroll, which is 0 because an open modal freezes the page. Its own coordinates are already
 *   viewport coordinates, so it needs help only when the body scrolls under it.
 * - Awesomplete does not position its list at all; CSS hangs it below the input. Fixed, it needs a top,
 *   a left and a width, set here when the list opens and again whenever the body scrolls.
 * - The multi-select's checkbox panel hangs below its trigger with inline `position: absolute`, so it
 *   is made fixed here (inline, to win over its own inline style) and placed under the trigger when it
 *   opens and whenever the body scrolls. Clipped, only one row of the panel showed above the footer.
 *   Fixed, it is bounded by the viewport instead: it shrinks to the room below, or opens upward.
 */

const TYPE_AHEAD_LIST = ':scope > ul[role="listbox"]';
const OPEN_DATEPICKER = '.datepicker-dropdown.active';
const MULTI_SELECT_PANEL = '.chc-multi-select-dropdown';

function placeTypeAheadList(input: HTMLElement): void {
  const list = input.parentElement?.querySelector<HTMLElement>(TYPE_AHEAD_LIST);
  if (!list || list.hidden) return;
  const { left, bottom, width } = input.getBoundingClientRect();
  list.style.left = `${left}px`;
  list.style.top = `${bottom}px`;
  list.style.width = `${width}px`;
}

const PANEL_MAX_HEIGHT = 220;
const PANEL_MIN_HEIGHT = 120;
const VIEWPORT_MARGIN = 8;

function placeMultiSelectPanel(panel: HTMLElement): void {
  const trigger = panel.previousElementSibling;
  if (!trigger || panel.style.display === 'none') return;
  const { left, top, bottom, width } = trigger.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.left = `${left}px`;
  panel.style.width = `${width}px`;
  panel.style.right = 'auto';

  // Fixed, the panel is no longer bounded by the body, so bound it by the viewport: rows hanging off
  // the bottom of the window could not be reached. Open upward when below is too cramped and above
  // has more room; either way the panel scrolls its own rows.
  const below = window.innerHeight - bottom - VIEWPORT_MARGIN;
  const above = top - VIEWPORT_MARGIN;
  const upward = below < PANEL_MIN_HEIGHT && above > below;
  const maxHeight = Math.min(PANEL_MAX_HEIGHT, upward ? above : below);
  panel.style.maxHeight = `${Math.max(maxHeight, 0)}px`;
  panel.style.top = upward ? 'auto' : `${bottom}px`;
  panel.style.bottom = upward ? `${window.innerHeight - top}px` : 'auto';
}

export function anchorModalPopups(body: HTMLElement): void {
  let lastScrollTop = body.scrollTop;

  body.addEventListener('awesomplete-open', (event) => placeTypeAheadList(event.target as HTMLElement));

  body.addEventListener('chc-multi-select-place', (event) => {
    const panel = (event.target as HTMLElement).querySelector<HTMLElement>(`:scope > ${MULTI_SELECT_PANEL}`);
    if (panel) placeMultiSelectPanel(panel);
  });

  body.addEventListener('scroll', () => {
    const delta = body.scrollTop - lastScrollTop;
    lastScrollTop = body.scrollTop;

    body.querySelectorAll<HTMLElement>('.awesomplete > input').forEach(placeTypeAheadList);
    body.querySelectorAll<HTMLElement>(MULTI_SELECT_PANEL).forEach(placeMultiSelectPanel);

    // The calendar keeps the coordinates it computed when it opened; move it with its input.
    body.querySelectorAll<HTMLElement>(OPEN_DATEPICKER).forEach((picker) => {
      picker.style.top = `${Number.parseFloat(picker.style.top || '0') - delta}px`;
    });
  });
}
