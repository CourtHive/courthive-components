import { PrivacyEditorChangeListener, PrivacyEditorConfig, PrivacyEditorState, PrivacyPolicyData } from './types';
export declare class PrivacyEditorStore {
    private state;
    private readonly listeners;
    private readonly config;
    constructor(config: PrivacyEditorConfig);
    getState(): PrivacyEditorState;
    getData(): PrivacyPolicyData;
    setData(data: PrivacyPolicyData): void;
    setPolicyName(value: string): void;
    setField(group: 'participant' | 'person', field: string, value: boolean): void;
    subscribe(listener: PrivacyEditorChangeListener): () => void;
    private commitDraft;
    private emit;
}
