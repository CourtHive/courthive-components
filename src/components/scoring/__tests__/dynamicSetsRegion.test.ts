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
const BEST_OF_3 = 'SET3-S:6/TB7';
const BEST_OF_5 = 'SET5-S:6/TB7';
const ROW_HEAD = '.chc-sec-row-head';
const COL_HEAD = '.chc-sec-col-head';
const ROW = '.chc-sec-row';
const ARIA_LABEL = 'aria-label';

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' },
];

function mount(over: { matchUpFormat?: string; sets?: any[]; smartComplements?: boolean } = {}) {
  document.body.innerHTML = '';
  const matchUpFormat = over.matchUpFormat ?? BEST_OF_3;

  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets: over.sets,
    smartComplements: over.smartComplements,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender(),
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

  const tb = (side: number, set: number) =>
    q<HTMLInputElement>(`input[data-tiebreak-side="${side}"][data-tiebreak-set="${set}"]`);

  const typeTb = (side: number, set: number, value: string) => {
    const input = tb(side, set);
    if (!input) throw new Error(`no tiebreak cell for side ${side} set ${set}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  };

  /** Enter a whole set, the way an operator does. */
  const enterSet = (set: number, side1: string, side2: string) => {
    type(1, set, side1);
    type(2, set, side2);
  };

  return {
    card,
    region,
    q,
    cell,
    type,
    tb,
    typeTb,
    enterSet,
    focusCell: (side: number, set: number) => cell(side, set)?.dispatchEvent(new Event('focus', { bubbles: true })),
    parenthetical: (side: number, set: number) =>
      cell(side, set)?.closest('.chc-sec-games-cell')?.querySelector('.chc-sec-tb-paren')?.textContent ?? '',
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

describe('the grid reveals one set at a time — CA, 2026-09-27', () => {
  it('opens with only the first set, whatever the best-of', () => {
    // Progressive disclosure, matching USTA Tournament Desk: the second set's fields do not exist until
    // the first is finished. An empty column for a set the match may never reach invites input that
    // cannot mean anything yet.
    for (const format of [BEST_OF_3, BEST_OF_5]) {
      const h = mount({ matchUpFormat: format });
      expect(h.all(SET_CELLS), `${format} should open with one set column`).toHaveLength(2);
      expect(h.cell(1, 1)).toBeTruthy();
      expect(h.cell(1, 2)).toBeNull();
    }
  });

  it('reveals the second set once the first is finished', () => {
    const h = mount();
    expect(h.cell(1, 2)).toBeNull();

    h.enterSet(1, '6', '4');

    expect(h.cell(1, 2), 'the second set should open').toBeTruthy();
    expect(h.cell(1, 3), 'but not the third').toBeNull();
  });

  it('stops revealing once the match is decided', () => {
    // `shouldCreateNextSet` knows two sets to the same side ends a best-of-3, so no third column appears
    // and there is nowhere to record a set that was never played.
    const h = mount();
    h.enterSet(1, '6', '4');
    h.enterSet(2, '6', '3');

    expect(h.cell(1, 3)).toBeNull();
    expect(h.submit()?.disabled).toBe(false);
  });

  it('does reveal a third set when the match is level', () => {
    const h = mount();
    h.enterSet(1, '6', '4');
    h.enterSet(2, '3', '6');

    expect(h.cell(1, 3)).toBeTruthy();
    expect(h.submit()?.disabled).toBe(true);
  });

  it('heads the visible columns 1st / 2nd / 3rd, not "SET 1"', () => {
    const h = mount();
    expect(h.all(COL_HEAD).map((cell) => cell.textContent)).toEqual(['1st']);

    h.enterSet(1, '6', '4');
    expect(h.all(COL_HEAD).map((cell) => cell.textContent)).toEqual(['1st', '2nd']);
    expect(h.q(ROW_HEAD)?.textContent).not.toMatch(/SET\s*\d/i);
  });

  it('keeps the full set number in the accessible name, since "1st" alone has no context', () => {
    const h = mount();
    expect(h.cell(1, 1)?.getAttribute(ARIA_LABEL)).toBe('1st set, side 1 games');

    h.enterSet(1, '6', '4');
    expect(h.cell(2, 2)?.getAttribute(ARIA_LABEL)).toBe('2nd set, side 2 games');
    expect(h.cell(1, 2)?.getAttribute(ARIA_LABEL)).toBe('2nd set, side 1 games');
  });

  it('names the tiebreak field as points, not games', () => {
    // A tiebreak column beside a games column with an identical name would be unusable by ear.
    const h = mount();
    h.enterSet(1, '7', '6');

    expect(h.tb(1, 1)?.getAttribute(ARIA_LABEL)).toBe('1st set tiebreak, side 1 points');
    expect(h.tb(2, 1)?.getAttribute(ARIA_LABEL)).toBe('1st set tiebreak, side 2 points');
  });

  it('falls back to best-of-3 for an unparseable format rather than rendering nothing', () => {
    // A dialog that will not open is worse than one that opens on the wrong best-of.
    const h = mount({ matchUpFormat: 'NOT-A-FORMAT' });
    h.enterSet(1, '6', '4');
    h.enterSet(2, '3', '6');

    expect(h.cell(1, 3)).toBeTruthy();
  });

  // ── Alignment: a heading must sit over the cell it describes ──
  //
  // happy-dom computes no layout, so pixel positions cannot be measured. What CAN be asserted is the
  // structure that GUARANTEES it, which is the real mechanism: one grid template assigned to the header
  // row and to every participant row, built from one column array. Centring within a track is then CSS,
  // and every score cell uses the same property for it.
  it.each([
    ['one set open', (h: any) => h],
    ['two sets open', (h: any) => { h.enterSet(1, '6', '4'); return h; }],
    ['a tiebreak column open', (h: any) => { h.enterSet(1, '7', '6'); return h; }],
  ])('header and rows share one identical column template (%s)', (_label, drive) => {
    const h = drive(mount());
    // Cast rather than a generic call: the `it.each` drive functions are typed `any`, so a type argument
    // on `h.q` is rejected outright.
    const head = h.q(ROW_HEAD) as HTMLElement | null;
    const rows = h.all(ROW) as HTMLElement[];

    expect(head?.style.gridTemplateColumns).toBeTruthy();
    for (const row of rows) {
      expect(row.style.gridTemplateColumns, 'a row disagrees with the header about its columns').toBe(
        head?.style.gridTemplateColumns,
      );
    }
    // And one heading per score column, on every row.
    expect(head?.children.length).toBe(rows[0].children.length);
  });

  it('centres every score cell by the SAME property, not two that happen to agree', () => {
    const h = mount();
    h.enterSet(1, '7', '6');

    expect(h.all(COL_HEAD).length).toBeGreaterThan(1);
    for (const input of h.all<HTMLInputElement>(SET_CELLS)) {
      expect(input.classList.contains('chc-sec-set-input')).toBe(true);
      expect(input.style.margin, 'an inline margin would reintroduce a second mechanism').toBe('');
    }
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

  it('KEEPS THE INPUT ELEMENT while typing WITHIN a set — the caret must survive', () => {
    // The property a screenshot cannot show and a real operator notices immediately. `refresh` must not
    // rebuild the rows, or the field being typed into is replaced each character and only one digit can
    // be entered per click.
    //
    // Scoped to within a set deliberately: a set BOUNDARY is a structural change (a column appears) and
    // there the cells are rebuilt on purpose, with focus moved to where the operator should go next.
    // Smart complements OFF for this one. With it on, a 5 completes the set to 7-5, which opens the next
    // column — a structural change, and therefore a legitimate rebuild. The property under test is what
    // happens BETWEEN structural changes.
    const h = mount({ smartComplements: false });
    const first = h.cell(1, 1);

    h.type(1, 1, '6');
    h.type(1, 1, '');
    h.type(1, 1, '5');

    expect(h.cell(1, 1)).toBe(first);
  });

  it('and a set boundary DOES rebuild, because a column appeared', () => {
    const h = mount();
    const first = h.cell(1, 1);

    h.enterSet(1, '6', '4');

    // The 2nd set's column did not exist a moment ago, so the grid had to be rebuilt. The VALUES come
    // back because the region holds them; only the elements are new.
    expect(h.cell(1, 1)).not.toBe(first);
    expect(h.cell(1, 1)?.value).toBe('6');
    expect(h.cell(1, 2)).toBeTruthy();
  });

  it('accepts digits only, and clears a rejected character out of the field', () => {
    // A rejected character left sitting in the field reads as accepted.
    const h = mount({ smartComplements: false });
    const input = h.type(1, 1, '6a');

    expect(input.value).toBe('6');

    // Both sides, because `getSets()` deliberately excludes a half-entered set now — completing it with
    // a zero made the band announce a `6-0` nobody typed. Asserted on the SETS rather than the band
    // text, since the band legitimately contains letters ("not a finished result").
    h.type(2, 1, '4');
    expect(h.region.getSets()[0].side1Score).toBe(6);
    expect(h.region.getSets()[0].side2Score).toBe(4);
  });

  it('reports no set at all until both sides are entered', () => {
    // The bug this rule fixed, pinned: a lone 6 used to read as 6-0, which completed the set, revealed
    // the next one, and put a score in the band the operator had not typed.
    const h = mount({ smartComplements: false });
    h.type(1, 1, '6');

    expect(h.region.getSets()).toEqual([]);
    expect(h.band()?.textContent).toMatch(/no result/i);
    expect(h.cell(1, 2), 'the next set must not open on half a score').toBeNull();
  });

  it('strips a non-digit from anywhere in the field, not just the end', () => {
    const h = mount();

    expect(h.type(1, 1, 'a6').value).toBe('6');
    expect(h.type(2, 1, '1a2').value).toBe('12');
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
    // Same set, cleared and re-typed: the 2nd set is not open until the 1st is finished.
    h.type(1, 1, '');
    h.type(1, 1, '4');

    expect(h.cell(2, 1)?.value).toBe('6');
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
    // No third column: the match is decided, so there is nowhere to record a set never played.
    expect(h.cell(1, 3)).toBeNull();
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

/**
 * The tiebreak column: it appears, collects, folds away, and comes back when you return to the set.
 *
 * CA, 2026-09-27, describing USTA Tournament Desk: *"a TB column of entry fields appears and also has
 * auto-complete so if TB7 then entering a 3 in one autocompletes the other to 7 then the completed 1st
 * set score changes to 7-6(3) and the TB entry column disappears and the 2nd set entry fields appear"*
 * — and then, on the reopen: *"clicking on the set one scores creates a state where set 1, tb, and set 2
 * (empty) are all visible at once"*.
 *
 * Each clause is asserted separately, because they fail independently.
 */
describe('the tiebreak column — CA, 2026-09-27', () => {
  it('does not exist until the games call for one', () => {
    const h = mount();
    expect(h.tb(1, 1)).toBeNull();

    h.enterSet(1, '6', '4');
    expect(h.tb(1, 1), 'a 6-4 needs no tiebreak').toBeNull();
  });

  it('appears on a 7-6, with a field per side', () => {
    const h = mount();
    h.enterSet(1, '7', '6');

    expect(h.tb(1, 1)).toBeTruthy();
    expect(h.tb(2, 1)).toBeTruthy();
    expect(h.all(COL_HEAD).map((c) => c.textContent)).toEqual(['1st', 'TB']);
  });

  it('holds the second set closed while the tiebreak is outstanding', () => {
    // `isSetComplete(0, 7-6)` is FALSE, measured — a 7-6 is not a finished set until its tiebreak is
    // known. That is what makes the column a step rather than an optional extra.
    const h = mount();
    h.enterSet(1, '7', '6');

    expect(h.cell(1, 2)).toBeNull();
    expect(h.submit()?.disabled).toBe(true);
  });

  it('autocompletes the other side to the format target — a 3 in a TB7 gives 7', () => {
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');

    // Both are recorded, and which is which matters: side 1 won the set 7-6, so side 1 took the tiebreak
    // 7-3. `buildSetScore` derives the winner's score from the loser's, so handing it the wrong one of
    // the pair produced a 7-9.
    const set = h.region.getSets()[0];
    expect(set.side1TiebreakScore).toBe(7);
    expect(set.side2TiebreakScore).toBe(3);
    expect(h.band()?.textContent).toContain('7-6(3)');
  });

  it('takes the target from the FORMAT, not a hard-coded 7', () => {
    // `SET3-S:6/TB10` — sets to 6 with a tiebreak to TEN. Measured: `tiebreakFormat.tiebreakTo` is 10, so
    // a 4 completes to 10 and not to 7.
    const h = mount({ matchUpFormat: 'SET3-S:6/TB10' });
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '4');

    // Asserted on the resulting SET, not on the field: completing the tiebreak folds the column away, so
    // the input is gone by the time this runs. That fold is the behaviour under test elsewhere; here it
    // just means the outcome is the only place left to read.
    const set = h.region.getSets()[0];
    expect(set.side1TiebreakScore).toBe(10);
    expect(set.side2TiebreakScore).toBe(4);
    expect(h.band()?.textContent).toContain('7-6(4)');
  });

  it('a tiebreak-ONLY set has no separate column — its own cells are the points', () => {
    // `SET1-S:TB10` is a match tiebreak: `isSetTiebreakOnly` is true and `buildSetScore` reads the main
    // inputs AS tiebreak scores. So there is nothing to disclose, and a TB column here would be a second
    // place to enter the same number. Measured, after a test of mine assumed otherwise.
    const h = mount({ matchUpFormat: 'SET1-S:TB10' });
    h.enterSet(1, '10', '8');

    expect(h.tb(1, 1)).toBeNull();
    const set = h.region.getSets()[0];
    expect(set.side1TiebreakScore).toBe(10);
    expect(set.side2TiebreakScore).toBe(8);
  });

  it('does NOT autocomplete from the winning score, which says nothing about the loser', () => {
    // Same principle as 6 and 7 completing nothing in the games row: never infer from a value with more
    // than one reading. A 7 in a TB7 could face any loser score.
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(1, 1, '7');

    expect(h.tb(2, 1)?.value, 'the other side must stay empty for the operator to fill').toBe('');
    expect(h.tb(1, 1), 'and the column must stay open, since the points are still unknown').toBeTruthy();
    expect(h.cell(1, 2), 'the second set must not open on an incomplete tiebreak').toBeNull();
  });

  it('folds away once the tiebreak is known, and opens the second set', () => {
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');

    expect(h.tb(1, 1), 'the tiebreak column should be gone').toBeNull();
    expect(h.cell(1, 2), 'the second set should be open').toBeTruthy();
  });

  it('shows the folded tiebreak as a parenthetical on the LOSING side', () => {
    // `7-6(3)` means the loser took three points, which is what every score line in the ecosystem does.
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');

    expect(h.parenthetical(2, 1)).toBe('(3)');
    expect(h.parenthetical(1, 1), 'nothing on the winner').toBe('');
  });

  it('comes BACK when the set is entered again — set 1, TB and set 2 together', () => {
    // The reopen CA described. Without it the column vanished for good on completion and the tiebreak
    // could never be corrected: the score editable, the points that qualify it not.
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');
    expect(h.tb(1, 1)).toBeNull();

    h.focusCell(1, 1);

    expect(h.tb(1, 1), 'the tiebreak column should reopen').toBeTruthy();
    expect(h.all(COL_HEAD).map((c) => c.textContent)).toEqual(['1st', 'TB', '2nd']);
    // Both sides populated, as USTA Tournament Desk shows them.
    expect(h.tb(1, 1)?.value).toBe('7');
    expect(h.tb(2, 1)?.value).toBe('3');
  });

  it('reopens by FOCUS, so the keyboard gets the same affordance as a click', () => {
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');

    h.focusCell(2, 1);

    expect(h.tb(1, 1)).toBeTruthy();
  });

  it('entering a 6-4 does not reopen a tiebreak that never applied', () => {
    const h = mount();
    h.enterSet(1, '6', '4');
    h.focusCell(1, 1);

    expect(h.tb(1, 1)).toBeNull();
  });

  it('carries the tiebreak through to the submitted outcome', () => {
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');
    h.enterSet(2, '6', '4');

    const sets = h.region.getSets();
    expect(sets).toHaveLength(2);
    expect(sets[0].side2TiebreakScore).toBe(3);
    expect(sets[0].side1TiebreakScore).toBe(7);
    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('7-6(3) 6-4');
  });

  it('a second set can have its own tiebreak — each set independently', () => {
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');
    h.enterSet(2, '6', '7');

    expect(h.tb(1, 2), 'the second set should get its own tiebreak column').toBeTruthy();
    expect(h.tb(1, 1), 'and the first set stays folded').toBeNull();
  });
});
