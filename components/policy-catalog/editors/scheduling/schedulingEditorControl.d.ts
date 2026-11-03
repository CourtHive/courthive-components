import { SchedulingEditorStore } from './schedulingEditorStore';
import { SchedulingPolicyData, SchedulingEditorConfig } from './types';
import { PolicyEditorInstance as CatalogEditorInstance } from '../../types';
export declare class SchedulingEditorControl {
    private readonly store;
    private readonly panel;
    private readonly unsubscribe;
    private container;
    constructor(config: SchedulingEditorConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getData(): SchedulingPolicyData;
    setData(data: SchedulingPolicyData): void;
    getStore(): SchedulingEditorStore;
    /**
     * Create as a PolicyEditorInstance for embedding in the catalog editor shell.
     */
    static createEditorInstance(config: {
        initialData: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
    }): CatalogEditorInstance;
}
/**
 * Convenience factory for standalone use (e.g., TMX scheduling page).
 */
export declare function createSchedulingEditor(config: SchedulingEditorConfig, container: HTMLElement): SchedulingEditorControl;
