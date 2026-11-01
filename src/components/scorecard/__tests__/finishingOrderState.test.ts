import { createFinishingOrderState, playedToResult, type FinishingOrderLine } from '../finishingOrderState';
import { describe, expect, it } from 'vitest';

const played = { sets: [{ side1Score: 6, side2Score: 2 }] };
const line = (id: string, matchUpStatus: string, orderOfFinish?: number): FinishingOrderLine => ({
  ...(orderOfFinish !== undefined && { orderOfFinish }),
  ...(matchUpStatus === 'COMPLETED' && { score: played }),
  collectionPosition: Number(id.replace(/\D/g, '')),
  matchUpStatus,
  matchUpId: id
});

describe('finishing order state', () => {
  it('only lines played to a result are in the order', () => {
    expect(playedToResult(line('s1', 'COMPLETED'))).toBe(true);
    expect(playedToResult({ matchUpId: 'x', matchUpStatus: 'DEFAULTED', score: played })).toBe(true);
    expect(playedToResult({ matchUpId: 'x', matchUpStatus: 'DEFAULTED' })).toBe(false);
    ['WALKOVER', 'DEAD_RUBBER', 'ABANDONED', 'TO_BE_PLAYED'].forEach((status) =>
      expect(playedToResult(line('s1', status))).toBe(false)
    );

    const state = createFinishingOrderState([
      line('s1', 'COMPLETED', 1),
      line('s2', 'WALKOVER'),
      line('s3', 'TO_BE_PLAYED')
    ]);
    expect(state.order()).toEqual(['s1']);
    expect(state.isEditable('s2')).toBe(false);
    expect(state.valueOf('s3')).toBeUndefined();
  });

  it('starts from the stored numbers; a played line without one joins the end', () => {
    const state = createFinishingOrderState([
      line('s1', 'COMPLETED', 2),
      line('s2', 'COMPLETED'),
      line('s3', 'COMPLETED', 1)
    ]);
    expect(state.order()).toEqual(['s3', 's1', 's2']);
    expect(state.changes()).toEqual([{ matchUpId: 's2', orderOfFinish: 3 }]);
  });

  it('entering 1 on the second line makes the first 2', () => {
    const state = createFinishingOrderState([
      line('s1', 'COMPLETED', 1),
      line('s2', 'COMPLETED', 2),
      line('s3', 'COMPLETED', 3)
    ]);
    state.setValue('s2', 1);
    expect(state.toFinishingOrder()).toEqual([
      { matchUpId: 's2', orderOfFinish: 1 },
      { matchUpId: 's1', orderOfFinish: 2 },
      { matchUpId: 's3', orderOfFinish: 3 }
    ]);
    expect(state.changes()).toEqual([
      { matchUpId: 's2', orderOfFinish: 1 },
      { matchUpId: 's1', orderOfFinish: 2 }
    ]);
    expect(state.isDirty()).toBe(true);
  });

  it('moving a line later shifts the ones between up; out-of-range values clamp; bad values change nothing', () => {
    const state = createFinishingOrderState([
      line('s1', 'COMPLETED', 1),
      line('s2', 'COMPLETED', 2),
      line('s3', 'COMPLETED', 3)
    ]);
    state.setValue('s1', 3);
    expect(state.order()).toEqual(['s2', 's3', 's1']);
    state.setValue('s1', 0);
    expect(state.order()).toEqual(['s1', 's2', 's3']);
    state.setValue('s3', 99);
    expect(state.order()).toEqual(['s1', 's2', 's3']);
    state.setValue('s2', Number.NaN);
    state.setValue('s2', 1.5);
    expect(state.order()).toEqual(['s1', 's2', 's3']);
  });

  it('every state is saveable: numbers run 1..n, each once', () => {
    const state = createFinishingOrderState([
      line('s1', 'COMPLETED', 1),
      line('s2', 'COMPLETED', 2),
      line('s3', 'COMPLETED', 3)
    ]);
    [
      ['s3', 1],
      ['s1', 3],
      ['s2', 2],
      ['s2', 1]
    ].forEach(([id, value]) => {
      state.setValue(id as string, value as number);
      const numbers = state.toFinishingOrder().map(({ orderOfFinish }) => orderOfFinish);
      expect([...numbers].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });
  });

  it('reset restores the stored order', () => {
    const state = createFinishingOrderState([line('s1', 'COMPLETED', 1), line('s2', 'COMPLETED', 2)]);
    state.setValue('s2', 1);
    state.reset();
    expect(state.order()).toEqual(['s1', 's2']);
    expect(state.isDirty()).toBe(false);
  });

  it('a commit makes the current order the saved one: nothing is dirty, and reset returns to it', () => {
    const state = createFinishingOrderState([
      line('s1', 'COMPLETED', 1),
      line('s2', 'COMPLETED', 2),
      line('s3', 'COMPLETED', 3)
    ]);
    state.setValue('s3', 1);
    expect(state.isDirty()).toBe(true);
    expect(state.changes()).toHaveLength(3);

    state.commit();
    expect(state.isDirty()).toBe(false);
    expect(state.changes()).toEqual([]);
    expect(state.order()).toEqual(['s3', 's1', 's2']);

    state.setValue('s2', 1);
    expect(state.changes()).toEqual([
      { matchUpId: 's2', orderOfFinish: 1 },
      { matchUpId: 's3', orderOfFinish: 2 },
      { matchUpId: 's1', orderOfFinish: 3 }
    ]);
    state.reset();
    expect(state.order()).toEqual(['s3', 's1', 's2']);
  });
});
