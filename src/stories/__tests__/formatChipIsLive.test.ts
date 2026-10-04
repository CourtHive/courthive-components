// @vitest-environment happy-dom
/**
 * The format chip is a BUTTON in every score-entry story, not inert text.
 *
 * CA, 2026-09-30: *"The format Chip should be active on all stories for the Score Entry modal."*
 *
 * `openScoreEntryDialog` makes the chip a button only when a host supplies `onFormatChange` — without
 * one it stays text, because a picker whose choice goes nowhere is worse than no picker. Measured
 * before the fix: of the story modules, only `FormatPicker` supplied one, so every other modal story
 * showed a chip that could not be pressed.
 *
 * Asserted across EVERY story rather than a sample, because the defect was per-story wiring and a
 * sample is exactly what missed it the first time.
 */
import { describe, expect, it } from 'vitest';

import * as roundTripStories from '../scoreEntryRoundTrip.stories';
import * as overADrawStories from '../scoreEntryOverADraw.stories';
import * as dialogStories from '../scoreEntryDialog.stories';
import { cModal } from '../../components/modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';
const OPEN_BUTTON = 'button[id^="open"]';

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

const modalStories = [
  ...Object.entries(dialogStories as Record<string, any>),
  ...Object.entries(roundTripStories as Record<string, any>),
  ...Object.entries(overADrawStories as Record<string, any>)
].filter(([name, story]) => name !== 'default' && typeof story?.render === 'function');

describe('the format chip is live in every modal story', () => {
  it('found the stories, so a pass cannot mean an empty list', () => {
    expect(modalStories.length).toBeGreaterThanOrEqual(9);
  });

  for (const [name, story] of modalStories) {
    it(`${name}`, () => {
      closeAll();
      const canvas = document.createElement('div');
      document.body.append(canvas);
      canvas.append(story.render());

      // Every one of these stories opens from its own button rather than on render.
      canvas.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

      const chip = document.querySelector<HTMLButtonElement>('button[data-action="editFormat"]');
      expect(chip, 'the chip is a button, not text').toBeTruthy();
      expect(chip!.disabled).toBe(false);

      closeAll();
    });
  }
});
