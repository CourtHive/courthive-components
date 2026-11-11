/**
 * The notes toolbar's recent-colours list: newest first, no repeats, at most eight. Pure, so the list rules
 * run in node; `notesToolbar.ts` reads and writes it through localStorage under `RECENT_COLORS_KEY`.
 */
export const RECENT_COLORS_KEY = 'notes-toolbar-recent-colors';
export const MAX_RECENT_COLORS = 8;

/** The stored list, or none when it is missing, unparsable or not a list of strings. */
export function parseRecentColors(stored: string | null): string[] {
  try {
    const parsed = JSON.parse(stored || '[]');
    return Array.isArray(parsed) ? parsed.filter((color) => typeof color === 'string') : [];
  } catch {
    return [];
  }
}

/** `color` moved (or added) to the front, the rest kept in order, capped. */
export function pushRecentColor(recent: readonly string[], color: string, max = MAX_RECENT_COLORS): string[] {
  return [color, ...recent.filter((c) => c !== color)].slice(0, max);
}
