import { describe, it, expect, vi } from 'vitest';
import { SchedulePageStore } from '../engine/schedulePageStore';
import type { SchedulePageConfig, CatalogMatchUpItem, ScheduleDate } from '../types';

const DATE_DAY1 = '2026-06-15';
const DATE_DAY2 = '2026-06-16';

const matchUpCatalog: CatalogMatchUpItem[] = [
  {
    matchUpId: 'M1',
    eventId: 'E1',
    eventName: 'Boys U16',
    drawId: 'D1',
    drawName: 'Main',
    structureId: 'S1',
    roundNumber: 1,
    roundName: 'R32',
    isScheduled: false,
    sides: [{ participantName: 'Alice' }, { participantName: 'Bob' }]
  },
  {
    matchUpId: 'M2',
    eventId: 'E1',
    eventName: 'Boys U16',
    drawId: 'D1',
    drawName: 'Main',
    structureId: 'S1',
    roundNumber: 2,
    roundName: 'R16',
    isScheduled: true,
    scheduledTime: '10:00',
    scheduledCourtName: 'Court 1',
    sides: [{ participantName: 'Charlie' }, { participantName: 'David' }]
  }
];

const scheduleDates: ScheduleDate[] = [
  { date: DATE_DAY1, isActive: true, matchUpCount: 10 },
  { date: DATE_DAY2, isActive: true, matchUpCount: 8 },
  { date: '2026-06-17', isActive: false }
];

function makeConfig(overrides: Partial<SchedulePageConfig> = {}): SchedulePageConfig {
  return { matchUpCatalog, scheduleDates, ...overrides };
}

describe('SchedulePageStore', () => {
  describe('initialization', () => {
    it('initializes with default state', () => {
      const store = new SchedulePageStore(makeConfig());
      const state = store.getState();
      expect(state.matchUpCatalog).toEqual(matchUpCatalog);
      expect(state.scheduleDates).toEqual(scheduleDates);
      expect(state.selectedDate).toBe(DATE_DAY1);
      expect(state.selectedMatchUp).toBeNull();
      expect(state.catalogSearchQuery).toBe('');
      expect(state.catalogGroupBy).toBe('event');
      expect(state.scheduledBehavior).toBe('dim');
      expect(state.leftCollapsed).toBe(false);
      expect(state.issues).toEqual([]);
    });

    it('uses custom scheduledBehavior', () => {
      const store = new SchedulePageStore(makeConfig({ scheduledBehavior: 'hide' }));
      expect(store.getState().scheduledBehavior).toBe('hide');
    });

    it('handles empty dates', () => {
      const store = new SchedulePageStore(makeConfig({ scheduleDates: [] }));
      expect(store.getState().selectedDate).toBeNull();
    });
  });

  describe('selectDate', () => {
    it('updates selected date', () => {
      const store = new SchedulePageStore(makeConfig());
      store.selectDate(DATE_DAY2);
      expect(store.getState().selectedDate).toBe(DATE_DAY2);
    });

    it('calls onDateSelected callback', () => {
      const onDateSelected = vi.fn();
      const store = new SchedulePageStore(makeConfig({ onDateSelected }));
      store.selectDate(DATE_DAY2);
      expect(onDateSelected).toHaveBeenCalledWith(DATE_DAY2);
    });

    it('does not emit when selecting same date', () => {
      const store = new SchedulePageStore(makeConfig());
      const listener = vi.fn();
      store.subscribe(listener);
      store.selectDate(DATE_DAY1);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('selectMatchUp', () => {
    it('sets selected matchUp', () => {
      const store = new SchedulePageStore(makeConfig());
      store.selectMatchUp(matchUpCatalog[0]);
      expect(store.getState().selectedMatchUp).toEqual(matchUpCatalog[0]);
    });

    it('clears selection with null', () => {
      const store = new SchedulePageStore(makeConfig());
      store.selectMatchUp(matchUpCatalog[0]);
      store.selectMatchUp(null);
      expect(store.getState().selectedMatchUp).toBeNull();
    });

    it('calls onMatchUpSelected callback', () => {
      const onMatchUpSelected = vi.fn();
      const store = new SchedulePageStore(makeConfig({ onMatchUpSelected }));
      store.selectMatchUp(matchUpCatalog[0]);
      expect(onMatchUpSelected).toHaveBeenCalledWith(matchUpCatalog[0]);
    });
  });

  describe('catalog controls', () => {
    it('updates search query', () => {
      const store = new SchedulePageStore(makeConfig());
      store.setCatalogSearch('boys');
      expect(store.getState().catalogSearchQuery).toBe('boys');
    });

    it('updates groupBy', () => {
      const store = new SchedulePageStore(makeConfig());
      store.setCatalogGroupBy('draw');
      expect(store.getState().catalogGroupBy).toBe('draw');
    });
  });

  describe('toggleLeftPanel', () => {
    it('toggles left panel collapse state', () => {
      const store = new SchedulePageStore(makeConfig());
      expect(store.getState().leftCollapsed).toBe(false);
      store.toggleLeftPanel();
      expect(store.getState().leftCollapsed).toBe(true);
      store.toggleLeftPanel();
      expect(store.getState().leftCollapsed).toBe(false);
    });
  });

  describe('consumer data push', () => {
    it('updates matchUp catalog', () => {
      const store = new SchedulePageStore(makeConfig());
      const newCatalog = [matchUpCatalog[0]];
      store.setMatchUpCatalog(newCatalog);
      expect(store.getState().matchUpCatalog).toEqual(newCatalog);
    });

    it('clears selection if matchUp removed from catalog', () => {
      const store = new SchedulePageStore(makeConfig());
      store.selectMatchUp(matchUpCatalog[1]);
      store.setMatchUpCatalog([matchUpCatalog[0]]);
      expect(store.getState().selectedMatchUp).toBeNull();
    });

    it('keeps selection if matchUp still in catalog', () => {
      const store = new SchedulePageStore(makeConfig());
      store.selectMatchUp(matchUpCatalog[0]);
      store.setMatchUpCatalog(matchUpCatalog);
      expect(store.getState().selectedMatchUp).toEqual(matchUpCatalog[0]);
    });

    it('updates schedule dates', () => {
      const store = new SchedulePageStore(makeConfig());
      const newDates: ScheduleDate[] = [{ date: '2026-07-01', isActive: true }];
      store.setScheduleDates(newDates);
      expect(store.getState().scheduleDates).toEqual(newDates);
    });

    it('updates issues', () => {
      const store = new SchedulePageStore(makeConfig());
      const issues = [{ severity: 'WARN' as const, message: 'Back-to-back matchUps' }];
      store.setIssues(issues);
      expect(store.getState().issues).toEqual(issues);
    });
  });

  describe('scheduling mode — immediate', () => {
    it('defaults to immediate mode', () => {
      const store = new SchedulePageStore(makeConfig());
      expect(store.getState().schedulingMode).toBe('immediate');
    });

    it('fires onMatchUpDrop immediately', () => {
      const onMatchUpDrop = vi.fn();
      const store = new SchedulePageStore(makeConfig({ onMatchUpDrop }));
      const payload = { type: 'CATALOG_MATCHUP' as const, matchUp: matchUpCatalog[0] };
      const fakeEvent = new Event('drop') as DragEvent;
      store.handleMatchUpDrop(payload, fakeEvent);
      expect(onMatchUpDrop).toHaveBeenCalledWith(payload, fakeEvent);
      expect(store.getState().pendingActions).toEqual([]);
      expect(store.getState().hasUnsavedChanges).toBe(false);
    });

    it('fires onMatchUpRemove immediately', () => {
      const onMatchUpRemove = vi.fn();
      const store = new SchedulePageStore(makeConfig({ onMatchUpRemove }));
      store.handleMatchUpRemove('M1');
      expect(onMatchUpRemove).toHaveBeenCalledWith('M1');
      expect(store.getState().pendingActions).toEqual([]);
    });
  });

  describe('scheduling mode — bulk', () => {
    it('queues schedule actions', () => {
      const onMatchUpDrop = vi.fn();
      const store = new SchedulePageStore(makeConfig({ schedulingMode: 'bulk', onMatchUpDrop }));
      const payload = { type: 'CATALOG_MATCHUP' as const, matchUp: matchUpCatalog[0] };
      const fakeEvent = new Event('drop') as DragEvent;
      store.handleMatchUpDrop(payload, fakeEvent);

      expect(onMatchUpDrop).not.toHaveBeenCalled();
      expect(store.getState().pendingActions).toHaveLength(1);
      expect(store.getState().pendingActions[0]).toMatchObject({
        kind: 'schedule',
        matchUpId: 'M1'
      });
      expect(store.getState().hasUnsavedChanges).toBe(true);
    });

    it('queues unschedule actions', () => {
      const store = new SchedulePageStore(makeConfig({ schedulingMode: 'bulk' }));
      store.handleMatchUpRemove('M2');

      expect(store.getState().pendingActions).toHaveLength(1);
      expect(store.getState().pendingActions[0]).toEqual({
        kind: 'unschedule',
        matchUpId: 'M2'
      });
      expect(store.getState().hasUnsavedChanges).toBe(true);
    });

    it('cancels pending schedule when removing same matchUp', () => {
      const store = new SchedulePageStore(makeConfig({ schedulingMode: 'bulk' }));
      const payload = { type: 'CATALOG_MATCHUP' as const, matchUp: matchUpCatalog[0] };
      store.handleMatchUpDrop(payload, new Event('drop') as DragEvent);
      expect(store.getState().pendingActions).toHaveLength(1);

      store.handleMatchUpRemove('M1');
      expect(store.getState().pendingActions).toHaveLength(0);
      expect(store.getState().hasUnsavedChanges).toBe(false);
    });

    it('save() flushes pending actions via onBulkSave', () => {
      const onBulkSave = vi.fn();
      const store = new SchedulePageStore(makeConfig({ schedulingMode: 'bulk', onBulkSave }));
      const payload = { type: 'CATALOG_MATCHUP' as const, matchUp: matchUpCatalog[0] };
      store.handleMatchUpDrop(payload, new Event('drop') as DragEvent);
      store.handleMatchUpRemove('M2');

      const flushed = store.save();
      expect(flushed).toHaveLength(2);
      expect(onBulkSave).toHaveBeenCalledWith(flushed);
      expect(store.getState().pendingActions).toEqual([]);
      expect(store.getState().hasUnsavedChanges).toBe(false);
    });

    it('save() returns empty array when nothing pending', () => {
      const onBulkSave = vi.fn();
      const store = new SchedulePageStore(makeConfig({ schedulingMode: 'bulk', onBulkSave }));
      const flushed = store.save();
      expect(flushed).toEqual([]);
      expect(onBulkSave).not.toHaveBeenCalled();
    });

    it('discardPending() clears queue without saving', () => {
      const onBulkSave = vi.fn();
      const store = new SchedulePageStore(makeConfig({ schedulingMode: 'bulk', onBulkSave }));
      const payload = { type: 'CATALOG_MATCHUP' as const, matchUp: matchUpCatalog[0] };
      store.handleMatchUpDrop(payload, new Event('drop') as DragEvent);

      store.discardPending();
      expect(store.getState().pendingActions).toEqual([]);
      expect(store.getState().hasUnsavedChanges).toBe(false);
      expect(onBulkSave).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on state change', () => {
      const store = new SchedulePageStore(makeConfig());
      const listener = vi.fn();
      store.subscribe(listener);
      store.selectDate(DATE_DAY2);
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].selectedDate).toBe(DATE_DAY2);
    });

    it('returns unsubscribe function', () => {
      const store = new SchedulePageStore(makeConfig());
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      unsub();
      store.selectDate(DATE_DAY2);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
