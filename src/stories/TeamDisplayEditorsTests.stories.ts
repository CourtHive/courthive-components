/**
 * Team display editors — team colors and tournament team presentation, play-function tests.
 *
 * Pinned here:
 *
 * - the colors editor edits all five default roles, keeps every palette entry, never mutates its input,
 *   and an invalid edit reads back as nothing with an alert;
 * - imported palette IDs survive and an added color gets a unique ID;
 * - the presentation editor offers all-team inheritance, per-team overrides, an explicit theme reset, and leaves
 *   the provider's data untouched; exceptions for removed teams are visible so they can be reset;
 * - palette colors are offered by name and persisted by stable ID;
 * - option labels and accessible names stay distinct and the controls use the library's classes.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderTeamPresentationEditor } from '../components/team-display/teamPresentationEditor';
import { renderTeamColorsEditor } from '../components/team-display/teamColorsEditor';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Team Display Editors',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

type Editor = { read: () => any };
const HOST_TESTID = 'team-display-editor-host';
/** The editor handle each render produced, keyed by its host, for the play to read back. */
const editors = new WeakMap<HTMLElement, Editor>();
/** Inputs whose immutability a play asserts. */
const inputs = new WeakMap<HTMLElement, { value: unknown; original: string }>();

function host(build: (target: HTMLElement) => Editor, input?: unknown): HTMLElement {
  const target = document.createElement('div');
  target.dataset.testid = HOST_TESTID;
  if (input !== undefined) inputs.set(target, { value: input, original: JSON.stringify(input) });
  editors.set(target, build(target));
  return target;
}
const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>(`[data-testid="${HOST_TESTID}"]`)!;
const editorOf = (target: HTMLElement) => editors.get(target)!;
const expectInputUnchanged = (target: HTMLElement) => {
  const input = inputs.get(target)!;
  expect(JSON.stringify(input.value)).toBe(input.original);
};
const change = (element: HTMLSelectElement | HTMLInputElement, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input'));
};

const colors = () => ({
  palette: [
    { colorId: 'navy', value: '#13294B', name: 'Navy' },
    { colorId: 'white', value: '#FFFFFF', name: 'White' }
  ],
  display: { roles: { 'team.surface': 'navy', 'team.text': 'white' } }
});

export const ColorsEditorRolesAndCancel: StoryObj = {
  name: 'colors editor: all five roles, every palette entry kept, invalid edit reads nothing',
  render: () => {
    const initial = colors();
    return host((target) => renderTeamColorsEditor(target, initial), initial);
  },
  play: async ({ canvasElement }) => {
    const target = getHost(canvasElement);
    const editor = editorOf(target);
    const initial = colors();
    const selects = target.querySelectorAll('select');
    expect(selects).toHaveLength(5);
    change(selects[3], 'white');
    expect(editor.read()).toEqual({
      ...initial,
      display: { roles: { ...initial.display.roles, 'score.surface': 'white' } }
    });
    expectInputUnchanged(target);
    target.querySelector<HTMLButtonElement>('.team-palette-row button:last-child')!.click();
    expect(editor.read()).toBeUndefined();
    expect(target.querySelector('[role="alert"]')?.textContent).toContain('Check colors');
  }
};

const presentationInitial = () => ({
  roles: { 'score.surface': '#112233' },
  teams: { alpha: { roles: { 'team.accent': 'white' } } }
});
export const PresentationInheritanceAndReset: StoryObj = {
  name: 'presentation editor: all-team inheritance, per-team overrides, theme reset, provider data unchanged',
  render: () => {
    const initial = presentationInitial();
    return host(
      (target) =>
        renderTeamPresentationEditor(target, initial, [
          { participantId: 'alpha', participantName: 'Alpha', teamColors: colors() }
        ]),
      initial
    );
  },
  play: async ({ canvasElement }) => {
    const target = getHost(canvasElement);
    const editor = editorOf(target);
    const initial = presentationInitial();
    const scope = target.querySelector('select')!;
    change(scope, 'alpha');
    const modes = target.querySelectorAll('select');
    change(modes[1], 'theme');
    expect(editor.read()?.teams?.alpha.roles['team.surface']).toEqual({ theme: true });
    expect(editor.read()?.roles).toEqual(initial.roles);
    expectInputUnchanged(target);
    target.querySelector('button')!.click();
    expect(editor.read()?.teams?.alpha).toBeUndefined();
    expect(editor.read()?.roles).toEqual(initial.roles);
    change(scope, '');
    target.querySelector('button')!.click();
    expect(editor.read()?.roles).toBeUndefined();
  }
};

export const RemovedTeamExceptions: StoryObj = {
  name: 'presentation editor: exceptions for removed teams are visible and resettable',
  render: () =>
    host((target) =>
      renderTeamPresentationEditor(target, { teams: { removed: { roles: { 'team.accent': 'missing' } } } }, [])
    ),
  play: async ({ canvasElement }) => {
    const target = getHost(canvasElement);
    const editor = editorOf(target);
    expect(editor.read()).toBeUndefined();
    const scope = target.querySelector('select')!;
    expect(scope.options[1].textContent).toContain('missing team');
    change(scope, 'removed');
    target.querySelector('button')!.click();
    expect(editor.read()?.teams).toEqual({});
  }
};

export const AddColorKeepsImportedIds: StoryObj = {
  name: 'colors editor: imported palette IDs preserved, a new color gets a unique ID',
  render: () => {
    const palette = Array.from({ length: 64 }, (_, index) => ({ colorId: `color-${index + 1}`, value: '#13294B' }));
    return host((target) => renderTeamColorsEditor(target, { palette }));
  },
  play: async ({ canvasElement }) => {
    const target = getHost(canvasElement);
    const editor = editorOf(target);
    const add = [...target.querySelectorAll('button')].find((button) => button.textContent === 'Add color')!;
    add.click();
    const row = target.querySelector('.team-palette-row:last-child')!;
    change(row.querySelector<HTMLInputElement>('input[placeholder="#RRGGBB"]')!, '#FFFFFF');
    const value = editor.read() as { palette: { colorId: string }[] };
    expect(value.palette).toHaveLength(65);
    expect(new Set(value.palette.map((entry) => entry.colorId)).size).toBe(65);
  }
};

export const PaletteColorsByName: StoryObj = {
  name: 'presentation editor: palette colors offered by name, persisted by stable ID',
  render: () =>
    host((target) =>
      renderTeamPresentationEditor(target, {}, [
        { participantId: 'alpha', participantName: 'Alpha', teamColors: colors() }
      ])
    ),
  play: async ({ canvasElement }) => {
    const target = getHost(canvasElement);
    const editor = editorOf(target);
    change(target.querySelector('select')!, 'alpha');
    const row = target.querySelector('.team-presentation-role')!;
    const selects = row.querySelectorAll('select');
    change(selects[0], 'palette');
    expect(selects[1].options[1].textContent).toBe('Navy');
    change(selects[1], 'navy');
    expect(editor.read()?.teams?.alpha.roles['team.surface']).toBe('navy');
  }
};

export const LabelsAndControlClasses: StoryObj = {
  name: 'presentation editor: distinct option labels and accessible names, library control classes',
  render: () =>
    host((target) => renderTeamPresentationEditor(target, {}, [], { color: 'Use color', colorValue: 'custom color' })),
  play: async ({ canvasElement }) => {
    const target = getHost(canvasElement);
    const row = [...target.querySelectorAll('.team-presentation-role')][1];
    const mode = row.querySelector('select')!;
    expect([...mode.options].map((option) => option.textContent)).toContain('Use color');
    expect(row.querySelector('input')?.ariaLabel).toBe('Team text custom color');
    expect(target.querySelector('.team-presentation-editor > button')?.className).toBe('button');
    const controls = target.querySelectorAll('.team-presentation-editor select, .team-presentation-editor input');
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) expect(control.classList.contains('input')).toBe(true);
  }
};
