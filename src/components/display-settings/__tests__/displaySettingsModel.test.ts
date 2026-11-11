/**
 * The display-settings rules, in node: what the quick settings keep, drop and restore, and what a save
 * contains. The view that renders them (modes, dialog, sizing, Save and Cancel) is asserted in Chromium by
 * `src/stories/DisplaySettingsTests.stories.ts` and `src/stories/displaySettings.stories.ts`.
 */
import { DisplaySettingsModel, displayToggleChecked, participantDetailValue } from '../displaySettingsModel';
import { displaySettingsPreviewMatchUps } from '../displaySettingsPreview';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { compositions } from '../../../compositions/compositions';
import { describe, expect, it } from 'vitest';

const CUSTOM = 'Club style';
const initial = {
  ...compositions.Scoreboard,
  configuration: { ...compositions.Scoreboard.configuration, rounded: true, customOption: 'kept' } as any,
  colors: { accent: '#ff6a00' }
};
const model = () => new DisplaySettingsModel({ composition: initial, compositionName: CUSTOM });

describe('DisplaySettingsModel', () => {
  it('opens on the full initial custom composition without mutating it', () => {
    const settings = model();
    expect(settings.choices.get(CUSTOM)?.composition).toBe(initial);
    expect(settings.snapshot().compositionName).toBe(CUSTOM);
    expect(settings.snapshot().configuration).toMatchObject({ rounded: true, customOption: 'kept' });
    expect(settings.snapshot().colors).toEqual(initial.colors);
    settings.setToggle('flags', false);
    expect(settings.snapshot().configuration.flags).toBe(false);
    expect(initial.configuration.flags).toBe(true);
  });

  it('keeps quick and advanced edits together in one detached snapshot', () => {
    const settings = model();
    settings.setToggle('matchUpFooter', true);
    // an advanced-section control writes to the same store
    settings.store.setColorField('accent', '#7135a5');
    const saved = settings.snapshot();
    expect(saved.colors?.accent).toBe('#7135a5');
    expect(saved.configuration.matchUpFooter).toBe(true);
    saved.configuration.rounded = false;
    expect(settings.snapshot().configuration.rounded).toBe(true);
  });

  it('retains richer schedule settings across a quick off/on', () => {
    const settings = model();
    const before = settings.snapshot().configuration.scheduleInfo;
    expect(typeof before).toBe('object');
    settings.setToggle('scheduleInfo', false);
    expect(settings.snapshot().configuration.scheduleInfo).toBe(false);
    settings.setToggle('scheduleInfo', true);
    expect(settings.snapshot().configuration.scheduleInfo).toEqual(before);
  });

  it('restores a header set by another control after it is switched off', () => {
    const settings = model();
    const header = { elapsed: false, eventRound: true };
    settings.store.setConfigField('scheduleInfo', header);
    settings.observe(settings.store.getState());
    settings.setToggle('scheduleInfo', false);
    settings.setParticipantDetail('TEAM');
    settings.setToggle('scheduleInfo', true);
    expect(settings.snapshot().configuration.scheduleInfo).toEqual(header);
  });

  it('loads a preset without carrying the previous colours or header options, and back again', () => {
    const settings = model();
    settings.choosePreset('Australian');
    expect(settings.snapshot().colors).toBeUndefined();
    expect(settings.snapshot().configuration.scheduleInfo).toBeUndefined();
    settings.setToggle('scheduleInfo', true);
    expect(settings.snapshot().configuration.scheduleInfo).toBe(true);
    settings.choosePreset(CUSTOM);
    expect(settings.snapshot().colors).toEqual(initial.colors);
    expect((settings.snapshot().configuration as any).customOption).toBe('kept');
  });

  it('offers the host presets when given, the built-ins otherwise, never InlineScoring', () => {
    expect(model().choices.has('InlineScoring')).toBe(false);
    expect(model().choices.has('Australian')).toBe(true);
    const hosted = new DisplaySettingsModel({
      composition: initial,
      compositionName: CUSTOM,
      presets: [
        { name: CUSTOM, label: 'Ours', composition: compositions.Australian },
        { name: 'Only', composition: {} as any }
      ]
    });
    expect([...hosted.choices.keys()]).toEqual([CUSTOM, 'Only']);
    // the initial composition wins for its own name; the host's label survives
    expect(hosted.choices.get(CUSTOM)).toEqual({ name: CUSTOM, label: 'Ours', composition: initial });
  });

  it('writes participant detail with its address flag', () => {
    const settings = model();
    settings.setParticipantDetail('ADDRESS');
    expect(settings.snapshot().configuration).toMatchObject({ participantDetail: 'ADDRESS', showAddress: true });
    settings.setParticipantDetail('');
    expect(settings.snapshot().configuration.participantDetail).toBeUndefined();
    expect(settings.snapshot().configuration.showAddress).toBe(false);
  });
});

describe('display settings readers', () => {
  it('reads connectors from the theme when unset and other toggles from configuration', () => {
    const state = model().store.getState();
    expect(displayToggleChecked('flags', state)).toBe(!!state.configuration.flags);
    expect(displayToggleChecked('connectors', { ...state, configuration: { connectors: false } })).toBe(false);
    expect(displayToggleChecked('connectors', { ...state, configuration: { connectors: true } })).toBe(true);
  });

  it('reads NONE and unset participant detail as none', () => {
    expect(participantDetailValue({ participantDetail: 'NONE' })).toBe('');
    expect(participantDetailValue({})).toBe('');
    expect(participantDetailValue({ participantDetail: 'TEAM' })).toBe('TEAM');
  });
});

describe('displaySettingsPreviewMatchUps', () => {
  it('builds a finished and a live matchUp without replacing the host tournament state', () => {
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      setState: true,
      drawProfiles: [{ drawSize: 2 }]
    });
    const before = tournamentEngine.allTournamentMatchUps().matchUps.map((matchUp) => matchUp.matchUpId);
    const [completed, live] = displaySettingsPreviewMatchUps();
    expect(completed.winningSide).toBeDefined();
    expect(live.matchUpStatus).toBe('IN_PROGRESS');
    expect(live.matchUpId).toBe(`${completed.matchUpId}-live`);
    expect(tournamentEngine.getTournament().tournamentRecord.tournamentId).toBe(tournamentRecord.tournamentId);
    expect(tournamentEngine.allTournamentMatchUps().matchUps.map((matchUp) => matchUp.matchUpId)).toEqual(before);
  });
});
