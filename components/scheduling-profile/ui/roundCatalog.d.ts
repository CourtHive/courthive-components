import { ProfileStoreState, UIPanel, CatalogGroupBy, CatalogRoundItem, RoundLocator } from '../types';
export interface RoundCatalogCallbacks {
    onSearchChange: (query: string) => void;
    onGroupByChange: (mode: CatalogGroupBy) => void;
    onDropRemove?: (locator: RoundLocator) => void;
    onNavigateToPlanned?: (item: CatalogRoundItem) => void;
}
export declare function buildRoundCatalog(callbacks: RoundCatalogCallbacks): UIPanel<ProfileStoreState>;
