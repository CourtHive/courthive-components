/** @vitest-environment happy-dom */
import { isComplete, isSettled, matchUpStatus, error } from '../logic/scoreEntrySelectors';
import { createScoreEntryModel, chooseEnding, setCell } from '../logic/scoreEntryModel';
import { matchUpStatusConstants, scoreGovernor } from 'tods-competition-factory';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const { COMPLETED, RETIRED, SUSPENDED, WALKOVER } = matchUpStatusConstants;
const TIMED = 'SET1-S:T15P';
const DECIDING = 'SET1-S:T15P/TB1';
const MODAL = 'section[id^="cmdl-"]';
const SUBMIT = 'button[data-action="submit"]';
const MESSAGE = 'Timed set requires at least one side to have scored';
const zero = { setNumber: 1, side1Score: 0, side2Score: 0 };

const modelFor = (matchUpFormat = TIMED, side1Score = 0, side2Score = 0) =>
  createScoreEntryModel({ matchUpFormat, sets: [{ ...zero, side1Score, side2Score }] });

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.replaceChildren();
});

describe('single timed set with no points', () => {
  it.each([TIMED, DECIDING, 'SET1-S:T15', 'SET1X-S:T15P'])(
    'refuses a completed 0–0 consistently with the factory: %s',
    (format) => {
      const model = modelFor(format);
      const validation = scoreGovernor.validateSetScore(zero, format, false, false);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe(MESSAGE);
      expect(error(model)).toContain(MESSAGE);
      expect(isSettled(model, 0)).toBe(false);
      expect(isComplete(model)).toBe(false);
      expect(matchUpStatus(model)).toBeUndefined();
    }
  );

  it.each([
    [1, 0],
    [0, 1],
    [9, 9],
    [11, 8]
  ])('still completes scored timed results %i–%i', (a, b) => {
    const model = modelFor(TIMED, a, b);
    expect(error(model)).toBeUndefined();
    expect(isComplete(model)).toBe(true);
    expect(matchUpStatus(model)).toBe(COMPLETED);
  });

  it('does not treat a blank or half-entered score as 0–0', () => {
    const empty = createScoreEntryModel({ matchUpFormat: TIMED });
    const partial = setCell(empty, { setIndex: 0, side: 1, kind: 'games' }, 0);
    for (const model of [empty, partial]) {
      expect(error(model)).toBeUndefined();
      expect(isComplete(model)).toBe(false);
    }
  });

  it('keeps non-completed endings available and restores the refusal when unchosen', () => {
    const initial = modelFor();
    const retired = chooseEnding(initial, { kind: 'side', sideNumber: 2, status: RETIRED });
    const suspended = chooseEnding(initial, { kind: 'match', status: SUSPENDED });
    const walkover = chooseEnding(initial, { kind: 'side', sideNumber: 2, status: WALKOVER });
    for (const model of [retired, suspended, walkover]) {
      expect(error(model)).toBeUndefined();
      expect(isComplete(model)).toBe(false);
      expect(matchUpStatus(model)).not.toBe(COMPLETED);
    }
    expect(error(chooseEnding(retired, { kind: 'side', sideNumber: 2, status: RETIRED }))).toContain(MESSAGE);
  });

  it.each(['SET2XA-S:T15P', 'SET3X-S:T10', 'SET1XA-S:T15P'])('preserves scoreless periods in %s', (format) => {
    const model = modelFor(format);
    expect(isSettled(model, 0)).toBe(true);
    expect(error(model)).toBeUndefined();
  });

  it('still completes an aggregate with a scoreless period', () => {
    const model = createScoreEntryModel({
      matchUpFormat: 'SET2XA-S:T15P',
      sets: [zero, { setNumber: 2, side1Score: 1, side2Score: 0 }]
    });
    expect(error(model)).toBeUndefined();
    expect(isComplete(model)).toBe(true);
  });
});

describe('dialog submission', () => {
  it.each(['dynamicSets', 'freeScore', 'dialPad'] as const)('blocks a seeded 0–0 in %s and shows why', (approach) => {
    const onSubmit = vi.fn();
    const dialog = openScoreEntryDialog({
      sides: [{ participantName: 'Side one' }, { participantName: 'Side two' }],
      matchUpFormat: TIMED,
      approach,
      sets: [zero],
      onSubmit
    });
    const button = dialog.card.element.querySelector<HTMLButtonElement>(SUBMIT)!;
    expect(button.disabled).toBe(true);
    expect(dialog.card.element.textContent).toContain(MESSAGE);
    button.click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a typed 0–0, then submits after either side scores', () => {
    const onSubmit = vi.fn();
    const dialog = openScoreEntryDialog({
      sides: [{ participantName: 'Side one' }, { participantName: 'Side two' }],
      matchUpFormat: TIMED,
      approach: 'dynamicSets',
      onSubmit
    });
    const type = (side: number, value: string) => {
      const input = dialog.card.element.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="1"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const submit = () => dialog.card.element.querySelector<HTMLButtonElement>(SUBMIT)!;
    type(1, '0');
    type(2, '0');
    expect(submit().disabled).toBe(true);
    expect(dialog.card.element.textContent).toContain(MESSAGE);
    type(2, '1');
    expect(submit().disabled).toBe(false);
    expect(dialog.card.element.textContent).not.toContain(MESSAGE);
    submit().click();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0].outcome).toMatchObject({ matchUpStatus: COMPLETED, winningSide: 2 });
  });
});
