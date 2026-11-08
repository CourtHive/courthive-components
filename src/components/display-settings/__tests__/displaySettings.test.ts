/** @vitest-environment happy-dom */
import { openDisplaySettingsDialog } from '../openDisplaySettingsDialog';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { compositions } from '../../../compositions/compositions';
import { createDisplaySettings } from '../createDisplaySettings';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cModal } from '../../modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';
const CUSTOM = 'Club style';
const initial = {
  ...compositions.Scoreboard,
  configuration: { ...compositions.Scoreboard.configuration, rounded: true, customOption: 'kept' },
  colors: { accent: '#ff6a00' }
};

function setup() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = createDisplaySettings(host, { composition: initial, compositionName: CUSTOM });
  return { host, editor };
}

function input(host: HTMLElement, key: string) {
  return host.querySelector<HTMLInputElement>(`[data-display-setting="${key}"]`)!;
}

function toggle(host: HTMLElement, key: string) {
  const field = input(host, key);
  field.checked = !field.checked;
  field.dispatchEvent(new Event('change'));
}

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.replaceChildren();
});

describe('display settings', () => {
  it('opens on the full initial custom composition without mutating it', () => {
    const { editor, host } = setup();
    expect(editor.getMode()).toBe('basic');
    expect(host.querySelector('select')?.value).toBe(CUSTOM);
    expect(editor.getComposition().configuration).toMatchObject({ rounded: true, customOption: 'kept' });
    expect(editor.getComposition().colors).toEqual(initial.colors);
    toggle(host, 'flags');
    expect(initial.configuration.flags).toBe(true);
    editor.destroy();
  });

  it('keeps advanced edits while moving between modes and saves detached JSON snapshots', () => {
    const { editor, host } = setup();
    toggle(host, 'matchUpFooter');
    editor.setMode('advanced');
    const header = [...host.querySelectorAll<HTMLElement>('.ce-section-header')].find((element) =>
      element.textContent?.includes('Colors')
    )!;
    header.click();
    const row = [...host.querySelectorAll('.ce-color-field')].find(
      (element) => element.querySelector('.ce-field-label')?.textContent === 'Accent color'
    )!;
    const color = row.querySelector<HTMLInputElement>('input[type="text"]')!;
    color.value = '#7135a5';
    color.dispatchEvent(new Event('input'));
    editor.setMode('basic');
    const saved = editor.getComposition();
    expect(saved.colors?.accent).toBe('#7135a5');
    expect(saved.configuration.matchUpFooter).toBe(true);
    saved.configuration.rounded = false;
    expect(editor.getComposition().configuration.rounded).toBe(true);
    editor.destroy();
  });

  it('retains richer schedule settings across quick off/on toggles', () => {
    const { editor, host } = setup();
    const before = editor.getComposition().configuration.scheduleInfo;
    toggle(host, 'scheduleInfo');
    expect(editor.getComposition().configuration.scheduleInfo).toBe(false);
    toggle(host, 'scheduleInfo');
    expect(editor.getComposition().configuration.scheduleInfo).toEqual(before);
  });

  it('loads a new preset without carrying the previous preset colors or header options', () => {
    const { editor, host } = setup();
    const select = host.querySelector('select')!;
    select.value = 'Australian';
    select.dispatchEvent(new Event('change'));
    expect(editor.getComposition().colors).toBeUndefined();
    expect(editor.getComposition().configuration.scheduleInfo).toBeUndefined();
    toggle(host, 'scheduleInfo');
    expect(editor.getComposition().configuration.scheduleInfo).toBe(true);
    select.value = CUSTOM;
    select.dispatchEvent(new Event('change'));
    expect(editor.getComposition().colors).toEqual(initial.colors);
  });

  it('does not replace the host tournament state when generating previews', () => {
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      setState: true,
      drawProfiles: [{ drawSize: 2 }]
    });
    const before = tournamentEngine.allTournamentMatchUps().matchUps.map((matchUp) => matchUp.matchUpId);
    const { editor } = setup();
    expect(tournamentEngine.getTournament().tournamentRecord.tournamentId).toBe(tournamentRecord.tournamentId);
    expect(tournamentEngine.allTournamentMatchUps().matchUps.map((matchUp) => matchUp.matchUpId)).toEqual(before);
    editor.destroy();
  });

  it('destroys the view idempotently', () => {
    const { editor, host } = setup();
    editor.destroy();
    editor.destroy();
    editor.setMode('advanced');
    expect(host.children.length).toBe(0);
  });
});

describe('display settings dialog', () => {
  it('cancel and header close leave persistence untouched and dispose the editor', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    openDisplaySettingsDialog({ compositionName: CUSTOM, composition: initial, onSave, onClose });
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
      (button) => button.textContent === 'Cancel'
    )!;
    cancel.click();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.querySelector('.chc-display-settings')).toBeNull();
    const dialog = openDisplaySettingsDialog({ compositionName: CUSTOM, composition: initial, onSave });
    dialog.close();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the complete configuration and resizes for advanced mode', () => {
    const onSave = vi.fn();
    const editor = openDisplaySettingsDialog({
      compositionName: CUSTOM,
      composition: initial,
      onSave,
      saveButtonId: 'save-display'
    });
    editor.setMode('advanced');
    expect(document.querySelector<HTMLElement>('.chc-modal-container')!.style.maxWidth).toBe('1120px');
    editor.setMode('basic');
    expect(document.querySelector<HTMLElement>('.chc-modal-container')!.style.maxWidth).toBe('600px');
    document.querySelector<HTMLButtonElement>('#save-display')!.click();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        compositionName: CUSTOM,
        colors: initial.colors,
        configuration: expect.objectContaining({ customOption: 'kept', rounded: true })
      })
    );
    expect(document.querySelector(MODAL)).toBeNull();
  });
});
