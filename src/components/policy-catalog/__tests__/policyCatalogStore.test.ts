import { describe, it, expect, vi } from 'vitest';
import { PolicyCatalogStore } from '../engine/policyCatalogStore';
import type { PolicyCatalogConfig, PolicyCatalogItem } from '../types';

// Shared fixture strings — extracted to satisfy sonarjs/no-duplicate-string.
const USER_SCHEDULING_NAME = 'My Scheduling';
const RENAMED_NAME = 'Junior 2026';
const SERVER_ID_SYNC = 'srv-abc-123';
const SERVER_ID_ASYNC = 'srv-async-id';

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
    name: USER_SCHEDULING_NAME,
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

  describe('rename', () => {
    it('initializes editedName on selection', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('u1');
      expect(store.getState().editedName).toBe(USER_SCHEDULING_NAME);
      expect(store.getState().dirty).toBe(false);
    });

    it('renamePolicy updates editedName and marks dirty for user policies', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('u1');
      store.renamePolicy('Renamed Scheduling');
      expect(store.getState().editedName).toBe('Renamed Scheduling');
      expect(store.getState().dirty).toBe(true);
    });

    it('renamePolicy is a no-op for builtin policies', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('b1');
      store.renamePolicy('Hacked Default');
      expect(store.getState().editedName).toBe('Default Scheduling');
      expect(store.getState().dirty).toBe(false);
    });

    it('savePolicy persists the renamed name and fires onPolicySaved with it', () => {
      const onSaved = vi.fn();
      const store = new PolicyCatalogStore(makeConfig({ onPolicySaved: onSaved }));
      store.selectPolicy('u1');
      store.renamePolicy(RENAMED_NAME);
      store.savePolicy();

      const saved = store.getState().catalog.find((p) => p.id === 'u1');
      expect(saved!.name).toBe(RENAMED_NAME);
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', name: RENAMED_NAME }));
    });

    it('resetDraft reverts editedName along with policyData', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.selectPolicy('u1');
      store.renamePolicy('Halfway Renamed');
      store.updateEditorDraft({ averageTimes: 30 });
      store.resetDraft();
      expect(store.getState().editedName).toBe(USER_SCHEDULING_NAME);
      expect(store.getState().editorDraft).toEqual({ averageTimes: 60 });
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('addNewPolicy + id reconciliation', () => {
    it('addNewPolicy seeds a placeholder id and selects the new item', () => {
      const store = new PolicyCatalogStore(makeConfig());
      const localId = store.addNewPolicy('scheduling');
      expect(localId).toMatch(/^user-scheduling-/);
      expect(store.getState().selectedId).toBe(localId);
      expect(store.getState().editedName).toBe('New scheduling policy');
    });

    it('reconciles to the server id when onPolicyCreated returns a string', () => {
      const onPolicyCreated = vi.fn(() => SERVER_ID_SYNC);
      const store = new PolicyCatalogStore(makeConfig({ onPolicyCreated }));
      const localId = store.addNewPolicy('scheduling');

      expect(onPolicyCreated).toHaveBeenCalled();
      expect(store.getState().catalog.find((p) => p.id === localId)).toBeUndefined();
      expect(store.getState().catalog.find((p) => p.id === SERVER_ID_SYNC)).toBeTruthy();
      expect(store.getState().selectedId).toBe(SERVER_ID_SYNC);
    });

    it('reconciles to the server id when onPolicyCreated returns a Promise<string>', async () => {
      const onPolicyCreated = vi.fn(() => Promise.resolve(SERVER_ID_ASYNC));
      const store = new PolicyCatalogStore(makeConfig({ onPolicyCreated }));
      const localId = store.addNewPolicy('scheduling');

      // Still placeholder before the promise resolves
      expect(store.getState().selectedId).toBe(localId);

      await Promise.resolve();
      await Promise.resolve();

      expect(store.getState().selectedId).toBe(SERVER_ID_ASYNC);
      expect(store.getState().catalog.find((p) => p.id === SERVER_ID_ASYNC)).toBeTruthy();
    });

    it('keeps the local id when onPolicyCreated returns void', () => {
      const onPolicyCreated = vi.fn(() => undefined);
      const store = new PolicyCatalogStore(makeConfig({ onPolicyCreated }));
      const localId = store.addNewPolicy('scheduling');
      expect(store.getState().selectedId).toBe(localId);
    });

    it('keeps the local id when the create promise rejects (no crash)', async () => {
      const onPolicyCreated = vi.fn(() => Promise.reject(new Error('boom')));
      const store = new PolicyCatalogStore(makeConfig({ onPolicyCreated }));
      const localId = store.addNewPolicy('scheduling');

      await Promise.resolve();
      await Promise.resolve();

      expect(store.getState().selectedId).toBe(localId);
    });

    it('reconcilePolicyId is idempotent and a no-op for unknown ids', () => {
      const store = new PolicyCatalogStore(makeConfig());
      store.reconcilePolicyId('does-not-exist', 'whatever');
      expect(store.getState().catalog).toHaveLength(3);

      store.reconcilePolicyId('u1', 'u1');
      expect(store.getState().catalog.find((p) => p.id === 'u1')).toBeTruthy();
    });

    it('rename then save fires onPolicySaved against the reconciled server id', () => {
      const onPolicyCreated = vi.fn(() => 'srv-final-id');
      const onSaved = vi.fn();
      const store = new PolicyCatalogStore(makeConfig({ onPolicyCreated, onPolicySaved: onSaved }));
      store.addNewPolicy('scheduling');
      store.renamePolicy('USTA L7 Scheduling');
      store.updateEditorDraft({ averageTimes: 75 });
      store.savePolicy();

      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'srv-final-id', name: 'USTA L7 Scheduling' })
      );
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
