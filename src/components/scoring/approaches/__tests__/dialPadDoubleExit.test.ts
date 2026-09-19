/**
 * @vitest-environment happy-dom
 *
 * Double-exit entry through the real dialPad DOM. dialPad carried its own copy of the implicit
 * rule — pressing WO alone emitted a valid DOUBLE_WALKOVER — so it needs its own wiring test even
 * though it now calls the same resolver as dynamicSets.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderDialPadScoreEntry } from '../dialPadApproach';
import { NEITHER_SIDE } from '../../logic/irregularEnding';

const { WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

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

  renderDialPadScoreEntry({
    matchUp,
    container,
    onScoreChange: (outcome) => outcomes.push(outcome),
    labels: {},
  });

  const winnerRadios = () => [...container.querySelectorAll(WINNER_SELECTOR)] as HTMLInputElement[];

  const pressButton = async (label: string) => {
    const button = [...container.querySelectorAll('button')].find((b) => b.textContent === label);
    if (!button) throw new Error(`no dialPad button labelled ${label}`);
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  const selectWinner = async (value: string) => {
    const radio = winnerRadios().find((r) => r.value === value);
    if (!radio) throw new Error(`no winner radio with value ${value}`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  return { container, outcomes, last: () => outcomes.at(-1), pressButton, selectWinner, winnerRadios };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('dialPad — pressing an ending is not by itself a result', () => {
  it('WO alone does not produce a submittable double walkover', async () => {
    const h = mount();

    await h.pressButton('WO');

    expect(h.last().isValid).toBe(false);
    expect(h.last().matchUpStatus).not.toBe(DOUBLE_WALKOVER);
  });

  it('DEF alone does not produce a submittable double default', async () => {
    const h = mount();

    await h.pressButton('6');
    await h.pressButton('4');
    await h.pressButton('DEF');

    expect(h.last().isValid).toBe(false);
    expect(h.last().matchUpStatus).not.toBe(DOUBLE_DEFAULT);
  });
});

describe('dialPad — the explicit double exit', () => {
  it('WO + Neither side produces DOUBLE_WALKOVER', async () => {
    const h = mount();

    await h.pressButton('WO');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect(h.last().isValid).toBe(true);
    expect(h.last().winningSide).toBeUndefined();
  });

  it('DEF + Neither side produces DOUBLE_DEFAULT', async () => {
    const h = mount();

    await h.pressButton('6');
    await h.pressButton('4');
    await h.pressButton('DEF');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().matchUpStatus).toBe(DOUBLE_DEFAULT);
    expect(h.last().isValid).toBe(true);
  });

  it('warns what the double exit will do', async () => {
    const h = mount();

    await h.pressButton('WO');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.container.textContent).toContain('neither side advances');
  });
});

describe('dialPad — naming a side keeps the single-sided status', () => {
  it.each([
    ['1', 1],
    ['2', 2],
  ])('WO with side %s', async (sideValue, expectedWinningSide) => {
    const h = mount();

    await h.pressButton('WO');
    await h.selectWinner(sideValue);

    expect(h.last().matchUpStatus).toBe(WALKOVER);
    expect(h.last().winningSide).toBe(expectedWinningSide);
    expect(h.last().isValid).toBe(true);
  });
});

describe('dialPad — reopening an existing double exit', () => {
  it.each([
    [DOUBLE_WALKOVER, WALKOVER],
    [DOUBLE_DEFAULT, DEFAULTED],
  ])('%s restores the Neither answer', async (existingStatus, _baseStatus) => {
    const h = mount(makeMatchUp({ matchUpStatus: existingStatus }));
    await new Promise((resolve) => setTimeout(resolve, 30));

    const neither = h.winnerRadios().find((r) => r.value === NEITHER_SIDE);
    expect(neither?.checked).toBe(true);
  });
});

describe('dialPad — a walkover carries no score', () => {
  it.each([
    ['1', 'a named winner'],
    [NEITHER_SIDE, 'neither side'],
  ])('WO with %s emits no sets and no error', async (winner, _label) => {
    const h = mount();

    await h.pressButton('WO');
    await h.selectWinner(winner);

    expect(h.last().sets).toEqual([]);
    expect(h.last().scoreObject).toBeUndefined();
    expect(h.last().error).toBeUndefined();
  });

  it('discards digits already entered when WO is pressed', async () => {
    const h = mount();

    await h.pressButton('6');
    await h.pressButton('4');
    await h.pressButton('WO');
    await h.selectWinner('1');

    expect(h.last().sets).toEqual([]);
  });
});

describe('dialPad — a default keeps the partial score it was entered with', () => {
  it('DEF after 3-2 keeps the set', async () => {
    const h = mount();

    await h.pressButton('3');
    await h.pressButton('2');
    await h.pressButton('DEF');
    await h.selectWinner('1');

    expect(h.last().isValid).toBe(true);
    expect(h.last().sets).toHaveLength(1);
    expect(h.last().error).toBeUndefined();
  });
});

