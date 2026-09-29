/**
 * The keyboard rules every score region shares.
 *
 * ── Why the digit comes from `event.code` ──
 *
 * `Shift+3` produces `#` in a text field, so by the time an `input` event arrives the digit is gone.
 * `event.code` is the physical key and survives the modifier, which is what makes "the typed number
 * goes to the OTHER side" expressible at all. The shipping `approaches/dynamicSetsApproach.ts` matches
 * on `code` for exactly this reason.
 *
 * Shared rather than copied because the Dial Pad now takes keystrokes too (CA, 2026-09-28). Two copies
 * of a keyboard rule is how the three entry approaches came to disagree about everything else.
 */

import type { SideNumber } from './logic/scoreEntryState';

/**
 * The LOWER participant's row — where entry begins, in every approach.
 *
 * CA, 2026-09-28: *"the dynamic sets when launched should always initially give focus to the lower
 * row; that way e.g. 3 is lower row and shift+3 is upper row, which feels natural ... each subsequent
 * entry column should start on the bottom cell."*
 *
 * Named rather than written as a bare `2` at each site: it is one decision, and the shifted case is
 * derived from it (`otherSide`) so the two can never be set independently and disagree.
 */
export const ENTRY_SIDE: SideNumber = 2;

/** The side a SHIFTED keystroke writes to — the upper row, by construction. */
export const SHIFTED_SIDE: SideNumber = otherSide(ENTRY_SIDE);

export function otherSide(sideNumber: SideNumber): SideNumber {
  return sideNumber === 1 ? 2 : 1;
}

/**
 * The digit a key press means, or `undefined` for anything that is not a digit key.
 *
 * Both the number row and the numpad, because an operator entering scores at speed uses whichever is
 * under their hand.
 */
export function digitFromCode(code: string): number | undefined {
  const match = /^(?:Digit|Numpad)(\d)$/.exec(code);
  return match ? Number(match[1]) : undefined;
}

/** Whether a key event carries a modifier that means it belongs to the browser or the OS. */
export function hasCommandModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}
