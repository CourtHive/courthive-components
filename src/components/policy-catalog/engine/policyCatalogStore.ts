/**
 * Policy Catalog — Observable Store
 *
 * Merges builtin + user policies, manages selection, search/group state,
 * and editor draft. Follows ProfileStore pattern.
 */

import { deepClone } from '../domain/utils';
import { getEmptyPolicyData } from '../domain/policyDefaults';
import type {
  PolicyCatalogState,
  PolicyCatalogChangeListener,
  PolicyCatalogConfig,
  PolicyCatalogItem,
  CatalogGroupBy
} from '../types';

export class PolicyCatalogStore {
  private state: PolicyCatalogState;
  private readonly listeners: Set<PolicyCatalogChangeListener> = new Set();
  private readonly config: PolicyCatalogConfig;

  constructor(config: PolicyCatalogConfig) {
    this.config = config;

    // Merge builtin + user, deduplicating by ID (builtins take precedence)
    const builtinIds = new Set((config.builtinPolicies ?? []).map((p) => p.id));
    const catalog = [
      ...(config.builtinPolicies ?? []),
      ...(config.userPolicies ?? []).filter((p) => !builtinIds.has(p.id))
    ];

    this.state = {
      catalog,
      searchQuery: '',
      groupBy: 'type',
      selectedId: null,
      editorDraft: null,
      dirty: false
    };
  }

  // ---------- Getters ----------

  getState(): PolicyCatalogState {
    return this.state;
  }

  getSelectedItem(): PolicyCatalogItem | null {
    if (!this.state.selectedId) return null;
    return this.state.catalog.find((p) => p.id === this.state.selectedId) ?? null;
  }

  // ---------- Catalog Controls ----------

  setCatalogSearch(query: string): void {
    this.setState({ searchQuery: query });
  }

  setCatalogGroupBy(mode: CatalogGroupBy): void {
    this.setState({ groupBy: mode });
  }

  // ---------- Selection ----------

  selectPolicy(id: string): void {
    if (this.state.selectedId === id) return;
    const item = this.state.catalog.find((p) => p.id === id);
    if (!item) return;

    this.setState({
      selectedId: id,
      editorDraft: deepClone(item.policyData),
      dirty: false
    });
    this.config.onSelectionChanged?.(item);
  }

  clearSelection(): void {
    if (!this.state.selectedId) return;
    this.setState({
      selectedId: null,
      editorDraft: null,
      dirty: false
    });
    this.config.onSelectionChanged?.(null);
  }

  // ---------- Editor Draft ----------

  updateEditorDraft(data: Record<string, unknown>): void {
    this.setState({ editorDraft: data, dirty: true });
  }

  markDirty(): void {
    if (!this.state.dirty) {
      this.setState({ dirty: true });
    }
  }

  markClean(): void {
    if (this.state.dirty) {
      this.setState({ dirty: false });
    }
  }

  // ---------- Save / Apply ----------

  savePolicy(): void {
    const item = this.getSelectedItem();
    if (!item || !this.state.editorDraft) return;

    const updated: PolicyCatalogItem = {
      ...item,
      policyData: deepClone(this.state.editorDraft)
    };

    // Update catalog in place
    const catalog = this.state.catalog.map((p) => (p.id === updated.id ? updated : p));
    this.state = { ...this.state, catalog, dirty: false };
    this.emit();

    this.config.onPolicySaved?.(updated);
  }

  resetDraft(): void {
    const item = this.getSelectedItem();
    if (!item) return;
    this.setState({
      editorDraft: deepClone(item.policyData),
      dirty: false
    });
  }

  applyPolicy(): void {
    const item = this.getSelectedItem();
    if (!item) return;

    const applied: PolicyCatalogItem = {
      ...item,
      policyData: this.state.editorDraft ? deepClone(this.state.editorDraft) : deepClone(item.policyData)
    };
    this.config.onPolicyApplied?.(applied);
  }

  // ---------- New / Duplicate / Delete ----------

  addNewPolicy(policyType: string): string {
    const id = `user-${policyType}-${Date.now()}`;
    const item: PolicyCatalogItem = {
      id,
      name: `New ${policyType} policy`,
      policyType,
      source: 'user',
      description: '',
      policyData: getEmptyPolicyData(policyType)
    };
    const catalog = [...this.state.catalog, item];
    this.state = {
      ...this.state,
      catalog,
      selectedId: id,
      editorDraft: deepClone(item.policyData),
      dirty: false
    };
    this.emit();
    this.config.onPolicyCreated?.(item);
    this.config.onSelectionChanged?.(item);
    return id;
  }

  duplicatePolicy(sourceId: string): string | null {
    const source = this.state.catalog.find((p) => p.id === sourceId);
    if (!source) return null;
    const id = `user-${source.policyType}-${Date.now()}`;
    const item: PolicyCatalogItem = {
      id,
      name: `${source.name} (Copy)`,
      policyType: source.policyType,
      source: 'user',
      description: source.description,
      policyData: deepClone(source.policyData)
    };
    const catalog = [...this.state.catalog, item];
    this.state = {
      ...this.state,
      catalog,
      selectedId: id,
      editorDraft: deepClone(item.policyData),
      dirty: false
    };
    this.emit();
    this.config.onPolicyCreated?.(item);
    this.config.onSelectionChanged?.(item);
    return id;
  }

  deletePolicy(id: string): void {
    const item = this.state.catalog.find((p) => p.id === id);
    if (!item || item.source === 'builtin') return;
    const catalog = this.state.catalog.filter((p) => p.id !== id);
    const wasSelected = this.state.selectedId === id;
    this.state = {
      ...this.state,
      catalog,
      ...(wasSelected ? { selectedId: null, editorDraft: null, dirty: false } : {})
    };
    this.emit();
    this.config.onPolicyDeleted?.(id);
    if (wasSelected) this.config.onSelectionChanged?.(null);
  }

  // ---------- Subscription ----------

  subscribe(listener: PolicyCatalogChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- Internal ----------

  private setState(partial: Partial<PolicyCatalogState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
