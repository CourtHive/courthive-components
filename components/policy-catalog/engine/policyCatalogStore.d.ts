import { PolicyCatalogState, PolicyCatalogChangeListener, PolicyCatalogConfig, PolicyCatalogItem, CatalogGroupBy } from '../types';
export declare class PolicyCatalogStore {
    private state;
    private readonly listeners;
    private readonly config;
    constructor(config: PolicyCatalogConfig);
    getState(): PolicyCatalogState;
    getSelectedItem(): PolicyCatalogItem | null;
    setCatalogSearch(query: string): void;
    setCatalogGroupBy(mode: CatalogGroupBy): void;
    selectPolicy(id: string): void;
    clearSelection(): void;
    renamePolicy(name: string): void;
    updateEditorDraft(data: Record<string, unknown>): void;
    markDirty(): void;
    markClean(): void;
    savePolicy(): void;
    resetDraft(): void;
    applyPolicy(): void;
    addNewPolicy(policyType: string): string;
    duplicatePolicy(sourceId: string): string | null;
    /**
     * Swap a placeholder id (returned from addNewPolicy/duplicatePolicy) for a
     * canonical id assigned by the persistence backend. Idempotent and a no-op
     * when the placeholder is gone (e.g. user deleted before reconciliation).
     */
    reconcilePolicyId(localId: string, serverId: string): void;
    deletePolicy(id: string): void;
    subscribe(listener: PolicyCatalogChangeListener): () => void;
    private setState;
    private emit;
    private localIdCounter;
    private nextLocalId;
    private appendAndSelect;
    private runCreateAndReconcile;
}
