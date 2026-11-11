/**
 * The recent-colours list rules, in node. The toolbar that reads and writes them through real localStorage,
 * and every button, select and popover, is asserted in Chromium by `src/stories/NotesToolbarTests.stories.ts`.
 */
import { MAX_RECENT_COLORS, parseRecentColors, pushRecentColor } from '../recentColors';
import { describe, expect, it } from 'vitest';

describe('pushRecentColor', () => {
  it('puts a new colour first', () => {
    expect(pushRecentColor(['#000000', '#ffffff'], '#ff0000')).toEqual(['#ff0000', '#000000', '#ffffff']);
  });

  it('moves a repeated colour to the front instead of listing it twice', () => {
    expect(pushRecentColor(['#000000', '#ff0000', '#ffffff'], '#ff0000')).toEqual(['#ff0000', '#000000', '#ffffff']);
  });

  it('keeps at most eight, dropping the oldest', () => {
    const full = Array.from({ length: MAX_RECENT_COLORS }, (_, i) => `#00000${i}`);
    const next = pushRecentColor(full, '#ffffff');
    expect(MAX_RECENT_COLORS).toBe(8);
    expect(next).toHaveLength(8);
    expect(next[0]).toBe('#ffffff');
    expect(next).not.toContain(full.at(-1));
  });

  it('does not modify the list it is given', () => {
    const recent = ['#000000'];
    pushRecentColor(recent, '#ffffff');
    expect(recent).toEqual(['#000000']);
  });
});

describe('parseRecentColors', () => {
  it('reads a stored list', () => {
    expect(parseRecentColors('["#ff0000","#000000"]')).toEqual(['#ff0000', '#000000']);
  });

  it('reads nothing stored, unparsable or not a list as no history', () => {
    expect(parseRecentColors(null)).toEqual([]);
    expect(parseRecentColors('not json')).toEqual([]);
    expect(parseRecentColors('{"0":"#ff0000"}')).toEqual([]);
    expect(parseRecentColors('["#ff0000", 3, null]')).toEqual(['#ff0000']);
  });
});
