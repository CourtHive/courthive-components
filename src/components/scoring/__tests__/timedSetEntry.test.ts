/**
 * @vitest-environment happy-dom
 *
 * Timed formats — where a digit is NOT the end of a bolt, and Enter is.
 *
 * CA, 2026-09-28: *"when I'm in a timed format the enter key in an entry cell should advance to the
 * next 'set/bolt', not a numeric key; as it is I can enter 33 in the top and then only 3 in the bottom
 * because the entry in the bottom is the trigger, regardless of if it's a number. this means I can't
 * easily enter 22/21 without going back and editing a previous column."*
 *
 * Two distinct causes sat behind that one report, and both are pinned here:
 *
 *   1. Completing a bolt reveals the next one, which changes the row grid, which re-renders every cell
 *      — so the input being typed into was DESTROYED after its first digit. Focus is now restored to
 *      it, with the caret at the end.
 *   2. Nothing else finishes a timed bolt. A games set is finished by its complement, so moving on when
 *      one lands is right; a timed bolt has no complement and routinely takes two digits, so the card
 *      must wait to be told. Enter is what tells it.
 *
 * ── Why these type character by character ──
 *
 * happy-dom does not insert text from a `keydown`, and a browser does. So typing is simulated the way
 * it actually happens: a `keydown` (which is where the region's own handling lives), then the value the
 * browser would have written, then `input`. Setting `.value` alone would skip the handler entirely and
 * test nothing.
 */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { renderScoreEntryCard } from '../scoreEntryCard';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** Nine ten-minute bolts. `SET9-…` does NOT parse — measured; the nine-set form is `SET9X`. */
const NINE_BOLTS = 'SET9X-S:T10';
const ONE_BOLT = 'SET1-S:T10';
const GAMES_FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];

function mount(matchUpFormat: string, over: { sets?: any[]; onSubmit?: any } = {}) {
  document.body.innerHTML = '';
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets: over.sets,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region, onSubmit: over.onSubmit });
  document.body.append(card.element);

  /** Re-queried every time: a structural render REPLACES these elements. */
  const cell = (side: number, set: number) =>
    card.element.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

  /** One character, as a browser delivers it: keydown, then the resulting value, then input. */
  const typeInto = (side: number, set: number, digits: string) => {
    for (const digit of digits) {
      const input = cell(side, set);
      if (!input) throw new Error(`no cell for side ${side}, set ${set}`);
      input.focus();
      const handled = !input.dispatchEvent(
        new KeyboardEvent('keydown', { code: `Digit${digit}`, key: digit, bubbles: true, cancelable: true })
      );
      if (handled) continue;
      // The browser's own insertion. `cell(...)` again because the keydown may have re-rendered.
      const live = cell(side, set)!;
      live.value = `${live.value}${digit}`;
      live.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const enter = (side: number, set: number) =>
    cell(side, set)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

  return { card, region, cell, typeInto, enter, element: card.element };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a timed bolt takes two digits on BOTH sides', () => {
  it("enters 22/21 without going back to correct a previous column — CA's case", () => {
    const h = mount(NINE_BOLTS);

    // Entry begins on the lower row, so the lower value is typed first.
    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '22');

    expect(h.cell(2, 1)!.value).toBe('21');
    expect(h.cell(1, 1)!.value).toBe('22');
  });

  it('keeps the caret in the cell when completing the bolt reveals the next one', () => {
    // The mechanism behind the report. The second value's FIRST digit completes the bolt, which reveals
    // bolt 2, which rebuilds the row grid and replaces every input. Before the fix the operator was left
    // on the document body and the second digit went nowhere.
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    expect(h.cell(1, 2), 'bolt 2 is not revealed yet').toBeNull();

    h.typeInto(1, 1, '2');

    expect(h.cell(1, 2), 'bolt 2 revealed, so the grid did change').toBeTruthy();
    expect(document.activeElement, 'and the operator is still in the cell they were typing in').toBe(h.cell(1, 1));
  });

  it('puts the caret at the END on that restore, so the next digit appends', () => {
    // Focus arriving at a NEW cell selects its contents, so typing replaces. Focus RETURNING to a cell
    // mid-number must not, or the second digit of a 22 would wipe the first.
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '2');

    const live = h.cell(1, 1)!;
    expect(live.selectionStart).toBe(live.value.length);
    expect(live.selectionEnd).toBe(live.value.length);
  });
});

describe('what advances a timed bolt, and what must not', () => {
  it('a DIGIT does not move on', () => {
    // The explicit half of CA's instruction: *"not a numeric key"*. Note what carries this: not a guard
    // in `advanceTarget` — one was written there and removing it changed nothing, because that path is
    // unreachable for a timed set — but the focus RESTORE in `settle`. Reverting that turns this red.
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '22');

    expect(document.activeElement).toBe(h.cell(1, 1));
    expect(document.activeElement).not.toBe(h.cell(2, 2));
  });

  it('ENTER moves to the next bolt, on its lower row', () => {
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '22');
    h.enter(1, 1);

    expect(document.activeElement).toBe(h.cell(2, 2));
  });

  it('Enter does NOT submit while there is a bolt to go to', () => {
    // The same key cannot both move to the next bolt and end the match. The card owns Enter, so the
    // cell has to stop it reaching there.
    const onSubmit = vi.fn();
    const h = mount(NINE_BOLTS, { onSubmit });

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '22');
    h.enter(1, 1);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Enter submits on the LAST bolt, where there is nowhere to advance to', () => {
    // The end of the sequence, and the control for the test above: if Enter were swallowed everywhere,
    // that test would pass for the wrong reason and a one-bolt match could never be submitted.
    const onSubmit = vi.fn();
    const h = mount(ONE_BOLT, { onSubmit });

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '22');
    h.enter(1, 1);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enter still submits in a GAMES format — the rule is scoped to timed sets', () => {
    // Enter has meant Submit since the card was written and goes on meaning it. Only a timed bolt, which
    // has no other way to say "done", takes it over.
    const onSubmit = vi.fn();
    const h = mount(GAMES_FORMAT, {
      onSubmit,
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
      ]
    });

    h.enter(2, 1);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enter does nothing while the bolt is half entered — there is nothing to advance to yet', () => {
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    h.enter(2, 1);

    expect(h.cell(1, 2)).toBeNull();
    expect(document.activeElement).toBe(h.cell(2, 1));
  });
});

describe('a DRAWN bolt is an ordinary result', () => {
  it('reveals the next bolt, though nobody won it', () => {
    // A timed bolt ends on the clock. `shouldCreateNextSet` asks for a `winningSide`, and a tied 21-21
    // resolves `undefined` — measured against `SET9X-S:T10` — so a draw used to reveal no successor and
    // entry stopped dead with eight bolts still to record.
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '21');

    expect(h.cell(1, 2)).toBeTruthy();
    expect(h.cell(2, 2)).toBeTruthy();
  });

  it('and Enter moves into it', () => {
    const h = mount(NINE_BOLTS);

    h.typeInto(2, 1, '21');
    h.typeInto(1, 1, '21');
    h.enter(1, 1);

    expect(document.activeElement).toBe(h.cell(2, 2));
  });
});
