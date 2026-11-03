import { SideNumber } from './logic/scoreEntryState';
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
export declare const ENTRY_SIDE: SideNumber;
/** The side a SHIFTED keystroke writes to — the upper row, by construction. */
export declare const SHIFTED_SIDE: SideNumber;
export declare function otherSide(sideNumber: SideNumber): SideNumber;
/**
 * The digit a key press means, or `undefined` for anything that is not a digit key.
 *
 * Both the number row and the numpad, because an operator entering scores at speed uses whichever is
 * under their hand.
 */
export declare function digitFromCode(code: string): number | undefined;
/** Whether a key event carries a modifier that means it belongs to the browser or the OS. */
export declare function hasCommandModifier(event: KeyboardEvent): boolean;
