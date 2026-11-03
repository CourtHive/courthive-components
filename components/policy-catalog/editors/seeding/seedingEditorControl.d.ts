import { SeedingEditorStore } from './seedingEditorStore';
import { SeedingPolicyDraft, SeedingPolicyData, SeedingEditorConfig } from './types';
import { PolicyEditorInstance as CatalogEditorInstance } from '../../types';
export declare class SeedingEditorControl {
    private readonly store;
    private readonly panel;
    private readonly unsubscribe;
    private container;
    constructor(config: SeedingEditorConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getData(): SeedingPolicyDraft;
    setData(data: SeedingPolicyData): void;
    getStore(): SeedingEditorStore;
    static createEditorInstance(config: {
        initialData: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
    }): CatalogEditorInstance;
}
export declare function createSeedingEditor(config: SeedingEditorConfig, container: HTMLElement): SeedingEditorControl;
