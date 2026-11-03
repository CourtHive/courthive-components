import { CatalogMatchUpItem, CatalogFilters, MatchUpCatalogGroupBy, ScheduledBehavior, SchedulePageState } from '../types';
export declare function isCompletedStatus(status?: string): boolean;
export declare function filterMatchUpCatalog(catalog: CatalogMatchUpItem[], query: string, behavior?: ScheduledBehavior, filters?: CatalogFilters, showCompleted?: boolean): CatalogMatchUpItem[];
/**
 * For each event, returns the lowest `roundNumber` among items that are
 * unscheduled and not completed. Drives the round-emphasis tier on each
 * catalog card — offset 0 means "this round is what should be scheduled
 * next within its event," offset >= 1 deemphasizes future rounds.
 *
 * Computed against the FULL catalog (not the filtered set) by the catalog
 * widget's `update()` so a search / filter that narrows the visible items
 * doesn't shift the priority assignment underneath the operator.
 */
export declare function computeBaseRoundByEvent(catalog: CatalogMatchUpItem[]): Map<string, number>;
export declare function groupMatchUpCatalog(items: CatalogMatchUpItem[], mode: MatchUpCatalogGroupBy): Map<string, CatalogMatchUpItem[]>;
/** The state a catalog view is derived from — every field `visibleCatalogGroups` reads. */
type CatalogViewState = Pick<SchedulePageState, 'matchUpCatalog' | 'catalogSearchQuery' | 'catalogFilters' | 'showCompleted' | 'showScheduled' | 'scheduledBehavior' | 'catalogGroupBy'>;
/**
 * The groups the catalog shows for a state, in display order. One derivation for the panel that draws
 * them and the store that collapses them, so "collapse all" collapses exactly what is on screen.
 */
export declare function visibleCatalogGroups(state: CatalogViewState): Map<string, CatalogMatchUpItem[]>;
/** True when the catalog shows at least one group and every group it shows is collapsed. */
export declare function allCatalogGroupsCollapsed(state: CatalogViewState & Pick<SchedulePageState, 'catalogCollapsedGroups'>): boolean;
export {};
