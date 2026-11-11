/**
 * Notes toolbar URL popover — focus on open WITHOUT tippy's stylesheet.
 *
 * This file deliberately does not import `styles/tippy.css` (each story file runs in its own frame, so the
 * stylesheet imported by `NotesToolbarTests.stories.ts` is absent here). tippy's `onShown` waits for the
 * transitionend that stylesheet drives, so focus placed there never arrived for a consumer that imports
 * `notesToolbar` without the package entry's CSS. The popover must focus its input regardless.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/NotesToolbarNoTippyCssTests.stories.ts`
 */
import { notesToolbar } from '../components/notes-toolbar/notesToolbar';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Foundations/Notes Editor/Tests/Toolbar Without Tippy CSS',
  tags: ['!dev']
};
export default meta;

const onLink = fn();

export const UrlInputFocusesWithoutTheStylesheet: StoryObj = {
  render: () => {
    onLink.mockClear();
    const host = document.createElement('div');
    host.style.padding = '1em';
    host.style.minHeight = '200px';
    host.appendChild(notesToolbar({ onLink }));
    return host;
  },
  play: async ({ canvasElement }) => {
    // the premise: tippy's stylesheet is not loaded in this frame
    const probe = document.createElement('div');
    probe.className = 'tippy-box';
    document.body.appendChild(probe);
    const transition = getComputedStyle(probe).transitionProperty;
    probe.remove();
    await expect(transition).toBe('all');

    await user.click(canvasElement.querySelector<HTMLElement>('[data-action="link"]')!);
    const input = await waitFor(() => {
      const found = document.querySelector<HTMLInputElement>('.notes-url-panel .notes-url-input');
      expect(found).not.toBeNull();
      return found!;
    });
    await waitFor(() => expect(input).toHaveFocus());
    await user.keyboard('https://courthive.com{Enter}');
    await expect(onLink).toHaveBeenCalledOnce();
    await expect(onLink).toHaveBeenCalledWith('https://courthive.com');
  }
};
