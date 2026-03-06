/**
 * Policy Catalog Control — Orchestrator.
 *
 * Creates store, both panels, subscribes store → layout.update,
 * manages editor lifecycle. Follows SchedulingProfileControl pattern.
 */

import { PolicyCatalogStore } from '../engine/policyCatalogStore';
import { buildPolicyCatalogPanel } from '../ui/policyCatalogPanel';
import { buildEditorShell } from '../ui/editorShell';
import { buildPolicyCatalogLayout } from '../ui/policyCatalogLayout';
import { buildJsonEditor } from '../ui/jsonEditor';
import { SchedulingEditorControl } from '../editors/scheduling/schedulingEditorControl';
import { POLICY_TYPE_SCHEDULING } from '../domain/policyDefaults';
import type {
  PolicyCatalogConfig,
  PolicyEditorInstance,
  CatalogGroupBy,
} from '../types';

export class PolicyCatalogControl {
  private readonly store: PolicyCatalogStore;
  private readonly layout: { element: HTMLElement; update: (state: any) => void };
  private readonly editorShell: ReturnType<typeof buildEditorShell>;
  private readonly unsubscribe: () => void;
  private currentEditor: PolicyEditorInstance | null = null;
  private container: HTMLElement | null = null;

  constructor(config: PolicyCatalogConfig) {
    this.store = new PolicyCatalogStore(config);

    const catalogPanel = buildPolicyCatalogPanel({
      onSearchChange: (query: string) => this.store.setCatalogSearch(query),
      onGroupByChange: (mode: CatalogGroupBy) => this.store.setCatalogGroupBy(mode),
      onSelectPolicy: (id: string) => this.handleSelectPolicy(id),
    });

    this.editorShell = buildEditorShell({
      onSave: () => this.store.savePolicy(),
      onReset: () => {
        this.store.resetDraft();
        this.syncEditorFromStore();
      },
      onApply: () => this.store.applyPolicy(),
    });

    this.layout = buildPolicyCatalogLayout({
      catalogPanel,
      editorShell: this.editorShell,
    });

    this.unsubscribe = this.store.subscribe((state) => {
      this.layout.update(state);
    });

    // Initial render
    this.layout.update(this.store.getState());
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.layout.element);
  }

  destroy(): void {
    this.destroyCurrentEditor();
    this.unsubscribe();
    if (this.container && this.layout.element.parentNode === this.container) {
      this.container.removeChild(this.layout.element);
    }
    this.container = null;
  }

  getStore(): PolicyCatalogStore {
    return this.store;
  }

  // ---------- Private ----------

  private handleSelectPolicy(id: string): void {
    this.store.selectPolicy(id);
    this.mountEditorForSelection();
  }

  private mountEditorForSelection(): void {
    this.destroyCurrentEditor();

    const item = this.store.getSelectedItem();
    if (!item) return;

    const editorConfig = {
      initialData: { ...item.policyData },
      onChange: (data: Record<string, unknown>) => {
        this.store.updateEditorDraft(data);
      },
    };

    // Use scheduling editor for scheduling policies, JSON editor for everything else
    if (item.policyType === POLICY_TYPE_SCHEDULING) {
      this.currentEditor = SchedulingEditorControl.createEditorInstance(editorConfig);
    } else {
      this.currentEditor = buildJsonEditor(editorConfig);
    }

    this.editorShell.bodyElement.innerHTML = '';
    this.editorShell.bodyElement.appendChild(this.currentEditor.element);
  }

  private syncEditorFromStore(): void {
    const state = this.store.getState();
    if (this.currentEditor && state.editorDraft) {
      this.currentEditor.setData(state.editorDraft);
    }
  }

  private destroyCurrentEditor(): void {
    if (this.currentEditor) {
      this.currentEditor.destroy();
      this.currentEditor = null;
    }
    this.editorShell.bodyElement.innerHTML = '';
  }
}
