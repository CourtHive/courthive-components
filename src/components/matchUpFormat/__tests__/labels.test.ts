/**
 * The picker's own words come from `config.labels` (CA, 2026-10-11): singular set-type names in `what`,
 * plural ones in `whatPlural`, and every label that carries a number is a template with `{n}`.
 *
 * The sweep below renders every corpus code with a pseudo-locale in which each label is wrapped in ⟦ ⟧,
 * and requires every text the picker shows to be either translated or a bare value. An English string
 * that is not read from the labels, now or added later, fails it by name.
 */
import { matchUpFormatCode } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

import { deriveView, DEFAULT_LABELS } from '../machine/view';
import { applyEdit } from '../machine/edits';
import { fromCode } from '../machine/codec';
import corpus from './roundTripCorpus.json';

// constants and types
import type { ControlView, EditorView, SegmentView } from '../machine/view';
import type { EditorState } from '../machine/types';

const codec = { parse: matchUpFormatCode.parse, stringify: matchUpFormatCode.stringify };
const CLICKABLE = '▾';
const STANDARD = 'SET3-S:6/TB7';

/** Every label in ⟦ ⟧, templates keeping their `{n}`. */
function pseudo(value: any): any {
  if (typeof value === 'string') return `⟦${value}⟧`;
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, pseudo(inner)]));
}

const PSEUDO_LABELS = {
  ...pseudo(DEFAULT_LABELS),
  descriptors: { bestOf: '⟦Best of⟧', exactly: '⟦Exactly⟧' },
  game: '⟦Game⟧',
  maxTime: '⟦Max time⟧',
  none: '⟦None⟧',
  games: '⟦Games⟧',
  points: '⟦Points⟧',
  traditional: '⟦Traditional⟧',
  consecutive2: '⟦2 consecutive⟧',
  consecutive3: '⟦3 consecutive⟧',
  consecutive4: '⟦4 consecutive⟧',
  goldenPoint: '⟦Golden point⟧',
  starPoint: '⟦Star point⟧'
};

function texts(control: ControlView): string[] {
  if (!control.visible) return [];
  return [control.label, ...control.options.map((option) => option.text)].map((text) => text.replace(CLICKABLE, ''));
}

function segmentTexts(segment: SegmentView): string[] {
  const controls = Object.values(segment).filter(
    (value): value is ControlView => typeof value === 'object' && 'options' in value
  );
  return controls.flatMap(texts);
}

function viewTexts(view: EditorView): string[] {
  return [
    ...texts(view.descriptor),
    ...texts(view.count),
    ...texts(view.matchRoot),
    ...texts(view.gameFormat),
    ...texts(view.maxTime),
    ...segmentTexts(view.set),
    ...(view.finalSet.visible ? segmentTexts(view.finalSet) : [])
  ];
}

/**
 * Text left once every translated part is taken out. A bare value (a number, `@6`, a code such as RALLY)
 * has no lowercase letters; any that remain are words the labels did not supply.
 */
const untranslated = (text: string) => /[a-z]/.test(text.replace(/⟦[^⟧]*⟧/g, ''));

describe('every word the picker shows comes from its labels', () => {
  const view = (state: EditorState) => deriveView(state, { codec, labels: PSEUDO_LABELS, catalogCodes: [] });

  it('over the whole corpus, every control and every option', () => {
    const leaks = new Set<string>();
    let shown = 0;
    for (const code of corpus as string[]) {
      for (const text of viewTexts(view(fromCode(code, codec)))) {
        shown += 1;
        if (untranslated(text)) leaks.add(`${code}: ${text}`);
      }
    }
    expect(shown, 'control: the sweep read the picker').toBeGreaterThan(5000);
    expect([...leaks]).toEqual([]);
  });

  it('including what only an edit reveals: a points total, a final set, a game format, a time limit', () => {
    const edited = [
      applyEdit(fromCode(STANDARD, codec), { type: 'setFinalSet', on: true }, { codec }),
      applyEdit(fromCode(STANDARD, codec), { type: 'setSetType', segment: 'set', setType: 'POINTS_TOTAL' }, { codec }),
      applyEdit(
        fromCode('SET1-S:P32', codec),
        { type: 'setSegmentValue', segment: 'set', field: 'tieMargin', value: 2 },
        { codec }
      ),
      applyEdit(
        fromCode('SET3-S:T10', codec),
        { type: 'setGameFormat', gameFormat: { type: 'CONSECUTIVE', count: 5 } },
        { codec }
      ),
      applyEdit(fromCode(STANDARD, codec), { type: 'setMaxMinutes', minutes: 90 }, { codec })
    ];
    const leaks = edited.flatMap((state) => viewTexts(view(state))).filter(untranslated);
    expect(leaks).toEqual([]);
  });

  it('control: without labels, the English defaults are what fails the sweep', () => {
    const english = deriveView(fromCode(STANDARD, codec), { codec, catalogCodes: [] });
    expect(viewTexts(english).filter(untranslated)).toContain('to 6');
  });
});

describe('singular and plural set-type names, and templates', () => {
  const labels = {
    what: { sets: 'Manche', tiebreaks: 'Jeu décisif' },
    whatPlural: { sets: 'Manches', tiebreaks: 'Jeux décisifs' },
    setTo: 'en {n} jeux',
    winBy: '{n} d’écart'
  };
  const view = (code: string) => deriveView(fromCode(code, codec), { codec, labels, catalogCodes: [] });

  it('a match of more than one set reads the plural, one set the singular, and the final set the singular', () => {
    expect(view(STANDARD).set.what.label).toBe('Manches▾');
    expect(view('SET1-S:6/TB7').set.what.label).toBe('Manche▾');
    expect(view('SET3-S:6/TB7-F:TB10').finalSet.what.label).toBe('Jeu décisif▾');
    expect(view(STANDARD).set.what.options.map((option) => option.text)).toContain('Jeux décisifs');
  });

  it('a template puts the number where the language does', () => {
    expect(view('SET3-S:4/TB7').set.setTo.label).toBe('en 4 jeux▾');
    expect(view('SET3-S:6NOAD').set.winBy.label).toBe('2 d’écart▾');
  });

  it('a key a consumer leaves out falls back to English on its own', () => {
    expect(view('SET3-S:T10').set.what.label).toBe('Timed sets▾');
    expect(view(STANDARD).set.tiebreakTo.label).toBe('TB to 7▾');
  });

  it('a translated "None" clears the modifier, because only its text is translated', () => {
    const french = { none: 'Aucun' };
    const state = fromCode('SET3-S:6/TB7@RALLY', codec);
    const options = deriveView(state, { codec, labels: french, catalogCodes: [] }).set.modifier.options;
    const none = options.find((option) => option.text === 'Aucun')!;
    const cleared = applyEdit(
      state,
      { type: 'setSegmentValue', segment: 'set', field: 'modifier', value: none.value },
      { codec }
    );
    expect(cleared.format.set.modifier).toBeUndefined();
  });
});
