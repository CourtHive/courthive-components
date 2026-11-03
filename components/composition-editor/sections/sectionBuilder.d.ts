import { SectionId, EditorPanel } from '../compositionEditorTypes';
import { CompositionEditorStore } from '../compositionEditorStore';
export interface SectionDef {
    id: SectionId;
    label: string;
    factory: (store: CompositionEditorStore) => EditorPanel;
}
export declare function buildSection(def: SectionDef, store: CompositionEditorStore): EditorPanel;
