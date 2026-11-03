import { CatalogRoundItem, CatalogGroupBy, PlannedRoundBehavior, RoundSegment, SchedulingProfile, RoundLocator } from '../types';
export declare function segmentKeyString(roundKey: string, seg: RoundSegment): string;
export interface RoundPlacement {
    locator: RoundLocator;
    date: string;
    venueId: string;
    roundSegment?: RoundSegment;
}
/**
 * Build a placement index keyed by `{roundKey}` (whole) and
 * `{roundKey}|{n}/{count}` (segmented). The catalog UI uses this to display
 * the date + venue for any placed round so an operator can locate (and
 * remove) placements without remembering where they were dropped.
 */
export declare function buildPlacementIndex(profile: SchedulingProfile): Map<string, RoundPlacement[]>;
/**
 * Max `segmentsCount` per roundKey across all placed segments. Lets the
 * catalog auto-expand a round into sub-rows when segments are already
 * placed — so an orphaned segment is always visible and removable, even if
 * the operator has not manually clicked the split chip.
 */
export declare function getPlacedSegmentsCount(profile: SchedulingProfile): Map<string, number>;
/**
 * Whether a catalog round's event plays on `date`. A round without `playingDates` (an event whose
 * dates do not narrow the tournament's) plays every date, and so does any round when no date is
 * selected.
 */
export declare function roundPlaysOnDate(round: {
    playingDates?: string[];
}, date?: string | null): boolean;
/**
 * Every round placed anywhere in the profile, whole or as a segment, by `roundKeyString`.
 */
export declare function getPlacedRoundKeys(profile: SchedulingProfile): Set<string>;
export interface FilterCatalogOptions {
    /** Hide rounds whose event does not play on this date (see `roundPlaysOnDate`). */
    selectedDate?: string | null;
    /**
     * Rounds that stay listed on a non-playing date because they are already placed somewhere, so
     * their placements remain visible and removable. `plannedRoundBehavior: 'hide'` still applies.
     */
    placedKeys?: Set<string>;
}
export declare function filterCatalog(catalog: CatalogRoundItem[], query: string, plannedKeys: Set<string>, behavior?: PlannedRoundBehavior, options?: FilterCatalogOptions): Array<CatalogRoundItem & {
    isPlanned: boolean;
}>;
/**
 * How many catalog rounds `filterCatalog` hides on `date` because their event does not play then.
 */
export declare function countNotPlayingRounds(catalog: CatalogRoundItem[], date: string | null | undefined, placedKeys: Set<string>): number;
export declare function groupCatalog(items: Array<CatalogRoundItem & {
    isPlanned: boolean;
}>, mode: CatalogGroupBy): Map<string, Array<CatalogRoundItem & {
    isPlanned: boolean;
}>>;
export declare function getPlannedRoundKeys(profile: {
    venues: {
        rounds: {
            roundSegment?: unknown;
        }[];
    }[];
}[]): Set<string>;
/**
 * Per-segment planned keys — every placed segment gets a key
 * `{roundKey}|{n}/{count}` so that exploded catalog rows can mark only the
 * specific segment(s) already placed (instead of dimming the whole round).
 * A whole-round placement claims every segment regardless of split count.
 */
export declare function getPlannedSegmentKeys(profile: {
    venues: {
        rounds: ({
            roundSegment?: {
                segmentNumber: number;
                segmentsCount: number;
            };
        } & Partial<CatalogRoundItem>)[];
    }[];
}[]): Set<string>;
