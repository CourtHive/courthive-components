/**
 * Which ending a letter names: the card's shortcut table, as a pure function of the key.
 *
 * It lived inside the card's keydown handler. The table itself is not about the browser: a key, its
 * modifiers and the side the lower-case letters write to are all it reads. What IS about the browser
 * stays in the card — which focused field may receive a shortcut (a Dynamic Sets cell may, the Free
 * Score field may not), where focus lands after the press, and whether the control the letter stands
 * for is currently offered. Those are covered by `ScoreEntryEndingShortcutTests.stories.ts`, in
 * Chromium, with real key presses.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';

import type { EndingIntent } from './scoreEntryModel';
import type { SideNumber } from './scoreEntryState';

const { RETIRED, WALKOVER, DEFAULTED, IN_PROGRESS, CANCELLED, AWAITING_RESULT, SUSPENDED } = matchUpStatusConstants;

/**
 * One letter per side ending, and the CASE names the row.
 *
 * CA, 2026-09-28: *"in all scoring modes 'w' should be a WALKOVER to the lower participant and 'W'
 * should be a WALKOVER to the upper participant; same for 'r/R' and 'd/D' => pressing these keys
 * toggles the appropriate irregular ending pane below the appropriate participant."*
 *
 * The same three endings the row panels offer, so the keyboard cannot reach an ending the pointer
 * cannot — the letters are a shortcut to the existing control, never a second way to record an
 * outcome. Case rather than a modifier because it needs no second key: lower case is the lower row,
 * which is the same mnemonic as the digits.
 */
const SIDE_ENDING_KEYS: Record<string, string> = {
  w: WALKOVER,
  r: RETIRED,
  d: DEFAULTED
};

/**
 * One letter per match-level ending that names no side, and here the case means nothing.
 *
 * CA, 2026-10-15: *"we can extend that behavior to statuses which don't have a side such that 'i', 'I'
 * behave as if (In Progress) was clicked, 'c', 'C' as if (Cancelled), 'a', 'A' as if (Awaiting Result),
 * 's', 'S' (Suspended). We will leave 'Abandoned' and 'Incomplete' without shortcut keys"*.
 */
const MATCH_ENDING_KEYS: Record<string, string> = {
  i: IN_PROGRESS,
  c: CANCELLED,
  a: AWAITING_RESULT,
  s: SUSPENDED
};

/** The modifiers a key event carries. Only the command modifiers matter; Shift is read from the character. */
export type EndingKeyModifiers = {
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
};

export type EndingKeyContext = {
  /** The side a lower-case letter writes to; upper case names the other one. */
  entrySide: SideNumber;
};

export type EndingShortcut = Extract<EndingIntent, { kind: 'side' } | { kind: 'match' }>;

/**
 * The ending `key` stands for, or `undefined` when it stands for none.
 *
 * `key` is `KeyboardEvent.key`, the character the operator's keyboard produced. Upper case names the
 * UPPER row, and it is read from the character rather than from `shiftKey`, so Caps Lock means the same
 * thing as Shift — the operator is looking at a capital either way.
 *
 * A letter carrying a command modifier names nothing: `Cmd+R` is a reload and `Ctrl+D` a shell EOF.
 */
export function endingForKey(
  key: string,
  modifiers: EndingKeyModifiers,
  context: EndingKeyContext
): EndingShortcut | undefined {
  if (modifiers.metaKey || modifiers.ctrlKey || modifiers.altKey) return undefined;
  if (key.length !== 1) return undefined;

  const letter = key.toLowerCase();
  const matchStatus = MATCH_ENDING_KEYS[letter];
  if (matchStatus) return { kind: 'match', status: matchStatus };

  const status = SIDE_ENDING_KEYS[letter];
  if (!status) return undefined;

  const upperSide: SideNumber = context.entrySide === 1 ? 2 : 1;
  const sideNumber = key === key.toUpperCase() ? upperSide : context.entrySide;
  return { kind: 'side', sideNumber, status };
}
