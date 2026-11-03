import { SchedulingEditorState } from '../types';
import { SchedulingEditorStore } from '../schedulingEditorStore';
export declare function buildDefaultTimesSection(store: SchedulingEditorStore): {
    element: HTMLElement;
    update(state: SchedulingEditorState): void;
};
