import { ScoringPolicyData, ScoringEditorState, ScoringEditorSection, ScoringEditorChangeListener, ScoringEditorConfig, MatchUpStatusKey, AllowedFormatField, MatchUpFormatEntry } from './types';
export declare class ScoringEditorStore {
    private state;
    private readonly listeners;
    private readonly config;
    constructor(config: ScoringEditorConfig);
    isReadonly(): boolean;
    getState(): ScoringEditorState;
    getData(): ScoringPolicyData;
    setData(data: ScoringPolicyData): void;
    toggleSection(sectionId: ScoringEditorSection): void;
    toggleStatus(key: MatchUpStatusKey): void;
    setAdvancedOpen(value: boolean): void;
    setDefaultMatchUpFormat(value: string): void;
    setRequireParticipants(value: boolean): void;
    setRequireAllPositions(value: 'default' | 'true' | 'false'): void;
    setAllowChangePropagation(value: boolean): void;
    setAllowDeletionDraws(value: boolean): void;
    setAllowDeletionStructures(value: boolean): void;
    addAllowedFormat(seed?: Partial<MatchUpFormatEntry>): void;
    removeAllowedFormat(index: number): void;
    setAllowedFormatField(index: number, field: AllowedFormatField, value: string): void;
    isAllowedFormatDuplicate(format: string, excludeIndex?: number): boolean;
    addAllowedFormatCategory(index: number, kind: 'categoryNames' | 'categoryTypes', value: string): void;
    removeAllowedFormatCategory(index: number, kind: 'categoryNames' | 'categoryTypes', valueIndex: number): void;
    /**
     * Add a code to a status group.
     *
     * The operator types a code; the entry stored is an OBJECT. Only `matchUpStatusCode` is set —
     * `matchUpStatusCodeDisplay` and `label` are authored per code and this control has no field for
     * them, so inventing values would be worse than leaving them absent (the reason picker falls back
     * to the code, which is the policy saying "the code IS the label").
     *
     * Entries that arrive already carrying display text are never rewritten by this path, which is
     * the whole point: the previous `string[]` model discarded them on every save.
     */
    addStatusCode(status: MatchUpStatusKey, value: string): void;
    removeStatusCode(status: MatchUpStatusKey, index: number): void;
    addProcessCode(value: string): void;
    removeProcessCode(index: number): void;
    subscribe(listener: ScoringEditorChangeListener): () => void;
    private commitDraft;
    private emit;
}
