/**
 * @vitest-environment happy-dom
 *
 * The Dynamic Sets region, driven through the card it plugs into.
 *
 * Tested via the card rather than in isolation, because the thing that has gone wrong historically is
 * never a rule — the rules in `dynamicSetsLogic.ts` are pure and already covered — it is the WIRING
 * between a renderer and those rules. A region tested alone would pass while reporting its score to
 * nobody.
 *
 * The properties that matter most here are the two that are invisible in a screenshot: that typing
 * does not destroy the input being typed into, and that the band and the submit gate follow the score
 * without the operator doing anything.
 */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderScoreEntryCard } from '../scoreEntryCard';
import { describe, it, expect, beforeEach } from 'vitest';

const { WALKOVER, CANCELLED, SUSPENDED } = matchUpStatusConstants;

const SET_CELLS = 'input[data-set]';

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' },
];

function mount(over: { matchUpFormat?: string; sets?: any[]; smartComplements?: boolean } = {}) {
  document.body.innerHTML = '';
  const matchUpFormat = over.matchUpFormat ?? 'SET3-S:6/TB7';

  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets: over.sets,
    smartComplements: over.smartComplements,
    onChange: () => card.refresh(),
  });

  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);

  const cell = (side: number, set: number) =>
    q<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

  /** Type into a cell the way a browser does — set the value, then dispatch `input`. */
  const type = (side: number, set: number, value: string) => {
    const input = cell(side, set);
    if (!input) throw new Error(`no cell for side ${side} set ${set}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  };

  return {
    card,
    region,
    q,
    cell,
    type,
    all: <T extends Element>(s: string) => [...card.element.querySelectorAll<T>(s)],
    band: () => q<HTMLElement>('.chc-sec-band'),
    submit: () => q<HTMLButtonElement>('button[data-action="submit"]'),
    smart: () => q<HTMLInputElement>('input[data-action="smartComplements"]'),
    matchEnding: (status: string) => q<HTMLButtonElement>(`.chc-sec-endings > button[data-ending="${status}"]`),
    endedEarly: (side: number) => q<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`),
    sideOption: (side: number, status: string) =>
      q<HTMLButtonElement>(`[data-panel-side="${side}"] button[data-ending="${status}"]`),
    otherButton: () => q<HTMLButtonElement>('button[data-action="other"]'),
    otherItem: (status: string) => q<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${status}"]`),
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the grid follows the matchUpFormat', () => {
  it('gives a best-of-3 three set columns, on both rows', () => {
    const h = mount({ matchUpFormat: 'SET3-S:6/TB7' });

    expect(h.all('.chc-sec-row-head > div')).toHaveLength(5); // player + 3 sets + the ended-early column
    for (const side of [1, 2]) {
      for (const set of [1, 2, 3]) expect(h.cell(side, set), `side ${side} set ${set}`).toBeTruthy();
    }
    expect(h.all(SET_CELLS)).toHaveLength(6);
  });

  it('gives a best-of-5 five, without anyone saying five', () => {
    const h = mount({ matchUpFormat: 'SET5-S:6/TB7' });

    expect(h.all(SET_CELLS)).toHaveLength(10);
    expect(h.cell(1, 5)).toBeTruthy();
  });

  it('gives a one-set match one column', () => {
    // An `exactly` format. `matchUpConfigFor` resolves it; nothing here counts sets itself.
    const h = mount({ matchUpFormat: 'SET1-S:6/TB7' });

    expect(h.all(SET_CELLS)).toHaveLength(2);
  });

  it('falls back to best-of-3 for an unparseable format rather than rendering nothing', () => {
    // A dialog that will not open is worse than one that opens on the wrong best-of, and the operator
    // can see and correct a wrong column count.
    const h = mount({ matchUpFormat: 'NOT-A-FORMAT' });

    expect(h.all(SET_CELLS)).toHaveLength(6);
  });
});

describe('typing a score', () => {
  it('reaches the band without the operator doing anything else', () => {
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');

    expect(h.band()?.textContent).toContain('6-4');
  });

  it('opens Submit once the match is complete, and not before', () => {
    const h = mount();

    h.type(1, 1, '6');
    h.type(2, 1, '4');
    expect(h.submit()?.disabled, 'one set of three is not a result').toBe(true);

    h.type(1, 2, '6');
    h.type(2, 2, '3');
    expect(h.submit()?.disabled, 'two sets of three IS a result').toBe(false);
    expect(h.band()?.textContent).toContain('Rosalind Lem def. Derrick Ellul');
  });

  it('names the other winner when the other side wins', () => {
    const h = mount();
    for (const [side, set, value] of [[2, 1, '6'], [1, 1, '4'], [2, 2, '6'], [1, 2, '3']] as const) {
      h.type(side, set, value);
    }

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('Derrick Ellul def. Rosalind Lem');
  });

  it('KEEPS THE INPUT ELEMENT across keystrokes — the caret must survive', () => {
    // The property a screenshot cannot show and a real operator notices immediately. The region calls
    // the card's refresh on every keystroke; if that rebuilt the rows, this input would be replaced
    // each character and only one digit could be entered per click.
    const h = mount();
    const first = h.cell(1, 1);

    h.type(1, 1, '6');
    h.type(2, 1, '4');
    h.type(1, 2, '6');

    expect(h.cell(1, 1)).toBe(first);
  });

  it('accepts digits only, and clears a rejected character out of the field', () => {
    // A rejected character left sitting in the field reads as accepted.
    const h = mount();
    const input = h.type(1, 1, '6a');

    expect(input.value).toBe('6');
    // Asserted on the SETS rather than on the band text: the band legitimately contains letters ("not
    // a finished result"), so a `not.toContain('a')` there was a vacuous assertion that happened to
    // fail. What matters is that no non-digit reached the score.
    expect(h.region.getSets()[0].side1Score).toBe(6);
  });

  it('strips a non-digit from anywhere in the field, not just the end', () => {
    const h = mount();

    expect(h.type(1, 1, 'a6').value).toBe('6');
    expect(h.type(1, 2, '1a2').value).toBe('12');
  });

  it('treats a cleared field as not-entered, not as zero', () => {
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');
    expect(h.band()?.textContent).toContain('6-4');

    h.type(1, 1, '');
    h.type(2, 1, '');

    // Back to nothing entered. A region storing numbers would report 0-0 here, which reads as a
    // played set lost to love.
    expect(h.region.getSets()).toEqual([]);
    expect(h.band()?.textContent).toMatch(/no result/i);
  });

  it('records a genuine 0 — a set lost to love is not an empty field', () => {
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '0');

    expect(h.band()?.textContent).toContain('6-0');
    expect(h.region.getSets()[0].side2Score).toBe(0);
  });
});

describe('smart complements', () => {
  it('fills the opposing cell from an unambiguous digit', () => {
    // `calculateComplement(4)` is 6: a 4 can only have been a 6-4 loss.
    const h = mount();
    h.type(1, 1, '4');

    expect(h.cell(2, 1)?.value).toBe('6');
    expect(h.band()?.textContent).toContain('4-6');
  });

  it('fills the other direction too — it follows the cell typed into, not side 1', () => {
    // The mapping bug that would be invisible in the common case: typing in side 2 must complement
    // side 1, not overwrite side 2 again.
    const h = mount();
    h.type(2, 1, '4');

    expect(h.cell(1, 1)?.value).toBe('6');
    expect(h.cell(2, 1)?.value).toBe('4');
  });

  it('leaves an ambiguous digit alone', () => {
    // `calculateComplement(6)` is null — a 6 could end 6-0 through 6-4, so there is nothing to infer
    // and guessing would put a score in front of the operator that they never typed.
    const h = mount();
    h.type(1, 1, '6');

    expect(h.cell(2, 1)?.value).toBe('');
  });

  it('does not fire twice in one set, so a correction by hand stands', () => {
    // Without the per-set record, correcting the filled value would have the correction complemented
    // in turn and the operator could never overrule it.
    const h = mount();
    h.type(1, 1, '4');
    expect(h.cell(2, 1)?.value).toBe('6');

    h.type(2, 1, '7');

    expect(h.cell(2, 1)?.value).toBe('7');
    expect(h.cell(1, 1)?.value).toBe('4');
  });

  it('can be switched off, and then fills nothing', () => {
    const h = mount();
    expect(h.smart()?.checked).toBe(true);

    h.smart()!.checked = false;
    h.smart()!.dispatchEvent(new Event('change', { bubbles: true }));
    h.type(1, 1, '4');

    expect(h.cell(2, 1)?.value).toBe('');
  });

  it('starts off when asked, and can be switched on', () => {
    const h = mount({ smartComplements: false });
    expect(h.smart()?.checked).toBe(false);

    h.type(1, 1, '4');
    expect(h.cell(2, 1)?.value).toBe('');

    h.smart()!.checked = true;
    h.smart()!.dispatchEvent(new Event('change', { bubbles: true }));
    h.type(1, 2, '4');

    expect(h.cell(2, 2)?.value).toBe('6');
  });

  it('carries no explanatory sub-text — CA, 2026-09-27', () => {
    // The draft read "type 6 → fills 6-4", which was clutter AND backwards: 6 has no complement, 4
    // has. Pinned so it does not come back.
    const h = mount();
    const label = h.smart()?.closest('label');

    expect(label?.textContent?.trim()).toBe('Smart complements');
    expect(label?.textContent).not.toMatch(/6-4|type 6|→/);
  });

  it('lives in the score region, not the card chrome', () => {
    // Its presence in the shared chrome would imply it applied to Free Score and the Dial Pad too.
    expect(mount().q('.chc-sec-score-region input[data-action="smartComplements"]')).toBeTruthy();
  });
});

describe('a saved score re-opens in the grid', () => {
  it('seeds every cell from the sets it was given', () => {
    const h = mount({
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 },
      ],
    });

    expect(h.cell(1, 1)?.value).toBe('6');
    expect(h.cell(2, 1)?.value).toBe('4');
    expect(h.cell(1, 2)?.value).toBe('6');
    expect(h.cell(2, 2)?.value).toBe('3');
    expect(h.cell(1, 3)?.value).toBe('');
  });

  it('opens with Submit live and the result already stated', () => {
    const h = mount({
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 },
      ],
    });

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('Rosalind Lem def. Derrick Ellul 6-4 6-3');
  });

  it('seeds a genuine 0 rather than blanking it', () => {
    // `0 || ''` is `''`. The seeding uses `=== undefined`, and this is the test that says why.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 0, winningSide: 1 }] });

    expect(h.cell(2, 1)?.value).toBe('0');
  });
});

describe('the region and the endings groups agree', () => {
  it('a walkover still submits, even with a part-score typed', () => {
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');

    h.endedEarly(2)?.click();
    h.sideOption(2, WALKOVER)?.click();

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('Rosalind Lem advances');
    // A walkover has no score, so the band must not quote the part-score as if it were recorded.
    expect(h.band()?.textContent).toContain('no score recorded');
  });

  it('Cancelled quotes the part-score it clears, taken from the region', () => {
    // The band's number comes from the region's own `scoreString`, so it can never differ from what
    // the grid holds.
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');
    h.type(1, 2, '2');
    h.type(2, 2, '1');

    h.otherButton()?.click();
    h.otherItem(CANCELLED)?.click();

    expect(h.band()?.dataset.tone).toBe('warn');
    expect(h.band()?.textContent).toContain('6-4 2-1');
    expect(h.band()?.textContent).toMatch(/cleared/i);
  });

  it('Suspended keeps the part-score', () => {
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');
    h.matchEnding(SUSPENDED)?.click();

    expect(h.band()?.textContent).toContain('6-4');
    expect(h.band()?.textContent).toMatch(/recorded/i);
  });

  it('typed values survive an ending being chosen and cleared again', () => {
    // Choosing an ending is a full card re-render, so the cells are rebuilt. The VALUES must come back
    // because the region holds them — this is the difference between a re-render and a reset.
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');

    h.matchEnding(SUSPENDED)?.click();
    h.matchEnding(SUSPENDED)?.click();

    expect(h.cell(1, 1)?.value).toBe('6');
    expect(h.cell(2, 1)?.value).toBe('4');
    expect(h.band()?.textContent).toContain('6-4');
  });
});
