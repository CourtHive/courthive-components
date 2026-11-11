import { resolveTeamColors, teamColorsOf } from '../teamBranding';
import { normalizeTeamPalette } from '../teamPalette';
import { expect, it } from 'vitest';

const colors = {
  palette: [
    { colorId: 'red', value: '#ce1126', name: 'Red', group: 'Primary' },
    { colorId: 'white', value: '#ffffff', name: 'White', group: 'Primary' },
    { colorId: 'black', value: '#000000', name: 'Black', group: 'Primary' },
    { colorId: 'gold', value: '#fcd116', name: 'Gold', group: 'Primary' }
  ],
  display: { roles: { 'team.accent': 'red', 'team.surface': 'gold' } }
};
it('resolves selections from four primary-group colors without changing names, values or ordering', () => {
  const before = JSON.stringify(colors);
  expect(resolveTeamColors(colors)).toEqual({ roles: { 'team.accent': '#CE1126', 'team.surface': '#FCD116' } });
  expect(resolveTeamColors({ ...colors, palette: [...colors.palette].reverse() })).toEqual(resolveTeamColors(colors));
  expect(JSON.stringify(colors)).toBe(before);
  expect(normalizeTeamPalette(colors)?.palette).toHaveLength(4);
});
it('uses only exposed TEAM data and never leaks unselected palette metadata into display colors', () => {
  expect(teamColorsOf({ teamParticipant: { participantId: 'team', teamColors: colors } })).toEqual({
    roles: { 'team.accent': '#CE1126', 'team.surface': '#FCD116' }
  });
  expect(teamColorsOf({ teamParticipant: { participantId: 'team' } })).toBeUndefined();
  expect(
    teamColorsOf({ participant: { participantId: 'player', participantType: 'INDIVIDUAL', teamColors: colors } })
  ).toBeUndefined();
});
it.each([0])('refuses palette size %s rather than silently truncating it', (count) => {
  expect(
    normalizeTeamPalette({
      ...colors,
      palette: Array.from({ length: count }, (_, i) => ({ colorId: `c${i}`, value: '#ffffff' }))
    })
  ).toBeUndefined();
});
it('refuses dangling selections, duplicate IDs, unknown keys and invalid labels', () => {
  for (const value of [
    { ...colors, display: { roles: { 'team.accent': 'missing' } } },
    { ...colors, display: { roles: { 'team.accent': 'red', 'team.surface': 'missing' } } },
    { ...colors, palette: [colors.palette[0], colors.palette[0]] },
    { ...colors, unknown: true },
    { ...colors, palette: [{ ...colors.palette[0], group: ' ' }] }
  ])
    expect(resolveTeamColors(value)).toBeUndefined();
});
it('permits identical values without conflating palette identity and refuses the obsolete pair shape', () => {
  const duplicateValues = {
    palette: [
      { colorId: 'one', value: '#ffffff' },
      { colorId: 'two', value: '#ffffff' }
    ],
    display: { roles: { 'team.accent': 'one', 'team.surface': 'two' } }
  };
  expect(normalizeTeamPalette(duplicateValues)?.palette).toHaveLength(2);
  expect(resolveTeamColors(duplicateValues)).toEqual({
    roles: { 'team.accent': '#FFFFFF', 'team.surface': '#FFFFFF' }
  });
  expect(resolveTeamColors({ primary: '#ffffff', secondary: '#ffffff' })).toBeUndefined();
});
