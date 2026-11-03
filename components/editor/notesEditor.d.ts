import { Editor } from '@tiptap/core';
export interface NotesEditorOptions {
    initialHtml?: string;
}
export interface NotesEditorHandle {
    toolbar: HTMLElement;
    editorElement: HTMLElement;
    editor: Editor | undefined;
    getHtml(): string;
    isEmpty(): boolean;
    destroy(): void;
}
export declare function createNotesEditor(options?: NotesEditorOptions): NotesEditorHandle;
