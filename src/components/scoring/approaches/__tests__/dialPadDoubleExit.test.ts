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
import { NEITHER_SIDE, NON_DIRECTING_ENDINGS } from '../../logic/irregularEnding';

const {
  WALKOVER,
  DEFAULTED,
  DOUBLE_WALKOVER,
  DOUBLE_DEFAULT,
  ABANDONED,
  CANCELLED,
  INCOMPLETE,
  SUSPENDED,
  DEAD_RUBBER,
} = matchUpStatusConstants;

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

  const pressEnding = async (status: string) => {
    const chip = container.querySelector(`button[data-ending="${status}"]`) as HTMLButtonElement;
    if (!chip) throw new Error(`no ending chip for ${status}`);
    chip.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  const endingChips = () =>
    ([...container.querySelectorAll('button[data-ending]')] as HTMLButtonElement[]).map((c) => c.dataset.ending);

  const endingChipLabels = () =>
    ([...container.querySelectorAll('button[data-ending]')] as HTMLButtonElement[]).map((c) =>
      (c.textContent ?? '').trim(),
    );

  return {
    container,
    outcomes,
    last: () => outcomes.at(-1),
    pressButton,
    selectWinner,
    winnerRadios,
    pressEnding,
    endingChips,
    endingChipLabels,
  };
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

// M2: dialPad's 4x4 grid is full, so the endings that resolve nobody live in their own row.
describe('dialPad — the endings that resolve nobody', () => {
  it('offers every non-directing ending, and no more', async () => {
    // Asserted against the constant rather than a literal list, because the row is BUILT by
    // iterating it — a literal here would only restate the source and would go stale the next time
    // the vocabulary moves, as it did when this list went from three to seven.
    const h = mount();

    expect(h.endingChips()?.toSorted((a, b) => (a ?? '').localeCompare(b ?? '', 'en'))).toEqual(
      [...NON_DIRECTING_ENDINGS].toSorted((a, b) => a.localeCompare(b, 'en')),
    );
  });

  it('labels every chip — none falls through to a raw status constant', () => {
    // `endingLabels()` falls back to the raw status so an unlabelled ending is visibly wrong rather
    // than blank. That makes "no chip reads as a CONSTANT" the assertion worth making: it is what
    // catches an ending added to the vocabulary and not to the label map.
    const h = mount();
    const text = h.endingChipLabels() ?? [];

    expect(text.length).toBe(NON_DIRECTING_ENDINGS.size);
    for (const label of text) expect(label).not.toMatch(/^[A-Z][A-Z_]+$/);
  });

  it.each([...NON_DIRECTING_ENDINGS])('%s is submittable with no winner', async (status) => {
    const h = mount();

    await h.pressEnding(status);

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().isValid).toBe(true);
    expect(h.last().winningSide).toBeUndefined();
  });

  it('pressing the same ending twice returns to an ordinary result', async () => {
    const h = mount();

    await h.pressEnding(ABANDONED);
    expect(h.last().matchUpStatus).toBe(ABANDONED);

    await h.pressEnding(ABANDONED);

    expect(h.last().matchUpStatus).not.toBe(ABANDONED);
  });

  // The case the pre-existing digit handler would have broken: an abandonment is normally recorded
  // WITH the score it was abandoned at.
  it('keeps the ending when a score is entered after it', async () => {
    const h = mount();

    await h.pressEnding(ABANDONED);
    await h.pressButton('6');
    await h.pressButton('4');

    expect(h.last().matchUpStatus).toBe(ABANDONED);
    expect(h.last().sets?.length).toBeGreaterThan(0);
  });

  // ── Which endings keep a partial score, and which discard it ──
  //
  // These two tests are the pair, and they used to be one test that got the example wrong: it
  // asserted "an abandonment does not clear the score" while PRESSING CANCELLED, which CA has since
  // settled as one of the two endings that DOES clear (2026-09-27). It passed because
  // `NO_SCORE_STATUSES` held neither CANCELLED nor DEAD_RUBBER at the time, so the mistaken example
  // and the incomplete constant agreed with each other.

  it.each([ABANDONED, INCOMPLETE, SUSPENDED])('%s keeps the score entered before it', async (status) => {
    // The partial score is the entire content of these results — "6-4, suspended" is what says when
    // it was suspended. Losing it would silently discard the only information the status carries.
    const h = mount();

    await h.pressButton('6');
    await h.pressButton('4');
    await h.pressEnding(status);

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().sets?.length).toBeGreaterThan(0);
  });

  it.each([CANCELLED, DEAD_RUBBER])('%s discards the score entered before it', async (status) => {
    // CA, 2026-09-27: selecting Cancelled or Dead Rubber clears any partial score present. Note this
    // is a CLIENT policy — the factory blanks scores only for the walkovers — so nothing else
    // enforces it and this is the test that holds it.
    const h = mount();

    await h.pressButton('6');
    await h.pressButton('4');
    await h.pressEnding(status);

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().sets).toEqual([]);
  });

  it('a walkover clears the score too, by way of the grid', async () => {
    const h = mount();

    await h.pressButton('6');
    await h.pressButton('4');
    await h.pressButton('WO');
    await h.selectWinner('1');

    expect(h.last().sets).toEqual([]);
  });

  it.each([SUSPENDED, ABANDONED])('typing a digit after %s keeps that ending selected', async (status) => {
    // The corrected digit gate. It asked NON_DIRECTING_ENDINGS — "does anyone advance" — where it
    // meant "is there a score". Across the old six those coincided; across the ten they do not.
    const h = mount();

    await h.pressEnding(status);
    await h.pressButton('6');
    await h.pressButton('4');

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().sets?.length).toBeGreaterThan(0);
  });

  it.each([CANCELLED, DEAD_RUBBER])('typing a digit after %s clears that ending', async (status) => {
    // The other half, and the case the old gate got wrong: it would have PRESERVED an ending that
    // had just discarded the digits being typed, leaving a status whose own rule says it has no
    // score sitting on top of a score.
    const h = mount();

    await h.pressEnding(status);
    await h.pressButton('6');
    await h.pressButton('4');

    expect(h.last().matchUpStatus).not.toBe(status);
    expect(h.last().sets?.length).toBeGreaterThan(0);
  });

  it('choosing a grid ending replaces a non-directing one', async () => {
    const h = mount();

    await h.pressEnding(ABANDONED);
    await h.pressButton('WO');
    await h.selectWinner('1');

    expect(h.last().matchUpStatus).toBe(WALKOVER);
  });
});

