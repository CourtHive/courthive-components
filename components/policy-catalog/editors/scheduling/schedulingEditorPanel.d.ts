import { SchedulingEditorState, SchedulingEditorConfig } from './types';
import { SchedulingEditorStore } from './schedulingEditorStore';
export declare function buildSchedulingEditorPanel(store: SchedulingEditorStore, config: SchedulingEditorConfig): {
    element: HTMLElement;
    update(state: SchedulingEditorState): void;
};
