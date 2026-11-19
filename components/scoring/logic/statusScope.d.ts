import { ScoringModalLabels } from '../types';
/** Adapt the legacy modal's named labels to the card's status-keyed labels. */
export declare function scoringStatusScopeLabels(labels?: ScoringModalLabels): Record<string, string>;
/** Scope decisions come from the host's factory SCORE action, never from UI draw heuristics. */
export declare function statusScopeError(status: string | undefined, disabledMatchUpStatuses?: readonly string[], labels?: Record<string, string>): string | undefined;
