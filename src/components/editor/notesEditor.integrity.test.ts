// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ created: vi.fn(), destroyed: vi.fn() }));
vi.mock('@tiptap/core', () => ({
  Editor: class {
    constructor() {
      calls.created();
    }
    destroy() {
      calls.destroyed();
    }
  }
}));
vi.mock('../notes-toolbar/notesToolbar', () => ({ notesToolbar: () => document.createElement('div') }));
import { createNotesEditor } from './notesEditor';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe('notes editor lifetime', () => {
  it('cancels an editor mount when destroyed before the next frame', () => {
    vi.useFakeTimers();
    const editor = createNotesEditor();
    editor.destroy();
    vi.runAllTimers();
    expect(calls.created).not.toHaveBeenCalled();
    expect(editor.editor).toBeUndefined();
  });
  it('destroys an already mounted editor exactly once', () => {
    vi.useFakeTimers();
    const editor = createNotesEditor();
    vi.runAllTimers();
    editor.destroy();
    editor.destroy();
    expect(calls.created).toHaveBeenCalledTimes(1);
    expect(calls.destroyed).toHaveBeenCalledTimes(1);
  });
});
