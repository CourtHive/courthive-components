/**
 * The notes toolbar's recent-colours list: newest first, no repeats, at most eight. Pure, so the list rules
 * run in node; `notesToolbar.ts` reads and writes it through localStorage under `RECENT_COLORS_KEY`.
 */
export declare const RECENT_COLORS_KEY = "notes-toolbar-recent-colors";
export declare const MAX_RECENT_COLORS = 8;
/** The stored list, or none when it is missing, unparsable or not a list of strings. */
export declare function parseRecentColors(stored: string | null): string[];
/** `color` moved (or added) to the front, the rest kept in order, capped. */
export declare function pushRecentColor(recent: readonly string[], color: string, max?: number): string[];
