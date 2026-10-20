// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { scoringModal } from '../scoringModal';
import { setScoringConfig } from '../config';
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
  setScoringConfig({ scoringApproach: 'dynamicSets' });
});

describe('clearing an imported retirement with no score', () => {
  for (const approach of ['dynamicSets', 'dialPad', 'freeScore', 'inlineScoring'] as const) {
    it(`${approach}: permits explicit Clear and Submit without retaining the retirement or winner`, () => {
      setScoringConfig({ scoringApproach: approach });
      const callback = vi.fn();
      scoringModal({ matchUp: retired(), callback, clearable: true });
      vi.advanceTimersByTime(200);
      const clear = document.getElementById('clearScoreV2') as HTMLButtonElement;
      expect(clear).toBeTruthy();
      expect(clear.disabled).toBe(false);
      clear.click();
      vi.advanceTimersByTime(200);
      const submit = document.getElementById('submitScoreV2') as HTMLButtonElement;
      expect(submit.disabled).toBe(false);
      submit.click();
      expect(callback).toHaveBeenCalledOnce();
      const outcome = callback.mock.calls[0][0];
      expect(outcome.sets).toEqual([]);
      expect(outcome.winningSide).toBeFalsy();
      expect(outcome.matchUpStatus ?? 'TO_BE_PLAYED').toBe('TO_BE_PLAYED');
    });

    it(`${approach}: allows a form reset but refuses submitting an empty removal`, () => {
      setScoringConfig({ scoringApproach: approach });
      scoringModal({ matchUp: retired(), callback: vi.fn(), clearable: false });
      vi.advanceTimersByTime(200);
      const clear = document.getElementById('clearScoreV2') as HTMLButtonElement;
      expect(clear.disabled).toBe(false);
      clear.click();
      vi.advanceTimersByTime(200);
      expect((document.getElementById('submitScoreV2') as HTMLButtonElement).disabled).toBe(true);
    });
  }

  for (const approach of ['dynamicSets', 'dialPad', 'freeScore'] as const) {
    it(`new dialog ${approach}: can clear the imported status`, () => {
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
    it(`new dialog ${approach}: Clear resets the form without permitting empty submission`, () => {
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

  it('new dialog: Clear permits retyping a score while an empty removal is refused', () => {
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
