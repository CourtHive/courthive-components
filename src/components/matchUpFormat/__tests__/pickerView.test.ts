/**
 * The picker's flows without a DOM: a code opened with the picker's own configuration
 * (`resolvePickerConfig`), each control chosen by the text its dropdown shows (`controlView`,
 * `editForControl`), and what each control would read, offer and show (`deriveView`).
 *
 * These were happy-dom tests (`modalBehaviour`, `modalStateMachine`, `setCountDescriptors`) that drove
 * the rendered modal. Everything they asserted that the machine decides lives here; what only a browser
 * can show (a control disabled or hidden on screen, the footer reporting, one picker's state not
 * reaching the next) is in `src/stories/MatchUpFormatPickerTests.stories.ts`.
 */
import { matchUpFormatCode } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

import { controlView, editForControl, segmentOf } from '../machine/controls';
import { codec, resolvePickerConfig } from '../machine/pickerConfig';
import { fromCode, selectedCode } from '../machine/codec';
import { deriveView, CUSTOM } from '../machine/view';
import { applyEdit } from '../machine/edits';
import catalog from '../matchUpFormats.json';

// constants and types
import type { MatchUpFormatConfig } from '../machine/pickerConfig';
import type { SetControl } from '../machine/controls';
import type { ControlView } from '../machine/view';
import type { Edit } from '../machine/types';

const STANDARD = 'SET3-S:6/TB7';
const BLW = 'INN4XA-S:O3-M:T50';
const TIMED_SETS_LABEL = 'Timed sets';
const EXACTLY_TIMED = 'SET3X-S:T10';
const TIMED = 'SET3-S:T10';
const TIMED_POINTS = 'SET3-S:T10P';
const CATALOG_TIMED = 'SET7XA-S:T10P';
const POINTS_TOTAL = 'Points total';
const DECIDING_POINT = 'SET1-S:P32DP';
const POINTS_32 = 'SET1-S:P32';

/** The picker opened on a code, as `getMatchUpFormatModal` opens it, minus the DOM. */
function picker(matchUpFormat: string, config?: MatchUpFormatConfig) {
  const { viewConfig, editContext, capabilities } = resolvePickerConfig(config);
  let state = fromCode(matchUpFormat, codec, capabilities);
  const view = () => deriveView(state, viewConfig);
  const dispatch = (edit: Edit) => {
    state = applyEdit(state, edit, editContext);
  };
  const optionValue = (control: ControlView, text: string, name: string) => {
    const option = control.options.find((candidate) => candidate.text === text);
    expect(
      option,
      `control: "${text}" is offered by ${name} (offered: ${control.options.map((o) => o.text).join(', ')})`
    ).toBeTruthy();
    return option!.value;
  };
  return {
    view,
    dispatch,
    code: () => view().code,
    selected: () => selectedCode(state, codec),
    /** Open a set-row control's dropdown and choose an item by its text, as an operator would. */
    choose(id: SetControl, text: string, index?: number) {
      const segment = segmentOf(index);
      const current = view();
      dispatch(editForControl(current, id, segment, optionValue(controlView(current, id, segment), text, id)));
    },
    chooseRoot: (text: string) =>
      dispatch({ type: 'setMatchRoot', matchRoot: optionValue(view().matchRoot, text, 'matchRoot') }),
    chooseMaxTime: (text: string) =>
      dispatch({ type: 'setMaxMinutes', minutes: optionValue(view().maxTime, text, 'maxTime') }),
    offered: (id: SetControl) => controlView(view(), id, 'set').options.map((option) => option.text)
  };
}

const expectParses = (code: string) => {
  expect(code).not.toBe('');
  expect(matchUpFormatCode.parse(code), code).toBeTruthy();
};

describe('opening a format', () => {
  it('reads the code and its tiebreak and final-set toggles', () => {
    const { view } = picker(STANDARD);
    expect(view().code).toBe(STANDARD);
    expect(view().set.tiebreakToggle.checked).toBe(true);
    expect(view().finalSetToggle.checked).toBe(false);
  });

  it('reads an explicit final set without a tiebreak as having none', () => {
    const { view } = picker('SET3-S:6/TB7-F:6');
    expect(view().set.tiebreakToggle.checked).toBe(true);
    expect(view().finalSet.tiebreakToggle.checked).toBe(false);
  });

  it('reads a tiebreak-only final set as a tiebreak, with no set target', () => {
    const { view } = picker('SET3-S:6/TB7-F:TB10');
    expect(view().finalSetToggle.checked).toBe(true);
    expect(view().finalSet.what.label).toContain('Tiebreak');
    expect(view().finalSet.setTo.visible).toBe(false);
  });
});

describe('the final set', () => {
  it('copies the main set, tiebreak included, so turning it on changes nothing until it is edited', () => {
    const { view, dispatch, selected } = picker(STANDARD);
    dispatch({ type: 'setFinalSet', on: true });
    expect(view().finalSet.tiebreakToggle.checked).toBe(true);
    expect(view().code).toBe(STANDARD);
    expect(selected()).toBe(STANDARD);
  });

  it('copies a main set without a tiebreak as one without', () => {
    const { view, dispatch, selected } = picker('SET3-S:6');
    dispatch({ type: 'setFinalSet', on: true });
    expect(view().finalSet.tiebreakToggle.checked).toBe(false);
    expect(selected()).toBe('SET3-S:6');
  });

  it('goes away when the match becomes a single set', () => {
    const { view, choose, selected } = picker('SET3-S:6/TB7-F:TB10');
    choose('bestOf', '1');
    expect(view().code).toBe('SET1-S:6/TB7');
    expect(view().finalSetToggle).toEqual({ visible: false, checked: false });
    expect(selected()).toBe('SET1-S:6/TB7');
  });
});

describe('each control', () => {
  it('Exactly turns standard sets into timed sets', () => {
    const { view, choose, selected } = picker(STANDARD);
    choose('descriptor', 'Exactly');
    expect(view().code).toBe(EXACTLY_TIMED);
    expect(view().set.what.label).toContain(TIMED_SETS_LABEL);
    expect(view().set.minutes.visible).toBe(true);
    expect(view().set.setTo.visible).toBe(false);
    expect(selected()).toBe(EXACTLY_TIMED);
  });

  it('a tiebreak set shows its target and win-by, and no set controls', () => {
    const { view, choose } = picker(STANDARD);
    choose('what', 'Tiebreaks');
    const { set } = view();
    expect(view().code).toBe('SET3-S:TB7');
    expect(set.setTo.visible).toBe(false);
    expect(set.tiebreakTo.visible).toBe(true);
    expect(set.tiebreakAt.visible).toBe(false);
    expect(set.winBy.visible).toBe(true);
    expect(set.tiebreakToggle.visible).toBe(false);
  });

  it('a timed set shows minutes and its scoring basis; points hides the game format', () => {
    const { view, choose, selected } = picker(STANDARD);
    choose('what', TIMED_SETS_LABEL);
    // The main set's tiebreak does not carry over to the timed set.
    expect(view().code).toBe(TIMED);
    expect(view().set.minutes.visible).toBe(true);
    expect(view().set.based.visible).toBe(true);
    // Phase 6: a timed set can end in a tiebreak (`SET3-S:T10P/TB1`), so its toggle is offered.
    expect(view().set.tiebreakToggle).toEqual({ visible: true, checked: false });
    choose('based', 'Points');
    expect(view().code).toBe(TIMED_POINTS);
    expect(view().gameFormat.visible).toBe(false);
    expect(selected()).toBe(TIMED_POINTS);
  });

  it('a smaller set moves the tiebreak point with it', () => {
    const { view, choose } = picker(STANDARD);
    choose('setTo', '4');
    expect(view().code).toBe('SET3-S:4/TB7');
    expect(view().set.tiebreakAt.label).toContain('@4');
  });

  it('removing the tiebreak hides its target and offers a set-level win-by', () => {
    const { view, dispatch } = picker(STANDARD);
    dispatch({ type: 'setTiebreak', segment: 'set', on: false });
    expect(view().code).toBe('SET3-S:6');
    expect(view().set.tiebreakTo.visible).toBe(false);
    expect(view().set.winBy.visible).toBe(true);
  });

  it('advantage, win-by, tiebreak target and modifier each change the code', () => {
    const first = picker(STANDARD);
    first.choose('advantage', 'No-Ad');
    expect(first.code()).toBe('SET3-S:6NOAD/TB7');
    first.choose('winBy', '1');
    expect(first.code()).toBe('SET3-S:6NOAD/TB7NOAD');
    first.choose('tiebreakTo', '10');
    expect(first.code()).toBe('SET3-S:6NOAD/TB10NOAD');
    const second = picker(STANDARD);
    second.choose('modifier', 'RALLY');
    expect(second.code()).toBe('SET3-S:6/TB7@RALLY');
  });

  it('aggregate and match root change the code', () => {
    const halves = picker('HAL2-S:T45');
    halves.dispatch({ type: 'setAggregate', on: true });
    expect(halves.code()).toBe('HAL2A-S:T45');
    const sets = picker('SET5-S:6/TB7');
    sets.chooseRoot('Half');
    expect(sets.code()).toBe('HAL5-S:6/TB7');
    expect(sets.view().count.label).toContain('5');
  });

  it('choosing a catalog format loads all of it', () => {
    const { view, dispatch, selected } = picker(STANDARD);
    dispatch({ type: 'loadCode', code: CATALOG_TIMED });
    expect(view().code).toBe(CATALOG_TIMED);
    expect(view().descriptor.label).toContain('Exactly');
    expect(view().count.label).toContain('7');
    expect(view().set.what.label).toContain(TIMED_SETS_LABEL);
    expect(view().aggregate.checked).toBe(true);
    expect(selected()).toBe(CATALOG_TIMED);
  });
});

describe('an untouched Select returns the code it opened with, catalog included', () => {
  // formatMachine.test.ts sweeps the corpus through `fromCode`; this adds the catalog, opened as the picker
  // opens it, which the 257-picker DOM sweep in the retired modalBehaviour.test.ts covered.
  const codes = [
    ...new Set([
      ...(catalog as { format?: string }[]).flatMap((entry) => entry.format ?? []),
      ...resolvePickerConfig().viewConfig.catalogCodes
    ])
  ];

  it('drifts on none of them', () => {
    expect(codes.length, 'control: the catalog is not empty').toBeGreaterThan(40);
    const drift = codes.filter((code) => picker(code).selected() !== code);
    expect(drift).toEqual([]);
  });
});

describe('a format that needs a switched-off capability opens read-only', () => {
  const noOuts: MatchUpFormatConfig = { capabilities: { setTypes: { outs: false } } };

  it('reads the code as read-only, and an untouched Select returns it unchanged', () => {
    const { view, selected } = picker(BLW, noOuts);
    expect(view().code).toBe(BLW);
    expect(view().readOnly).toBe(true);
    expect(selected()).toBe(BLW);
  });

  it('becomes editable when another format replaces it', () => {
    const { view, dispatch, choose, selected } = picker(BLW, noOuts);
    dispatch({ type: 'loadCode', code: STANDARD });
    expect(view().readOnly).toBe(false);
    choose('setTo', '4');
    expect(selected()).toBe('SET3-S:4/TB7');
  });

  it('is not read-only when it can be edited', () => {
    expect(picker(STANDARD).view().readOnly).toBe(false);
  });
});

describe('capabilities', () => {
  const restricted: MatchUpFormatConfig = {
    capabilities: { setTypes: { timed: false }, exactly: false, aggregate: false, finalSet: false }
  };

  it('a switched-off capability is not offered, by the names the dropdown shows', () => {
    // formatMachine.test.ts checks the option values; this checks the texts an operator sees.
    const { offered, view } = picker(STANDARD, restricted);
    expect(offered('what')).toEqual(['Sets', 'Tiebreaks', 'Outs', POINTS_TOTAL]);
    expect(offered('descriptor')).toEqual(['Best of']);
    expect(view().aggregate.visible).toBe(false);
    expect(view().finalSetToggle.visible).toBe(false);
  });

  it('the catalog dropdown can be switched off', () => {
    expect(picker(STANDARD, { capabilities: { catalog: false } }).view().catalogVisible).toBe(false);
    expect(picker(STANDARD).view().catalogVisible, 'control: shown by default').toBe(true);
  });
});

describe('the catalog dropdown follows the code', () => {
  it('reads Custom once the code leaves the catalog, and the entry again when it returns', () => {
    const { view, choose } = picker(STANDARD);
    expect(view().catalogValue).toBe(STANDARD);
    choose('tiebreakTo', '10');
    expect(view().code, 'control: a tiebreak to 10 is not a catalog format').toBe('SET3-S:6/TB10');
    expect(view().catalogValue).toBe(CUSTOM);
    choose('tiebreakTo', '7');
    expect(view().catalogValue).toBe(STANDARD);
  });
});

describe('labels', () => {
  it('a translated "Exactly" switches to Exactly, which matching on the English label could not', () => {
    const { view, choose } = picker(STANDARD, {
      labels: { descriptors: { bestOf: 'Au meilleur de', exactly: 'Exactement' } }
    });
    choose('descriptor', 'Exactement');
    expect(view().code).toBe(EXACTLY_TIMED);
    expect(view().descriptor.label).toContain('Exactement');
  });

  const french: MatchUpFormatConfig = {
    labels: {
      what: { sets: 'Manche', tiebreaks: 'Jeu décisif', timedSets: 'Manche chronométrée' },
      whatPlural: { sets: 'Manches', tiebreaks: 'Jeux décisifs', timedSets: 'Manches chronométrées' },
      advantage: { ad: 'Avantage', noAd: 'Point décisif' },
      setTo: 'en {n} jeux',
      tiebreakTo: 'JD en {n}'
    }
  };

  it('shows the translated names and templates, and choosing a translated set type still edits the code', () => {
    const { view, choose, selected } = picker(STANDARD, french);
    expect(view().set.what.label).toContain('Manches');
    expect(view().set.setTo.label).toContain('en 6 jeux');
    expect(view().set.tiebreakTo.label).toContain('JD en 7');
    expect(view().set.advantage.label).toContain('Avantage');
    choose('advantage', 'Point décisif');
    choose('what', 'Manches chronométrées');
    expect(view().code).toBe(TIMED);
    expect(selected()).toBe(TIMED);
  });

  it('reads the singular once the match is a single set', () => {
    const { view, choose } = picker(STANDARD, french);
    choose('bestOf', '1');
    expect(view().set.what.label).toContain('Manche');
    expect(view().set.what.label).not.toContain('Manches');
  });
});

describe('Phases 6 and 5 through the controls', () => {
  it("a timed set's tiebreak shows its toggle and target, and no win-by", () => {
    const { view, selected } = picker('SET3-S:T10P/TB1');
    expect(view().set.tiebreakToggle.checked).toBe(true);
    expect(view().set.tiebreakTo.label).toContain('TB to 1');
    expect(view().set.winBy.visible).toBe(false);
    expect(selected()).toBe('SET3-S:T10P/TB1');
  });

  it('the BLW format is editable: outs per side and the time limit', () => {
    const { view, choose, chooseMaxTime, selected } = picker(BLW);
    expect(view().readOnly).toBe(false);
    expect(view().set.outs.label).toContain('3 outs');
    expect(view().maxTime.label).toContain('50 min');
    choose('outs', '2');
    expect(view().code).toBe('INN4XA-S:O2-M:T50');
    chooseMaxTime('None');
    expect(view().code).toBe('INN4XA-S:O2');
    expect(selected()).toBe('INN4XA-S:O2');
  });

  it('a short-form timed code keeps its spelling when edited', () => {
    const { code, choose } = picker('T10');
    choose('minutes', '20');
    expect(code()).toBe('T20');
  });

  it('a code with an unknown match modifier keeps it when edited', () => {
    const { code, choose } = picker('SET3Z-S:6/TB7');
    choose('setTo', '4');
    expect(code()).toBe('SET3Z-S:4/TB7');
  });
});

describe('points total (SET1-S:P32)', () => {
  it('opens SET1-S:P32DP as win by 1, and an untouched Select returns it', () => {
    const { view, selected } = picker(DECIDING_POINT);
    expect(view().code).toBe(DECIDING_POINT);
    expect(view().readOnly).toBe(false);
    expect(view().set.what.label).toContain(POINTS_TOTAL);
    expect(view().set.pointsTotal.label).toContain('32 points');
    expect(view().set.tieRule.label).toContain('Win by 1');
    expect(selected()).toBe(DECIDING_POINT);
  });

  it('the tie rule and total change the code; an odd total hides the tie rule', () => {
    const { view, choose, selected } = picker(DECIDING_POINT);
    choose('tieRule', 'Win by 2');
    expect(view().code).toBe('SET1-S:P32WB2');
    choose('pointsTotal', '31 points');
    expect(view().code).toBe('SET1-S:P31');
    expect(view().set.tieRule.visible).toBe(false);
    choose('pointsTotal', '24 points');
    expect(view().code).toBe('SET1-S:P24WB2');
    expect(selected()).toBe('SET1-S:P24WB2');
  });

  it('choosing it locks Best of 1 and hides what the grammar does not allow; another type restores them', () => {
    const start = 'SET3-S:4/TB7-F:TB10';
    const { view, choose } = picker(start);
    expect(view().count.locked, 'control: Best of is editable before').toBeFalsy();
    choose('what', POINTS_TOTAL);
    const points = view();
    expect(points.code).toBe(POINTS_32);
    expect(points.count).toMatchObject({ locked: true, label: '1' });
    expect(points.descriptor.locked).toBe(true);
    expect(points.finalSet.visible).toBe(false);
    expect(points.finalSetToggle.visible).toBe(false);
    expect(points.aggregate.visible).toBe(false);
    expect(points.gameFormat.visible).toBe(false);
    expect(points.maxTime.visible).toBe(false);
    choose('what', 'Set');
    expect(view().code).toBe(start);
    expect(view().count.locked).toBeFalsy();
  });

  it('the points-total preset "Americano / Mexicano: 32 points" is a points total whose tie stands', () => {
    const preset = resolvePickerConfig().catalog.find((entry) => entry.label === 'Americano / Mexicano: 32 points');
    expect(preset, 'control: the preset is offered').toBeTruthy();
    const { view, dispatch, selected } = picker(STANDARD);
    dispatch({ type: 'loadCode', code: preset!.code! });
    expect(view().code).toBe(POINTS_32);
    expect(view().set.pointsTotal.label).toContain('32 points');
    expect(view().set.tieRule.label).toContain('Tie allowed');
    expect(selected()).toBe(POINTS_32);
  });
});

describe('set count and descriptor', () => {
  // Factory 7.5.0 (#5136(competition-factory)) parses any best-of count, so the picker offers 7 and 9.
  // It keeps `X` (exactly) timed-only: `SET3X-S:6/TB7` does not parse, so the picker never leaves
  // Exactly standing on a set that is not timed. Every code shown is asserted to parse.

  it('Best of offers 7 and 9, and each is a code the factory parses', () => {
    const { offered, choose, code } = picker(STANDARD);
    expect(offered('bestOf')).toEqual(['1', '3', '5', '7', '9']);
    choose('bestOf', '7');
    expect(code()).toBe('SET7-S:6/TB7');
    expectParses(code());
    choose('bestOf', '9');
    expect(code()).toBe('SET9-S:6/TB7');
    expectParses(code());
  });

  it('a best of 9 code opens with its count selected', () => {
    const { view } = picker('SET9-S:6/TB7-F:TB10');
    expect(view().count.label).toContain('9');
    expect(view().code).toBe('SET9-S:6/TB7-F:TB10');
  });

  it('choosing Exactly on a games set turns it into a timed set', () => {
    const { choose, code } = picker(STANDARD);
    choose('descriptor', 'Exactly');
    expect(code()).toMatch(/^SET3X-S:T\d+/);
    expectParses(code());
  });

  it('turning an Exactly timed set into games sets falls back to Best of', () => {
    const { view, choose, code } = picker(EXACTLY_TIMED);
    choose('what', 'Sets');
    expect(view().descriptor.label).toContain('Best of');
    expect(code()).not.toContain('X');
    expect(code()).toMatch(/^SET3-S:6/);
    expectParses(code());
  });

  it('turning an Exactly timed set into tiebreak sets falls back to Best of, at the next odd count', () => {
    const { view, choose, code } = picker('SET2X-S:T10');
    choose('what', 'Tiebreaks');
    expect(view().descriptor.label).toContain('Best of');
    expect(code()).not.toContain('X');
    expect(code()).toMatch(/^SET3-S:TB/);
    expectParses(code());
  });
});
