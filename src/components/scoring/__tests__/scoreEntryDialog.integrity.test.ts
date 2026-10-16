// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';
const sections = () => document.querySelectorAll('section[id^="cmdl-"]');
const params = {
  sides: [{ participantName: 'A' }, { participantName: 'B' }] as [
    { participantName: string },
    { participantName: string }
  ],
  matchUpFormat: 'SET3-S:6/TB7'
};
afterEach(() => {
  while (sections().length) cModal.close();
  vi.restoreAllMocks();
});
describe('score dialog owned disposal', () => {
  it('programmatic parent close disposes its nested picker and itself, once', () => {
    const onClose = vi.fn();
    const dialog = openScoreEntryDialog({ ...params, onClose });
    cModal.open({ content: 'picker' });
    dialog.close();
    dialog.close();
    expect(sections()).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('external modal close releases the document keydown handler', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const dialog = openScoreEntryDialog(params);
    const listener = add.mock.calls.find(([type]) => type === 'keydown')?.[1];
    cModal.close();
    dialog.close();
    expect(remove).toHaveBeenCalledWith('keydown', listener);
  });
});
