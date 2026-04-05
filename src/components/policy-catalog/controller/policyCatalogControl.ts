/**
 * Policy Catalog Control — Orchestrator.
 *
 * Creates store, both panels, subscribes store → layout.update,
 * manages editor lifecycle. Follows SchedulingProfileControl pattern.
 */

import { RankingPointsEditorControl } from '../editors/ranking/rankingPointsEditorControl';
import { SchedulingEditorControl } from '../editors/scheduling/schedulingEditorControl';
import { buildPolicyCatalogLayout } from '../ui/policyCatalogLayout';
import { buildPolicyCatalogPanel } from '../ui/policyCatalogPanel';
import { PolicyCatalogStore } from '../engine/policyCatalogStore';
import { buildEditorShell } from '../ui/editorShell';
import { buildJsonEditor } from '../ui/jsonEditor';

import { POLICY_TYPE_SCHEDULING, POLICY_TYPE_RANKING_POINTS } from '../domain/policyDefaults';
import type { PolicyCatalogConfig, PolicyEditorInstance, CatalogGroupBy } from '../types';

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
      onNewPolicy: (policyType: string) => {
        this.store.addNewPolicy(policyType);
        this.mountEditorForSelection();
      },
      onDuplicatePolicy: (id: string) => {
        this.store.duplicatePolicy(id);
        this.mountEditorForSelection();
      },
      onDeletePolicy: (id: string) => {
        this.store.deletePolicy(id);
        if (!this.store.getSelectedItem()) {
          this.destroyCurrentEditor();
        }
      }
    });

    this.editorShell = buildEditorShell({
      onSave: () => this.store.savePolicy(),
      onReset: () => {
        this.store.resetDraft();
        this.syncEditorFromStore();
      },
      onApply: () => this.store.applyPolicy(),
      onDuplicate: () => {
        const selected = this.store.getSelectedItem();
        if (selected) {
          this.store.duplicatePolicy(selected.id);
          this.mountEditorForSelection();
        }
      }
    });

    this.layout = buildPolicyCatalogLayout({
      catalogPanel,
      editorShell: this.editorShell
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
      this.layout.element.remove();
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

    const isBuiltin = item.source === 'builtin';

    const editorConfig = {
      initialData: { ...item.policyData },
      onChange: (data: Record<string, unknown>) => {
        this.store.updateEditorDraft(data);
      },
      readonly: isBuiltin
    };

    if (item.policyType === POLICY_TYPE_SCHEDULING) {
      this.currentEditor = SchedulingEditorControl.createEditorInstance(editorConfig);
    } else if (item.policyType === POLICY_TYPE_RANKING_POINTS) {
      this.currentEditor = RankingPointsEditorControl.createEditorInstance(editorConfig);
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
