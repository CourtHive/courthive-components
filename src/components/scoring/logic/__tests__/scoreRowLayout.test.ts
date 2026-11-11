/**
 * The stacked-rows decision. What each answer looks like on screen is measured at a real desktop and
 * phone viewport in `WideFormatRowsTests.stories.ts`.
 */
import { MAX_INLINE_SCORE_COLUMNS, shouldStack } from '../scoreRowLayout';
import { describe, expect, it } from 'vitest';

describe('shouldStack', () => {
  it('keeps every conventional racquet format inline on a wide screen — up to six columns', () => {
    // Best-of-five is five games columns plus at most one transient tiebreak column.
    expect(MAX_INLINE_SCORE_COLUMNS).toBe(6);
    for (const columns of [0, 1, 3, 5, 6]) expect(shouldStack(columns, false), `${columns} columns`).toBe(false);
  });

  it('stacks once the columns outnumber what fits beside a name — nine timed bolts', () => {
    for (const columns of [7, 9, 12]) expect(shouldStack(columns, false), `${columns} columns`).toBe(true);
  });

  it('always stacks on a phone, whatever the count — CA, 2026-10-08', () => {
    for (const columns of [0, 1, 3, 6, 9]) expect(shouldStack(columns, true), `${columns} columns`).toBe(true);
  });
});
