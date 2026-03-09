import type { SchedulingEditorConfig, SchedulingPolicyData } from '../types';
import { SchedulingEditorStore } from '../schedulingEditorStore';
import { describe, it, expect, vi } from 'vitest';

const samplePolicy: SchedulingPolicyData = {
  allowModificationWhenMatchUpsScheduled: { courts: false, venues: false },
  defaultTimes: {
    averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
    recoveryTimes: [{ minutes: { default: 60, DOUBLES: 30 } }]
  },
  defaultDailyLimits: { SINGLES: 2, DOUBLES: 2, total: 3 },
  matchUpAverageTimes: [
    {
      matchUpFormatCodes: ['SET3-S:6/TB7'],
      averageTimes: [
        { categoryNames: [], minutes: { default: 90 } },
        { categoryTypes: ['WHEELCHAIR'], minutes: { default: 120 } }
      ]
    }
  ],
  matchUpRecoveryTimes: [],
  matchUpDailyLimits: []
};

function makeConfig(overrides: Partial<SchedulingEditorConfig> = {}): SchedulingEditorConfig {
  return { initialPolicy: samplePolicy, ...overrides };
}

describe('SchedulingEditorStore', () => {
  describe('initialization', () => {
    it('loads initial policy', () => {
      const store = new SchedulingEditorStore(makeConfig());
      const data = store.getData();
      expect(data.defaultDailyLimits?.SINGLES).toBe(2);
      expect(data.matchUpAverageTimes).toHaveLength(1);
    });

    it('starts clean', () => {
      const store = new SchedulingEditorStore(makeConfig());
      expect(store.getState().dirty).toBe(false);
    });

    it('starts with all sections expanded', () => {
      const store = new SchedulingEditorStore(makeConfig());
      const expanded = store.getState().expandedSections;
      expect(expanded.has('modificationFlags')).toBe(true);
      expect(expanded.has('dailyLimits')).toBe(true);
      expect(expanded.has('defaultTimes')).toBe(true);
      expect(expanded.has('averageTimes')).toBe(true);
      expect(expanded.has('recoveryTimes')).toBe(true);
    });
  });

  describe('section toggle', () => {
    it('collapses an expanded section', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.toggleSection('dailyLimits');
      expect(store.getState().expandedSections.has('dailyLimits')).toBe(false);
    });

    it('expands a collapsed section', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.toggleSection('dailyLimits');
      store.toggleSection('dailyLimits');
      expect(store.getState().expandedSections.has('dailyLimits')).toBe(true);
    });
  });

  describe('modification flags', () => {
    it('sets courts flag', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setModificationFlag('courts', true);
      expect(store.getData().allowModificationWhenMatchUpsScheduled?.courts).toBe(true);
      expect(store.getState().dirty).toBe(true);
    });
  });

  describe('daily limits', () => {
    it('sets singles limit', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setDailyLimit('SINGLES', 5);
      expect(store.getData().defaultDailyLimits?.SINGLES).toBe(5);
    });

    it('sets total limit', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setDailyLimit('total', 8);
      expect(store.getData().defaultDailyLimits?.total).toBe(8);
    });
  });

  describe('default times', () => {
    it('sets default average time', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setDefaultAverageTime(0, 'default', 75);
      expect(store.getData().defaultTimes?.averageTimes?.[0].minutes.default).toBe(75);
    });

    it('sets doubles average override', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setDefaultAverageTime(0, 'DOUBLES', 60);
      expect(store.getData().defaultTimes?.averageTimes?.[0].minutes.DOUBLES).toBe(60);
    });

    it('clears doubles override when undefined', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setDefaultAverageTime(0, 'DOUBLES', 60);
      store.setDefaultAverageTime(0, 'DOUBLES', undefined);
      expect(store.getData().defaultTimes?.averageTimes?.[0].minutes.DOUBLES).toBeUndefined();
    });
  });

  describe('average format groups', () => {
    it('adds a format group', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.addAverageFormatGroup();
      expect(store.getData().matchUpAverageTimes).toHaveLength(2);
    });

    it('removes a format group', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.removeAverageFormatGroup(0);
      expect(store.getData().matchUpAverageTimes).toHaveLength(0);
    });

    it('sets format codes', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setAverageFormatCodes(0, ['SET1-S:6/TB7', 'SET1-S:8/TB7']);
      expect(store.getData().matchUpAverageTimes?.[0].matchUpFormatCodes).toEqual(['SET1-S:6/TB7', 'SET1-S:8/TB7']);
    });

    it('sets average time for override', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setAverageTime(0, 0, 'default', 75);
      expect(store.getData().matchUpAverageTimes?.[0].averageTimes[0].minutes.default).toBe(75);
    });

    it('adds a category override', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.addAverageCategoryOverride(0);
      expect(store.getData().matchUpAverageTimes?.[0].averageTimes).toHaveLength(3);
    });

    it('removes a category override', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.removeAverageCategoryOverride(0, 1);
      expect(store.getData().matchUpAverageTimes?.[0].averageTimes).toHaveLength(1);
    });
  });

  describe('recovery format groups', () => {
    it('adds a recovery format group', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.addRecoveryFormatGroup();
      expect(store.getData().matchUpRecoveryTimes).toHaveLength(1);
    });

    it('removes a recovery format group', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.addRecoveryFormatGroup();
      store.removeRecoveryFormatGroup(0);
      expect(store.getData().matchUpRecoveryTimes).toHaveLength(0);
    });
  });

  describe('bulk operations', () => {
    it('setData replaces entire draft', () => {
      const store = new SchedulingEditorStore(makeConfig());
      store.setDailyLimit('SINGLES', 10);
      expect(store.getState().dirty).toBe(true);

      const newPolicy: SchedulingPolicyData = {
        defaultDailyLimits: { SINGLES: 1, DOUBLES: 1, total: 2 }
      };
      store.setData(newPolicy);
      expect(store.getData().defaultDailyLimits?.SINGLES).toBe(1);
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('onChange callback', () => {
    it('fires onChange on mutations', () => {
      const onChange = vi.fn();
      const store = new SchedulingEditorStore(makeConfig({ onChange }));
      store.setDailyLimit('SINGLES', 5);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultDailyLimits: expect.objectContaining({ SINGLES: 5 })
        })
      );
    });
  });

  describe('subscription', () => {
    it('notifies listeners', () => {
      const store = new SchedulingEditorStore(makeConfig());
      const listener = vi.fn();
      store.subscribe(listener);
      store.setDailyLimit('total', 5);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes correctly', () => {
      const store = new SchedulingEditorStore(makeConfig());
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      unsub();
      store.setDailyLimit('total', 5);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
