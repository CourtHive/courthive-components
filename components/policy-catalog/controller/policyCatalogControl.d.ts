import { PolicyCatalogStore } from '../engine/policyCatalogStore';
import { PolicyCatalogConfig } from '../types';
export declare class PolicyCatalogControl {
    private readonly store;
    private readonly layout;
    private readonly editorShell;
    private readonly unsubscribe;
    private currentEditor;
    private container;
    constructor(config: PolicyCatalogConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    getStore(): PolicyCatalogStore;
    private handleSelectPolicy;
    private mountEditorForSelection;
    private syncEditorFromStore;
    private destroyCurrentEditor;
}
