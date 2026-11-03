import { SeedingPolicyDraft, SeedingPolicyData, SeedingEditorState, SeedingEditorSection, SeedingEditorChangeListener, SeedingEditorConfig, SeedsCountThreshold, SeedingPositioning } from './types';
export declare class SeedingEditorStore {
    private state;
    private readonly listeners;
    private readonly config;
    constructor(config: SeedingEditorConfig);
    getState(): SeedingEditorState;
    getData(): SeedingPolicyDraft;
    setData(data: SeedingPolicyData): void;
    toggleSection(sectionId: SeedingEditorSection): void;
    setPolicyName(value: string): void;
    setPositioning(value: SeedingPositioning): void;
    setValidSeedPositionsIgnore(value: boolean): void;
    setDuplicateSeedNumbers(value: boolean): void;
    setDrawSizeProgression(value: boolean): void;
    addThreshold(): void;
    removeThreshold(index: number): void;
    setThresholdField(index: number, field: keyof SeedsCountThreshold, value: number): void;
    sortThresholds(): void;
    addDrawTypeOverride(drawType: string, positioning: SeedingPositioning): void;
    removeDrawTypeOverride(drawType: string): void;
    setDrawTypeOverridePositioning(drawType: string, positioning: SeedingPositioning): void;
    subscribe(listener: SeedingEditorChangeListener): () => void;
    private commitDraft;
    private emit;
}
