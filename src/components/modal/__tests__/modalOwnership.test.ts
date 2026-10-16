// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cModal } from '../cmodal';
const sections = () => document.querySelectorAll('section[id^="cmdl-"]');
afterEach(() => {
  while (sections().length) cModal.close();
});
describe('modal ownership', () => {
  it('keeps a replacement opened by onClose and removes the original first', () => {
    cModal.open({ content: 'original', onClose: () => cModal.open({ content: 'replacement' }) });
    cModal.close();
    expect(sections()).toHaveLength(1);
    expect(document.body.textContent).toContain('replacement');
    expect(document.body.textContent).not.toContain('original');
  });
  it('updates only the callback belonging to a nested handle', () => {
    const parent = vi.fn();
    const child = vi.fn();
    cModal.open({ content: 'parent', onClose: parent });
    const handle = cModal.open({ content: 'child' });
    handle.update({ onClose: child });
    cModal.close();
    cModal.close();
    expect(parent).toHaveBeenCalledTimes(1);
    expect(child).toHaveBeenCalledTimes(1);
  });
  it('finishes teardown even when the host callback throws', () => {
    cModal.open({
      content: 'dialog',
      onClose: () => {
        throw new Error('host error');
      }
    });
    expect(() => cModal.close()).toThrow('host error');
    expect(sections()).toHaveLength(0);
  });
  it('a default footer close removes only one modal', () => {
    cModal.open({ content: 'parent' });
    cModal.open({ content: 'child', buttons: [{ label: 'Close child' }] });
    (
      Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Close child'
      ) as HTMLButtonElement
    ).click();
    expect(sections()).toHaveLength(1);
    expect(document.body.textContent).toContain('parent');
  });
});
