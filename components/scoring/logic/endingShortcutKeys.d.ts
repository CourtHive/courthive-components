import { EndingIntent } from './scoreEntryModel';
import { SideNumber } from './scoreEntryState';
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
export type EndingShortcut = Extract<EndingIntent, {
    kind: 'side';
} | {
    kind: 'match';
}>;
/**
 * The ending `key` stands for, or `undefined` when it stands for none.
 *
 * `key` is `KeyboardEvent.key`, the character the operator's keyboard produced. Upper case names the
 * UPPER row, and it is read from the character rather than from `shiftKey`, so Caps Lock means the same
 * thing as Shift — the operator is looking at a capital either way.
 *
 * A letter carrying a command modifier names nothing: `Cmd+R` is a reload and `Ctrl+D` a shell EOF.
 */
export declare function endingForKey(key: string, modifiers: EndingKeyModifiers, context: EndingKeyContext): EndingShortcut | undefined;
