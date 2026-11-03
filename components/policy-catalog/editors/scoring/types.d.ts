import { StatusCodeEntry } from '../../../scoring/logic/statusCodes';
export type MatchUpStatusKey = 'ABANDONED' | 'CANCELLED' | 'DEFAULTED' | 'INCOMPLETE' | 'RETIRED' | 'WALKOVER';
export declare const MATCH_UP_STATUS_KEYS: MatchUpStatusKey[];
export type RequireAllPositionsTriState = 'default' | 'true' | 'false';
export interface AllowDeletionWithScoresPresent {
    drawDefinitions?: boolean;
    structures?: boolean;
}
export interface StageSequenceOverride {
    requireAllPositionsAssigned?: boolean;
}
export interface MatchUpFormatEntry {
    name?: string;
    description?: string;
    matchUpFormat: string;
    categoryNames?: string[];
    categoryTypes?: string[];
}
export type AllowedFormatEntry = string | MatchUpFormatEntry;
export type AllowedFormatField = 'name' | 'description' | 'matchUpFormat';
export interface ScoringPolicyData {
    policyName?: string;
    defaultMatchUpFormat?: string;
    matchUpFormats?: AllowedFormatEntry[];
    requireParticipantsForScoring?: boolean;
    requireAllPositionsAssigned?: boolean;
    allowChangePropagation?: boolean;
    allowDeletionWithScoresPresent?: AllowDeletionWithScoresPresent;
    matchUpStatusCodes?: Partial<Record<MatchUpStatusKey, StatusCodeEntry[]>>;
    stage?: Record<string, {
        stageSequence?: Record<string, StageSequenceOverride>;
    }>;
    processCodes?: {
        incompleteAssignmentsOnDefault?: string[];
    };
}
export type ScoringEditorSection = 'defaults' | 'allowedFormats' | 'statusCodes';
export interface ScoringEditorState {
    draft: ScoringPolicyData;
    expandedSections: Set<ScoringEditorSection>;
    expandedStatuses: Set<MatchUpStatusKey>;
    advancedOpen: boolean;
    dirty: boolean;
}
export type ScoringEditorChangeListener = (state: ScoringEditorState) => void;
export interface ScoringEditorConfig {
    initialPolicy?: ScoringPolicyData;
    readonly?: boolean;
    onChange?: (policy: ScoringPolicyData) => void;
}
