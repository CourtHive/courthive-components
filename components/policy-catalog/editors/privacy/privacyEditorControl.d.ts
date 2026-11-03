import { PrivacyEditorStore } from './privacyEditorStore';
import { PrivacyEditorConfig, PrivacyPolicyData } from './types';
import { PolicyEditorInstance as CatalogEditorInstance } from '../../types';
export declare class PrivacyEditorControl {
    private readonly store;
    private readonly panel;
    private readonly unsubscribe;
    private container;
    constructor(config: PrivacyEditorConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getData(): PrivacyPolicyData;
    setData(data: PrivacyPolicyData): void;
    getStore(): PrivacyEditorStore;
    static createEditorInstance(config: {
        initialData: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
    }): CatalogEditorInstance;
}
export declare function createPrivacyEditor(config: PrivacyEditorConfig, container: HTMLElement): PrivacyEditorControl;
