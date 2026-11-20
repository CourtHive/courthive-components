import { getCategoryModal } from '../components/categories/category/category';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

/**
 * A category name may be as short as its code. The editor required five characters, so the common short names
 * (U9, U16, MS, 18U) could not be saved: an existing "U16" opened with OK disabled and stayed that way, which is how
 * TMX's "Define" on an event's undefined category could not complete.
 */
const meta: Meta = {
  title: 'Policies & Setup/Categories/Tests/Short Names',
  tags: ['!dev']
};
export default meta;

const okButton = () => document.getElementById('categoryOkButton') as HTMLButtonElement | null;
const nameInput = () => document.querySelector<HTMLInputElement>('input[placeholder^="e.g., Boys U18"]') ?? undefined;

export const ShortCodeName: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    getCategoryModal({
      existingCategory: { categoryName: 'U9', type: 'AGE', ageCategoryCode: 'U9' } as any,
      editorConfig: { defaultConsideredDate: '2026-11-20' },
      callback: () => undefined
    });
    return container;
  },
  play: async ({ step }) => {
    await step('an existing two-character category opens ready to save', async () => {
      await waitFor(() => expect(okButton()).toBeTruthy());
      await waitFor(() => expect(okButton()?.disabled).toBe(false));
    });

    await step('the name is required, at any length', async () => {
      const input = nameInput();
      await expect(input, 'the category name input').toBeTruthy();
      await user.clear(input as HTMLInputElement);
      await waitFor(() => expect(okButton()?.disabled).toBe(true));
      await user.fill(input as HTMLInputElement, 'U9');
      await waitFor(() => expect(okButton()?.disabled).toBe(false));
    });
  }
};
