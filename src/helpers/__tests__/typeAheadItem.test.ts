import { highlightSegments } from '../createTypeAhead';
import { describe, expect, it } from 'vitest';

/**
 * The match rule behind every type-ahead suggestion (#744). `typeAheadItem` renders these segments as
 * text nodes and `<mark>` elements; that rendering — markup staying text, the option id and role — is
 * asserted in Chromium by `src/stories/TypeAheadItemTests.stories.ts`.
 */
const PAYLOAD = '<img src=x onerror="globalThis.__xss=1">';

describe('highlightSegments', () => {
  it('marks every match, case-insensitively, keeping the original case', () => {
    expect(highlightSegments('Anna Annabel', 'ann')).toEqual([
      { text: 'Ann', match: true },
      { text: 'a ', match: false },
      { text: 'Ann', match: true },
      { text: 'abel', match: false }
    ]);
  });

  it('trims the input before matching', () => {
    expect(highlightSegments('Smith', '  SMI ')).toEqual([
      { text: 'Smi', match: true },
      { text: 'th', match: false }
    ]);
  });

  it('marks nothing for an empty or whitespace-only input', () => {
    expect(highlightSegments('Anna', '  ')).toEqual([{ text: 'Anna', match: false }]);
    expect(highlightSegments('Anna', '')).toEqual([{ text: 'Anna', match: false }]);
  });

  it('returns the whole text as one plain segment when nothing matches', () => {
    expect(highlightSegments('Anna', 'zz')).toEqual([{ text: 'Anna', match: false }]);
  });

  it('keeps markup in a label as literal characters, split only where the input matches', () => {
    const segments = highlightSegments(`${PAYLOAD} Smith`, 'smi');
    expect(segments.map((s) => s.text).join('')).toBe(`${PAYLOAD} Smith`);
    expect(segments).toEqual([
      { text: `${PAYLOAD} `, match: false },
      { text: 'Smi', match: true },
      { text: 'th', match: false }
    ]);
  });
});
