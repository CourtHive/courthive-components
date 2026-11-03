import { SchedulingEditorState } from '../types';
import { SchedulingEditorStore } from '../schedulingEditorStore';
export declare function buildDailyLimitsSection(store: SchedulingEditorStore): {
    element: HTMLElement;
    update(state: SchedulingEditorState): void;
};
