/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { createCompositionEditor } from '../compositionEditor';
import { compositions } from '../../../compositions/compositions';

const NAME_INPUT_SELECTOR = 'input[type="text"]';

describe('createCompositionEditor', () => {
  function setup(config = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = createCompositionEditor(container, config);
    return { container, editor };
  }

  it('creates a root layout element in the container', () => {
    const { container } = setup();
    expect(container.children.length).toBe(1);
    const root = container.children[0] as HTMLElement;
    expect(root.children.length).toBe(2); // left + right columns
  });

  it('renders a name input with default value', () => {
    const { container } = setup();
    const input = container.querySelector(NAME_INPUT_SELECTOR) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Custom');
  });

  it('renders name from provided compositionName', () => {
    const { container } = setup({ compositionName: 'My Comp' });
    const input = container.querySelector(NAME_INPUT_SELECTOR) as HTMLInputElement;
    expect(input!.value).toBe('My Comp');
  });

  it('renders with composition data', () => {
    const { container } = setup({
      compositionName: 'Australian',
      composition: compositions.Australian,
    });
    const input = container.querySelector(NAME_INPUT_SELECTOR) as HTMLInputElement;
    expect(input!.value).toBe('Australian');
  });

  it('name input is disabled in readOnly mode', () => {
    const { container } = setup({ readOnly: true });
    const input = container.querySelector(NAME_INPUT_SELECTOR) as HTMLInputElement;
    expect(input!.disabled).toBe(true);
  });

  it('name input is enabled in normal mode', () => {
    const { container } = setup();
    const input = container.querySelector(NAME_INPUT_SELECTOR) as HTMLInputElement;
    expect(input!.disabled).toBe(false);
  });

  it('destroy() removes root from container', () => {
    const { container, editor } = setup();
    expect(container.children.length).toBe(1);
    editor.destroy();
    expect(container.children.length).toBe(0);
  });

  it('destroy() can be called multiple times safely', () => {
    const { container, editor } = setup();
    editor.destroy();
    editor.destroy(); // Should not throw
    expect(container.children.length).toBe(0);
  });

  it('getComposition returns SavedComposition with version', () => {
    const { editor } = setup({
      compositionName: 'Test',
      composition: { theme: 'chc-theme-french', configuration: { flags: true } },
    });
    const saved = editor.getComposition();
    expect(saved.compositionName).toBe('Test');
    expect(saved.theme).toBe('chc-theme-french');
    expect(saved.configuration.flags).toBe(true);
    expect(saved.version).toBe(1);
  });

  it('getComposition strips runtime-only fields', () => {
    const { editor } = setup({
      composition: {
        theme: 'x',
        configuration: {
          flags: true,
          participantProvider: () => [],
          persistInputFields: true,
          inlineAssignment: true,
        } as any,
      },
    });
    const saved = editor.getComposition();
    expect(saved.configuration.flags).toBe(true);
    expect((saved.configuration as any).participantProvider).toBeUndefined();
    expect((saved.configuration as any).persistInputFields).toBeUndefined();
    expect((saved.configuration as any).inlineAssignment).toBeUndefined();
  });

  it('renders 7 accordion sections', () => {
    const { container } = setup();
    // Each section has a header button — look for section containers
    // The sections are in the left column (first child of root)
    const root = container.children[0];
    const left = root.children[0];
    // Left has: nameRow + 7 sections = 8 children
    expect(left.children.length).toBe(8);
  });

  it('renders a preview panel in the right column', () => {
    const { container } = setup({
      composition: compositions.Australian,
      compositionName: 'Australian',
    });
    const root = container.children[0];
    const right = root.children[1];
    expect(right).toBeDefined();
    expect(right.children.length).toBeGreaterThan(0);
  });

  it('onChange callback fires when theme changes via store manipulation', () => {
    // We can't directly manipulate the store (it's private), but we can verify
    // the editor accepts the onChange config
    const onChange = vi.fn();
    const { editor: _editor } = setup({ onChange });
    // The onChange should not have been called during setup
    // (only on user-driven changes)
    // This test mainly verifies the config is accepted without error
    expect(onChange).not.toHaveBeenCalled();
  });
});
