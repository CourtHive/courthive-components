/**
 * Policy Catalog — Type Definitions
 */

// ============================================================================
// Policy Type Metadata
// ============================================================================

export type PolicyTypeGroup =
  | 'Tournament Operations'
  | 'Scoring & Results'
  | 'Ranking Points'
  | 'Draw Configuration'
  | 'Participants'
  | 'Display & Audit';

export interface PolicyTypeMeta {
  policyType: string;
  label: string;
  description: string;
  group: PolicyTypeGroup;
  hasEditor: boolean;
}

// ============================================================================
// Catalog Items
// ============================================================================

export type PolicySource = 'builtin' | 'user';

export interface PolicyCatalogItem {
  id: string;
  name: string;
  policyType: string;
  source: PolicySource;
  description: string;
  policyData: Record<string, unknown>;
}

// ============================================================================
// Catalog State
// ============================================================================

export type CatalogGroupBy = 'type' | 'source';

export interface PolicyCatalogState {
  catalog: PolicyCatalogItem[];
  searchQuery: string;
  groupBy: CatalogGroupBy;
  selectedId: string | null;
  editorDraft: Record<string, unknown> | null;
  /**
   * Live name buffer for the selected policy. Populated on selection from the
   * catalog item and mutated by the rename input so renames survive across
   * editor remounts. `savePolicy` writes this back to the catalog item.
   */
  editedName: string | null;
  dirty: boolean;
}

export type PolicyCatalogChangeListener = (state: PolicyCatalogState) => void;

// ============================================================================
// Editor Plugin Interface
// ============================================================================

export interface PolicyEditorInstance {
  element: HTMLElement;
  setData(data: Record<string, unknown>): void;
  getData(): Record<string, unknown>;
  destroy(): void;
}

export interface PolicyEditorPlugin {
  policyType: string;
  create(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
  }): PolicyEditorInstance;
}

// ============================================================================
// Config
// ============================================================================

export interface PolicyCatalogConfig {
  builtinPolicies?: PolicyCatalogItem[];
  userPolicies?: PolicyCatalogItem[];
  editorPlugins?: PolicyEditorPlugin[];
  onPolicySaved?: (item: PolicyCatalogItem) => void;
  onPolicyApplied?: (item: PolicyCatalogItem) => void;
  /**
   * Fired when "+" creates a new policy. If the host persists the new policy
   * to a backend that mints its own canonical id, return that id (sync or
   * Promise) — the store will reconcile the local placeholder id so subsequent
   * Save calls hit the right backend record. Return void to keep the local id.
   */
  onPolicyCreated?: (item: PolicyCatalogItem) => string | void | Promise<string | void>;
  onPolicyDeleted?: (id: string) => void;
  onSelectionChanged?: (item: PolicyCatalogItem | null) => void;
}

// ============================================================================
// UI Panel
// ============================================================================

export interface UIPanel<S> {
  element: HTMLElement;
  update(state: S): void;
}
