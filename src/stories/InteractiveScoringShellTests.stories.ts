/**
 * `buildInteractiveScoringShell` in Chromium, for the standard tennis format `SET3-S:6/TB7`: what it
 * renders, what its buttons do, and what each control's disabled state follows. The other formats are
 * driven to match-complete by `inlineScoringFormats.stories.ts`.
 *
 * Moved from the retired happy-dom `buildInteractiveScoringShell.test.ts`. The rules the shell renders
 * from (config validation, listeners, point / undo / reset, the reset confirmation) are a node test of
 * `interactiveScoringSession.ts`.
 */
import { buildInteractiveScoringShell } from '../components/interactive-scoring/buildInteractiveScoringShell';
import { expect, fn, waitFor, within } from 'storybook/test';
import { user } from './helpers/trustedUser';

import type { InteractiveScoringShell, InteractiveScoringShellConfig } from '../components/interactive-scoring/types';
import type { StoryObj } from '@storybook/html-vite';

export default {
  title: 'Scoring/Inline Scoring/Tests/Interactive Scoring Shell',
  tags: ['!dev']
};

const BASE_CONFIG: InteractiveScoringShellConfig = {
  matchUpId: 'mu-1',
  matchUpFormat: 'SET3-S:6/TB7',
  tournamentId: 'tour-1',
  side1Name: 'Alice',
  side2Name: 'Bob'
};

function mount(
  canvasElement: HTMLElement,
  config: Partial<InteractiveScoringShellConfig> = {}
): InteractiveScoringShell {
  canvasElement.replaceChildren();
  const shell = buildInteractiveScoringShell({ ...BASE_CONFIG, ...config });
  const wrap = document.createElement('div');
  wrap.style.maxWidth = '500px';
  wrap.append(shell.element);
  canvasElement.append(wrap);
  return shell;
}

const ui = (shell: InteractiveScoringShell) => {
  const canvas = within(shell.element);
  return {
    side1: () => canvas.getByRole('button', { name: 'Alice won the point' }) as HTMLButtonElement,
    side2: () => canvas.getByRole('button', { name: 'Bob won the point' }) as HTMLButtonElement,
    undo: () => canvas.getByRole('button', { name: 'Undo' }) as HTMLButtonElement,
    reset: () => canvas.getByRole('button', { name: 'Reset' }) as HTMLButtonElement,
    /** The current game as the page shows it, e.g. `15 — 0`; undefined when no game is shown. */
    game: () => shell.element.querySelector('.chc-iss-game-score')?.textContent ?? undefined,
    setCells: (side: 1 | 2) =>
      [...shell.element.querySelectorAll(`.chc-iss-score-row-side${side} .chc-iss-score-cell`)].map(
        (cell) => cell.textContent
      ),
    banner: () => shell.element.querySelector<HTMLElement>('.chc-iss-match-complete')
  };
};

const empty = () => document.createElement('div');

export const RendersTheShell: StoryObj = {
  name: 'Renders both names, both point buttons, and Undo disabled with nothing to undo',
  render: empty,
  play: async ({ canvasElement }) => {
    const shell = mount(canvasElement);
    const page = ui(shell);
    await expect(shell.element).toBeVisible();
    await expect(shell.element.classList.contains('chc-interactive-scoring-shell')).toBe(true);
    await expect(shell.element.dataset.matchupId).toBe('mu-1');
    await expect(shell.element.dataset.tournamentId).toBe('tour-1');

    const header = shell.element.querySelector<HTMLElement>('.chc-iss-header')!;
    await expect(header).toBeVisible();
    await expect(header.textContent).toBe('AlicevsBob');

    for (const button of [page.side1(), page.side2()]) {
      await expect(button).toBeVisible();
      await expect(button.checkVisibility()).toBe(true);
      await expect(button).toBeEnabled();
    }
    const controls = [...shell.element.querySelectorAll('.chc-iss-control-button')].map((b) => b.textContent);
    await expect(controls).toEqual(['Undo', 'Reset']);
    await expect(page.undo()).toBeDisabled();
    await expect(page.reset()).toBeEnabled();
    await expect(page.setCells(1)).toEqual(['0']);
    await expect(page.setCells(2)).toEqual(['0']);
  }
};

export const APointShowsAndUndoes: StoryObj = {
  name: 'A point to Alice shows 15 — 0 and enables Undo; Undo takes it back',
  render: empty,
  play: async ({ canvasElement }) => {
    const shell = mount(canvasElement);
    const page = ui(shell);
    const changed = fn();
    shell.addEventListener('stateChanged', changed);
    // What the page shows at the moment each notice arrives: the shell re-renders BEFORE it notifies.
    const seen: (string | undefined)[] = [];
    shell.addEventListener('stateChanged', () => seen.push(page.game()));

    await user.click(page.side1());
    await expect(page.game()).toBe('15 — 0');
    await expect(page.undo()).toBeEnabled();
    await expect(changed).toHaveBeenCalledTimes(1);

    await user.click(page.side2());
    await user.click(page.side1());
    await expect(page.game()).toBe('30 — 15');

    await user.click(page.undo());
    await expect(page.game(), 'the last point only').toBe('15 — 15');
    await user.click(page.undo());
    await user.click(page.undo());
    await expect(page.game()).toBe('0 — 0');
    await expect(page.undo(), 'nothing left to undo').toBeDisabled();

    // ONE notice per click — three points and three undos — each heard with the page already showing it
    await expect(changed).toHaveBeenCalledTimes(6);
    await expect(seen).toEqual(['15 — 0', '15 — 15', '30 — 15', '15 — 15', '15 — 0', '0 — 0']);
  }
};

export const PlayedToMatchComplete: StoryObj = {
  name: 'Played out 6-0 6-0: the banner names Alice and both point buttons disable',
  render: empty,
  play: async ({ canvasElement }) => {
    const shell = mount(canvasElement);
    const page = ui(shell);
    const changed = fn();
    shell.addEventListener('stateChanged', changed);

    // 2 sets × 6 games × 4 points
    for (let point = 0; point < 48; point += 1) await user.click(page.side1());

    await waitFor(() => expect(page.banner()).toBeVisible());
    await expect(page.banner()!.textContent).toBe('Alice wins');
    await expect(page.setCells(1)).toEqual(['6', '6']);
    await expect(page.setCells(2)).toEqual(['0', '0']);
    await expect(page.side1()).toBeDisabled();
    await expect(page.side2()).toBeDisabled();
    await expect(shell.getState().winningSide).toBe(1);
    // one notice per point: the winning point is ONE notice carrying the result, not two
    await expect(changed).toHaveBeenCalledTimes(48);
    const last = changed.mock.calls.at(-1)![0] as CustomEvent;
    await expect(last.detail).toMatchObject({ isComplete: true, winningSide: 1 });
    await expect(page.undo(), 'the winning point can still be undone').toBeEnabled();
  }
};

export const ResetAsksFirst: StoryObj = {
  name: 'Reset asks confirmReset: a refusal keeps the score, a yes clears it',
  render: empty,
  play: async ({ canvasElement }) => {
    let answer = false;
    const confirmReset = fn(async () => answer);
    const shell = mount(canvasElement, { confirmReset });
    const page = ui(shell);

    await user.click(page.side1());
    await user.click(page.reset());
    await waitFor(() => expect(confirmReset).toHaveBeenCalledTimes(1));
    await expect(page.game(), 'refused: the point stands').toBe('15 — 0');
    await expect(page.undo()).toBeEnabled();

    answer = true;
    await user.click(page.reset());
    await waitFor(() => expect(page.undo()).toBeDisabled());
    await expect(confirmReset).toHaveBeenCalledTimes(2);
    await expect(page.game()).toBe('0 — 0');
  }
};

export const ResetWithoutAHook: StoryObj = {
  name: 'With no confirmReset, Reset clears at once',
  render: empty,
  play: async ({ canvasElement }) => {
    const shell = mount(canvasElement);
    const page = ui(shell);
    await user.click(page.side1());
    await user.click(page.side1());
    await user.click(page.reset());
    await waitFor(() => expect(page.undo()).toBeDisabled());
    await expect(page.game()).toBe('0 — 0');
  }
};

export const DestroyEmptiesAndSilences: StoryObj = {
  name: 'destroy empties the element and stops stateChanged',
  render: empty,
  play: async ({ canvasElement }) => {
    const shell = mount(canvasElement);
    const changed = fn();
    shell.addEventListener('stateChanged', changed);
    shell.destroy();
    await expect(shell.element.childElementCount).toBe(0);
    await expect(shell.element.textContent).toBe('');
    shell.reset();
    await expect(changed, 'no listener left to hear the reset').not.toHaveBeenCalled();
  }
};
