/**
 * Close-on-outside-click, attached after a delay.
 *
 * A popover opened by a click must not be closed by that same click, so its outside-click listener is
 * attached a little later. The delay is also the hazard: a popover closed before it elapses still
 * attaches its listener afterwards, which then closes the NEXT popover on any click (the format
 * picker's dropdowns did this) and, once the page is torn down, runs against a document that is gone
 * (the 6.4.0 and 6.4.1 publish runs failed on `document is not defined` from exactly these timers).
 *
 * The returned `cancel` covers both states at once: it clears the pending attach and removes the
 * listener if it is already attached. It is safe to call more than once.
 */
export interface OutsideClickOptions {
    /** Milliseconds before the listener is attached. */
    delay?: number;
    /** Listen in the capture phase, so an inner `stopPropagation` cannot hide the click. */
    capture?: boolean;
    /** Where to listen; the document unless given. */
    target?: EventTarget;
}
export declare function listenForOutsideClick(listener: (event: MouseEvent) => void, { delay, capture, target }?: OutsideClickOptions): () => void;
