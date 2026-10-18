/**
 * The picker's state machine, without a DOM: codes in, codes out, and every transition rule once.
 */
import { matchUpFormatCode } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

import { fromCode, selectedCode, toCode } from '../machine/codec';
import { deriveView } from '../machine/view';
import { applyEdit } from '../machine/edits';
import catalog from '../matchUpFormats.json';
import corpus from './roundTripCorpus.json';

// constants and types
import type { Capabilities, Edit, EditorState } from '../machine/types';

const codec = { parse: matchUpFormatCode.parse, stringify: matchUpFormatCode.stringify };
const STANDARD = 'SET3-S:6/TB7';
const TIMED_POINTS = 'SET3-S:T10P';
const TIME_LIMITED = 'SET3-S:6/TB7-M:T60';
const EXACTLY_TIMED = 'SET3X-S:T10';
const TIEBREAK_SETS = 'SET3-S:TB11';
const TIMED = 'SET3-S:T10';

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
    expect(codeAfter(STANDARD, { type: 'setCountMode', mode: 'EXACTLY' })).toBe(EXACTLY_TIMED);
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
    expect(shown.set.what.options.map((option) => option.value)).toEqual(['SET', 'TIEBREAK', 'OUTS', 'POINTS_TOTAL']);
    expect(shown.descriptor.options.map((option) => option.value)).toEqual(['BEST_OF']);
    expect(shown.aggregate.visible).toBe(false);
    expect(shown.finalSetToggle.visible).toBe(false);
    // a tiebreak-only set is one an aggregate is offered for, so this is the capability hiding it
    expect(view(TIEBREAK_SETS, { aggregate: false }).aggregate.visible).toBe(false);
    expect(view(TIEBREAK_SETS, {}).aggregate.visible, 'control: offered with the capability on').toBe(true);
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
    expect(codeAfter(STANDARD, { type: 'setSetType', segment: 'set', setType: 'TIMED' })).toBe(TIMED);
  });

  it('the standalone short form is kept while the format is still a single timed set', () => {
    expect(codeAfter('T10', { type: 'setSegmentValue', segment: 'set', field: 'minutes', value: 20 })).toBe('T20');
    expect(codeAfter('T10', { type: 'setCount', count: 3 })).toBe(TIMED);
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
    // a standard set cannot be part of an aggregate (CA 2026-10-18), so the aggregate ends with the outs
    expect(codeAfter('INN4XA-S:O3', { type: 'setSetType', segment: 'set', setType: 'SET' })).toBe('INN5-S:6');
  });

  it('a match time limit can be set on any format and removed', () => {
    expect(codeAfter(STANDARD, { type: 'setMaxMinutes', minutes: 60 })).toBe(TIME_LIMITED);
    expect(codeAfter('INN4XA-S:O3-M:T50', { type: 'setMaxMinutes', minutes: 0 })).toBe('INN4XA-S:O3');
  });

  it('a switched-off time limit makes a code that has one read-only', () => {
    expect(fromCode(TIME_LIMITED, codec, { maxMatchTime: false }).readOnlyReasons).toEqual(['maxMatchTime']);
  });
});

describe('Phases 1–3: points total (SET1-S:P32)', () => {
  const WITH_FINAL_SET = 'SET3-S:4/TB7-F:TB10';
  const AGGREGATE_HALVES = 'HAL2A-S:T15';
  const WITH_GAME_FORMAT = 'SET3-S:T10-G:3C';
  const DECIDING_POINT = 'SET1-S:P32DP';
  const POINTS = 'SET1-S:P32';
  const choosePoints: Edit = { type: 'setSetType', segment: 'set', setType: 'POINTS_TOTAL' };
  const total = (value: number): Edit => ({
    type: 'setSegmentValue',
    segment: 'set',
    field: 'combinedPointTotal',
    value
  });
  const tieMargin = (value: number): Edit => ({ type: 'setSegmentValue', segment: 'set', field: 'tieMargin', value });
  const view = (state: EditorState, extra: Partial<Parameters<typeof deriveView>[1]> = {}) =>
    deriveView(state, { codec, catalogCodes: [], ...extra });
  // Each one carries a match-level value a points total locks: final set, Exactly, a root, aggregate,
  // a game format, a time limit.
  const LOCKED_STARTS = [WITH_FINAL_SET, EXACTLY_TIMED, AGGREGATE_HALVES, WITH_GAME_FORMAT, TIME_LIMITED];

  it('control: every start is a code the picker rebuilds exactly', () => {
    for (const start of LOCKED_STARTS) expect(codeAfter(start), start).toBe(start);
  });

  it('choosing it writes one set of a SET match, whatever the match had', () => {
    for (const start of LOCKED_STARTS) expect(codeAfter(start, choosePoints), start).toBe(POINTS);
  });

  it('choosing another set type brings back what the match had', () => {
    expect(codeAfter(WITH_FINAL_SET, choosePoints, { type: 'setSetType', segment: 'set', setType: 'SET' })).toBe(
      WITH_FINAL_SET
    );
    for (const start of [EXACTLY_TIMED, AGGREGATE_HALVES, WITH_GAME_FORMAT]) {
      expect(codeAfter(start, choosePoints, { type: 'setSetType', segment: 'set', setType: 'TIMED' }), start).toBe(
        start
      );
    }
    expect(codeAfter(TIME_LIMITED, choosePoints, { type: 'setSetType', segment: 'set', setType: 'SET' })).toBe(
      TIME_LIMITED
    );
  });

  it('while it is chosen, each match-level edit is refused and changes nothing', () => {
    const locked: Edit[] = [
      { type: 'setCountMode', mode: 'EXACTLY' },
      { type: 'setCount', count: 3 },
      { type: 'setMatchRoot', matchRoot: 'INN' },
      { type: 'setAggregate', on: true },
      { type: 'setGameFormat', gameFormat: { type: 'CONSECUTIVE', count: 3 } },
      { type: 'setMaxMinutes', minutes: 60 },
      { type: 'setFinalSet', on: true }
    ];
    const opened = fromCode(POINTS, codec);
    for (const next of locked) expect(applyEdit(opened, next, { codec }), next.type).toBe(opened);
    // control: the same edits do change a format that is not a points total
    const standard = fromCode(STANDARD, codec);
    for (const next of locked) expect(applyEdit(standard, next, { codec }), next.type).not.toBe(standard);
  });

  it('a final set is never a points total', () => {
    const start = WITH_FINAL_SET;
    expect(codeAfter(start, { type: 'setSetType', segment: 'finalSet', setType: 'POINTS_TOTAL' })).toBe(start);
    const shown = view(fromCode(start, codec));
    expect(shown.finalSet.what.options.map((option) => option.value)).not.toContain('POINTS_TOTAL');
    expect(shown.set.what.options.map((option) => option.value)).toContain('POINTS_TOTAL');
  });

  it('the tie rule writes nothing, a deciding point for win by 1, and WB for 2 or 3', () => {
    expect(codeAfter(POINTS, tieMargin(1))).toBe(DECIDING_POINT);
    expect(codeAfter(POINTS, tieMargin(2))).toBe('SET1-S:P32WB2');
    expect(codeAfter(POINTS, tieMargin(3))).toBe('SET1-S:P32WB3');
    expect(codeAfter('SET1-S:P32WB2', tieMargin(0))).toBe(POINTS);
    expect(fromCode(DECIDING_POINT, codec).format.set.tieMargin).toBe(1);
  });

  it('an odd total cannot tie: the tie rule is hidden and not written, and comes back on an even total', () => {
    const odd = edit(fromCode(DECIDING_POINT, codec), total(31));
    expect(toCode(odd.format, codec)).toBe('SET1-S:P31');
    expect(view(odd).set.tieRule.visible).toBe(false);
    expect(view(fromCode(DECIDING_POINT, codec)).set.tieRule.visible).toBe(true);
    expect(codeAfter(DECIDING_POINT, total(31), total(24))).toBe('SET1-S:P24DP');
  });

  it('an odd total that names a tie rule opens read-only rather than losing it', () => {
    const state = fromCode('SET1-S:P31DP', codec);
    expect(state.readOnlyReasons).toEqual(['unrepresentable']);
    expect(selectedCode(state, codec)).toBe('SET1-S:P31DP');
  });

  it('shows the match-level values it locks, fixed, and hides the ones it turns off', () => {
    const shown = view(fromCode(WITH_FINAL_SET, codec), {});
    const points = view(edit(fromCode(WITH_FINAL_SET, codec), choosePoints));
    expect([shown.descriptor.locked, shown.count.locked, shown.matchRoot.locked]).toEqual([
      undefined,
      undefined,
      undefined
    ]);
    expect([points.descriptor.locked, points.count.locked, points.matchRoot.locked]).toEqual([true, true, true]);
    expect([points.descriptor.label, points.count.label, points.matchRoot.label]).toEqual(['Best of', '1', 'Set']);
    expect(points.aggregate.visible).toBe(false);
    expect(points.gameFormat.visible).toBe(false);
    expect(points.maxTime.visible).toBe(false);
    expect(points.finalSetToggle.visible).toBe(false);
    expect(points.finalSet.visible).toBe(false);
    expect(points.set.pointsTotal.label).toBe('32 points▾');
    expect(points.set.tieRule.label).toBe('Tie allowed▾');
  });

  it('a switched-off points total is not offered, and a code that has one opens read-only', () => {
    const capabilities: Capabilities = { setTypes: { pointsTotal: false } };
    const shown = deriveView(fromCode(STANDARD, codec, capabilities), { codec, capabilities, catalogCodes: [] });
    expect(shown.set.what.options.map((option) => option.value)).not.toContain('POINTS_TOTAL');
    expect(fromCode(POINTS, codec, capabilities).readOnlyReasons).toEqual(['setTypes.pointsTotal']);
  });

  it('offers the configured totals, plus an opened total that is not among them', () => {
    const shown = view(fromCode('SET1-S:P40', codec), { options: { combinedPointTotals: [16, 32] } });
    expect(shown.set.pointsTotal.options.map((option) => option.value)).toEqual([16, 32, 40]);
  });

  describe('Phase 3: a policy narrows what is offered', () => {
    const combinedPoints = {
      permittedPointTotals: [24, 32],
      permittedVariants: [{ tieResolution: 'DECIDING_POINT' as const }]
    };

    it('offers only the permitted totals, and a single permitted tie rule as fixed text', () => {
      const shown = view(fromCode(DECIDING_POINT, codec), { combinedPoints });
      expect(shown.set.pointsTotal.options.map((option) => option.value)).toEqual([24, 32]);
      expect(shown.set.tieRule).toMatchObject({ label: 'Win by 1', locked: true });
      // control: without a policy the same rule is a dropdown of all four
      const free = view(fromCode(DECIDING_POINT, codec));
      expect(free.set.tieRule.locked).toBeUndefined();
      expect(free.set.tieRule.options.map((option) => option.text)).toEqual([
        'Tie allowed',
        'Win by 1',
        'Win by 2',
        'Win by 3'
      ]);
    });

    it('choosing points total starts on a permitted total and tie rule', () => {
      const start = fromCode(STANDARD, codec);
      const next = applyEdit(start, choosePoints, {
        codec,
        combinedPoints: { ...combinedPoints, permittedPointTotals: [24] }
      });
      expect(toCode(next.format, codec)).toBe('SET1-S:P24DP');
      // control: with no policy it starts on the defaults
      expect(codeAfter(STANDARD, choosePoints)).toBe(POINTS);
    });

    it('a code opened with values the policy does not permit keeps them', () => {
      const state = fromCode('SET1-S:P40WB2', codec);
      expect(state.readOnlyReasons).toEqual([]);
      expect(selectedCode(state, codec)).toBe('SET1-S:P40WB2');
      const narrowed = view(state, { combinedPoints }).set.pointsTotal;
      expect(narrowed.label).toBe('40 points▾');
      // shown, but not offered: the policy's list is not widened to admit it
      expect(narrowed.options.map((option) => option.value)).toEqual([24, 32]);
    });
  });
});

describe('codes the retired matchUpFormatLogic tests pinned, outside the corpus', () => {
  // From matchUpFormatLogic.test.ts and timedSetsScoringMethods.test.ts, retired with the file (M5,
  // CA 2026-10-11). Each is canonical and must rebuild exactly; the corpus and catalog hold the rest.
  const CANONICAL = [
    'SET4X-S:T20',
    'SET3X-S:T10-F:TB1NOAD',
    'SET3X-S:T10-F:TB1',
    'SET5-S:5-G:3C3D',
    'SET3-S:6/TB7-F:T10P',
    'SET1-S:T5'
  ];

  it('each opens editable and rebuilds exactly', () => {
    for (const code of CANONICAL) {
      const state = fromCode(code, codec);
      expect(state.readOnlyReasons, code).toEqual([]);
      expect(toCode(state.format, codec), code).toBe(code);
    }
  });

  it('an explicit games basis (T10G) opens editable, returns its own spelling, and rebuilds as T10', () => {
    const state = fromCode('SET3X-S:T10G', codec);
    expect(state.readOnlyReasons).toEqual([]);
    expect(selectedCode(state, codec)).toBe('SET3X-S:T10G');
    expect(toCode(state.format, codec)).toBe(EXACTLY_TIMED);
  });

  it('the removed "A" basis (T10A) does not parse, so the picker falls back to the default', () => {
    expect(codec.parse('SET3X-S:T10A')).toBeFalsy();
    expect(selectedCode(fromCode('SET3X-S:T10A', codec), codec)).toBe(STANDARD);
  });
});

describe('the catalog', () => {
  // The picker's named presets, including the points totals (M4, CA lifted the gate 2026-10-11).
  const presets = (catalog as { format?: string; name: string }[]).filter((entry) => entry.format);

  it('every preset opens editable and rebuilds exactly', () => {
    expect(presets.length, 'control: the catalog is not empty').toBeGreaterThan(40);
    for (const { format, name } of presets) {
      const state = fromCode(format!, codec);
      expect(state.readOnlyReasons, name).toEqual([]);
      expect(toCode(state.format, codec), name).toBe(format);
    }
  });

  it('offers the points-total presets: 32 with a tie as a result, 32 with a deciding point, and 24', () => {
    const formats = presets.map((entry) => entry.format);
    expect(formats).toEqual(expect.arrayContaining(['SET1-S:P32', 'SET1-S:P32DP', 'SET1-S:P24']));
  });
});

/**
 * An aggregate of standard sets (`SET3A-S:6/TB7`) is refused by the factory for a new format (CA
 * 2026-10-18, scoring engine spec § 9.3 rule 5): an aggregate sums segments scored in units. The picker
 * offers Aggregate only where the factory accepts it, so it cannot build a code the factory refuses.
 */
describe('Aggregate is offered only where an aggregate is defined', () => {
  const shownFor = (code: string) => deriveView(fromCode(code, codec), { codec, catalogCodes: [] }).aggregate;

  it('is not offered for a standard set, and switching it on there changes nothing', () => {
    expect(shownFor(STANDARD).visible).toBe(false);
    expect(codeAfter(STANDARD, { type: 'setAggregate', on: true })).toBe(STANDARD);
    expect(codeAfter('INN5-S:6', { type: 'setAggregate', on: true })).toBe('INN5-S:6');
  });

  it('is offered for timed, tiebreak-only and outs sets', () => {
    for (const code of [TIMED, TIEBREAK_SETS, 'INN9-S:O3', EXACTLY_TIMED]) {
      expect(shownFor(code).visible, code).toBe(true);
    }
    expect(codeAfter(TIEBREAK_SETS, { type: 'setAggregate', on: true })).toBe('SET3A-S:TB11');
    expect(codeAfter('HAL2-S:T45', { type: 'setAggregate', on: true })).toBe('HAL2A-S:T45');
  });

  it('a set made standard ends the aggregate', () => {
    expect(codeAfter('HAL2A-S:T45', { type: 'setSetType', segment: 'set', setType: 'SET' })).toBe('HAL2-S:6');
  });

  it('a best-of aggregate sums its final set, so a standard final set ends it; an Exactly decider does not', () => {
    const bestOf = edit(
      fromCode('SET3A-S:TB11', codec),
      { type: 'setFinalSet', on: true },
      { type: 'setSetType', segment: 'finalSet', setType: 'SET' }
    );
    expect(bestOf.format.aggregate).toBe(false);
    const exactly = edit(
      fromCode('SET2XA-S:T10P', codec),
      { type: 'setFinalSet', on: true },
      { type: 'setSetType', segment: 'finalSet', setType: 'SET' }
    );
    expect(exactly.format.aggregate).toBe(true);
  });

  it('a stored aggregate of standard sets opens with the toggle on and offered, so it can be turned off', () => {
    const stored = 'SET3A-S:6/TB7';
    expect(selectedCode(fromCode(stored, codec), codec)).toBe(stored);
    expect(shownFor(stored)).toEqual({ visible: true, checked: true });
    expect(codeAfter(stored, { type: 'setAggregate', on: false })).toBe(STANDARD);
  });
});
