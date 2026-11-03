import { CourtCardConfig } from '../court-card/types';
import { CourtLayoutCallbacks, CourtLayoutConfig, CourtLayoutCourt, CourtLayoutData } from './types';
export interface CourtGroup {
    key: string;
    label: string;
    courts: CourtLayoutCourt[];
}
export declare function settingOf(court: CourtLayoutCourt): string;
export declare function surfaceOf(court: CourtLayoutCourt): string;
/**
 * Split courts into display groups. Order within a group is always courtOrder-first; the ORDER OF
 * THE GROUPS follows first appearance in that sorted list, so a venue whose court 1 is outdoor
 * leads with outdoor rather than with whatever sorts first alphabetically.
 */
export declare function groupCourts(courts: CourtLayoutCourt[], grouping: CourtLayoutConfig['grouping']): CourtGroup[];
/** "8 outdoor hard, 4 indoor hard" — the breakdown, most common first. */
export declare function summarizeCourts(courts: CourtLayoutCourt[]): string;
export declare function buildCourtLayout(data: CourtLayoutData, config?: Partial<CourtLayoutConfig>, callbacks?: CourtLayoutCallbacks): HTMLElement;
/**
 * Card config for a cell, given what the group heading already says. Repeating "Outdoor" on every
 * card inside a group headed OUTDOOR is noise, so the redundant corner badge is dropped — but only
 * the redundant one. `floodlit` is never implied by grouping and always survives.
 */
export declare function cellCardConfig(grouping: CourtLayoutConfig['grouping']): Partial<CourtCardConfig> | undefined;
