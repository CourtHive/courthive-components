/** @vitest-environment happy-dom */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { afterEach, describe, expect, it } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';
import { scoreGovernor } from 'tods-competition-factory';

const DECIDER = 'SET3-S:6/TB7-F:TB10';
const SINGLE = 'SET1-S:TB10';
const SPLIT_SETS = [
  { setNumber: 1, side1Score: 6, side2Score: 4 },
  { setNumber: 2, side1Score: 4, side2Score: 6 }
];

function mount(matchUpFormat = DECIDER, smartComplements = true) {
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets: matchUpFormat === DECIDER ? SPLIT_SETS : [],
    smartComplements,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({
    sides: [{ participantName: 'Upper player' }, { participantName: 'Lower player' }],
    matchUpFormat,
    region
  });
  document.body.append(card.element);
  const set = matchUpFormat === DECIDER ? 3 : 1;
  const cell = (side: number) =>
    card.element.querySelector<HTMLInputElement>(`[data-set="${set}"][data-side="${side}"]`)!;
  return { card, cell, region };
}

/** Include the browser's text insertion when the handler leaves a key unhandled. */
function press(input: HTMLInputElement, digit: string, shifted = false) {
  const key = shifted ? ')!@#$%^&*('[Number(digit)] : digit;
  const event = new KeyboardEvent('keydown', {
    code: `Digit${digit}`,
    key,
    shiftKey: shifted,
    bubbles: true,
    cancelable: true
  });
  input.dispatchEvent(event);
  if (event.defaultPrevented) return;
  input.setRangeText(key, input.selectionStart ?? 0, input.selectionEnd ?? 0, 'end');
  input.dispatchEvent(new InputEvent('input', { data: key, inputType: 'insertText', bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe.each([DECIDER, SINGLE])('match tiebreak entry in %s', (format) => {
  it.each([1, 2])('recalculates the complement while typing a low score on side %i', (side) => {
    const h = mount(format);
    h.cell(side).focus();
    press(h.cell(side), '1');
    expect(h.cell(3 - side).value).toBe('10');
    press(h.cell(side), '0');
    expect(h.cell(side).value).toBe('10');
    expect(h.cell(3 - side).value).toBe('12');
  });

  it.each([1, 2])('completes a pasted 16 to 18 on side %i', (side) => {
    const h = mount(format);
    h.cell(side).value = '16';
    h.cell(side).dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
    expect(h.cell(side).value).toBe('16');
    expect(h.cell(3 - side).value).toBe('18');
  });

  it.each([1, 2])('keeps deriving after the first input event on side %i', (side) => {
    const h = mount(format);
    for (const value of ['1', '16']) {
      h.cell(side).value = value;
      h.cell(side).dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    expect(h.cell(side).value).toBe('16');
    expect(h.cell(3 - side).value).toBe('18');
  });

  it.each(['10', '16'])('accumulates shifted digits into an upper-row %s', (value) => {
    const h = mount(format);
    h.cell(2).focus();
    for (const digit of value) {
      expect(document.activeElement).toBe(h.cell(2));
      press(h.cell(2), digit, true);
    }
    expect(h.cell(1).value).toBe(value);
    expect(h.cell(2).value).toBe(String(Number(value) + 2));
  });

  it('keeps single-digit and no-complement entry available', () => {
    const h = mount(format, false);
    h.cell(2).focus();
    press(h.cell(2), '1');
    press(h.cell(2), '0');
    expect(h.cell(2).value).toBe('10');
    expect(h.cell(1).value).toBe('');
  });
});

it.each([0, 1, 8, 9, 10, 16])('uses the real factory complement for low score %i on either side', (lowValue) => {
  const high = Math.max(10, lowValue + 2);
  expect(scoreGovernor.getTiebreakComplement({ lowValue, tiebreakTo: 10, isSide1: true })).toEqual([lowValue, high]);
  expect(scoreGovernor.getTiebreakComplement({ lowValue, tiebreakTo: 10, isSide1: false })).toEqual([high, lowValue]);
});
