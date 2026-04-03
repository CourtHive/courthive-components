import { describe, it, expect, vi } from 'vitest';
import { PolicyCatalogStore } from '../engine/policyCatalogStore';
import type { PolicyCatalogConfig, PolicyCatalogItem } from '../types';

const builtinPolicies: PolicyCatalogItem[] = [
  {
    id: 'b1',
    name: 'Default Scheduling',
    policyType: 'scheduling',
    source: 'builtin',
    description: 'Default',
    policyData: { averageTimes: 90 }
  },
  {
    id: 'b2',
    name: 'Default Scoring',
    policyType: 'scoring',
    source: 'builtin',
    description: 'Default',
    policyData: { rules: true }
  }
];

const userPolicies: PolicyCatalogItem[] = [
  {
    id: 'u1',
    name: 'My Scheduling',
    policyType: 'scheduling',
    source: 'user',
    description: 'Custom',
    policyData: { averageTimes: 60 }
  }
];

function makeConfig(overrides: Partial<PolicyCatalogConfig> = {}): PolicyCatalogConfig {
  return { builtinPolicies, userPolicies, ...overrides };
}

describe('PolicyCatalogStore', () => {
  describe('initialization', () => {
    it('merges builtin and user policies', () => {
      const store = new PolicyCatalogStore(makeConfig());
      expect(store.getState().catalog).toHaveLength(3);
    });

    it('starts with no selection', () => {
      const store = new PolicyCatalogStore(makeConfig());
      expect(store.getState().selectedId).toBeNull();
      expect(store.getState().editorDraft).toBeNull();
    });

    it('starts clean', () => {
      const store = new PolicyCatalogStore(makeConfig());
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('search and group', () => {
    it('sets search query', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.setCatalogSearch('scheduling');
      expect(store.getState().searchQuery).toBe('scheduling');
    });

    it('sets group by mode', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.setCatalogGroupBy('source');
      expect(store.getState().groupBy).toBe('source');
    });
  });

  describe('selection', () => {
    it('selects a policy and loads draft', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('b1');
      const state = store.getState();
      expect(state.selectedId).toBe('b1');
      expect(state.editorDraft).toEqual({ averageTimes: 90 });
      expect(state.dirty).toBe(false);
    });

    it('clears selection', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('b1');
      store.clearSelection();
      expect(store.getState().selectedId).toBeNull();
      expect(store.getState().editorDraft).toBeNull();
    });

    it('fires onSelectionChanged callback', () => {
      const cb = vi.fn();
      const store = new PolicyCatalogStore(makeConfig({ onSelectionChanged: cb }));
      store.selectPolicy('b1');
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
      store.clearSelection();
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('ignores selecting non-existent policy', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('nonexistent');
      expect(store.getState().selectedId).toBeNull();
    });
  });

  describe('editor draft', () => {
    it('marks dirty when draft is updated', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('b1');
      store.updateEditorDraft({ averageTimes: 120 });
      expect(store.getState().dirty).toBe(true);
      expect(store.getState().editorDraft).toEqual({ averageTimes: 120 });
    });

    it('resets draft to original', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('b1');
      store.updateEditorDraft({ averageTimes: 120 });
      store.resetDraft();
      expect(store.getState().editorDraft).toEqual({ averageTimes: 90 });
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('save', () => {
    it('saves draft to catalog and fires callback', () => {
      const onSaved = vi.fn();
      const store = new PolicyCatalogStore(makeConfig({ onPolicySaved: onSaved }));
      store.selectPolicy('b1');
      store.updateEditorDraft({ averageTimes: 120 });
      store.savePolicy();

      expect(store.getState().dirty).toBe(false);
      const saved = store.getState().catalog.find((p) => p.id === 'b1');
      expect(saved!.policyData).toEqual({ averageTimes: 120 });
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    });
  });

  describe('apply', () => {
    it('fires onPolicyApplied callback', () => {
      const onApplied = vi.fn();
      const store = new PolicyCatalogStore(makeConfig({ onPolicyApplied: onApplied }));
      store.selectPolicy('b1');
      store.applyPolicy();
      expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    });
  });

  describe('subscription', () => {
    it('notifies listeners on state change', () => {
      const store = new PolicyCatalogStore(makeConfig());
      const listener = vi.fn();
      store.subscribe(listener);
      store.setCatalogSearch('test');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'test' }));
    });

    it('unsubscribes correctly', () => {
      const store = new PolicyCatalogStore(makeConfig());
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      unsub();
      store.setCatalogSearch('test');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
