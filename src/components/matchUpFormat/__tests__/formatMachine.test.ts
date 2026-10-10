/**
 * The picker's state machine, without a DOM: codes in, codes out, and every transition rule once.
 */
import { matchUpFormatCode } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

import { fromCode, selectedCode, toCode } from '../machine/codec';
import { deriveView } from '../machine/view';
import { applyEdit } from '../machine/edits';
import corpus from './roundTripCorpus.json';

// constants and types
import type { Capabilities, Edit, EditorState } from '../machine/types';

const codec = { parse: matchUpFormatCode.parse, stringify: matchUpFormatCode.stringify };
const STANDARD = 'SET3-S:6/TB7';
const TIMED_POINTS = 'SET3-S:T10P';

function edit(state: EditorState, ...edits: Edit[]): EditorState {
  return edits.reduce((current, next) => applyEdit(current, next, { codec }), state);
}
const codeAfter = (start: string, ...edits: Edit[]) => toCode(edit(fromCode(start, codec), ...edits).format, codec);

/**
 * The codes the state cannot represent. Phase 0 left 27 (outs sets, match time limits, a timed set's
 * tiebreak, the standalone timed short form and unknown match modifiers), each opening read-only.
 * Phases 6 and 5 made all of them editable. The list stays, asserted exactly, so a grammar addition the
 * picker cannot hold shows up here by name instead of opening read-only unnoticed.
 */
const UNREPRESENTABLE: string[] = [];

describe('codes in, codes out', () => {
  it('rebuilds every code in the corpus exactly', () => {
    const readOnly: string[] = [];
    for (const code of corpus as string[]) {
      const state = fromCode(code, codec);
      if (state.readOnlyReasons.length) readOnly.push(code);
      else expect(toCode(state.format, codec), code).toBe(code);
    }
    expect((corpus as string[]).length, 'control: the corpus is not empty').toBeGreaterThan(250);
    expect(readOnly).toEqual(UNREPRESENTABLE);
  });

  it('returns the code it opened with until something is edited, whatever its spelling', () => {
    for (const code of [...(corpus as string[]), 'SET3-S:6/TB7@6']) {
      expect(selectedCode(fromCode(code, codec), codec)).toBe(code);
    }
  });

  it('falls back to the default format for a code that does not parse', () => {
    const state = fromCode('NOT-A-FORMAT', codec);
    expect(state.readOnlyReasons).toEqual([]);
    expect(selectedCode(state, codec)).toBe(STANDARD);
  });
});

describe('each transition', () => {
  it('Exactly makes the main set timed; leaving timed returns to an odd Best of', () => {
    expect(codeAfter(STANDARD, { type: 'setCountMode', mode: 'EXACTLY' })).toBe('SET3X-S:T10');
    const exactlyFour = edit(fromCode('SET4X-S:T10', codec), { type: 'setSetType', segment: 'set', setType: 'SET' });
    expect(exactlyFour.format.countMode).toBe('BEST_OF');
    expect(exactlyFour.format.count).toBe(5);
  });

  it('a single set has no final set, and cannot be given one', () => {
    const single = edit(fromCode('SET3-S:6/TB7-F:TB10', codec), { type: 'setCount', count: 1 });
    expect(single.format.finalSetEnabled).toBe(false);
    expect(edit(single, { type: 'setFinalSet', on: true }).format.finalSetEnabled).toBe(false);
  });

  it('a final set starts as a copy of the main set', () => {
    const state = edit(fromCode('SET3-S:4NOAD/TB5@3', codec), { type: 'setFinalSet', on: true });
    expect(state.format.finalSet).toEqual(state.format.set);
    expect(toCode(state.format, codec)).toBe('SET3-S:4NOAD/TB5@3');
  });

  it('a new match root clamps Best of to what it offers', () => {
    expect(codeAfter('HAL11-S:T20', { type: 'setMatchRoot', matchRoot: 'SET' })).toBe('SET9-S:T20');
    expect(codeAfter('SET5-S:6/TB7', { type: 'setMatchRoot', matchRoot: 'HAL' })).toBe('HAL5-S:6/TB7');
  });

  it('a points-based timed set drops its game format', () => {
    const state = edit(fromCode('SET3-S:T10-G:3C', codec), {
      type: 'setSegmentValue',
      segment: 'set',
      field: 'based',
      value: 'P'
    });
    expect(state.format.gameFormat).toBeUndefined();
    expect(toCode(state.format, codec)).toBe(TIMED_POINTS);
  });

  it('a smaller set moves its tiebreak point with it', () => {
    expect(codeAfter(STANDARD, { type: 'setSegmentValue', segment: 'set', field: 'setTo', value: 4 })).toBe(
      'SET3-S:4/TB7'
    );
  });

  it('switching set type and back restores the earlier values', () => {
    const state = edit(
      fromCode('SET3-S:4NOAD/TB10@3', codec),
      { type: 'setSetType', segment: 'set', setType: 'TIMED' },
      { type: 'setSetType', segment: 'set', setType: 'SET' }
    );
    expect(toCode(state.format, codec)).toBe('SET3-S:4NOAD/TB10@3');
  });

  it('the tiebreak and the set-level win-by are separate values', () => {
    const noTiebreak = edit(fromCode('SET3-S:6/TB7NOAD', codec), { type: 'setTiebreak', segment: 'set', on: false });
    expect(toCode(noTiebreak.format, codec)).toBe('SET3-S:6');
    expect(codeAfter('SET3-S:6', { type: 'setSegmentValue', segment: 'set', field: 'setWinBy', value: 1 })).toBe(
      'SET3-S:6WB1'
    );
  });

  it('never changes the state it was given', () => {
    const before = fromCode(STANDARD, codec);
    const snapshot = structuredClone(before);
    edit(before, { type: 'setCount', count: 5 }, { type: 'setSegmentValue', segment: 'set', field: 'setTo', value: 4 });
    expect(before).toEqual(snapshot);
  });

  it('a read-only format accepts only a replacement code', () => {
    // No valid code is unrepresentable any more, so read-only is reached through a switched-off capability.
    const capabilities = { setTypes: { outs: false } };
    const readOnly = fromCode('INN4XA-S:O3-M:T50', codec, capabilities);
    expect(readOnly.readOnlyReasons).toEqual(['setTypes.outs']);
    const editOnly = (state: EditorState, next: Edit) => applyEdit(state, next, { codec, capabilities });
    expect(editOnly(readOnly, { type: 'setCount', count: 5 })).toBe(readOnly);
    const replaced = editOnly(readOnly, { type: 'loadCode', code: STANDARD });
    expect(replaced.readOnlyReasons).toEqual([]);
    expect(selectedCode(replaced, codec)).toBe(STANDARD);
  });

  it('a code whose parts the state cannot hold opens read-only', () => {
    // A codec whose stringify adds what the state does not carry stands in for a future grammar addition.
    const future = {
      parse: codec.parse,
      stringify: (parsed: any) => `${codec.stringify(parsed)}${parsed.future ? '-Q' : ''}`
    };
    const parse = (code: string) =>
      code === 'FUTURE' ? { ...codec.parse(STANDARD), future: true } : codec.parse(code);
    const state = fromCode('FUTURE', { parse, stringify: future.stringify });
    expect(state.readOnlyReasons).toEqual(['unrepresentable']);
    expect(selectedCode(state, codec)).toBe('FUTURE');
  });
});

describe('capabilities', () => {
  const view = (code: string, capabilities: Capabilities) =>
    deriveView(fromCode(code, codec, capabilities), { codec, capabilities, catalogCodes: [] });

  it('a switched-off capability is not offered', () => {
    const shown = view(STANDARD, { setTypes: { timed: false }, exactly: false, aggregate: false, finalSet: false });
    expect(shown.set.what.options.map((option) => option.value)).toEqual(['SET', 'TIEBREAK', 'OUTS']);
    expect(shown.descriptor.options.map((option) => option.value)).toEqual(['BEST_OF']);
    expect(shown.aggregate.visible).toBe(false);
    expect(shown.finalSetToggle.visible).toBe(false);
  });

  it('a code that needs a switched-off capability opens read-only and is returned unchanged', () => {
    const state = fromCode('SET7XA-S:T10P', codec, { setTypes: { timed: false }, aggregate: false });
    expect(state.readOnlyReasons).toEqual(['setTypes.timed', 'aggregate']);
    expect(selectedCode(state, codec)).toBe('SET7XA-S:T10P');
  });

  it('everything is on by default', () => {
    expect(fromCode('SET7XA-S:T10P-G:3C', codec).readOnlyReasons).toEqual([]);
  });
});

describe('Phase 6: what used to open read-only can be edited', () => {
  it("a timed set's tiebreak can be added, changed and removed", () => {
    expect(codeAfter(TIMED_POINTS, { type: 'setTiebreak', segment: 'set', on: true })).toBe('SET3-S:T10P/TB7');
    expect(
      codeAfter('SET3-S:T10P/TB7', { type: 'setSegmentValue', segment: 'set', field: 'tiebreakTo', value: 1 })
    ).toBe('SET3-S:T10P/TB1');
    expect(codeAfter('SET3-S:T10P/TB1', { type: 'setTiebreak', segment: 'set', on: false })).toBe(TIMED_POINTS);
  });

  it("a standard set's tiebreak does not follow it into a timed set", () => {
    expect(codeAfter(STANDARD, { type: 'setSetType', segment: 'set', setType: 'TIMED' })).toBe('SET3-S:T10');
  });

  it('the standalone short form is kept while the format is still a single timed set', () => {
    expect(codeAfter('T10', { type: 'setSegmentValue', segment: 'set', field: 'minutes', value: 20 })).toBe('T20');
    expect(codeAfter('T10', { type: 'setCount', count: 3 })).toBe('SET3-S:T10');
    expect(codeAfter('T10', { type: 'setCount', count: 3 }, { type: 'setCount', count: 1 })).toBe('T10');
    expect(codeAfter('T10', { type: 'setMaxMinutes', minutes: 20 })).toBe('SET1-S:T10-M:T20');
    expect(codeAfter('SET1-S:T10', { type: 'setSegmentValue', segment: 'set', field: 'minutes', value: 20 })).toBe(
      'SET1-S:T20'
    );
  });

  it('unknown match modifiers are carried through every edit', () => {
    expect(codeAfter('SET3Z-S:6/TB7', { type: 'setSegmentValue', segment: 'set', field: 'setTo', value: 4 })).toBe(
      'SET3Z-S:4/TB7'
    );
  });
});

describe('Phase 5: outs sets and the match time limit', () => {
  it('outs per side can be changed, in the main and the final set', () => {
    expect(codeAfter('INN9-S:O3', { type: 'setSegmentValue', segment: 'set', field: 'outs', value: 2 })).toBe(
      'INN9-S:O2'
    );
    expect(
      codeAfter(
        'INN9-S:O3',
        { type: 'setFinalSet', on: true },
        { type: 'setSegmentValue', segment: 'finalSet', field: 'outs', value: 1 }
      )
    ).toBe('INN9-S:O3-F:O1');
  });

  it('an outs set may be counted Exactly, and stays an outs set', () => {
    expect(codeAfter('INN9-S:O3', { type: 'setCountMode', mode: 'EXACTLY' })).toBe('INN9X-S:O3');
    expect(codeAfter('INN4XA-S:O3', { type: 'setSetType', segment: 'set', setType: 'SET' })).toBe('INN5A-S:6');
  });

  it('a match time limit can be set on any format and removed', () => {
    expect(codeAfter(STANDARD, { type: 'setMaxMinutes', minutes: 60 })).toBe('SET3-S:6/TB7-M:T60');
    expect(codeAfter('INN4XA-S:O3-M:T50', { type: 'setMaxMinutes', minutes: 0 })).toBe('INN4XA-S:O3');
  });

  it('a switched-off time limit makes a code that has one read-only', () => {
    expect(fromCode('SET3-S:6/TB7-M:T60', codec, { maxMatchTime: false }).readOnlyReasons).toEqual(['maxMatchTime']);
  });
});
