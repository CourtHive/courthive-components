import { openDisplaySettingsDialog } from '../components/display-settings/openDisplaySettingsDialog';
import { compositions } from '../compositions/compositions';
import { cModal } from '../components/modal/cmodal';
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
    canvasElement.querySelector<HTMLButtonElement>('button')!.click();
    const dialog = document.querySelector<HTMLElement>('.chc-display-settings')!;
    expect(dialog.dataset.mode).toBe('basic');
    expect(dialog.querySelectorAll('.tmx-m')).toHaveLength(2);
    const mode = dialog.querySelector<HTMLButtonElement>('.chc-display-settings-mode')!;
    mode.click();
    expect(dialog.dataset.mode).toBe('advanced');
    expect(document.querySelector('.chc-modal-container')!.getBoundingClientRect().width).toBeLessThanOrEqual(
      innerWidth
    );
    [...dialog.querySelectorAll<HTMLElement>('.ce-section-header')]
      .find((element) => element.textContent?.includes('Colors'))!
      .click();
    const row = [...dialog.querySelectorAll('.ce-color-field')].find(
      (element) => element.textContent === 'Accent color'
    )!;
    const field = row.querySelector<HTMLInputElement>('input[type="text"]')!;
    field.value = '#ff6a00';
    field.dispatchEvent(new Event('input'));
    const point = dialog.querySelector('.chc-point-score')!;
    expect(getComputedStyle(point).backgroundColor).toBe('rgb(255, 106, 0)');
    mode.click();
    mode.click();
    expect(getComputedStyle(dialog.querySelector('.chc-point-score')!).backgroundColor).toBe('rgb(255, 106, 0)');
    const save = [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
      (button) => button.textContent === 'Save'
    )!;
    save.click();
    expect(JSON.parse(canvasElement.querySelector('[data-saved-display]')!.textContent!).colors.accent).toBe('#ff6a00');
    expect(document.querySelector('.chc-display-settings')).toBeNull();
  }
};

export const Cancel: StoryObj = {
  ...BasicAndAdvanced,
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button')!.click();
    document.querySelector<HTMLButtonElement>('.chc-display-settings-mode')!.click();
    cModal.close();
    expect(canvasElement.querySelector('[data-saved-display]')!.textContent).toBe('');
  }
};
