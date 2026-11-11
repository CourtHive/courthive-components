/**
 * Composition editor — its controls, in Chromium, through trusted input.
 *
 * What the editor SAVES (snapshot shape, stripped runtime fields, colour and schedule-header round trips) is
 * unit-tested in node by `components/composition-editor/__tests__/compositionPersistence.test.ts`. These plays
 * pin what needs a browser: that the accordion shows and hides, that typed colours paint the preview, that the
 * schedule-header toggle locks its details, and that read-only disables every control.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/CompositionEditorTests.stories.ts`
 */
import { createCompositionEditor } from '../components/composition-editor/compositionEditor';
import { compositions } from '../compositions/compositions';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';
import '../components/forms/styles';

// constants and types
import type { CompositionEditorConfig } from '../components/composition-editor/compositionEditor';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Policies & Setup/Composition/Tests/Editor',
  tags: ['!dev']
};
export default meta;

type Editor = ReturnType<typeof createCompositionEditor>;
const editors = new WeakMap<Element, Editor>();
const onChange = fn();

const SECTION_LABELS = [
  'Theme & Preset',
  'Colors',
  'Display',
  'Score',
  'Participant',
  'Placeholders',
  'Scale Attributes',
  'Layout & Info'
];
const ORANGE = 'rgb(255, 106, 0)';
const TEXT_INPUT = 'input[type="text"]';
const SCHEDULE_HEADER = '.ce-preview-body .chc-scheduling';
const WHITE = 'rgb(255, 255, 255)';

function host(config: CompositionEditorConfig): HTMLElement {
  const container = document.createElement('div');
  container.style.padding = '1em';
  editors.set(container, createCompositionEditor(container, config));
  return container;
}

/** A JSON round trip, not a copy: what a host stores as text and hands back on the next open. */
function persisted(editor: Editor) {
  const stored = JSON.stringify(editor.getComposition());
  return JSON.parse(stored);
}

const editorOf = (canvas: HTMLElement) => editors.get(canvas.firstElementChild!)!;
const nameInput = (canvas: HTMLElement) => canvas.querySelector<HTMLInputElement>(TEXT_INPUT)!;
const headerOf = (canvas: HTMLElement, label: string) =>
  [...canvas.querySelectorAll<HTMLElement>('.ce-section-header')].find((el) => el.textContent?.includes(label))!;
const bodyOf = (canvas: HTMLElement, label: string) => headerOf(canvas, label).nextElementSibling as HTMLElement;
const open = (canvas: HTMLElement, label: string) => user.click(headerOf(canvas, label));

function control(canvas: HTMLElement, label: string, selector = 'input, select'): HTMLInputElement {
  return [...canvas.querySelectorAll('.ce-field')]
    .find((row) => row.querySelector('.ce-field-label')?.textContent === label)!
    .querySelector(selector)!;
}

/** the checkbox is zero-size under the switch: a user clicks the switch, the label that wraps it */
const flip = (toggle: HTMLInputElement) => user.click(toggle.closest('label') as HTMLLabelElement);

async function expectShown(element: Element, shown: boolean): Promise<void> {
  if (shown) await expect(element).toBeVisible();
  else await expect(element).not.toBeVisible();
  // jest-dom reads the `hidden` attribute and inline display; checkVisibility asks the renderer
  await expect(element.checkVisibility()).toBe(shown);
}

export const StructureAndName: StoryObj = {
  render: () => host({}),
  play: async ({ canvasElement }) => {
    const input = nameInput(canvasElement);
    await expect(input.value).toBe('Custom');
    await expect(input.disabled).toBe(false);
    const labels = [...canvasElement.querySelectorAll('.ce-section-header')].map((el) => el.textContent?.slice(1));
    await expect(labels).toEqual(SECTION_LABELS);
    // the right column is a live preview of real matchUp cards
    const cards = canvasElement.querySelectorAll('.ce-preview-body .tmx-m');
    await expect(cards.length).toBeGreaterThan(0);
    await expectShown(cards[0], true);
    await user.fill(input, 'Club style');
    await expect(editorOf(canvasElement).getComposition().compositionName).toBe('Club style');
  }
};

export const NamedComposition: StoryObj = {
  render: () => host({ compositionName: 'Australian', composition: compositions.Australian }),
  play: async ({ canvasElement }) => {
    await expect(nameInput(canvasElement).value).toBe('Australian');
    await expect(editorOf(canvasElement).getComposition().theme).toBe(compositions.Australian.theme);
  }
};

export const AccordionShowsAndHides: StoryObj = {
  render: () => host({ composition: compositions.Australian }),
  play: async ({ canvasElement }) => {
    // Theme and Display open by default, the rest closed
    await expectShown(bodyOf(canvasElement, 'Theme'), true);
    await expectShown(bodyOf(canvasElement, 'Colors'), false);
    await open(canvasElement, 'Colors');
    await expectShown(bodyOf(canvasElement, 'Colors'), true);
    await expectShown(control(canvasElement, 'Accent color', TEXT_INPUT), true);
    await open(canvasElement, 'Colors');
    await expectShown(bodyOf(canvasElement, 'Colors'), false);
  }
};

export const AccentColorsPaintAndRoundTrip: StoryObj = {
  render: () => {
    onChange.mockClear();
    return host({ composition: compositions['Broadcast Bold'], onChange });
  },
  play: async ({ canvasElement }) => {
    await expect(onChange).not.toHaveBeenCalled(); // mounting is not an edit
    const point = () => canvasElement.querySelector('[id="preview-in-progress"] .chc-point-score')!;
    await expect(getComputedStyle(point()).backgroundColor).not.toBe(ORANGE);
    await open(canvasElement, 'Colors');
    await user.fill(control(canvasElement, 'Accent color', TEXT_INPUT), '#ff6a00');
    await user.fill(control(canvasElement, 'Text on accent', TEXT_INPUT), '#ffffff');
    await expect(getComputedStyle(point()).backgroundColor).toBe(ORANGE);
    await expect(getComputedStyle(point()).color).toBe(WHITE);
    await expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ colors: { accent: '#ff6a00', accentText: '#ffffff' } })
    );

    // a JSON round trip into a fresh editor paints the same colours
    const saved = persisted(editorOf(canvasElement));
    editorOf(canvasElement).destroy();
    const reopened = document.createElement('div');
    canvasElement.appendChild(reopened);
    const editor = createCompositionEditor(reopened, { composition: saved });
    const reopenedPoint = reopened.querySelector('[id="preview-in-progress"] .chc-point-score')!;
    await expect(getComputedStyle(reopenedPoint).backgroundColor).toBe(ORANGE);
    await expect(getComputedStyle(reopenedPoint).color).toBe(WHITE);
    await expect(editor.getComposition().colors).toEqual({ accent: '#ff6a00', accentText: '#ffffff' });
    editor.destroy();
  }
};

export const RoundHeaderToggle: StoryObj = {
  render: () => {
    onChange.mockClear();
    return host({ composition: compositions.Australian, onChange });
  },
  play: async ({ canvasElement }) => {
    const headers = () => [...canvasElement.querySelectorAll('.ce-preview-body .chc-round-header')];
    await expect(headers()).toHaveLength(0);
    await open(canvasElement, 'Layout');
    const toggle = control(canvasElement, 'Round header');
    await flip(toggle);
    await expect(toggle.checked).toBe(true);
    await expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ configuration: expect.objectContaining({ roundHeader: true }) })
    );
    // the sample header above the cards and the connected bracket's columns
    await expect(headers().length).toBeGreaterThan(1);
    for (const header of headers()) await expectShown(header, true);
    await flip(toggle);
    await expect(headers()).toHaveLength(0);
  }
};

export const ScheduleHeaderLocksItsDetails: StoryObj = {
  render: () => host({ composition: compositions.Watch }),
  play: async ({ canvasElement }) => {
    const editor = editorOf(canvasElement);
    await open(canvasElement, 'Layout');
    const schedule = control(canvasElement, 'Schedule info');
    const details = ['Playing time', 'Event & round', 'Header layout'].map((label) => control(canvasElement, label));
    for (const detail of details) await expect(detail.disabled).toBe(false);
    await expect(canvasElement.querySelector(SCHEDULE_HEADER)).not.toBeNull();

    await flip(schedule);
    for (const detail of details) await expect(detail.disabled).toBe(true);
    await expect(canvasElement.querySelector(SCHEDULE_HEADER)).toBeNull();
    const saved = persisted(editor);
    await expect(saved.configuration.scheduleInfo).toBe(false);

    await flip(schedule);
    for (const detail of details) await expect(detail.disabled).toBe(false);
    await expect(editor.getComposition().configuration.scheduleInfo).toEqual(
      compositions.Watch.configuration!.scheduleInfo
    );
    await expect(canvasElement.querySelector('.ce-preview-body .chc-scheduling--inline')).not.toBeNull();

    // the hidden state reopens hidden
    editor.destroy();
    const reopened = document.createElement('div');
    canvasElement.appendChild(reopened);
    const again = createCompositionEditor(reopened, { composition: saved });
    await expect(reopened.querySelector(SCHEDULE_HEADER)).toBeNull();
    again.destroy();
  }
};

export const ReadOnlyDisablesEveryControl: StoryObj = {
  render: () => host({ composition: compositions.Scoreboard, compositionName: 'Scoreboard', readOnly: true }),
  play: async ({ canvasElement }) => {
    await expect(nameInput(canvasElement).disabled).toBe(true);
    for (const label of SECTION_LABELS.slice(1)) {
      if (!bodyOf(canvasElement, label).checkVisibility()) await open(canvasElement, label);
    }
    const controls = [...canvasElement.querySelectorAll<HTMLInputElement>('input, select, textarea')];
    await expect(controls.length).toBeGreaterThan(30);
    await expect(controls.filter((el) => !el.disabled).map((el) => el.closest('.ce-field')?.textContent)).toEqual([]);
    // even with the header shown, its details stay locked
    await expect(control(canvasElement, 'Schedule info').checked).toBe(true);
    await expect(control(canvasElement, 'Header layout').disabled).toBe(true);
  }
};

export const DestroyIsIdempotent: StoryObj = {
  render: () => host({}),
  play: async ({ canvasElement }) => {
    const container = canvasElement.firstElementChild!;
    await expect(container.children).toHaveLength(1);
    editorOf(canvasElement).destroy();
    editorOf(canvasElement).destroy();
    await waitFor(() => expect(container.children).toHaveLength(0));
  }
};
