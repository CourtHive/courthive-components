import { PolicyCatalogState, UIPanel } from '../types';
export interface EditorShellCallbacks {
    onSave: () => void;
    onReset: () => void;
    onApply: () => void;
    onDuplicate: () => void;
    onRename: (name: string) => void;
}
export interface EditorShellPanel extends UIPanel<PolicyCatalogState> {
    bodyElement: HTMLElement;
}
export declare function buildEditorShell(callbacks: EditorShellCallbacks): EditorShellPanel;
