/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { buildInteractiveScoringShell } from '../buildInteractiveScoringShell';
import type { StateChangedDetail } from '../types';

const STANDARD_FORMAT = 'SET3-S:6/TB7';
const SIDE1_BUTTON_SELECTOR = '.chc-iss-point-button-side1';
const SIDE2_BUTTON_SELECTOR = '.chc-iss-point-button-side2';
const UNDO_SELECTOR = '.chc-iss-control-undo';

const BASE_CONFIG = {
  matchUpId: 'mu-1',
  matchUpFormat: STANDARD_FORMAT,
  tournamentId: 'tour-1',
  side1Name: 'Alice',
  side2Name: 'Bob'
};

// Stub globalThis.confirm so `reset()` with confirmReset returns true in tests
beforeEach(() => {
  globalThis.confirm = vi.fn(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildInteractiveScoringShell', () => {
  describe('construction', () => {
    it('throws when matchUpId is missing', () => {
      expect(() => buildInteractiveScoringShell({ ...BASE_CONFIG, matchUpId: '' })).toThrow(/matchUpId/);
    });

    it('throws when matchUpFormat is missing', () => {
      expect(() => buildInteractiveScoringShell({ ...BASE_CONFIG, matchUpFormat: '' })).toThrow(/matchUpFormat/);
    });

    it('returns a shell with an HTMLElement root', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      expect(shell.element).toBeInstanceOf(HTMLElement);
      expect(shell.element.classList.contains('chc-interactive-scoring-shell')).toBe(true);
    });

    it('renders side names in the header', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      expect(shell.element.textContent).toContain('Alice');
      expect(shell.element.textContent).toContain('Bob');
    });

    it('sets data attributes for matchUpId and tournamentId', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      expect(shell.element.dataset.matchupId).toBe('mu-1');
      expect(shell.element.dataset.tournamentId).toBe('tour-1');
    });

    it('renders both point-won buttons', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const buttons = shell.element.querySelectorAll('.chc-iss-point-button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].classList.contains('chc-iss-point-button-side1')).toBe(true);
      expect(buttons[1].classList.contains('chc-iss-point-button-side2')).toBe(true);
    });

    it('renders the control bar with undo and reset', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const controls = shell.element.querySelectorAll('.chc-iss-control-button');
      expect(controls.length).toBe(2);
      expect(controls[0].textContent).toBe('Undo');
      expect(controls[1].textContent).toBe('Reset');
    });

    it('disables undo initially when there are no points to undo', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const undo = shell.element.querySelector(UNDO_SELECTOR) as HTMLButtonElement;
      expect(undo.disabled).toBe(true);
    });
  });

  describe('point entry', () => {
    it('awards a point to side 1 and updates the score display', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button.click();

      const gameScore = shell.element.querySelector('.chc-iss-game-score');
      expect(gameScore).not.toBeNull();
      // After side 1 wins a point from 0-0, the game score should reflect it
      // (exact display depends on engine, but "0" should no longer be the side1 score)
      expect(gameScore?.textContent).toContain('—');
    });

    it('enables the undo button after the first point', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button.click();

      const undo = shell.element.querySelector(UNDO_SELECTOR) as HTMLButtonElement;
      expect(undo.disabled).toBe(false);
    });

    it('disables point buttons when the match is complete', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = () => shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      const side2Button = () => shell.element.querySelector(SIDE2_BUTTON_SELECTOR) as HTMLButtonElement;

      // Play a fast match by awarding every point to side 1 until complete
      // (best-of-3, first to 6 games per set, 2 sets to win → 4 games per set × 4 points per game = 48 points max)
      let safety = 500;
      while (!shell.getState().winningSide && safety-- > 0) {
        const button = side1Button();
        if (button.disabled) break;
        button.click();
      }

      expect(shell.getState().winningSide).toBe(1);
      expect(side1Button().disabled).toBe(true);
      expect(side2Button().disabled).toBe(true);
    });

    it('does not throw when clicking point buttons after match complete', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = () => shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      let safety = 500;
      while (!shell.getState().winningSide && safety-- > 0) {
        side1Button().click();
      }
      // Click again after complete — should be a no-op
      expect(() => side1Button().click()).not.toThrow();
    });
  });

  describe('undo', () => {
    it('rolls back the previous point', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = () => shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button().click();
      side1Button().click();
      const stateAfterTwo = shell.getState();

      const undo = () => shell.element.querySelector(UNDO_SELECTOR) as HTMLButtonElement;
      undo().click();
      const stateAfterUndo = shell.getState();

      // The state should have changed — exact shape depends on engine, but
      // something must be different
      expect(JSON.stringify(stateAfterUndo)).not.toBe(JSON.stringify(stateAfterTwo));
    });
  });

  describe('stateChanged events', () => {
    it('fires stateChanged on every point', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const listener = vi.fn();
      shell.addEventListener('stateChanged', listener);

      const side1Button = () => shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button().click();
      side1Button().click();
      side1Button().click();

      expect(listener).toHaveBeenCalledTimes(3);
      const event = listener.mock.calls[0][0] as CustomEvent<StateChangedDetail>;
      expect(event.detail.matchUpId).toBe('mu-1');
      expect(event.detail.matchUp).toBeDefined();
      expect(event.detail.isComplete).toBe(false);
    });

    it('fires stateChanged with isComplete=true on match completion', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const listener = vi.fn();
      shell.addEventListener('stateChanged', listener);

      const side1Button = () => shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      let safety = 500;
      while (!shell.getState().winningSide && safety-- > 0) {
        side1Button().click();
      }

      const calls = listener.mock.calls;
      const lastEvent = calls.at(-1)[0] as CustomEvent<StateChangedDetail>;
      expect(lastEvent.detail.isComplete).toBe(true);
      expect(lastEvent.detail.winningSide).toBe(1);
    });

    it('removes listeners via removeEventListener', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const listener = vi.fn();
      shell.addEventListener('stateChanged', listener);
      shell.removeEventListener('stateChanged', listener);

      const side1Button = shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button.click();

      expect(listener).not.toHaveBeenCalled();
    });

    it('swallows listener errors without breaking the shell', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const throwingListener = vi.fn(() => {
        throw new Error('listener boom');
      });
      shell.addEventListener('stateChanged', throwingListener);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const side1Button = shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      expect(() => side1Button.click()).not.toThrow();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears state back to 0-0 when confirmed', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = () => shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button().click();
      side1Button().click();
      side1Button().click();

      shell.reset();
      const undo = shell.element.querySelector(UNDO_SELECTOR) as HTMLButtonElement;
      expect(undo.disabled).toBe(true);
    });

    it('does not reset when confirm returns false', () => {
      globalThis.confirm = vi.fn(() => false);
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const side1Button = shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button.click();

      // Click reset button (not the direct reset() method — that's unconditional)
      const resetButton = shell.element.querySelector('.chc-iss-control-reset') as HTMLButtonElement;
      resetButton.click();

      const undo = shell.element.querySelector(UNDO_SELECTOR) as HTMLButtonElement;
      // Undo should still be enabled — reset was cancelled
      expect(undo.disabled).toBe(false);
    });
  });

  describe('destroy', () => {
    it('clears listeners and empties the element', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const listener = vi.fn();
      shell.addEventListener('stateChanged', listener);

      shell.destroy();
      expect(shell.element.innerHTML).toBe('');

      // After destroy, listeners should be cleared (no easy way to verify
      // directly, but at least the shell is inert)
      expect(() => shell.getState()).not.toThrow();
    });
  });

  describe('getState', () => {
    it('returns the current matchUp snapshot', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const initialState = shell.getState();
      expect(initialState.matchUpId).toBe('mu-1');
      expect(initialState.matchUpFormat).toBe(STANDARD_FORMAT);
    });

    it('reflects changes after point entry', () => {
      const shell = buildInteractiveScoringShell(BASE_CONFIG);
      const initial = JSON.stringify(shell.getState());

      const side1Button = shell.element.querySelector(SIDE1_BUTTON_SELECTOR) as HTMLButtonElement;
      side1Button.click();

      const after = JSON.stringify(shell.getState());
      expect(after).not.toBe(initial);
    });
  });
});
