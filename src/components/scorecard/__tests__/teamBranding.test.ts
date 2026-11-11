import { compositionSnapshot } from '../../composition-editor/compositionSnapshot';
import { compositions } from '../../../compositions/compositions';
import { expect, it } from 'vitest';

// The rendered TEAM accent behavior is pinned by play functions in src/stories/TeamBrandingTests.stories.ts.

it('keeps the generic preset neutral and round-trips explicit maps while removing runtime callbacks', () => {
  expect(compositions.Scoreboard.configuration?.sideColors).toBeUndefined();
  const snapshot = (sideColors: any) =>
    compositionSnapshot({
      ...compositions.Scoreboard,
      compositionName: 'Scoreboard',
      configuration: { ...compositions.Scoreboard.configuration, sideColors }
    });
  expect(snapshot({ 1: '#FFFFFF' }).configuration.sideColors).toEqual({ 1: '#FFFFFF' });
  expect(snapshot(() => '#FFFFFF').configuration.sideColors).toBeUndefined();
});
