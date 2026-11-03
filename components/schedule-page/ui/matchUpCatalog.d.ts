import { SchedulePageState, UIPanel, MatchUpCatalogGroupBy, CatalogMatchUpItem, CatalogFilters } from '../types';
export interface MatchUpCatalogCallbacks {
    onSearchChange: (query: string) => void;
    onGroupByChange: (mode: MatchUpCatalogGroupBy) => void;
    onFilterChange: (filters: CatalogFilters) => void;
    onShowCompletedChange: (show: boolean) => void;
    onShowScheduledChange?: (show: boolean) => void;
    onMatchUpSelected?: (matchUp: CatalogMatchUpItem) => void;
    onDropRemove?: (matchUpId: string) => void;
    /** Forwarded to every card as `MatchUpCardOptions.renderExtra`. See that contract. */
    renderCardExtra?: (matchUp: CatalogMatchUpItem) => HTMLElement | null;
    /** Forwarded to every card as `MatchUpCardOptions.relatedMatchUpIds`. See that contract. */
    relatedMatchUpIds?: (matchUp: CatalogMatchUpItem) => string[];
    /** A group header was clicked. The collapsed set is store state (`catalogCollapsedGroups`). */
    onToggleGroupCollapsed?: (groupKey: string) => void;
}
export declare function buildMatchUpCatalog(callbacks: MatchUpCatalogCallbacks): UIPanel<SchedulePageState>;
