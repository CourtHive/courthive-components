import { describe, expect, it } from 'vitest';
import {
  normalizeTeamPalette,
  normalizeTeamPresentation,
  resolveTeamColors,
  readableTeamText,
  teamContrastRatio
} from '../teamPalette';

const colors = {
  palette: [
    { colorId: 'navy', value: '#13294b' },
    { colorId: 'white', value: '#ffffff' },
    { colorId: 'gold', value: '#e8b923' }
  ],
  display: { roles: { 'team.surface': 'navy', 'team.text': 'white', 'team.accent': 'gold' } }
};

describe('provider defaults and tournament presentation inheritance', () => {
  it('renders dozens of imported teams with their defaults and no tournament configuration', () => {
    for (let index = 0; index < 48; index++) {
      const result = resolveTeamColors(colors, { participantId: `college-${index}` });
      expect(result?.roles).toEqual({ 'team.surface': '#13294B', 'team.text': '#FFFFFF', 'team.accent': '#E8B923' });
    }
  });
  it('applies sparse all-team rules and identity-specific exceptions without mutating inputs', () => {
    const presentation = {
      roles: { 'score.surface': '#112233', 'score.text': '#ffffff' },
      teams: { alpha: { roles: { 'team.accent': 'white', 'team.surface': { theme: true as const } } } }
    };
    const before = JSON.stringify({ colors, presentation });
    const alpha = resolveTeamColors(colors, { participantId: 'alpha', presentation });
    const beta = resolveTeamColors(colors, { participantId: 'beta', presentation });
    expect(alpha?.roles).toEqual({
      'team.text': '#FFFFFF',
      'team.accent': '#FFFFFF',
      'score.surface': '#112233',
      'score.text': '#FFFFFF'
    });
    expect(beta?.roles['team.surface']).toBe('#13294B');
    expect(beta?.roles['team.accent']).toBe('#E8B923');
    expect(JSON.stringify({ colors, presentation })).toBe(before);
    expect(resolveTeamColors(colors, { participantId: 'alpha', presentation: {} })).toEqual(resolveTeamColors(colors));
  });
  it('refreshes provider defaults while leaving tournament overrides authoritative', () => {
    const presentation = { roles: { 'score.surface': '#112233' } };
    const refreshed = { ...colors, display: { roles: { 'team.surface': 'gold', 'team.text': 'navy' } } };
    expect(resolveTeamColors(refreshed, { participantId: 'alpha', presentation })?.roles).toEqual({
      'team.surface': '#E8B923',
      'team.text': '#13294B',
      'score.surface': '#112233'
    });
  });
  it('does not guess roles from palette order, truncate palettes or require every role', () => {
    const palette = Array.from({ length: 64 }, (_, index) => ({ colorId: `c${index}`, value: '#ffffff' }));
    expect(normalizeTeamPalette({ palette })?.palette).toHaveLength(64);
    expect(resolveTeamColors({ palette })).toBeUndefined();
    expect(resolveTeamColors({ ...colors, palette: colors.palette.toReversed() })).toEqual(resolveTeamColors(colors));
  });
  it('diagnoses dangling override references and atomically refuses unsupported role/CSS input', () => {
    const diagnostics: string[] = [];
    const result = resolveTeamColors(colors, {
      participantId: 'alpha',
      presentation: { teams: { alpha: { roles: { 'team.accent': 'missing' } } } },
      onDiagnostic: (message) => diagnostics.push(message)
    });
    expect(result?.roles['team.accent']).toBeUndefined();
    expect(diagnostics).toEqual(['Missing palette color missing for team.accent']);
    for (const value of [
      { roles: { color: '#FFFFFF' } },
      { roles: { 'team.text': 'navy' } },
      { roles: { 'team.text': 'var(--anything)' } },
      { teams: { alpha: { arbitraryCss: 'red' } } }
    ])
      expect(normalizeTeamPresentation(value)).toBeUndefined();
  });
  it.each(['#000000', '#FFFFFF', '#E8B923', '#13294B'])(
    'chooses readable text on %s without editing brand values',
    (background) => {
      const foreground = readableTeamText(background, background, '#777777');
      expect(teamContrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      expect(teamContrastRatio(background, background)).toBe(1); // deliberate failing contrast control
    }
  );
});

it('resolves team exception IDs such as __proto__ without reading inherited object properties', () => {
  const presentation = JSON.parse('{"teams":{"__proto__":{"roles":{"team.accent":"white"}}}}');
  expect(resolveTeamColors(colors, { participantId: '__proto__', presentation })?.roles['team.accent']).toBe('#FFFFFF');
  expect(resolveTeamColors(colors, { participantId: 'constructor', presentation })).toEqual(resolveTeamColors(colors));
});
