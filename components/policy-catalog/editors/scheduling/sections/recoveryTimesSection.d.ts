import { SchedulingEditorState, SchedulingEditorConfig } from '../types';
import { SchedulingEditorStore } from '../schedulingEditorStore';
export declare function buildRecoveryTimesSection(store: SchedulingEditorStore, config: SchedulingEditorConfig): {
    element: HTMLElement;
    update(state: SchedulingEditorState): void;
};
