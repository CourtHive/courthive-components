import { RankingPointsEditorStore } from './rankingPointsEditorStore';
import { RankingPolicyData, RankingPointsEditorConfig } from './types';
import { PolicyEditorInstance as CatalogEditorInstance } from '../../types';
export declare class RankingPointsEditorControl {
    private readonly store;
    private readonly panel;
    private readonly unsubscribe;
    private container;
    constructor(config: RankingPointsEditorConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getData(): RankingPolicyData;
    setData(data: RankingPolicyData): void;
    getStore(): RankingPointsEditorStore;
    /**
     * Create as a PolicyEditorInstance for embedding in the catalog editor shell.
     */
    static createEditorInstance(config: {
        initialData: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
        readonly?: boolean;
    }): CatalogEditorInstance;
}
/**
 * Convenience factory for standalone use.
 */
export declare function createRankingPointsEditor(config: RankingPointsEditorConfig, container: HTMLElement): RankingPointsEditorControl;
