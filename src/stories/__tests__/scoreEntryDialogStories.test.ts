/**
 * @vitest-environment happy-dom
 *
 * The score-entry dialog's STORIES, executed.
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
import { describe, it, expect, afterEach } from 'vitest';
import { cModal } from '../../components/modal/cmodal';
import * as stories from '../scoreEntryDialog.stories';

const MODAL = 'section[id^="cmdl-"]';

/** Every export that looks like a story: a `render` plus the `play` this file exists to execute. */
const playable = Object.entries(stories).filter(
  ([, story]: [string, any]) => typeof story?.render === 'function' && typeof story?.play === 'function'
) as [string, { name?: string; render: () => HTMLElement; play: (context: any) => Promise<void> }][];

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.replaceChildren();
});

describe('the dialog stories run', () => {
  // A guard, not a formality: a rename that broke the filter above would leave this file silently
  // asserting nothing, which is the failure mode it was written to prevent.
  it('found all three', () => {
    expect(playable.map(([name]) => name)).toEqual(['InModal', 'ApproachSwitching', 'FormatPicker']);
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
