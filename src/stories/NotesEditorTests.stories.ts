/**
 * Notes editor — its mount and destroy lifecycle, with real Tiptap and real animation frames.
 *
 * `createNotesEditor` mounts Tiptap on the next animation frame so its element is in the page first. A destroy
 * before that frame must cancel the mount; a destroy after it must free Tiptap once, however often it is
 * called. The old node test mocked both Tiptap and the timer, so it could only prove the mocks agreed; here the
 * frame is the browser's and the editor is the one consumers get.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/NotesEditorTests.stories.ts`
 */
import { createNotesEditor } from '../components/editor/notesEditor';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

// constants and types
import type { NotesEditorHandle } from '../components/editor/notesEditor';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Foundations/Notes Editor/Tests/Lifecycle',
  tags: ['!dev']
};
export default meta;

const SURFACE = '.ProseMirror';
const handles = new WeakMap<Element, NotesEditorHandle>();
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function editorHost(initialHtml?: string): HTMLElement {
  const host = document.createElement('div');
  const handle = createNotesEditor({ initialHtml });
  host.append(handle.toolbar, handle.editorElement);
  handles.set(host, handle);
  return host;
}

export const DestroyBeforeTheFrameCancelsTheMount: StoryObj = {
  render: () => {
    const host = editorHost('<p>never shown</p>');
    // destroyed in the same task that created it: the mount frame has not run yet
    handles.get(host)!.destroy();
    return host;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.firstElementChild!;
    const handle = handles.get(host)!;
    await nextFrame();
    await nextFrame();
    await expect(handle.editor).toBeUndefined();
    await expect(handle.editorElement.querySelector(SURFACE)).toBeNull();
    await expect(handle.getHtml()).toBe('');
    await expect(handle.isEmpty()).toBe(true);
  }
};

export const DestroyAfterMountFreesTiptapOnce: StoryObj = {
  render: () => editorHost('<p>Existing note</p>'),
  play: async ({ canvasElement }) => {
    const handle = handles.get(canvasElement.firstElementChild!)!;
    await waitFor(() => expect(handle.editor).toBeDefined());
    const editor = handle.editor!;
    await expect(handle.editorElement.querySelector(SURFACE)).not.toBeNull();
    await expect(handle.getHtml()).toBe('<p>Existing note</p>');
    const destroy = fn(editor.destroy.bind(editor));
    editor.destroy = destroy;
    handle.destroy();
    handle.destroy();
    await expect(destroy).toHaveBeenCalledOnce();
    await expect(editor.isDestroyed).toBe(true);
    await expect(handle.editor).toBeUndefined();
    await expect(handle.getHtml()).toBe('');
  }
};

export const ToolbarDrivesTheMountedEditor: StoryObj = {
  render: () => editorHost(),
  play: async ({ canvasElement }) => {
    const handle = handles.get(canvasElement.firstElementChild!)!;
    await waitFor(() => expect(handle.editor).toBeDefined());
    const surface = handle.editorElement.querySelector<HTMLElement>(SURFACE)!;
    await expect(handle.isEmpty()).toBe(true);
    await user.click(surface);
    await user.type(surface, 'Rain');
    await user.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}');
    const bold = handle.toolbar.querySelector<HTMLElement>('[data-action="bold"]')!;
    await user.click(bold);
    await expect(handle.getHtml()).toBe('<p><strong>Rain</strong></p>');
    // the selection is bold, so the toolbar says so
    await waitFor(() => expect(bold.classList.contains('is-active')).toBe(true));
    await user.selectOptions(handle.toolbar.querySelector('[data-action="heading"]')!, '2');
    // StarterKit's trailing node keeps an empty paragraph after a heading that ends the document
    await expect(handle.getHtml()).toBe('<h2><strong>Rain</strong></h2><p></p>');
    handle.destroy();
  }
};
