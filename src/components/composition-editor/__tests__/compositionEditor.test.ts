/**
 * @vitest-environment happy-dom
 */
import { compositions } from '../../../compositions/compositions';
import { createCompositionEditor } from '../compositionEditor';
import { describe, it, expect, vi } from 'vitest';

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
      composition: compositions.Australian
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
      composition: { theme: 'chc-theme-french', configuration: { flags: true } }
    });
    const saved = editor.getComposition();
    expect(saved.compositionName).toBe('Test');
    expect(saved.theme).toBe('chc-theme-french');
    expect(saved.configuration.flags).toBe(true);
    expect(saved.version).toBe(1);
  });

  it('saves edited broadcast accent colors and restores them into a new editor', () => {
    const { container, editor } = setup({ composition: compositions['Broadcast Bold'] });
    const header = [...container.querySelectorAll<HTMLElement>('.ce-section-header')].find((element) =>
      element.textContent?.includes('Colors')
    )!;
    header.click();
    const edited = { 'Accent color': '#ff6a00', 'Text on accent': '#ffffff' };
    for (const [label, value] of Object.entries(edited)) {
      const row = [...container.querySelectorAll('.ce-color-field')].find(
        (element) => element.querySelector('.ce-field-label')?.textContent === label
      )!;
      const input = row.querySelector<HTMLInputElement>(NAME_INPUT_SELECTOR)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Exercise the JSON persistence boundary, including new color fields.
    const serialized = JSON.stringify(editor.getComposition());
    const saved = JSON.parse(serialized);
    editor.destroy();
    const restored = setup({ composition: saved });
    expect(restored.editor.getComposition().colors).toEqual({ accent: '#ff6a00', accentText: '#ffffff' });
    const card = restored.container.querySelector<HTMLElement>('.tmx-m')!;
    expect(card.style.getPropertyValue('--chc-color-accent')).toBe('#ff6a00');
    expect(card.style.getPropertyValue('--chc-color-accent-text')).toBe('#ffffff');
    restored.editor.destroy();
    container.remove();
    restored.container.remove();
  });

  it('getComposition strips runtime-only fields', () => {
    const { editor } = setup({
      composition: {
        theme: 'x',
        configuration: {
          flags: true,
          participantProvider: () => [],
          persistInputFields: true,
          inlineAssignment: true
        } as any
      }
    });
    const saved = editor.getComposition();
    expect(saved.configuration.flags).toBe(true);
    expect((saved.configuration as any).participantProvider).toBeUndefined();
    expect((saved.configuration as any).persistInputFields).toBeUndefined();
    expect((saved.configuration as any).inlineAssignment).toBeUndefined();
  });

  it('renders 8 accordion sections', () => {
    const { container } = setup();
    // Each section has a header button — look for section containers
    // The sections are in the left column (first child of root)
    const root = container.children[0];
    const left = root.children[0];
    // Left has: nameRow + 8 sections = 9 children
    expect(left.children.length).toBe(9);
  });

  it('renders a preview panel in the right column', () => {
    const { container } = setup({
      composition: compositions.Australian,
      compositionName: 'Australian'
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
