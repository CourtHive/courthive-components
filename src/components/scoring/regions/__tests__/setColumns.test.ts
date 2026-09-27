/**
 * The score-column headings.
 *
 * `ordinalSetLabel` is trivial and that is exactly why it gets a test: the teens rule is the part
 * every hand-rolled ordinal gets wrong, and a wrong ordinal function is wrong forever because the next
 * caller will not check it.
 */
import { ordinalSetLabel } from '../setColumns';
import { describe, it, expect } from 'vitest';

describe('ordinalSetLabel', () => {
  it('labels the sets a match can actually have', () => {
    // CA, 2026-09-27: `1st` / `2nd` / `3rd`, replacing `SET 1` / `SET 2` / `SET 3`.
    expect([1, 2, 3, 4, 5].map(ordinalSetLabel)).toEqual(['1st', '2nd', '3rd', '4th', '5th']);
  });

  it('gets the teens right, which is where every hand-rolled ordinal goes wrong', () => {
    // No match has eleven sets. A function that is wrong for 11 is still a wrong function, and the
    // cost of being right is one comparison.
    expect([11, 12, 13].map(ordinalSetLabel)).toEqual(['11th', '12th', '13th']);
  });

  it('resumes the pattern after the teens', () => {
    expect([21, 22, 23, 24].map(ordinalSetLabel)).toEqual(['21st', '22nd', '23rd', '24th']);
    expect([111, 112, 113].map(ordinalSetLabel)).toEqual(['111th', '112th', '113th']);
  });

  it('never returns a bare number', () => {
    for (let n = 1; n <= 30; n += 1) expect(ordinalSetLabel(n)).toMatch(/^\d+(st|nd|rd|th)$/);
  });
});
