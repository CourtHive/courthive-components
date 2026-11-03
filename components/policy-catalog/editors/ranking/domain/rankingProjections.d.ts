import { AwardProfileData, TableLayout } from '../types';
export declare function positionToRoundLabel(position: number): string;
/**
 * Analyze a profile's finishingPositionRanges to determine the best table layout.
 * Examines all values to find the common shape.
 */
export declare function analyzePositionValueShape(ranges: Record<string, any> | undefined): TableLayout;
/**
 * Resolve a PositionValue for display in a specific context.
 * Returns the numeric value or undefined if not applicable.
 */
export declare function resolvePositionValue(value: any, context?: {
    level?: number;
    flight?: number;
    drawSize?: number;
}): number | undefined;
/**
 * Generate a one-line summary for a collapsed profile card.
 */
export declare function profileSummaryText(profile: AwardProfileData): string;
export interface ScopeBadge {
    label: string;
    intent: string;
}
/**
 * Extract displayable scope badges from an award profile.
 */
export declare function getProfileScopeBadges(profile: AwardProfileData): ScopeBadge[];
/**
 * Format a number for display in a points table cell.
 */
export declare function formatPointValue(value: number | undefined): string;
