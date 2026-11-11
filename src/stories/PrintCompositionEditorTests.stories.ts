/**
 * Print composition editor — its form, in Chromium, through trusted input.
 *
 * The config rules (defaults, seeding, field writes, detached snapshots) are unit-tested in node by
 * `components/print-composition-editor/__tests__/printCompositionConfig.test.ts`. These plays pin the form:
 * its sections per print type, read-only, and that a user's edits reach `onChange` and `onSave`.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/PrintCompositionEditorTests.stories.ts`
 */
import { createPrintCompositionEditor } from '../components/print-composition-editor/printCompositionEditor';
import { user } from './helpers/trustedUser';
import { expect, fn } from 'storybook/test';

// constants and types
import type { PrintCompositionEditorConfig } from '../components/print-composition-editor/printCompositionEditorTypes';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Policies & Setup/Composition/Tests/Print Editor',
  tags: ['!dev']
};
export default meta;

type Handle = ReturnType<typeof createPrintCompositionEditor>;
const CONTROLS = 'input, select';
const handles = new WeakMap<Element, Handle>();
const onChange = fn();
const onSave = fn();

function host(config: PrintCompositionEditorConfig): HTMLElement {
  onChange.mockClear();
  onSave.mockClear();
  const container = document.createElement('div');
  container.style.maxWidth = '1100px';
  handles.set(container, createPrintCompositionEditor(container, config));
  return container;
}

const handleOf = (canvas: HTMLElement) => handles.get(canvas.firstElementChild!)!;
const headers = (canvas: HTMLElement) =>
  [...canvas.querySelectorAll('.pce-section-header')].map((header) => header.textContent);
const saveButton = (canvas: HTMLElement) =>
  [...canvas.querySelectorAll('button')].find((button) => button.textContent === 'Save');

/** The control labelled `label` inside the section titled `section`. */
function field(canvas: HTMLElement, section: string, label: string): HTMLInputElement {
  const body = [...canvas.querySelectorAll('.pce-section')].find(
    (el) => el.querySelector('.pce-section-header')?.textContent === section
  )!;
  return [...body.querySelectorAll('.pce-field')]
    .find((row) => row.querySelector('.pce-field-label')?.textContent === label)!
    .querySelector(CONTROLS)!;
}

export const DrawFormEditsReachTheHost: StoryObj = {
  render: () =>
    host({
      printType: 'draw',
      config: { header: { layout: 'minimal', tournamentName: 'My Event' } },
      onChange,
      onSave
    }),
  play: async ({ canvasElement }) => {
    await expect(headers(canvasElement)).toEqual(['Page', 'Header', 'Footer', 'Content — draw']);
    await expect(field(canvasElement, 'Header', 'Tournament name').value).toBe('My Event');
    await expect(field(canvasElement, 'Header', 'Layout').value).toBe('minimal');
    await expect(canvasElement.querySelector('.pce-print-type-pill')).toBeVisible();
    await expect(onChange).not.toHaveBeenCalled();

    await user.selectOptions(field(canvasElement, 'Page', 'Size'), 'letter');
    await expect(onChange).toHaveBeenCalledOnce();
    await expect(onChange.mock.calls[0][0].page.pageSize).toBe('letter');

    await user.click(field(canvasElement, 'Content — draw', 'Show byes'));
    await expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: { draw: expect.objectContaining({ showByes: true }) } })
    );
    await user.fill(field(canvasElement, 'Header', 'Tournament name'), 'Renamed');
    // the aside's resolved-config preview follows every edit
    const stub = JSON.parse(canvasElement.querySelector('.pce-preview-stub')!.textContent!);
    await expect(stub.header.tournamentName).toBe('Renamed');

    // each payload is a snapshot: a host editing it does not reach the editor
    onChange.mock.lastCall![0].header.tournamentName = 'host edit';
    await user.click(saveButton(canvasElement)!);
    await expect(onSave).toHaveBeenCalledOnce();
    await expect(onSave.mock.calls[0][0]).toMatchObject({
      page: { pageSize: 'letter' },
      header: { layout: 'minimal', tournamentName: 'Renamed' },
      content: { draw: { showByes: true } }
    });
    await expect(handleOf(canvasElement).getConfig()).toEqual(onSave.mock.calls[0][0]);
  }
};

export const ReadOnlyDisablesEverythingAndHidesSave: StoryObj = {
  render: () => host({ printType: 'draw', readOnly: true, onSave }),
  play: async ({ canvasElement }) => {
    const controls = [...canvasElement.querySelectorAll<HTMLInputElement>(CONTROLS)];
    await expect(controls.length).toBeGreaterThan(10);
    for (const control of controls) await expect(control).toBeDisabled();
    await expect(saveButton(canvasElement)).toBeUndefined();
  }
};

export const NoSaveButtonWithoutOnSave: StoryObj = {
  render: () => host({ printType: 'draw' }),
  play: async ({ canvasElement }) => {
    await expect(saveButton(canvasElement)).toBeUndefined();
    await expect(field(canvasElement, 'Page', 'Size')).toBeEnabled();
  }
};

export const ScheduleContentFields: StoryObj = {
  render: () => host({ printType: 'schedule', onChange }),
  play: async ({ canvasElement }) => {
    await expect(headers(canvasElement).at(-1)).toBe('Content — schedule');
    const section = 'Content — schedule';
    await expect(field(canvasElement, section, 'Cell style').value).toBe('detailed');
    await user.selectOptions(field(canvasElement, section, 'Cell style'), 'compact');
    await user.click(field(canvasElement, section, 'Show match numbers'));
    await user.fill(field(canvasElement, section, 'Alert banner'), 'Rain delay');
    await expect(onChange.mock.lastCall![0].content.schedule).toEqual({
      cellStyle: 'compact',
      showMatchNumbers: true,
      alertBanner: 'Rain delay'
    });
  }
};

export const PlaceholderForUnimplementedTypes: StoryObj = {
  render: () => host({ printType: 'courtCard' }),
  play: async ({ canvasElement }) => {
    const content = [...canvasElement.querySelectorAll('.pce-section')].at(-1)!;
    const note = content.querySelector('.pce-preview-note')!;
    await expect(note).toBeVisible();
    await expect(note.textContent).toBe('Content options for "courtCard" not yet implemented.');
    await expect(content.querySelectorAll(CONTROLS)).toHaveLength(0);
  }
};

export const DestroyRemovesTheEditor: StoryObj = {
  render: () => host({ printType: 'draw' }),
  play: async ({ canvasElement }) => {
    const container = canvasElement.firstElementChild!;
    await expect(container.children).toHaveLength(1);
    handleOf(canvasElement).destroy();
    handleOf(canvasElement).destroy();
    await expect(container.children).toHaveLength(0);
  }
};
