import { SchedulingEditorState } from '../types';
import { SchedulingEditorStore } from '../schedulingEditorStore';
export declare function buildModificationFlagsSection(store: SchedulingEditorStore): {
    element: HTMLElement;
    update(state: SchedulingEditorState): void;
};
