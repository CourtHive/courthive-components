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
/**
 * Every state field the catalog's CARDS are built from, in a fixed order. The store emits on every
 * write — a selection, the Inspector toggle, a date-strip push — and rebuilding every card for each one
 * re-ran the consumer's `renderCardExtra` per card (engine work per card in TMX) to move one highlight.
 * `selectedMatchUp` is deliberately absent: the panel moves the highlight on the cards it already has.
 * Compared by reference (`sameCatalogCardInputs`): the consumer pushes a new catalog array when its data
 * changes.
 */
export declare function catalogCardInputs(state: CatalogViewState & Pick<SchedulePageState, 'catalogCollapsedGroups'>): unknown[];
/** True when the cards built from `previous` are still the cards `next` asks for. */
export declare function sameCatalogCardInputs(previous: unknown[] | null, next: unknown[]): boolean;
export interface CatalogRenderGroup {
    groupKey: string;
    /** Every matchUp the group holds; its header counts these. */
    items: CatalogMatchUpItem[];
    collapsed: boolean;
    /** The matchUps to build cards for, in order: none for a collapsed group. */
    cards: CatalogMatchUpItem[];
}
/** The groups the catalog draws for a state, in display order, with what each one builds. */
export declare function catalogRenderGroups(state: CatalogViewState & Pick<SchedulePageState, 'catalogCollapsedGroups'>): CatalogRenderGroup[];
export {};
