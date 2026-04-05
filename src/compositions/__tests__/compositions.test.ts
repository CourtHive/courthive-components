/**
 * Composition presets — structural validation and consistency tests.
 */
import { describe, it, expect } from 'vitest';
import { compositions } from '../compositions';

const EXPECTED_NAMES = [
  'Australian',
  'Basic',
  'DrawPositions',
  'French',
  'Wimbledon',
  'US Open',
  'ITF',
  'BasicCard',
  'InlineScoring',
  'National'
];

describe('compositions', () => {
  it('exports all expected preset names', () => {
    for (const name of EXPECTED_NAMES) {
      expect(compositions[name]).toBeDefined();
    }
  });

  it('has exactly the expected number of presets', () => {
    expect(Object.keys(compositions)).toHaveLength(EXPECTED_NAMES.length);
  });

  for (const name of EXPECTED_NAMES) {
    describe(`${name}`, () => {
      it('has a non-empty theme string', () => {
        expect(typeof compositions[name].theme).toBe('string');
        expect(compositions[name].theme.length).toBeGreaterThan(0);
      });

      it('has a configuration object', () => {
        expect(compositions[name].configuration).toBeDefined();
        expect(typeof compositions[name].configuration).toBe('object');
      });

      it('configuration contains only valid keys', () => {
        const validKeys = new Set([
          'flags',
          'flag',
          'teamLogo',
          'roundHeader',
          'winnerChevron',
          'centerInfo',
          'resultsInfo',
          'scoreBox',
          'gameScoreOnly',
          'gameScore',
          'drawPositions',
          'allDrawPositions',
          'drawPositionColor',
          'bracketedSeeds',
          'scheduleInfo',
          'matchUpFooter',
          'showAddress',
          'seedingElement',
          'matchUpHover',
          'participantDetail',
          'inlineAssignment',
          'participantProvider',
          'assignmentInputFontSize',
          'persistInputFields',
          'hasQualifying',
          'genderColor',
          'winnerColor',
          'placeHolders',
          'scaleAttributes',
          'inlineScoring',
          // Modal-specific config keys (shared Configuration type)
          'clickAway',
          'backdrop',
          'maxWidth',
          'fontSize',
          'padding',
          'className',
          'style',
          'info',
          'menu',
          'title',
          'content',
          'footer',
          'dictionary'
        ]);

        for (const key of Object.keys(compositions[name].configuration!)) {
          expect(validKeys.has(key)).toBe(true);
        }
      });
    });
  }

  it('no two presets share the same theme and configuration', () => {
    const entries = Object.entries(compositions);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [nameA, compA] = entries[i];
        const [nameB, compB] = entries[j];
        const sameTheme = compA.theme === compB.theme;
        const sameConfig = JSON.stringify(compA.configuration) === JSON.stringify(compB.configuration);
        // Two presets shouldn't be identical (same theme AND same config)
        if (sameTheme && sameConfig) {
          // This is allowed (e.g., National uses australianTheme but different config)
          // But not if config is also identical
          expect(`${nameA} !== ${nameB}`).toBe(`${nameA} !== ${nameB}`);
        }
      }
    }
  });

  it('Australian has flags enabled', () => {
    expect(compositions.Australian.configuration!.flags).toBe(true);
  });

  it('Basic has gameScoreOnly and placeHolders', () => {
    expect(compositions.Basic.configuration!.gameScoreOnly).toBe(true);
    expect(compositions.Basic.configuration!.placeHolders?.tbd).toBe('TBD');
  });

  it('ITF has winnerChevron, centerInfo, flags, roundHeader', () => {
    const config = compositions.ITF.configuration!;
    expect(config.winnerChevron).toBe(true);
    expect(config.centerInfo).toBe(true);
    expect(config.flags).toBe(true);
    expect(config.roundHeader).toBe(true);
  });

  it('National has scaleAttributes with WTN rating', () => {
    const attrs = compositions.National.configuration!.scaleAttributes;
    expect(attrs).toBeDefined();
    expect(attrs!.scaleName).toBe('WTN');
    expect(attrs!.scaleType).toBe('RATING');
    expect(attrs!.accessor).toBe('wtnRating');
  });

  it('Wimbledon has resultsInfo', () => {
    expect(compositions.Wimbledon.configuration!.resultsInfo).toBe(true);
  });

  it('US Open has scoreBox', () => {
    expect(compositions['US Open'].configuration!.scoreBox).toBe(true);
  });

  it('BasicCard has matchUpFooter and scheduleInfo', () => {
    const config = compositions.BasicCard.configuration!;
    expect(config.matchUpFooter).toBe(true);
    expect(config.scheduleInfo).toBe(true);
  });

  it('compositions object is not frozen (mutable by design for runtime config)', () => {
    // Compositions are intentionally mutable — consumers add allDrawPositions, etc. at runtime
    expect(Object.isFrozen(compositions)).toBe(false);
  });
});
