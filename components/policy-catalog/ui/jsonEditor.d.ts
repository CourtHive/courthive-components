import { PolicyEditorInstance } from '../types';
export declare function buildJsonEditor(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
}): PolicyEditorInstance;
