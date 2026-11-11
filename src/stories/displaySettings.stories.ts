import { openDisplaySettingsDialog } from '../components/display-settings/openDisplaySettingsDialog';
import { compositions } from '../compositions/compositions';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = { title: 'Policies & Setup/Composition/Display Settings', parameters: { layout: 'padded' } };
export default meta;

export const BasicAndAdvanced: StoryObj = {
  render: () => {
    const host = document.createElement('div');
    const open = document.createElement('button');
    open.textContent = 'Edit display settings';
    const output = document.createElement('pre');
    output.dataset.savedDisplay = 'true';
    open.onclick = () =>
      openDisplaySettingsDialog({
        composition: compositions['Broadcast Bold'],
        compositionName: 'Broadcast Bold',
        onSave: (value) => {
          output.textContent = JSON.stringify(value, null, 2);
        }
      });
    host.append(open, output);
    return host;
  },
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector<HTMLButtonElement>('button')!);
    const dialog = document.querySelector<HTMLElement>('.chc-display-settings')!;
    expect(dialog.dataset.mode).toBe('basic');
    expect(dialog.querySelectorAll('.tmx-m')).toHaveLength(2);
    const mode = dialog.querySelector<HTMLButtonElement>('.chc-display-settings-mode')!;
    await user.click(mode);
    expect(dialog.dataset.mode).toBe('advanced');
    expect(document.querySelector('.chc-modal-container')!.getBoundingClientRect().width).toBeLessThanOrEqual(
      innerWidth
    );
    await user.click(
      [...dialog.querySelectorAll<HTMLElement>('.ce-section-header')].find((element) =>
        element.textContent?.includes('Colors')
      )!
    );
    const row = [...dialog.querySelectorAll('.ce-color-field')].find(
      (element) => element.textContent === 'Accent color'
    )!;
    const field = row.querySelector<HTMLInputElement>('input[type="text"]')!;
    await user.fill(field, '#ff6a00');
    const point = dialog.querySelector('.chc-point-score')!;
    expect(getComputedStyle(point).backgroundColor).toBe('rgb(255, 106, 0)');
    await user.click(mode);
    await user.click(mode);
    expect(getComputedStyle(dialog.querySelector('.chc-point-score')!).backgroundColor).toBe('rgb(255, 106, 0)');
    const save = [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
      (button) => button.textContent === 'Save'
    )!;
    await user.click(save);
    expect(JSON.parse(canvasElement.querySelector('[data-saved-display]')!.textContent!).colors.accent).toBe('#ff6a00');
    expect(document.querySelector('.chc-display-settings')).toBeNull();
  }
};

export const Cancel: StoryObj = {
  ...BasicAndAdvanced,
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector<HTMLButtonElement>('button')!);
    await user.click(document.querySelector<HTMLButtonElement>('.chc-display-settings-mode')!);
    cModal.close();
    expect(canvasElement.querySelector('[data-saved-display]')!.textContent).toBe('');
  }
};
