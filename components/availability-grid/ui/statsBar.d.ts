/**
 * Stats Bar — Horizontal capacity statistics strip.
 *
 * Shows total hours, blocked, available, and avg per court.
 */
export interface StatsBarUpdate {
    totalHours: number;
    blockedHours: number;
    availableHours: number;
    avgPerCourt: number;
}
export interface StatsBarLabels {
    totalHours?: string;
    blocked?: string;
    available?: string;
    avgPerCourt?: string;
}
export declare function buildStatsBar(labels?: StatsBarLabels): {
    element: HTMLElement;
    update: (stats: StatsBarUpdate) => void;
};
