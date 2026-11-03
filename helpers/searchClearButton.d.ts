/**
 * Wraps an `<input>` in a relative-positioned container with an absolutely
 * positioned (×) clear button that shows whenever the input has a value
 * and clears it on click.
 *
 * Visual is matched to the controlBar's built-in clear icon so search
 * fields look consistent across the platform.
 *
 * Returns the wrapping element. Callers append the wrapper (not the raw
 * input) into the toolbar. When the input value is set programmatically
 * (state sync, etc.) call `syncClearVisibility(wrap)` so the button
 * toggles correctly — the `input` event fires for user typing but not
 * for direct `.value =` assignments.
 */
export declare function wrapSearchWithClear(input: HTMLInputElement, onClear: () => void): HTMLElement;
export declare function syncClearVisibility(wrap: HTMLElement): void;
