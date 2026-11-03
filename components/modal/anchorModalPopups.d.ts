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
export declare function anchorModalPopups(body: HTMLElement): void;
