/**
 * Small chip-list editor used by the "Allowed match-up formats" section
 * and each of the six status-code refinement groups. Repeats the same
 * UX: existing items render as removable chips, a single text input +
 * Add button appends new values.
 *
 * The host owns the array — the editor only emits add(value) /
 * remove(index). State for the input text is purely local DOM.
 */
export interface TagListEditorConfig {
    values: string[];
    placeholder?: string;
    readonly?: boolean;
    validate?: (value: string) => boolean;
    invalidMessage?: string;
    onAdd: (value: string) => void;
    onRemove: (index: number) => void;
}
export interface TagListEditorHandle {
    element: HTMLElement;
    setValues(values: string[]): void;
    destroy(): void;
}
export declare function buildTagListEditor(config: TagListEditorConfig): TagListEditorHandle;
