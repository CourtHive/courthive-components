/**
 * A modal opens with focus on the first thing in its body that can be modified or selected, so a dialog
 * that asks for one value (Select provider) can be answered by typing. The footer and the header are not
 * the body: a button there is an answer to the form, not part of it.
 *
 * Runs a frame after the modal opens (content renders before the modal is in the page, when focus cannot
 * land), and leaves focus alone if it is already in the body. A form that names its own field
 * (renderForm's `focus: true`, 200ms later) moves it there afterwards, so that choice stands. Skipped:
 * - a date field: focus opens its calendar over the modal, which is not what opening a dialog asks for;
 * - read-only and disabled controls, which cannot be modified;
 * - controls not rendered (`display: none` here or above).
 */

const CONTROLS = [
  'input:not([type="hidden"]):not([disabled]):not([readonly]):not(.datepicker-input)',
  'select:not([disabled])',
  'textarea:not([disabled]):not([readonly])',
  '[contenteditable="true"]'
].join(', ');

const isRendered = (element: HTMLElement) =>
  typeof element.checkVisibility === 'function' ? element.checkVisibility() : element.getClientRects().length > 0;

export function firstControl(body: HTMLElement): HTMLElement | undefined {
  return [...body.querySelectorAll<HTMLElement>(CONTROLS)].find(isRendered);
}

export function focusFirstControl(body: HTMLElement): void {
  if (body.contains(document.activeElement)) return;
  firstControl(body)?.focus({ preventScroll: true });
}
