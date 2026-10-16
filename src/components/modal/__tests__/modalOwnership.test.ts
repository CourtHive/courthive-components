// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cModal } from '../cmodal';
const MENU_DROPDOWN = '.chc-modal-menu-dropdown';
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
  it('only dismisses the top frame on click-away, respecting that frame policy', () => {
    const parentClose = vi.fn();
    const childClose = vi.fn();
    cModal.open({ content: 'parent', onClose: parentClose });
    const parent = sections()[0] as HTMLElement;
    const child = cModal.open({ content: 'child', config: { clickAway: false }, onClose: childClose });
    (parent.firstElementChild as HTMLElement).click();
    expect(parentClose).not.toHaveBeenCalled();
    const top = sections()[1] as HTMLElement;
    (top.firstElementChild as HTMLElement).click();
    expect(childClose).not.toHaveBeenCalled();
    child.update({ config: { clickAway: true } });
    (top.firstElementChild as HTMLElement).click();
    expect(childClose).toHaveBeenCalledTimes(1);
    expect(parentClose).not.toHaveBeenCalled();
    expect(sections()).toHaveLength(1);
  });
  it('preserves the upper frame popover and listener when a lower footer closes its own frame', () => {
    vi.useFakeTimers();
    try {
      cModal.open({ content: 'parent', buttons: [{ label: 'Close lower' }] });
      const lower = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent === 'Close lower'
      )!;
      cModal.open({
        content: 'upper',
        config: { menu: { menuItems: [{ label: 'Upper action', onClick: () => {} }] } }
      });
      document.querySelector<HTMLElement>('.chc-modal-menu-caret')!.click();
      expect(document.querySelector(MENU_DROPDOWN)).not.toBeNull();
      lower.click();
      expect(sections()).toHaveLength(1);
      expect(document.querySelector(MENU_DROPDOWN)).not.toBeNull();
      vi.runOnlyPendingTimers();
      document.body.click();
      expect(document.querySelector(MENU_DROPDOWN)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
