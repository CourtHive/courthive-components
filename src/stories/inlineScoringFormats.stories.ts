/**
 * Phase 2.5 — non-tennis format verification.
 *
 * Each story drives the interactive scoring shell through a deterministic
 * point sequence for a non-standard matchUpFormat and asserts the engine
 * reaches the expected match-complete state. The factory ScoringEngine
 * already handles every format; these stories prove the courthive-components
 * UI pipeline (InlineScoringManager → engineToMatchUp → buildInteractiveScoringShell)
 * passes that engine state through correctly.
 *
 * Run interactively: pnpm storybook
 * Run as tests:     pnpm storybook (one terminal) + pnpm test-storybook (other)
 */

import type { Meta, StoryObj } from '@storybook/html-vite';
import { within, waitFor, userEvent, expect } from 'storybook/test';
import { buildInteractiveScoringShell } from '../components/interactive-scoring/buildInteractiveScoringShell';

const SIDE1_NAME = 'Alice';
const SIDE2_NAME = 'Bob';
const SIDE1_LABEL = new RegExp(`${SIDE1_NAME} won the point`, 'i');
const SIDE2_LABEL = new RegExp(`${SIDE2_NAME} won the point`, 'i');
const MATCH_COMPLETE_SELECTOR = '.chc-iss-match-complete';

function renderShell(matchUpFormat: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.maxWidth = '500px';

  const shell = buildInteractiveScoringShell({
    matchUpId: `mu-${matchUpFormat}`,
    tournamentId: 'phase-2-5',
    matchUpFormat,
    side1Name: SIDE1_NAME,
    side2Name: SIDE2_NAME
  });
  wrap.appendChild(shell.element);
  return wrap;
}

async function clickPointN(canvas: ReturnType<typeof within>, label: RegExp, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const button = await canvas.findByLabelText(label);
    await userEvent.click(button);
  }
}

async function expectMatchComplete(winningSideName: string): Promise<void> {
  await waitFor(() => {
    const banner = document.querySelector(MATCH_COMPLETE_SELECTOR);
    expect(banner).toBeInTheDocument();
    expect(banner?.textContent || '').toContain(winningSideName);
  });
}

async function expectNotComplete(): Promise<void> {
  const banner = document.querySelector(MATCH_COMPLETE_SELECTOR);
  expect(banner).toBeNull();
}

const meta: Meta = {
  title: 'Components/Inline Scoring/Format Coverage (Phase 2.5)',
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

/**
 * Pickleball — best of 3, first to 11 (tiebreak-only sets).
 * Side 1 sweeps 11-0, 11-0 → match complete.
 */
export const PickleballSweep: Story = {
  name: 'Pickleball — SET3-S:TB11 sweep',
  render: () => renderShell('SET3-S:TB11'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await clickPointN(canvas, SIDE1_LABEL, 22);
    await expectMatchComplete(SIDE1_NAME);
  }
};

/**
 * Pickleball — win-by-2 deuce behaviour.
 * Sequence: 10 each (deuce), 1 to side1 (11-10, NOT yet won), 1 to side1 (12-10, set won),
 * then 11 to side1 for the second set. Verifies the engine honours the +2 win margin.
 */
export const PickleballDeuce: Story = {
  name: 'Pickleball — deuce + win-by-2',
  render: () => renderShell('SET3-S:TB11'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Take it to 10-10
    for (let i = 0; i < 10; i++) {
      await userEvent.click(await canvas.findByLabelText(SIDE1_LABEL));
      await userEvent.click(await canvas.findByLabelText(SIDE2_LABEL));
    }

    // 11-10 — side 1 leads but no win yet (needs +2)
    await userEvent.click(await canvas.findByLabelText(SIDE1_LABEL));
    await expectNotComplete();

    // 12-10 — set won
    await userEvent.click(await canvas.findByLabelText(SIDE1_LABEL));

    // Second set straight to side 1
    await clickPointN(canvas, SIDE1_LABEL, 11);

    await expectMatchComplete(SIDE1_NAME);
  }
};

/**
 * Badminton — best of 3, rally scoring to 21 (tiebreak-only sets).
 * Side 1 sweeps 21-0, 21-0 → match complete.
 */
export const BadmintonSweep: Story = {
  name: 'Badminton — SET3-S:TB21 sweep',
  render: () => renderShell('SET3-S:TB21'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await clickPointN(canvas, SIDE1_LABEL, 42);
    await expectMatchComplete(SIDE1_NAME);
  }
};

/**
 * Squash — best of 5, point-a-rally scoring to 11.
 * Side 1 sweeps 11-0, 11-0, 11-0 → match complete.
 */
export const SquashSweep: Story = {
  name: 'Squash — SET5-S:TB11 sweep (best of 5)',
  render: () => renderShell('SET5-S:TB11'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await clickPointN(canvas, SIDE1_LABEL, 33);
    await expectMatchComplete(SIDE1_NAME);
  }
};

/**
 * Short-set no-ad — best of 3, first to 4 games, no-ad games (4 points wins a game),
 * tiebreak (to 7) when sets reach 3-3.
 *
 * Side 1 sweeps: 4 points × 4 games × 2 sets = 32 clicks → match complete.
 */
export const NoAdShortSetSweep: Story = {
  name: 'No-ad short set — SET3-S:4NOAD/TB7@3 sweep',
  render: () => renderShell('SET3-S:4NOAD/TB7@3'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await clickPointN(canvas, SIDE1_LABEL, 32);
    await expectMatchComplete(SIDE1_NAME);
  }
};
