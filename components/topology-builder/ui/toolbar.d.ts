import { TopologyState, TopologyTemplate, UIPanel } from '../types';
export interface ToolbarCallbacks {
    onAddStructure: (stage: string, structureType?: string) => void;
    onLoadTemplate: (template: TopologyTemplate) => void;
    onAutoLayout: () => void;
    onGenerate: () => void;
    onSaveTemplate?: () => void;
    onClear?: () => void;
}
export interface ToolbarOptions {
    hideTemplates?: boolean;
    hideGenerate?: boolean;
    readOnly?: boolean;
}
export declare function buildToolbar(callbacks: ToolbarCallbacks, templates: TopologyTemplate[], options?: ToolbarOptions): UIPanel<TopologyState>;
