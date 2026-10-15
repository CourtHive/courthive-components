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
 */

const TYPE_AHEAD_LIST = ':scope > ul[role="listbox"]';
const OPEN_DATEPICKER = '.datepicker-dropdown.active';

function placeTypeAheadList(input: HTMLElement): void {
  const list = input.parentElement?.querySelector<HTMLElement>(TYPE_AHEAD_LIST);
  if (!list || list.hidden) return;
  const { left, bottom, width } = input.getBoundingClientRect();
  list.style.left = `${left}px`;
  list.style.top = `${bottom}px`;
  list.style.width = `${width}px`;
}

export function anchorModalPopups(body: HTMLElement): void {
  let lastScrollTop = body.scrollTop;

  body.addEventListener('awesomplete-open', (event) => placeTypeAheadList(event.target as HTMLElement));

  body.addEventListener('scroll', () => {
    const delta = body.scrollTop - lastScrollTop;
    lastScrollTop = body.scrollTop;

    body.querySelectorAll<HTMLElement>('.awesomplete > input').forEach(placeTypeAheadList);

    // The calendar keeps the coordinates it computed when it opened; move it with its input.
    body.querySelectorAll<HTMLElement>(OPEN_DATEPICKER).forEach((picker) => {
      picker.style.top = `${Number.parseFloat(picker.style.top || '0') - delta}px`;
    });
  });
}
