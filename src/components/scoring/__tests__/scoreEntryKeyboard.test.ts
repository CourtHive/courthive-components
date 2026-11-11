/**
 * The keyboard's rules: what a digit typed into an empty set means, and what a field's text resolves to.
 *
 * CA, 2026-09-28, using the merged dialog: *"when I enter '3' and the other side smart auto complete's to
 * '6' the focus should then shift to the 2nd set score entry ... Also Shift-3 should enter the '3' on the
 * other side!"* And: *"if I click into an entry field that has '0' and enter a value, I should not get
 * e.g. '06'... it should resolve to '6'."*
 *
 * These are the rule halves, asked of the functions the Dynamic Sets region calls: `digitFromCode` (which
 * physical key is which digit), `typeDigit` with the complement (what a digit in an empty cell writes), and
 * `cleanDigits` (what a field's text resolves to). The halves only a browser can show — real `keydown`s
 * with `shiftKey`, where focus lands, Tab, Backspace, select-on-focus, Clear and Enter — are play functions
 * in `src/stories/ScoreEntryKeyboardTests.stories.ts`.
 */
import { createScoreEntryModel, typeDigit } from '../logic/scoreEntryModel';
import { ENTRY_SIDE, SHIFTED_SIDE, digitFromCode } from '../keyboard';
import { G } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { cleanDigits } from '../logic/dynamicSetsEntry';
import { describe, expect, it } from 'vitest';

const FORMAT = 'SET3-S:6/TB7';

describe('which key is which digit', () => {
  it('reads the PHYSICAL key, so a shifted digit is still a digit', () => {
    // Shift+3 in a text field produces `#`; `event.code` is still `Digit3`.
    expect(digitFromCode('Digit3')).toBe(3);
    expect(digitFromCode('Numpad7')).toBe(7);
    expect(digitFromCode('KeyA')).toBeUndefined();
    expect(digitFromCode('Backspace')).toBeUndefined();
  });

  it('begins entry on the LOWER row, and a shift sends the digit to the upper one', () => {
    // CA, 2026-09-28: *"3 is lower row and shift+3 is upper row, which feels natural"*.
    expect(ENTRY_SIDE).toBe(2);
    expect(SHIFTED_SIDE).toBe(1);
  });
});

describe('a digit typed into an empty set', () => {
  it('complements every digit the way the FACTORY does — the whole table', () => {
    // The ten digits typed into set 1's upper cell with the complement offered, as the region does on the
    // first keystroke into a set. A change in `getSetComplement` shows up here as a diff, not a bug report.
    //
    // `-` is a cell left empty. A 7 complements to nothing — 7-5 and 7-6 are both live — so it stands
    // alone for the operator to finish. An 8 or a 9 is out of reach in a set to six and is REFUSED, by
    // identity: the regression this pins wrote straight into the entries, skipped the clamp, and stood an
    // 8 complemented to **8-7**.
    const empty = createScoreEntryModel({ matchUpFormat: FORMAT });
    const table = [...Array(10).keys()].map((digit) => {
      const next = typeDigit(empty, { cell: G(0, 1), digit, complement: true });
      const set = next.sets[0];
      return `${digit}:${set.side1 ?? '-'}-${set.side2 ?? '-'}${next === empty ? ' refused' : ''}`;
    });

    expect(table).toEqual([
      '0:0-6',
      '1:1-6',
      '2:2-6',
      '3:3-6',
      '4:4-6',
      '5:5-7',
      '6:6-7',
      '7:7--',
      '8:--- refused',
      '9:--- refused'
    ]);
  });

  it('complements the same way from the LOWER row, which is where entry begins', () => {
    const empty = createScoreEntryModel({ matchUpFormat: FORMAT });
    expect(typeDigit(empty, { cell: G(0, ENTRY_SIDE), digit: 3, complement: true }).sets[0]).toEqual({
      side1: 6,
      side2: 3
    });
  });
});

describe("a field's text resolves to its digits", () => {
  it('resolves a leading zero, so a 0 plus a 6 is 6 and not 06', () => {
    // CA's case. Selecting on focus covers the keyboard; a caret placed after the 0 does not, so the text
    // is normalised as well.
    expect(cleanDigits('06')).toBe('6');
    expect(cleanDigits('006')).toBe('6');
  });

  it('keeps a lone zero, because a set lost to love is a real score', () => {
    expect(cleanDigits('0')).toBe('0');
  });

  it('keeps a two-digit score whose first digit is not a zero', () => {
    expect(cleanDigits('10')).toBe('10');
  });
});
