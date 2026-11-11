/**
 * The format chip is a live BUTTON in every score-entry modal story, not inert text.
 *
 * CA, 2026-09-30: *"The format Chip should be active on all stories for the Score Entry modal."*
 *
 * `openScoreEntryDialog` makes the chip a button only when a host supplies `onFormatChange`; without one
 * it stays text, because a picker whose choice goes nowhere is worse than no picker. Before the fix only
 * `FormatPicker` supplied one, so every other modal story showed a chip that could not be pressed.
 *
 * Asserted across EVERY modal story rather than a sample, because the defect was per-story wiring and a
 * sample is exactly what missed it the first time. Each story is rendered here and opened from its own
 * button with a real click. Moved from the retired happy-dom `__tests__/formatChipIsLive.test.ts`.
 */
import * as roundTripStories from './scoreEntryRoundTrip.stories';
import * as overADrawStories from './scoreEntryOverADraw.stories';
import * as dialogStories from './scoreEntryDialog.stories';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { StoryObj } from '@storybook/html-vite';

export default {
  title: 'Scoring/Score Entry/Tests/Format Chip',
  tags: ['!dev']
};

const MODAL = 'section[id^="cmdl-"]';
const OPEN_BUTTON = 'button[id^="open"]';
const CHIP = 'button[data-action="editFormat"]';

function closeAll(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

const modalStories = [
  ...Object.entries(dialogStories as Record<string, any>),
  ...Object.entries(roundTripStories as Record<string, any>),
  ...Object.entries(overADrawStories as Record<string, any>)
].filter(([name, story]) => name !== 'default' && typeof story?.render === 'function');

export const ChipIsLiveInEveryModalStory: StoryObj = {
  name: 'Every score-entry modal story opens with a pressable format chip',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    // Named, so a story that stops being picked up is named in the failure rather than counted.
    await expect(modalStories.map(([name]) => name).sort()).toEqual(
      [
        'ScorelessTimedSet',
        'InModal',
        'InModalFreeScore',
        'InModalDialPad',
        'ApproachSwitching',
        'FormatPicker',
        'OutAndBackIn',
        'EnterSubmitReopenClear',
        'ReopenARetirement',
        'ReopenAMatchLevelEnding',
        'ReopenADoubleExit',
        'DrawBehindTheModal'
      ].sort()
    );

    for (const [name, story] of modalStories) {
      closeAll();
      canvasElement.replaceChildren(story.render());

      // Every one of these stories opens from its own button rather than on render.
      await user.click(canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!);

      const chip = document.querySelector<HTMLButtonElement>(`${MODAL} ${CHIP}`);
      await expect(chip, `${name}: the chip is a button, not text`).toBeTruthy();
      await expect(chip, name).toBeVisible();
      await expect(chip!.checkVisibility(), name).toBe(true);
      await expect(chip, name).toBeEnabled();
      closeAll();
    }
    canvasElement.replaceChildren();
  }
};
