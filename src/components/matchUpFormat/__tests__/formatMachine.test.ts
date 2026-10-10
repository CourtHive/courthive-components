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

function edit(state: EditorState, ...edits: Edit[]): EditorState {
  return edits.reduce((current, next) => applyEdit(current, next, { codec }), state);
}
const codeAfter = (start: string, ...edits: Edit[]) => toCode(edit(fromCode(start, codec), ...edits).format, codec);

/**
 * The codes the state cannot yet represent: outs sets, match-level time limits, a timed set's
 * tiebreak, the standalone timed short form and an unknown match modifier. They are the 26 the old
 * picker rebuilt wrongly (`modalBehaviour.test.ts`) plus the catalog's BLW format, which it kept only
 * through the catalog dropdown; here each one opens read-only instead.
 */
const UNREPRESENTABLE = [
  'INN4XA-S:O3',
  'INN4XA-S:O3-M:T50',
  'INN6XA-S:O3',
  'SET1-S:O3',
  'SET3-S:6/TB7-M:T120',
  'SET3-S:6/TB7-M:T60',
  'SET3-S:T10/TB1',
  'SET3-S:T10P/TB1',
  'SET3-S:T10P/TB10',
  'SET3-S:T10P/TB7',
  'SET3-S:T20/TB7',
  'SET3X-S:T10P/TB1',
  'SET3Z-S:6/TB7',
  'SET5-S:T10P/TB1',
  'T1',
  'T10',
  'T10P',
  'T120',
  'T120P',
  'T15P',
  'T2',
  'T20',
  'T30',
  'T30P',
  'T60',
  'T90',
  'T90@RALLY'
];

describe('codes in, codes out', () => {
  it('rebuilds every representable code exactly, and marks the rest read-only', () => {
    const readOnly: string[] = [];
    for (const code of corpus as string[]) {
      const state = fromCode(code, codec);
      if (state.readOnlyReasons.length) readOnly.push(code);
      else expect(toCode(state.format, codec), code).toBe(code);
    }
    expect(readOnly.length, 'control: the corpus holds representable codes').toBeLessThan((corpus as string[]).length);
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
    expect(toCode(state.format, codec)).toBe('SET3-S:T10P');
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
    const readOnly = fromCode('INN4XA-S:O3-M:T50', codec);
    expect(readOnly.readOnlyReasons).toEqual(['unrepresentable']);
    expect(edit(readOnly, { type: 'setCount', count: 5 })).toBe(readOnly);
    const replaced = edit(readOnly, { type: 'loadCode', code: STANDARD });
    expect(replaced.readOnlyReasons).toEqual([]);
    expect(selectedCode(replaced, codec)).toBe(STANDARD);
  });
});

describe('capabilities', () => {
  const view = (code: string, capabilities: Capabilities) =>
    deriveView(fromCode(code, codec, capabilities), { codec, capabilities, catalogCodes: [] });

  it('a switched-off capability is not offered', () => {
    const shown = view(STANDARD, { setTypes: { timed: false }, exactly: false, aggregate: false, finalSet: false });
    expect(shown.set.what.options.map((option) => option.value)).toEqual(['SET', 'TIEBREAK']);
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
