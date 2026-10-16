import { SchedulePageStore } from './schedulePageStore';
import { describe, expect, it } from 'vitest';

describe('atomic catalog refresh', () => {
  it('notifies once with the refreshed selected item and catalog together', () => {
    const first = { matchUpId: 'm1', sides: [] } as any;
    const store = new SchedulePageStore({ matchUpCatalog: [first], scheduleDates: [] });
    store.selectMatchUp(first);
    const states: any[] = [];
    store.subscribe((state) => states.push(state));
    const fresh = { ...first, isScheduled: true };
    store.setMatchUpCatalog([fresh]);
    expect(states).toHaveLength(1);
    expect(states[0].selectedMatchUp).toBe(fresh);
    expect(states[0].matchUpCatalog[0]).toBe(fresh);
  });
});
