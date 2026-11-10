/** @vitest-environment happy-dom */
import { renderTeamPresentationEditor } from '../../team-display/teamPresentationEditor';
import { renderTeamColorsEditor } from '../../team-display/teamColorsEditor';
import { beforeEach, expect, it } from 'vitest';

const colors = {
  palette: [
    { colorId: 'navy', value: '#13294B', name: 'Navy' },
    { colorId: 'white', value: '#FFFFFF', name: 'White' }
  ],
  display: { roles: { 'team.surface': 'navy', 'team.text': 'white' } }
};
beforeEach(() => document.body.replaceChildren());
const change = (element: HTMLSelectElement | HTMLInputElement, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input'));
};
it('edits all five default roles while preserving every palette entry and detached cancel state', () => {
  const before = JSON.stringify(colors);
  const editor = renderTeamColorsEditor(document.body, colors);
  const selects = document.querySelectorAll('select');
  expect(selects).toHaveLength(5);
  change(selects[3], 'white');
  expect(editor.read()).toEqual({
    ...colors,
    display: { roles: { ...colors.display.roles, 'score.surface': 'white' } }
  });
  expect(JSON.stringify(colors)).toBe(before);
  document.querySelector<HTMLButtonElement>('.team-palette-row button:last-child')!.click();
  expect(editor.read()).toBeUndefined();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Check colors');
});
it('provides all-team inheritance, per-team overrides, explicit theme reset and unchanged provider data', () => {
  const initial = { roles: { 'score.surface': '#112233' }, teams: { alpha: { roles: { 'team.accent': 'white' } } } };
  const before = JSON.stringify(initial);
  const editor = renderTeamPresentationEditor(document.body, initial, [
    { participantId: 'alpha', participantName: 'Alpha', teamColors: colors }
  ]);
  const scope = document.querySelector('select')!;
  change(scope, 'alpha');
  const modes = document.querySelectorAll('select');
  change(modes[1], 'theme');
  expect(editor.read()?.teams?.alpha.roles['team.surface']).toEqual({ theme: true });
  expect(editor.read()?.roles).toEqual(initial.roles);
  expect(JSON.stringify(initial)).toBe(before);
  document.querySelector('button')!.click();
  expect(editor.read()?.teams?.alpha).toBeUndefined();
  expect(editor.read()?.roles).toEqual(initial.roles);
  change(scope, '');
  document.querySelector('button')!.click();
  expect(editor.read()?.roles).toBeUndefined();
});
it('makes exceptions for removed teams visible so their dangling bindings can be reset', () => {
  const editor = renderTeamPresentationEditor(
    document.body,
    { teams: { removed: { roles: { 'team.accent': 'missing' } } } },
    []
  );
  expect(editor.read()).toBeUndefined();
  const scope = document.querySelector('select')!;
  expect(scope.options[1].textContent).toContain('missing team');
  change(scope, 'removed');
  document.querySelector('button')!.click();
  expect(editor.read()?.teams).toEqual({});
});

it('preserves imported palette IDs while adding a unique new color ID', () => {
  const palette = Array.from({ length: 64 }, (_, index) => ({ colorId: `color-${index + 1}`, value: '#13294B' }));
  const editor = renderTeamColorsEditor(document.body, { palette });
  const add = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Add color')!;
  add.click();
  const row = document.querySelector('.team-palette-row:last-child')!;
  change(row.querySelector<HTMLInputElement>('input[placeholder="#RRGGBB"]')!, '#FFFFFF');
  const value = editor.read() as { palette: { colorId: string }[] };
  expect(value.palette).toHaveLength(65);
  expect(new Set(value.palette.map((entry) => entry.colorId)).size).toBe(65);
});

it('offers palette colors by name while persisting their stable IDs', () => {
  const editor = renderTeamPresentationEditor(document.body, {}, [
    { participantId: 'alpha', participantName: 'Alpha', teamColors: colors }
  ]);
  change(document.querySelector('select')!, 'alpha');
  const row = document.querySelector('.team-presentation-role')!;
  const selects = row.querySelectorAll('select');
  change(selects[0], 'palette');
  expect(selects[1].options[1].textContent).toBe('Navy');
  change(selects[1], 'navy');
  expect(editor.read()?.teams?.alpha.roles['team.surface']).toBe('navy');
});

it('keeps option labels and accessible names distinct and uses library control classes', () => {
  renderTeamPresentationEditor(document.body, {}, [], { color: 'Use color', colorValue: 'custom color' });
  const row = [...document.querySelectorAll('.team-presentation-role')][1];
  const mode = row.querySelector('select')!;
  expect([...mode.options].map((option) => option.textContent)).toContain('Use color');
  expect(row.querySelector('input')?.ariaLabel).toBe('Team text custom color');
  expect(document.querySelector('.team-presentation-editor > button')?.className).toBe('button');
  for (const control of document.querySelectorAll('.team-presentation-editor select, .team-presentation-editor input'))
    expect(control.classList.contains('input')).toBe(true);
});
