import { PolicyCatalogState, UIPanel } from '../types';
import { EditorShellPanel } from './editorShell';
export declare function buildPolicyCatalogLayout(panels: {
    catalogPanel: UIPanel<PolicyCatalogState>;
    editorShell: EditorShellPanel;
}): UIPanel<PolicyCatalogState>;
