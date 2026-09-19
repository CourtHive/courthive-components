/**
 * @vitest-environment happy-dom
 *
 * Double-exit entry through the real dynamicSets DOM, not through the resolver it calls.
 *
 * The resolver has its own unit tests. These exist because the defect being fixed was not in the
 * rule — it was in the wiring: selecting Walkover alone emitted a valid, submittable
 * DOUBLE_WALKOVER, which no test at any level caught. A rule can be right while the control that
 * feeds it is wrong, so this drives the actual radio buttons.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderDynamicSetsScoreEntry } from '../dynamicSetsApproach';
import { NEITHER_SIDE } from '../../logic/irregularEnding';

const { WALKOVER, DEFAULTED, RETIRED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

const OUTCOME_SELECTOR = 'input[name="matchOutcome"]';
const WINNER_SELECTOR = 'input[name="irregularWinner"]';

function makeMatchUp(overrides: any = {}): any {
  return {
    matchUpId: 'm1',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } },
    ],
    ...overrides,
  };
}

function mount(matchUp: any = makeMatchUp()) {
  const outcomes: any[] = [];
  const container = document.createElement('div');
  document.body.appendChild(container);

  renderDynamicSetsScoreEntry({
    matchUp,
    container,
    onScoreChange: (outcome) => outcomes.push(outcome),
    labels: {},
  });

  const radios = (selector: string) => [...container.querySelectorAll(selector)] as HTMLInputElement[];

  const pick = async (selector: string, value: string) => {
    const radio = radios(selector).find((r) => r.value === value);
    if (!radio) throw new Error(`no radio with value ${value} for ${selector}`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  const enterSet = async (setIndex: number, side1: string, side2: string) => {
    for (const [side, value] of [['1', side1], ['2', side2]] as const) {
      const input = container.querySelector(
        `input[data-set-index="${setIndex}"][data-side="${side}"]`,
      ) as HTMLInputElement;
      if (!input) throw new Error(`no input for set ${setIndex} side ${side}`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };

  return {
    container,
    outcomes,
    last: () => outcomes.at(-1),
    selectOutcome: (value: string) => pick(OUTCOME_SELECTOR, value),
    selectWinner: (value: string) => pick(WINNER_SELECTOR, value),
    enterSet,
    radios,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('dynamicSets — an irregular ending alone is not submittable', () => {
  // The regression under test. This exact sequence used to yield
  // { isValid: true, matchUpStatus: 'DOUBLE_WALKOVER' }.
  it.each([WALKOVER, DEFAULTED, RETIRED])('%s with no winner answer stays invalid', async (status) => {
    const h = mount();

    await h.selectOutcome(status);

    expect(h.last().isValid).toBe(false);
  });

  it('selecting Walkover does not by itself produce a double walkover', async () => {
    const h = mount();

    await h.selectOutcome(WALKOVER);

    expect(h.last().matchUpStatus).not.toBe(DOUBLE_WALKOVER);
  });

  it('selecting Defaulted does not by itself produce a double default', async () => {
    const h = mount();

    await h.selectOutcome(DEFAULTED);

    expect(h.last().matchUpStatus).not.toBe(DOUBLE_DEFAULT);
  });
});

describe('dynamicSets — the explicit double exit', () => {
  it('Walkover + Neither side produces DOUBLE_WALKOVER with no winningSide', async () => {
    const h = mount();

    await h.selectOutcome(WALKOVER);
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect(h.last().isValid).toBe(true);
    expect(h.last().winningSide).toBeUndefined();
  });

  it('Defaulted + Neither side produces DOUBLE_DEFAULT with no winningSide', async () => {
    const h = mount();

    await h.selectOutcome(DEFAULTED);
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().matchUpStatus).toBe(DOUBLE_DEFAULT);
    expect(h.last().isValid).toBe(true);
    expect(h.last().winningSide).toBeUndefined();
  });

  it('clears the stale score error that used to ride along with a valid outcome', async () => {
    const h = mount();

    await h.selectOutcome(WALKOVER);
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().error).toBeUndefined();
  });

  it('warns what a double exit will do, before it can be submitted', async () => {
    const h = mount();

    await h.selectOutcome(WALKOVER);
    await h.selectWinner(NEITHER_SIDE);

    expect(h.container.textContent).toContain('neither side advances');
  });
});

describe('dynamicSets — naming a side keeps the single-sided status', () => {
  it.each([
    [WALKOVER, '1', 1],
    [WALKOVER, '2', 2],
    [DEFAULTED, '1', 1],
    [RETIRED, '2', 2],
  ])('%s with side %s', async (status, sideValue, expectedWinningSide) => {
    const h = mount();

    await h.selectOutcome(status);
    await h.selectWinner(sideValue);

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().winningSide).toBe(expectedWinningSide);
    expect(h.last().isValid).toBe(true);
  });
});

describe('dynamicSets — "Neither side" is offered only where it means something', () => {
  it('is hidden until an ending with a double form is chosen', async () => {
    const h = mount();

    await h.selectOutcome(RETIRED);

    const neither = h.radios(WINNER_SELECTOR).find((r) => r.value === NEITHER_SIDE);
    expect(neither?.parentElement?.style.display).toBe('none');
  });

  it.each([WALKOVER, DEFAULTED])('is shown for %s', async (status) => {
    const h = mount();

    await h.selectOutcome(status);

    const neither = h.radios(WINNER_SELECTOR).find((r) => r.value === NEITHER_SIDE);
    expect(neither?.parentElement?.style.display).toBe('flex');
  });

  // Switching Walkover → Retired must not leave a double-exit answer attached to an ending that
  // has no double form.
  it('drops a Neither answer when the ending changes to one without a double form', async () => {
    const h = mount();

    await h.selectOutcome(WALKOVER);
    await h.selectWinner(NEITHER_SIDE);
    expect(h.last().matchUpStatus).toBe(DOUBLE_WALKOVER);

    await h.selectOutcome(RETIRED);

    expect(h.last().isValid).toBe(false);
    expect(h.last().matchUpStatus).not.toBe(DOUBLE_WALKOVER);
  });
});

describe('dynamicSets — reopening an existing double exit', () => {
  it.each([
    [DOUBLE_WALKOVER, WALKOVER],
    [DOUBLE_DEFAULT, DEFAULTED],
  ])('%s restores %s plus the Neither answer', async (existingStatus, baseStatus) => {
    const h = mount(makeMatchUp({ matchUpStatus: existingStatus }));
    await new Promise((resolve) => setTimeout(resolve, 30));

    const outcomeRadio = h.radios(OUTCOME_SELECTOR).find((r) => r.value === baseStatus);
    const neitherRadio = h.radios(WINNER_SELECTOR).find((r) => r.value === NEITHER_SIDE);

    expect(outcomeRadio?.checked).toBe(true);
    expect(neitherRadio?.checked).toBe(true);
  });
});

// CA, 2026-09-19: "WALKOVER should record NO SCORE AT ALL ... RETIRED requires some score but by no
// means a full set." The factory agrees on both counts — modifyMatchUpScore.ts:236 blanks the score
// for WALKOVER/DOUBLE_WALKOVER and for nothing else.
describe('dynamicSets — a walkover carries no score, a retirement carries whatever was played', () => {
  it.each([
    ['1', 'WALKOVER'],
    [NEITHER_SIDE, 'DOUBLE_WALKOVER'],
  ])('a walkover resolved as %s emits no sets, no scoreObject and no error', async (winner, _status) => {
    const h = mount();

    await h.selectOutcome(WALKOVER);
    await h.selectWinner(winner);

    expect(h.last().sets).toEqual([]);
    expect(h.last().scoreObject).toBeUndefined();
    expect(h.last().error).toBeUndefined();
  });

  it('a retirement keeps a partial set — no completed set is required', async () => {
    const h = mount();

    await h.enterSet(0, '3', '2');
    await h.selectOutcome(RETIRED);
    await h.selectWinner('1');

    expect(h.last().isValid).toBe(true);
    expect(h.last().sets).toHaveLength(1);
    expect(h.last().sets[0]).toMatchObject({ side1Score: 3, side2Score: 2 });
    expect(h.last().error).toBeUndefined();
  });

  it('a retirement after a completed set keeps both', async () => {
    const h = mount();

    await h.enterSet(0, '6', '4');
    await h.enterSet(1, '3', '2');
    await h.selectOutcome(RETIRED);
    await h.selectWinner('1');

    expect(h.last().sets).toHaveLength(2);
    expect(h.last().sets[1]).toMatchObject({ side1Score: 3, side2Score: 2 });
  });

  it('selecting Walkover discards a score that had been entered', async () => {
    const h = mount();

    await h.enterSet(0, '6', '4');
    await h.selectOutcome(WALKOVER);
    await h.selectWinner('1');

    expect(h.last().sets).toEqual([]);
  });
});

