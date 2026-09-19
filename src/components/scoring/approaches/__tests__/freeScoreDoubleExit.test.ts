/**
 * @vitest-environment happy-dom
 *
 * Double-exit entry through the real freeScore DOM.
 *
 * freeScore reaches the same rule by a different road: the ending is parsed out of typed text
 * ("wo", "def") rather than chosen from a control, and it emits from inside its own
 * winner-selection helper. It carried the third copy of the implicit rule — typing "wo" produced a
 * valid DOUBLE_WALKOVER on the keystroke.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderFreeScoreEntry } from '../freeScoreApproach';
import { NEITHER_SIDE } from '../../logic/irregularEnding';

const { WALKOVER, RETIRED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

const WINNER_SELECTOR = 'input[name="winnerSelection"]';
const RETIRED_SCORE = '6-4 3-2 ret';

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

  renderFreeScoreEntry({
    matchUp,
    container,
    onScoreChange: (outcome) => outcomes.push(outcome),
    labels: {},
  });

  const input = container.querySelector('#scoreInputV2') as HTMLInputElement;
  const winnerRadios = () => [...container.querySelectorAll(WINNER_SELECTOR)] as HTMLInputElement[];

  const type = async (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  const selectWinner = async (value: string) => {
    const radio = winnerRadios().find((r) => r.value === value);
    if (!radio) throw new Error(`no winner radio with value ${value}`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  return { container, outcomes, last: () => outcomes.at(-1), type, selectWinner, winnerRadios };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('freeScore — a typed ending is not by itself a result', () => {
  it('"wo" alone does not produce a submittable double walkover', async () => {
    const h = mount();

    await h.type('wo');

    expect(h.last().matchUpStatus).not.toBe(DOUBLE_WALKOVER);
    expect(h.last().isValid).toBe(false);
  });

  it('"6-4 3-2 def" alone does not produce a submittable double default', async () => {
    const h = mount();

    await h.type('6-4 3-2 def');

    expect(h.last().matchUpStatus).not.toBe(DOUBLE_DEFAULT);
    expect(h.last().isValid).toBe(false);
  });

  it('says a winner is still owed', async () => {
    const h = mount();

    await h.type('wo');

    expect(h.last().error).toBeTruthy();
  });
});

describe('freeScore — the explicit double exit', () => {
  it('"wo" + Neither side produces DOUBLE_WALKOVER with no winningSide', async () => {
    const h = mount();

    await h.type('wo');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect(h.last().isValid).toBe(true);
    expect(h.last().winningSide).toBeUndefined();
  });

  it('"6-4 3-2 def" + Neither side produces DOUBLE_DEFAULT', async () => {
    const h = mount();

    await h.type('6-4 3-2 def');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().matchUpStatus).toBe(DOUBLE_DEFAULT);
    expect(h.last().isValid).toBe(true);
  });

  it('emits exactly one outcome for the selection, not a contradictory pair', async () => {
    const h = mount();

    await h.type('wo');
    const before = h.outcomes.length;
    await h.selectWinner(NEITHER_SIDE);

    // Every outcome emitted by the Neither selection must agree it is a double walkover. The bug
    // this guards is a second emit falling through with the bare WALKOVER status.
    const emitted = h.outcomes.slice(before);
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.every((o) => o.matchUpStatus === DOUBLE_WALKOVER)).toBe(true);
  });

  it('warns what the double exit will do', async () => {
    const h = mount();

    await h.type('wo');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.container.textContent).toContain('neither side advances');
  });
});

describe('freeScore — naming a side keeps the single-sided status', () => {
  it.each([
    ['1', 1],
    ['2', 2],
  ])('"wo" with side %s', async (sideValue, expectedWinningSide) => {
    const h = mount();

    await h.type('wo');
    await h.selectWinner(sideValue);

    expect(h.last().matchUpStatus).toBe(WALKOVER);
    expect(h.last().winningSide).toBe(expectedWinningSide);
    expect(h.last().isValid).toBe(true);
  });
});

describe('freeScore — "Neither side" is offered only where it means something', () => {
  it('is hidden for a retirement, which has no double form', async () => {
    const h = mount();

    await h.type(RETIRED_SCORE);

    const neither = h.winnerRadios().find((r) => r.value === NEITHER_SIDE);
    expect(neither?.parentElement?.style.display).toBe('none');
  });

  it('is shown for a walkover', async () => {
    const h = mount();

    await h.type('wo');

    const neither = h.winnerRadios().find((r) => r.value === NEITHER_SIDE);
    expect(neither?.parentElement?.style.display).toBe('flex');
  });

  // Editing "wo" into "ret" must not leave a double-exit answer attached to a retirement.
  it('drops a Neither answer when the typed ending changes to one without a double form', async () => {
    const h = mount();

    await h.type('wo');
    await h.selectWinner(NEITHER_SIDE);
    expect(h.last().matchUpStatus).toBe(DOUBLE_WALKOVER);

    await h.type(RETIRED_SCORE);

    expect(h.last().isValid).toBe(false);
    expect(h.last().matchUpStatus).toBe(RETIRED);
  });
});

// CA, 2026-09-19: a walkover records no score at all. freeScore was emitting `score: 'wo'` — the
// raw typed text — plus whatever error the score validator had produced before the ending was
// known. TMX feeds a non-empty `score` to parseScoreString, so this was not cosmetic.
describe('freeScore — a walkover carries no score', () => {
  it.each([
    ['1', 'a named winner'],
    [NEITHER_SIDE, 'neither side'],
  ])('"wo" with %s emits no score, no sets and no error', async (winner, _label) => {
    const h = mount();

    await h.type('wo');
    await h.selectWinner(winner);

    expect(h.last().score).toBeUndefined();
    expect(h.last().sets).toEqual([]);
    expect(h.last().scoreObject).toBeUndefined();
    expect(h.last().error).toBeUndefined();
  });

  it('never emits the raw typed text as a score', async () => {
    const h = mount();

    await h.type('wo');
    await h.selectWinner(NEITHER_SIDE);

    expect(h.last().score).not.toBe('wo');
  });
});

describe('freeScore — a retirement keeps what was played and needs no completed set', () => {
  it('"3-2 ret" keeps the partial set and reports no error', async () => {
    const h = mount();

    await h.type('3-2 ret');
    await h.selectWinner('1');

    expect(h.last().isValid).toBe(true);
    expect(h.last().matchUpStatus).toBe(RETIRED);
    expect(h.last().sets).toHaveLength(1);
    expect(h.last().error).toBeUndefined();
  });

  it('"6-4 3-2 ret" keeps both sets and drops the incomplete-match error', async () => {
    const h = mount();

    await h.type(RETIRED_SCORE);
    await h.selectWinner('1');

    expect(h.last().sets).toHaveLength(2);
    expect(h.last().score).toBe('6-4 3-2');
    // The validator says "Incomplete match - need 2 sets to win". True, and not the question:
    // the retirement is what makes this a result.
    expect(h.last().error).toBeUndefined();
  });
});

