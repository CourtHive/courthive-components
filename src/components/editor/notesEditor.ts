// Tiptap notes-editor primitive. Lifted from TMX's overviewTab/notesEditorModal
// (2026-05-26) so TMX and the AMS console share one implementation. Wires the
// generic editor lifecycle + toolbar state-sync; consumers wrap with their own
// modal + any consumer-specific insert buttons.
//
// Stack (kept aligned with TMX's original):
//   @tiptap/core + starter-kit + extension-{text-style, color, highlight,
//   text-align, youtube} + the shared notesToolbar.
//
// Usage:
//
//   const handle = createNotesEditor({ initialHtml: '<p>existing</p>' });
//   modalBody.append(handle.toolbar, handle.editorElement);
//   // ...later, on save:
//   const html = handle.getHtml();
//   handle.destroy();
//
// The editor is instantiated on the next animation frame (matching TMX's
// pattern) so the editorElement has time to land in the DOM before Tiptap
// initializes — important for plugins like Youtube that measure layout.

import { Color } from '@tiptap/extension-color';
import { Editor } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';

import { notesToolbar, updateHeadingSelect, updateToolbarState } from '../notes-toolbar/notesToolbar';

export interface NotesEditorOptions {
  initialHtml?: string;
}

export interface NotesEditorHandle {
  // The wired toolbar — append to wherever the consumer wants it (typically
  // immediately above the editorElement).
  toolbar: HTMLElement;
  // The placeholder div Tiptap mounts into. Must be in the DOM by the time
  // the next animation frame fires.
  editorElement: HTMLElement;
  // The Tiptap editor instance. Undefined until the rAF callback fires.
  editor: Editor | undefined;
  // Returns the editor HTML, or '' when the editor is empty. Safe to call
  // before destroy() (returns '' if not yet mounted).
  getHtml(): string;
  isEmpty(): boolean;
  // Frees the Tiptap instance. Safe to call multiple times.
  destroy(): void;
}

export function createNotesEditor(options: NotesEditorOptions = {}): NotesEditorHandle {
  const editorElement = document.createElement('div');
  editorElement.className = 'notes-editor-content';

  const handle: NotesEditorHandle = {
    toolbar: undefined as unknown as HTMLElement,
    editorElement,
    editor: undefined,
    getHtml: () => (handle.editor && !handle.editor.isEmpty ? handle.editor.getHTML() : ''),
    isEmpty: () => !handle.editor || handle.editor.isEmpty,
    destroy: () => {
      handle.editor?.destroy();
      handle.editor = undefined;
    },
  };

  handle.toolbar = notesToolbar({
    onHeading: (level) => {
      if (!handle.editor) return;
      if (level === false) {
        handle.editor.chain().focus().setParagraph().run();
      } else {
        handle.editor
          .chain()
          .focus()
          .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
          .run();
      }
    },
    onBold: () => handle.editor?.chain().focus().toggleBold().run(),
    onItalic: () => handle.editor?.chain().focus().toggleItalic().run(),
    onUnderline: () => handle.editor?.chain().focus().toggleUnderline().run(),
    onStrike: () => handle.editor?.chain().focus().toggleStrike().run(),
    onColor: (color) => handle.editor?.chain().focus().setColor(color).run(),
    onBackground: (color) => handle.editor?.chain().focus().setHighlight({ color }).run(),
    onBulletList: () => handle.editor?.chain().focus().toggleBulletList().run(),
    onOrderedList: () => handle.editor?.chain().focus().toggleOrderedList().run(),
    onAlign: (align) => handle.editor?.chain().focus().setTextAlign(align).run(),
    onBlockquote: () => handle.editor?.chain().focus().toggleBlockquote().run(),
    onCodeBlock: () => handle.editor?.chain().focus().toggleCodeBlock().run(),
    onLink: (url) => handle.editor?.chain().focus().setLink({ href: url }).run(),
    onVideo: (url) => handle.editor?.commands.setYoutubeVideo({ src: url }),
    onClearFormatting: () => handle.editor?.chain().focus().clearNodes().unsetAllMarks().run(),
  });

  const syncToolbarState = () => {
    if (!handle.editor) return;
    updateToolbarState(handle.toolbar, {
      bold: handle.editor.isActive('bold'),
      italic: handle.editor.isActive('italic'),
      underline: handle.editor.isActive('underline'),
      strike: handle.editor.isActive('strike'),
      orderedList: handle.editor.isActive('orderedList'),
      bulletList: handle.editor.isActive('bulletList'),
      blockquote: handle.editor.isActive('blockquote'),
      codeBlock: handle.editor.isActive('codeBlock'),
      alignLeft: handle.editor.isActive({ textAlign: 'left' }),
      alignCenter: handle.editor.isActive({ textAlign: 'center' }),
      alignRight: handle.editor.isActive({ textAlign: 'right' }),
      alignJustify: handle.editor.isActive({ textAlign: 'justify' }),
    });
    for (let i = 1; i <= 6; i++) {
      if (handle.editor.isActive('heading', { level: i })) {
        updateHeadingSelect(handle.toolbar, i);
        return;
      }
    }
    updateHeadingSelect(handle.toolbar, false);
  };

  requestAnimationFrame(() => {
    handle.editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Youtube.configure({ inline: false }),
      ],
      content: options.initialHtml || '',
      onSelectionUpdate: syncToolbarState,
      onTransaction: syncToolbarState,
    });
  });

  return handle;
}
