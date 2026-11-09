import { createCompositionEditor } from '../components/composition-editor/compositionEditor';
import { readCompositionColors } from '../styles/applyCompositionColors';
import { compositions } from '../compositions/compositions';
import { expect } from 'storybook/test';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';

const HEADER_BACKGROUND_RGB = 'rgb(18, 52, 86)';
const PREVIEW_ROUND_HEADER = '.ce-preview-body .chc-round-header';
const meta: Meta = { title: 'Policies & Setup/Composition/Control Consistency' };
export default meta;

function renderEditor(): HTMLElement {
  const container = document.createElement('div');
  createCompositionEditor(container, { composition: compositions.Scoreboard });
  return container;
}

function input(root: HTMLElement, label: string, selector = 'input, select'): HTMLInputElement {
  return [...root.querySelectorAll('.ce-field')]
    .find((row) => row.querySelector('.ce-field-label')?.textContent === label)!
    .querySelector(selector)!;
}

function change(control: HTMLInputElement, value: string, event = 'input'): void {
  control.value = value;
  control.dispatchEvent(new Event(event, { bubbles: true }));
}

function open(root: HTMLElement, label: string): void {
  [...root.querySelectorAll<HTMLElement>('.ce-section-header')]
    .find((header) => header.textContent?.includes(label))!
    .click();
}

export const HeaderColorsAndReset: StoryObj = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    open(canvasElement, 'Colors');
    open(canvasElement, 'Layout');
    const fields: Record<string, string> = {
      'Schedule header text': '#ffffff',
      'Schedule header background': '#123456',
      'Schedule header divider': '#ff6a00'
    };
    for (const name of Object.keys(compositions)) {
      change(input(canvasElement, 'Load preset'), name, 'change');
      const toggle = input(canvasElement, 'Schedule info');
      if (!toggle.checked) toggle.click();
      for (const [label, value] of Object.entries(fields))
        change(input(canvasElement, label, 'input[type="text"]'), value);
      const header = () => canvasElement.querySelector('.ce-preview-matchup .chc-scheduling')!;
      expect(getComputedStyle(header()).color).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(header()).backgroundColor).toBe(HEADER_BACKGROUND_RGB);
      expect(getComputedStyle(header()).borderBottomColor).toBe('rgb(255, 106, 0)');
      expect(getComputedStyle(header()).borderBottomStyle).toBe('solid');
      toggle.click();
      expect(canvasElement.querySelector('.ce-preview-matchup .chc-scheduling')).toBeNull();
      toggle.click();
      expect(getComputedStyle(header()).backgroundColor).toBe(HEADER_BACKGROUND_RGB);
      [...canvasElement.querySelectorAll('button')]
        .find((button) => button.textContent === 'Clear color overrides')!
        .click();
      expect(getComputedStyle(header()).backgroundColor).not.toBe(HEADER_BACKGROUND_RGB);
      if (presetUsesBasicCard(name)) {
        expect(readCompositionColors(compositions[name].theme).scheduleHeaderDivider).toBe('transparent');
        expect(getComputedStyle(header()).borderBottomColor).toBe('rgba(0, 0, 0, 0)');
      }
    }
  }
};

function presetUsesBasicCard(name: string): boolean {
  return compositions[name].theme === compositions.BasicCard.theme;
}

export const ServingAndVisibility: StoryObj = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    open(canvasElement, 'Score');
    open(canvasElement, 'Layout');
    const live = () => canvasElement.querySelector('[id="preview-in-progress"]')!;
    const selector = input(canvasElement, 'Server indicator');
    change(selector, '', 'change');
    expect(live().querySelector('.chc-server')).toBeNull();
    change(selector, 'column', 'change');
    expect(live().querySelectorAll('.chc-server')).toHaveLength(2);
    change(selector, 'name', 'change');
    expect(live().querySelectorAll('.chc-participant-name .chc-server')).toHaveLength(1);
    expect(canvasElement.querySelector('.ce-preview-matchup .tmx-m:not([data-live]) .chc-server')).toBeNull();
    const schedule = input(canvasElement, 'Schedule info');
    const layout = input(canvasElement, 'Header layout');
    change(layout, 'inline', 'change');
    schedule.click();
    expect(layout.disabled).toBe(true);
    expect(live().querySelector('.chc-scheduling')).toBeNull();
    schedule.click();
    expect(live().querySelector('.chc-scheduling--inline')).not.toBeNull();
    expect(layout.value).toBe('inline');
    const roundHeader = input(canvasElement, 'Round header');
    expect(roundHeader.checked).toBe(false);
    expect(canvasElement.querySelector(PREVIEW_ROUND_HEADER)).toBeNull();
    roundHeader.click();
    expect(canvasElement.querySelector(PREVIEW_ROUND_HEADER)).not.toBeNull();
    roundHeader.click();
    expect(canvasElement.querySelector(PREVIEW_ROUND_HEADER)).toBeNull();
  }
};
