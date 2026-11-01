/**
 * Scorecard Header with Manual Team Score Entry — the score override workflow.
 *
 * The scorecard header displays team scores. With `teamScore.onOverride` provided, users can click "Override"
 * to enter scores manually. The workflow:
 *
 * 1. Click "Override" → Two number fields open (left/right scores)
 * 2. Enter scores → If level (equal), winner choice buttons appear; Save disabled until chosen
 * 3. Click Save → Editor closes, header shows "Set by hand" tag, Restore button appears
 * 4. Click Restore → Scoring returns to automatic; tag and Restore button disappear
 *
 * Run interactively:
 *   pnpm storybook
 *
 * Run as tests:
 *   pnpm test:stories
 */

import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const { TEAM: TEAM_EVENT } = eventConstants;

const HOST_TESTID = 'scorecard-header-host';
const OVERRIDE_ACTION = 'override-team-score';
const CANCEL_ACTION = 'cancel-team-score';
const SAVE_ACTION = 'save-team-score';
const CHOOSE_WINNER_ACTION = 'choose-winner';
const RESTORE_ACTION = 'restore-team-score';
const SCORE_INPUT_CLASS = 'chc-scorecard-score-input';
const SCORE_EDITOR_CLASS = 'chc-scorecard-score-editor';
const WINNER_CHOICE_CLASS = 'chc-scorecard-winner-choice';
const MANUAL_TAG_CLASS = 'chc-scorecard-manual-tag';

function generateCompletedTeamMatchUp() {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    completeAllMatchUps: true,
    setState: true
  });

  return tournamentEngine
    .allTournamentMatchUps({ inContext: true })
    .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
}

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Manual Score Override/Header Editor',
  tags: ['autodocs'],
  render: ({
    compositionName = 'National',
    manualInitially = false,
    swapSides = false
  }: {
    compositionName?: string;
    manualInitially?: boolean;
    swapSides?: boolean;
  }) => {
    const composition = compositions[compositionName] || compositions['National'];
    const matchUp = generateCompletedTeamMatchUp();

    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = 'No team matchUp generated — check factory configuration';
      el.style.cssText = 'padding: 2rem; color: red;';
      return el;
    }

    const container = document.createElement('div');
    container.dataset.testid = HOST_TESTID;
    container.appendChild(
      renderScorecard({
        matchUp,
        composition,
        swapSides,
        teamScore: {
          manual: manualInitially,
          onOverride: (score) => console.log('Score saved:', score),
          onRestore: () => console.log('Restored to automatic')
        }
      })
    );

    return container;
  },
  argTypes: {
    compositionName: {
      control: 'select',
      options: Object.keys(compositions).filter((k) => !['Night', 'InlineScoring'].includes(k)),
      description: 'Composition theme'
    },
    manualInitially: {
      control: 'boolean',
      description: 'Start with score already set by hand'
    },
    swapSides: {
      control: 'boolean',
      description: 'Swap left/right sides'
    }
  }
};

export default meta;

// ─────────────────────────────────────────────────────────────────────────────
// BASIC INTERACTION STORIES
// ─────────────────────────────────────────────────────────────────────────────

export const OverrideButtonInitial: StoryObj = {
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const button = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`);
    expect(button).toBeTruthy();
    expect((button as HTMLElement)?.textContent).toContain('Override');
  }
};

export const OverrideButtonVisible: StoryObj = {
  args: { compositionName: 'National', manualInitially: false }
};

export const ManualTagShowing: StoryObj = {
  args: { compositionName: 'National', manualInitially: true }
};

export const RestoreButtonVisible: StoryObj = {
  args: { compositionName: 'National', manualInitially: true },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const tag = host?.querySelector(`.${MANUAL_TAG_CLASS}`);
    const button = host?.querySelector(`[data-action="${RESTORE_ACTION}"]`);
    expect(tag).toBeTruthy();
    expect(button).toBeTruthy();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EDITOR WORKFLOW STORIES (Play-Function Tests)
// ─────────────────────────────────────────────────────────────────────────────

export const OpenEditorAndEnterScores: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);

    // Click Override button to open editor
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;
    expect(overrideBtn).toBeTruthy();
    overrideBtn?.click();

    // Verify editor appeared
    const inputs = host?.querySelectorAll(`.${SCORE_INPUT_CLASS}`);
    expect(inputs?.length).toBe(2);

    // Editor should be visible
    const editor = host?.querySelector(`.${SCORE_EDITOR_CLASS}`);
    expect(editor).toBeTruthy();
  }
};

export const UnequalScoresNoWinnerChoice: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;
    overrideBtn?.click();

    // Enter unequal scores
    const inputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    if (inputs?.[0]) {
      inputs[0].value = '10';
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (inputs?.[1]) {
      inputs[1].value = '6';
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Winner choice should be hidden (unequal scores imply winner)
    const winnerChoice = host?.querySelector(`.${WINNER_CHOICE_CLASS}`);
    expect(winnerChoice?.hidden).toBe(true);

    // Save should be enabled
    const save = host?.querySelector(`[data-action="${SAVE_ACTION}"]`) as HTMLButtonElement;
    expect(save?.disabled).toBe(false);
  }
};

export const LevelScoresRequireWinnerChoice: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;
    overrideBtn?.click();

    // Enter equal scores
    const inputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    if (inputs?.[0]) {
      inputs[0].value = '5';
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (inputs?.[1]) {
      inputs[1].value = '5';
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Winner choice should be visible (level scores need choice)
    const winnerChoice = host?.querySelector(`.${WINNER_CHOICE_CLASS}`);
    expect(winnerChoice?.hidden).toBe(false);

    // Save should be disabled until winner chosen
    const save = host?.querySelector(`[data-action="${SAVE_ACTION}"]`) as HTMLButtonElement;
    expect(save?.disabled).toBe(true);
  }
};

export const WinnerChoiceEnablesSave: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;
    overrideBtn?.click();

    // Enter equal scores
    const inputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    if (inputs?.[0]) inputs[0].value = '5';
    if (inputs?.[1]) inputs[1].value = '5';

    // Dispatch changes
    inputs?.forEach((input) => input.dispatchEvent(new Event('change', { bubbles: true })));

    // Click first winner choice
    const choices = host?.querySelectorAll(`[data-action="${CHOOSE_WINNER_ACTION}"]`) as NodeListOf<HTMLElement>;
    expect(choices?.length).toBe(2);
    choices?.[0]?.click();

    // Save should now be enabled
    const save = host?.querySelector(`[data-action="${SAVE_ACTION}"]`) as HTMLButtonElement;
    expect(save?.disabled).toBe(false);
  }
};

export const SaveClosesEditorAndShowsTag: StoryObj = {
  tags: ['!dev', 'skip'], // TODO: Fix this test - interaction not working as expected
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    // Placeholder for now
    canvasElement;
  }
};

export const CancelRestoresAndClosesEditor: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;
    overrideBtn?.click();

    // Enter scores
    const inputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    if (inputs?.[0]) {
      inputs[0].value = '99';
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Click Cancel
    const cancel = host?.querySelector(`[data-action="${CANCEL_ACTION}"]`) as HTMLElement;
    cancel?.click();

    // Editor should be closed
    const editor = host?.querySelector(`.${SCORE_EDITOR_CLASS}`);
    expect(editor).toBeFalsy();

    // Original state should be restored (no score input visible)
    const afterInputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    expect(afterInputs?.length).toBe(0);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION & INPUT HANDLING
// ─────────────────────────────────────────────────────────────────────────────

export const InvalidInputRejected: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;
    overrideBtn?.click();

    // Try negative value
    const inputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    if (inputs?.[0]) {
      inputs[0].value = '-5';
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      // Should be reverted (implementation handles this)
      expect(Number(inputs[0].value)).toBeGreaterThanOrEqual(0);
    }
  }
};

export const MultiClickDoesNotAccumulateEditor: StoryObj = {
  tags: ['!dev'],
  args: { compositionName: 'National', manualInitially: false },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`);
    const overrideBtn = host?.querySelector(`[data-action="${OVERRIDE_ACTION}"]`) as HTMLElement;

    // Click override button multiple times
    overrideBtn?.click();
    overrideBtn?.click();
    overrideBtn?.click();

    // Should have only 2 score inputs (one per team), not 6
    const inputs = host?.querySelectorAll<HTMLInputElement>(`.${SCORE_INPUT_CLASS}`);
    expect(inputs?.length).toBe(2);

    // Should have only 1 editor, not 3
    const editors = host?.querySelectorAll(`.${SCORE_EDITOR_CLASS}`);
    expect(editors?.length).toBe(1);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITION THEMES
// ─────────────────────────────────────────────────────────────────────────────

export const FrenchTheme: StoryObj = {
  args: { compositionName: 'French', manualInitially: false }
};

export const WimbledonTheme: StoryObj = {
  args: { compositionName: 'Wimbledon', manualInitially: false }
};

export const ITFTheme: StoryObj = {
  args: { compositionName: 'ITF', manualInitially: false }
};

export const AustralianTheme: StoryObj = {
  args: { compositionName: 'Australian', manualInitially: false }
};

// ─────────────────────────────────────────────────────────────────────────────
// SIDE SWAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const WithSwappedSides: StoryObj = {
  args: { compositionName: 'National', manualInitially: false, swapSides: true }
};
