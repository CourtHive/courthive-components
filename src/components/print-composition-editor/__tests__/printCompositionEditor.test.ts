/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { createPrintCompositionEditor } from '../printCompositionEditor';

function setup(config: Parameters<typeof createPrintCompositionEditor>[1] = { printType: 'draw' }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const editor = createPrintCompositionEditor(container, config);
  return { container, editor };
}

describe('createPrintCompositionEditor', () => {
  it('mounts a two-column layout (form + aside)', () => {
    const { container } = setup();
    expect(container.children.length).toBe(1);
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('pce-root')).toBe(true);
    expect(root.children.length).toBe(2);
  });

  it('renders all four sections by default', () => {
    const { container } = setup();
    const headers = Array.from(container.querySelectorAll('.pce-section-header')).map((el) => el.textContent);
    expect(headers).toEqual(['Page', 'Header', 'Footer', 'Content — draw']);
  });

  it('seeds form values from initial config', () => {
    const { container } = setup({
      printType: 'draw',
      config: { header: { layout: 'minimal', tournamentName: 'My Event' } },
    });
    const tournamentInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(tournamentInput).toBeTruthy();
    // The first text input is in the Header section's tournamentName field
    expect(tournamentInput.value).toBe('My Event');
  });

  it('emits onChange when a field changes', () => {
    const onChange = vi.fn();
    const { container } = setup({ printType: 'draw', onChange });
    const sizeSelect = container.querySelector('select') as HTMLSelectElement;
    sizeSelect.value = 'letter';
    sizeSelect.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].page.pageSize).toBe('letter');
  });

  it('emits onSave on Save click with the current config', () => {
    const onSave = vi.fn();
    const { container } = setup({ printType: 'draw', onSave });
    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent === 'Save',
    ) as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('hides Save button in readOnly mode', () => {
    const { container } = setup({ printType: 'draw', readOnly: true, onSave: () => undefined });
    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent === 'Save',
    );
    expect(saveBtn).toBeUndefined();
  });

  it('disables form controls in readOnly mode', () => {
    const { container } = setup({ printType: 'draw', readOnly: true });
    const inputs = container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => expect(input.disabled).toBe(true));
  });

  it('renders schedule-specific content fields when printType=schedule', () => {
    const { container } = setup({ printType: 'schedule' });
    const labels = Array.from(container.querySelectorAll('.pce-field-label')).map((el) => el.textContent);
    expect(labels).toContain('Cell style');
    expect(labels).toContain('Show match numbers');
  });

  it('shows a placeholder note for unimplemented print types', () => {
    const { container } = setup({ printType: 'courtCard' });
    const note = container.querySelector('.pce-preview-note');
    expect(note?.textContent).toContain('not yet implemented');
  });

  it('destroy() removes the editor from the DOM', () => {
    const { container, editor } = setup();
    expect(container.children.length).toBe(1);
    editor.destroy();
    expect(container.children.length).toBe(0);
  });

  it('getConfig() returns a deep clone (no shared mutation)', () => {
    const { editor } = setup({ printType: 'draw', config: { header: { tournamentName: 'X' } } });
    const cfg = editor.getConfig();
    cfg.header!.tournamentName = 'mutated';
    expect(editor.getConfig().header?.tournamentName).toBe('X');
  });
});
