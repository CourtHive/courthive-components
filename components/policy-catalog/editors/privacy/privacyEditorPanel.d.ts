import { PrivacyEditorStore } from './privacyEditorStore';
import { PrivacyEditorConfig, PrivacyEditorState } from './types';
export declare function buildPrivacyEditorPanel(store: PrivacyEditorStore, _config: PrivacyEditorConfig): {
    element: HTMLElement;
    update: (state: PrivacyEditorState) => void;
};
