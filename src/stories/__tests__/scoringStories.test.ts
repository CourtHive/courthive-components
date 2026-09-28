/**
 * @vitest-environment happy-dom
 *
 * The scoring STORIES, executed.
 *
 * `test-storybook` cannot run in this package — measured 2026-09-27, 612/612 fail on a runner-internal
 * error (test-runner 0.24 against Storybook 10.2.17) — and it appears in no workflow. The consequence is
 * that a play function here is unexecuted code: it can reference a selector that no longer exists, or
 * assert something that has quietly become false, and nothing says so until a person opens Storybook and
 * reads a red panel.
 *
 * So the play functions are driven here instead, in happy-dom, exactly as the runner would: render into
 * a canvas attached to the document, then `play({ canvasElement })`. That does NOT make this a browser —
 * layout, real pointer events and focus rings are still unchecked, and those remain reasons to open
 * Storybook. What it does mean is that a broken story fails CI rather than waiting to be noticed.
 */
import * as roundTripStories from '../scoreEntryRoundTrip.stories';
import * as dialogStories from '../scoreEntryDialog.stories';
import * as cardStories from '../scoreEntryCard.stories';
import { describe, it, expect, afterEach } from 'vitest';
import { cModal } from '../../components/modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';

type Story = { name?: string; render: () => HTMLElement; play: (context: any) => Promise<void> };

/** Every export that looks like a story: a `render` plus the `play` this file exists to execute. */
function playableIn(module: Record<string, any>): [string, Story][] {
  return Object.entries(module).filter(
    ([, story]) => typeof story?.render === 'function' && typeof story?.play === 'function'
  ) as [string, Story][];
}

const playable = [...playableIn(cardStories), ...playableIn(dialogStories), ...playableIn(roundTripStories)];

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.replaceChildren();
});

describe('the dialog stories run', () => {
  // A guard, not a formality: a rename that broke the filter above would leave this file silently
  // asserting nothing, which is the failure mode it was written to prevent.
  // Listed by name rather than counted, so a story that stops being picked up is named in the failure.
  it('found every story in both modules', () => {
    expect(playable.map(([name]) => name)).toEqual([
      'PlayedOut',
      'Walkover',
      'ClearedPartScore',
      'Tiebreak',
      'FreeScore',
      'DialPad',
      'MatchTiebreak',
      'RowEndingClosed',
      'RowEndingChosen',
      'SubmitAndReopen',
      'FormatChipClearsTheScore',
      'NineTimedBolts',
      'InModal',
      'InModalFreeScore',
      'InModalDialPad',
      'ApproachSwitching',
      'FormatPicker',
      'ReopenAWalkover',
      'OutAndBackIn',
      'ReopenARetirement',
      'ReopenAMatchLevelEnding',
      'ReopenADoubleExit'
    ]);
  });

  for (const [name, story] of playable) {
    it(`${name} — ${story.name ?? ''}`, async () => {
      const canvasElement = document.createElement('div');
      document.body.append(canvasElement);
      canvasElement.append(story.render());

      await story.play({ canvasElement });
    });
  }
});
