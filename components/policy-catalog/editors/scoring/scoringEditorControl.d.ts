import { ScoringEditorStore } from './scoringEditorStore';
import { ScoringPolicyData, ScoringEditorConfig } from './types';
import { PolicyEditorInstance as CatalogEditorInstance } from '../../types';
export declare class ScoringEditorControl {
    private readonly store;
    private readonly panel;
    private readonly unsubscribe;
    private container;
    constructor(config: ScoringEditorConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getData(): ScoringPolicyData;
    setData(data: ScoringPolicyData): void;
    getStore(): ScoringEditorStore;
    static createEditorInstance(config: {
        initialData: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
        readonly?: boolean;
    }): CatalogEditorInstance;
}
export declare function createScoringEditor(config: ScoringEditorConfig, container: HTMLElement): ScoringEditorControl;
