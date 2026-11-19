import { TopologyMode, TopologyState, TopologyTemplate, UIPanel } from '../types';
export interface ToolbarCallbacks {
    onAddStructure: (stage: string, structureType?: string) => void;
    onLoadTemplate: (template: TopologyTemplate) => void;
    onAutoLayout: () => void;
    onGenerate: () => void;
    onSaveTemplate?: () => void;
    onClear?: () => void;
    /** Given with `modes`, the toolbar offers each mode as a toggle. */
    onSetMode?: (mode: TopologyMode) => void;
    /** The modes the host has given the topology what it needs for, in the order they are offered. */
    modes?: ModeToggle[];
}
/** A mode the toolbar offers as a toggle. */
export interface ModeToggle {
    mode: Exclude<TopologyMode, 'view'>;
    label: string;
    /** Why the mode cannot be entered right now, or nothing when it can. Leaving a mode is always possible. */
    unavailable?: (state: TopologyState) => string | undefined;
    /** The toggle's title while the mode is off and available, and while it is on. */
    offTitle: string;
    onTitle: string;
}
export interface ToolbarOptions {
    hideTemplates?: boolean;
    hideGenerate?: boolean;
    readOnly?: boolean;
}
export declare function buildToolbar(callbacks: ToolbarCallbacks, templates: TopologyTemplate[], options?: ToolbarOptions): UIPanel<TopologyState>;
/**
 * The mode toggles, as buttons: the toolbar's, or a host's own bar's (`TopologyBuilderControl.modeToggleButtons`).
 *
 * Their own buttons rather than controlBar items: each has a pressed state that follows the store, and a controlBar is
 * built once. Offered in a read-only topology too, which is where a live draw shows them — a mode changes the draw
 * only through the host's callbacks, never by editing the graph.
 */
export declare function buildModeToggles(onSetMode: (mode: TopologyMode) => void, modes: ModeToggle[]): {
    elements: HTMLButtonElement[];
    update: (state: TopologyState) => void;
};
