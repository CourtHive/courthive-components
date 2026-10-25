// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const CLEAR_SELECTOR = '[data-action="clear"]';
const SUBMIT_SELECTOR = '[data-action="submit"]';
const PLAYER_ONE = 'Player One';
const PLAYER_TWO = 'Player Two';

const retired = () => ({
  matchUpId: '1183741554',
  matchUpStatus: 'RETIRED',
  winningSide: 2,
  matchUpFormat: 'SET3-S:6/TB7-F:TB10',
  score: { sets: [], side1PointScore: '0', side2PointScore: '0', scoreStringSide1: '', scoreStringSide2: '' },
  sides: [
    { sideNumber: 1, participant: { participantName: PLAYER_ONE } },
    { sideNumber: 2, participant: { participantName: PLAYER_TWO } }
  ]
});

function closeAll(): void {
  for (let attempt = 0; attempt < 5 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
}

beforeEach(() => {
  vi.useFakeTimers();
  closeAll();
});

afterEach(() => {
  closeAll();
  vi.useRealTimers();
});

describe('clearing an imported retirement with no score', () => {
  for (const approach of ['dynamicSets', 'dialPad', 'freeScore'] as const) {
    it(`${approach}: can clear the imported status`, () => {
      const onSubmit = vi.fn();
      openScoreEntryDialog({
        matchUp: retired(),
        sides: [{ participantName: PLAYER_ONE }, { participantName: PLAYER_TWO }],
        approach,
        clearable: true,
        onSubmit
      });
      vi.advanceTimersByTime(200);
      const clear = document.querySelector<HTMLButtonElement>(CLEAR_SELECTOR)!;
      expect(clear.disabled).toBe(false);
      clear.click();
      const submit = document.querySelector<HTMLButtonElement>(SUBMIT_SELECTOR)!;
      expect(submit.disabled).toBe(false);
      submit.click();
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0][0]).toEqual({
        cleared: true,
        sets: [],
        outcome: { score: { sets: [] }, matchUpStatusCodes: [] }
      });
    });
  }

  for (const approach of ['dynamicSets', 'dialPad', 'freeScore'] as const) {
    it(`${approach}: Clear resets the form without permitting empty submission`, () => {
      const onSubmit = vi.fn();
      openScoreEntryDialog({
        matchUp: retired(),
        sides: [{ participantName: PLAYER_ONE }, { participantName: PLAYER_TWO }],
        approach,
        clearable: false,
        onSubmit
      });
      const clear = document.querySelector<HTMLButtonElement>(CLEAR_SELECTOR)!;
      expect(clear.disabled).toBe(false);
      clear.click();
      const submit = document.querySelector<HTMLButtonElement>(SUBMIT_SELECTOR)!;
      expect(submit.disabled).toBe(true);
      submit.click();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  }

  it('Clear permits retyping a score while an empty removal is refused', () => {
    const onSubmit = vi.fn();
    openScoreEntryDialog({
      matchUp: retired(),
      sides: [{ participantName: PLAYER_ONE }, { participantName: PLAYER_TWO }],
      approach: 'dynamicSets',
      clearable: false,
      onSubmit
    });
    const clear = document.querySelector<HTMLButtonElement>(CLEAR_SELECTOR)!;
    expect(clear.disabled).toBe(false);
    clear.click();
    expect(document.querySelector<HTMLButtonElement>(SUBMIT_SELECTOR)!.disabled).toBe(true);
    for (const [side, set, value] of [
      [1, 1, '3'],
      [2, 1, '6'],
      [1, 2, '4'],
      [2, 2, '6']
    ] as const) {
      const input = document.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
      expect(input.disabled).toBe(false);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const submit = document.querySelector<HTMLButtonElement>(SUBMIT_SELECTOR)!;
    expect(submit.disabled).toBe(false);
    submit.click();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0].outcome).toMatchObject({ matchUpStatus: 'COMPLETED', winningSide: 2 });
  });
});
