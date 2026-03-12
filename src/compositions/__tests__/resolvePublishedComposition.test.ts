import { describe, it, expect } from 'vitest';
import { resolvePublishedComposition } from '../resolvePublishedComposition';
import { compositions } from '../compositions';

describe('resolvePublishedComposition', () => {
  it('returns National composition when no display value provided', () => {
    const result = resolvePublishedComposition();
    expect(result.theme).toBe(compositions.National.theme);
    expect(result.configuration?.bracketedSeeds).toBe('square');
  });

  it('returns National composition for undefined display', () => {
    const result = resolvePublishedComposition();
    expect(result.theme).toBe(compositions.National.theme);
  });

  it('returns National composition for empty display', () => {
    const result = resolvePublishedComposition({});
    expect(result.theme).toBe(compositions.National.theme);
  });

  it('resolves named composition', () => {
    const result = resolvePublishedComposition({ compositionName: 'French' });
    expect(result.theme).toBe(compositions.French.theme);
    expect(result.configuration?.bracketedSeeds).toBe(true);
    expect(result.configuration?.flags).toBe(true);
  });

  it('overrides theme from display extension', () => {
    const result = resolvePublishedComposition({
      compositionName: 'Australian',
      theme: 'custom-theme-class'
    });
    expect(result.theme).toBe('custom-theme-class');
    // Base configuration still preserved
    expect(result.configuration?.flags).toBe(true);
  });

  it('merges configuration overrides onto base', () => {
    const result = resolvePublishedComposition({
      compositionName: 'Australian',
      configuration: { scheduleInfo: true, participantDetail: 'ADDRESS' }
    });
    // Base field preserved
    expect(result.configuration?.flags).toBe(true);
    // Overrides applied
    expect(result.configuration?.scheduleInfo).toBe(true);
    expect(result.configuration?.participantDetail).toBe('ADDRESS');
  });

  it('configuration override replaces base field', () => {
    const result = resolvePublishedComposition({
      compositionName: 'Australian',
      configuration: { flags: false }
    });
    expect(result.configuration?.flags).toBe(false);
  });

  it('falls back to National for unknown composition name', () => {
    const result = resolvePublishedComposition({ compositionName: 'NonExistent' });
    expect(result.theme).toBe(compositions.National.theme);
    expect(result.configuration?.bracketedSeeds).toBe('square');
  });

  it('uses custom fallback name', () => {
    const result = resolvePublishedComposition({}, 'French');
    expect(result.theme).toBe(compositions.French.theme);
  });

  it('falls back to National when custom fallback is also unknown', () => {
    const result = resolvePublishedComposition({}, 'AlsoNonExistent');
    expect(result.theme).toBe(compositions.National.theme);
  });

  it('does not mutate the built-in composition singleton', () => {
    const originalTheme = compositions.Australian.theme;
    const originalFlags = compositions.Australian.configuration?.flags;

    const result = resolvePublishedComposition({
      compositionName: 'Australian',
      theme: 'mutated-theme',
      configuration: { flags: false, scheduleInfo: true }
    });

    // Result has overrides
    expect(result.theme).toBe('mutated-theme');
    expect(result.configuration?.flags).toBe(false);

    // Singleton is unchanged
    expect(compositions.Australian.theme).toBe(originalTheme);
    expect(compositions.Australian.configuration?.flags).toBe(originalFlags);
    expect(compositions.Australian.configuration?.scheduleInfo).toBeUndefined();
  });

  it('returns independent objects across calls', () => {
    const a = resolvePublishedComposition({ compositionName: 'Australian' });
    const b = resolvePublishedComposition({ compositionName: 'Australian' });

    a.theme = 'changed';
    a.configuration.flags = false;

    expect(b.theme).toBe(compositions.Australian.theme);
    expect(b.configuration?.flags).toBe(true);
  });

  it('handles complete SavedComposition-shaped display value', () => {
    const result = resolvePublishedComposition({
      compositionName: 'ITF',
      theme: 'published-theme',
      configuration: {
        winnerChevron: false,
        genderColor: true,
        gameScore: { position: 'trailing', inverted: true }
      }
    });

    expect(result.theme).toBe('published-theme');
    expect(result.configuration?.winnerChevron).toBe(false);
    expect(result.configuration?.genderColor).toBe(true);
    expect(result.configuration?.gameScore?.position).toBe('trailing');
    // Base ITF fields not in override are preserved
    expect(result.configuration?.centerInfo).toBe(true);
    expect(result.configuration?.roundHeader).toBe(true);
  });
});
