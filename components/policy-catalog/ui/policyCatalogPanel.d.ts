import { PolicyCatalogState, UIPanel, CatalogGroupBy } from '../types';
export interface PolicyCatalogPanelCallbacks {
    onSearchChange: (query: string) => void;
    onGroupByChange: (mode: CatalogGroupBy) => void;
    onSelectPolicy: (id: string) => void;
    onNewPolicy?: (policyType: string) => void;
    onDuplicatePolicy?: (id: string) => void;
    onDeletePolicy?: (id: string) => void;
}
export declare function buildPolicyCatalogPanel(callbacks: PolicyCatalogPanelCallbacks): UIPanel<PolicyCatalogState>;
