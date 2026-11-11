import { parseDragPayload } from '../domain/dragPayload';
import { describe, expect, it } from 'vitest';

import type { SchedulePageDragPayload } from '../types';

/**
 * What the court grid slot (and the catalog) accept from a drop. The slot's header structure and a real
 * drag from a catalog card onto it are asserted in Chromium by
 * `src/stories/schedule-page/CourtGridSlotTests.stories.ts` — a synthetic `drop` event proves nothing
 * about a browser's drop, which only fires on a target whose `dragover` accepted it.
 */
describe('parseDragPayload', () => {
  it('reads a CATALOG_MATCHUP payload', () => {
    const payload: SchedulePageDragPayload = { type: 'CATALOG_MATCHUP', matchUp: { matchUpId: 'm1' } as any };
    expect(parseDragPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it('reads a GRID_MATCHUP payload with its source cell', () => {
    const payload: SchedulePageDragPayload = {
      type: 'GRID_MATCHUP',
      matchUp: { matchUpId: 'm2' } as any,
      sourceCourt: 'c1',
      sourceTime: '09:00'
    };
    expect(parseDragPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it.each([
    ['unparseable text', 'not-json'],
    ['an empty transfer', ''],
    ['no transfer at all', undefined],
    ['JSON null', 'null'],
    ['a payload of another type', JSON.stringify({ type: 'ROUND', matchUp: { matchUpId: 'm3' } })],
    ['a bare matchUp', JSON.stringify({ matchUpId: 'm4' })]
  ])('ignores %s', (_label, raw) => {
    expect(parseDragPayload(raw)).toBeUndefined();
  });
});
