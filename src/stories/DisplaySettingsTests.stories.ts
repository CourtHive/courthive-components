/**
 * Display settings — the view and its dialog, in Chromium, through trusted input.
 *
 * The rules behind the quick settings (what a preset load drops, what a quick schedule off/on restores, that
 * the input is never mutated and the host engine state is left alone) are unit-tested in node by
 * `components/display-settings/__tests__/displaySettingsModel.test.ts`. These plays pin what the browser
 * decides: which mode's controls show, the dialog's width per mode, and what Save, Cancel and click-away do.
 * `displaySettings.stories.ts` (BasicAndAdvanced) covers an accent colour surviving a mode round trip.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/DisplaySettingsTests.stories.ts`
 */
import { openDisplaySettingsDialog } from '../components/display-settings/openDisplaySettingsDialog';
import { createDisplaySettings } from '../components/display-settings/createDisplaySettings';
import { compositions } from '../compositions/compositions';
import { expect, fn, waitFor } from 'storybook/test';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Composition } from '../types';

const meta: Meta = {
  title: 'Policies & Setup/Composition/Tests/Display Settings',
  tags: ['!dev'],
  parameters: { layout: 'padded' }
};
export default meta;

const CUSTOM = 'Club style';
const ORANGE = 'rgb(255, 106, 0)';
const MODAL = 'section[id^="cmdl-"]';
const initial = {
  ...compositions.Scoreboard,
  configuration: { ...compositions.Scoreboard.configuration, rounded: true, customOption: 'kept' } as any,
  colors: { accent: '#ff6a00' }
};

const onSave = fn();
const onClose = fn();
type View = ReturnType<typeof createDisplaySettings>;
const views = new WeakMap<Element, View>();

function closeAll(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/** A page with an Open button, as a host would have; mocks reset per story. */
function dialogHost(): HTMLElement {
  closeAll();
  onSave.mockClear();
  onClose.mockClear();
  const open = document.createElement('button');
  open.textContent = 'Edit display settings';
  open.onclick = () =>
    openDisplaySettingsDialog({ compositionName: CUSTOM, composition: initial, onSave, onClose, saveButtonId: 'save' });
  return open;
}

function viewHost(composition: Composition = initial): HTMLElement {
  closeAll();
  const host = document.createElement('div');
  views.set(host, createDisplaySettings(host, { composition, compositionName: CUSTOM }));
  return host;
}

const footerButton = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find((b) => b.textContent === label)!;
const modalContainer = () => document.querySelector<HTMLElement>('.chc-modal-container')!;
/** The container's laid-out width inside its padding: what `max-width` limits. */
function contentWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}
const setting = (root: Document | Element, key: string) =>
  root.querySelector<HTMLInputElement>(`[data-display-setting="${key}"]`)!;
/** the checkbox is zero-size under the switch: a user clicks the switch, the label that wraps it */
const flip = (toggle: HTMLInputElement) => user.click(toggle.closest('label') as HTMLLabelElement);

async function expectShown(element: Element, shown: boolean): Promise<void> {
  if (shown) await expect(element).toBeVisible();
  else await expect(element).not.toBeVisible();
  // jest-dom treats the `hidden` attribute as final; checkVisibility asks the renderer, which CSS can override
  await expect(element.checkVisibility()).toBe(shown);
}

export const CancelLeavesPersistenceUntouched: StoryObj = {
  render: dialogHost,
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector('button')!);
    await flip(setting(document, 'flags'));
    await user.click(footerButton('Cancel'));
    await expect(onSave).not.toHaveBeenCalled();
    await expect(onClose).toHaveBeenCalledOnce();
    await expect(document.querySelector('.chc-display-settings')).toBeNull();
    await expect(document.querySelector(MODAL)).toBeNull();
  }
};

export const ClickAwayAndCloseDoNotSave: StoryObj = {
  render: dialogHost,
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector('button')!);
    // the area around the dialog, inside the container's padding
    await user.clickAt(modalContainer(), { x: 6, y: 6 });
    await waitFor(() => expect(document.querySelector(MODAL)).toBeNull());
    await expect(onClose).toHaveBeenCalledOnce();
    const dialog = openDisplaySettingsDialog({ compositionName: CUSTOM, composition: initial, onSave });
    dialog.close();
    await expect(document.querySelector('.chc-display-settings')).toBeNull();
    await expect(onSave).not.toHaveBeenCalled();
  }
};

export const SaveSendsTheCompleteComposition: StoryObj = {
  render: dialogHost,
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector('button')!);
    const mode = document.querySelector<HTMLButtonElement>('.chc-display-settings-mode')!;
    const basicWidth = contentWidth(modalContainer());
    await expect(getComputedStyle(modalContainer()).maxWidth).toBe('600px');
    await expect(basicWidth).toBeLessThanOrEqual(600);
    await user.click(mode);
    await expect(getComputedStyle(modalContainer()).maxWidth).toBe('1120px');
    const advancedWidth = contentWidth(modalContainer());
    await expect(advancedWidth).toBeLessThanOrEqual(Math.min(innerWidth, 1120));
    // wider whenever the viewport has room beyond the basic width
    if (innerWidth > 640) await expect(advancedWidth).toBeGreaterThan(basicWidth);
    await user.click(mode);
    await expect(getComputedStyle(modalContainer()).maxWidth).toBe('600px');
    await flip(setting(document, 'matchUpFooter'));
    await user.click(footerButton('Save'));
    await expect(onSave).toHaveBeenCalledOnce();
    await expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        compositionName: CUSTOM,
        colors: initial.colors,
        configuration: expect.objectContaining({ customOption: 'kept', rounded: true, matchUpFooter: true })
      })
    );
    await expect(document.querySelector(MODAL)).toBeNull();
  }
};

export const ModesShowTheirControls: StoryObj = {
  render: () => viewHost(),
  play: async ({ canvasElement }) => {
    const view = views.get(canvasElement.firstElementChild!)!;
    const basic = canvasElement.querySelector('.chc-display-settings-basic')!;
    const advanced = canvasElement.querySelector('.chc-display-settings-advanced')!;
    const mode = canvasElement.querySelector<HTMLButtonElement>('.chc-display-settings-mode')!;
    await expect(view.getMode()).toBe('basic');
    await expect(canvasElement.querySelector('select')!.value).toBe(CUSTOM);
    await expectShown(basic, true);
    await expectShown(advanced, false);
    await expect(mode.textContent).toBe('Advanced settings');
    await expect(mode.getAttribute('aria-expanded')).toBe('false');

    await flip(setting(canvasElement, 'matchUpFooter'));
    await user.click(mode);
    await expect(view.getMode()).toBe('advanced');
    await expectShown(basic, false);
    await expectShown(advanced, true);
    await expect(mode.getAttribute('aria-expanded')).toBe('true');
    await user.click(
      [...advanced.querySelectorAll<HTMLElement>('.ce-section-header')].find((el) =>
        el.textContent?.includes('Colors')
      )!
    );
    const accent = [...advanced.querySelectorAll('.ce-color-field')]
      .find((row) => row.querySelector('.ce-field-label')?.textContent === 'Accent color')!
      .querySelector<HTMLInputElement>('input[type="text"]')!;
    await user.fill(accent, '#7135a5');
    await user.click(mode);
    await expectShown(basic, true);
    const saved = view.getComposition();
    await expect(saved.colors?.accent).toBe('#7135a5');
    await expect(saved.configuration.matchUpFooter).toBe(true);
    await expect(setting(canvasElement, 'matchUpFooter').checked).toBe(true);
  }
};

export const PresetSwapsThePreview: StoryObj = {
  // a theme whose live point score is filled with the accent, so the accent override is paint
  render: () => viewHost({ ...compositions['Broadcast Bold'], colors: { accent: '#ff6a00' } }),
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector('select')!;
    const point = () => canvasElement.querySelector('.chc-display-settings-preview .chc-point-score')!;
    await expect(getComputedStyle(point()).backgroundColor).toBe(ORANGE);
    await user.selectOptions(select, 'Australian');
    await expect(getComputedStyle(point()).backgroundColor).not.toBe(ORANGE);
    await expect(setting(canvasElement, 'flags').checked).toBe(!!compositions.Australian.configuration?.flags);
    await user.selectOptions(select, CUSTOM);
    await expect(getComputedStyle(point()).backgroundColor).toBe(ORANGE);
  }
};

export const DestroyIsIdempotent: StoryObj = {
  render: () => viewHost(),
  play: async ({ canvasElement }) => {
    const host = canvasElement.firstElementChild!;
    const view = views.get(host)!;
    await expect(host.children).toHaveLength(1);
    view.destroy();
    view.destroy();
    view.setMode('advanced'); // a late call on a destroyed view is ignored
    await expect(host.children).toHaveLength(0);
    await expect(view.getMode()).toBe('basic');
  }
};
