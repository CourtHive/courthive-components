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
const ARIA_PRESSED = 'aria-pressed';
const GAMES_CELL = '.chc-sec-games-cell';

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' },
];

function mount(over: { matchUpFormat?: string; sets?: any[]; smartComplements?: boolean } = {}) {
  document.body.innerHTML = '';
  const matchUpFormat = over.matchUpFormat ?? BEST_OF_3;

  const region = createDynamicSetsRegion({
    matchUpFormat,
    sideNames: [SIDES[0].participantName, SIDES[1].participantName],
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
    /** The raised tiebreak digit beside a games cell. */
    parenthetical: (side: number, set: number) =>
      cell(side, set)?.closest(GAMES_CELL)?.querySelector('.chc-sec-tb-mark')?.textContent ?? '',
    /** Its visually-hidden twin, which is what a screen reader actually gets. */
    spokenTiebreak: (side: number, set: number) =>
      cell(side, set)?.closest(GAMES_CELL)?.querySelector('.chc-sec-sr-only')?.textContent ?? '',
    all: <T extends Element>(s: string) => [...card.element.querySelectorAll<T>(s)],
    band: () => q<HTMLElement>('.chc-sec-band'),
    submit: () => q<HTMLButtonElement>('button[data-action="submit"]'),
    smart: () => q<HTMLButtonElement>('button[data-action="smartComplements"]'),
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
    const h = mount({ smartComplements: false });

    expect(h.type(1, 1, 'a6').value).toBe('6');
    expect(h.type(2, 1, 'a4').value).toBe('4');
  });

  it('refuses a games value the format cannot produce — CA\'s 3-44', () => {
    // `getMaxAllowedScore` is 7 for `S:6/TB7`, so the second `4` is declined and `4` stands. The keystroke
    // is refused rather than substituted: the old Dial Pad replaced an out-of-range digit with `setTo`, so
    // typing 8 silently became 6 — a number the operator never typed in a field they were looking at.
    const h = mount({ smartComplements: false });

    expect(h.type(1, 1, '44').value).toBe('4');
    expect(h.type(2, 1, '8').value).toBe('');
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

  it('completes a 6 to a 7 — CA, 2026-09-27', () => {
    // The table treats the typed digit as the LOSER's games, so a 6 in a set that can reach 6-6 means the
    // opponent took it 7-6. This used to be null; CA changed it to match USTA Tournament Desk.
    const h = mount();
    h.type(1, 1, '6');

    expect(h.cell(2, 1)?.value).toBe('7');
  });

  it('and the operator can still win 6-4, because the complement fires once per set', () => {
    // What makes inferring the 6 safe rather than presumptuous: the guess is correctable in one keystroke
    // and will not be re-applied over the correction.
    const h = mount();
    h.type(1, 1, '6');
    h.type(2, 1, '4');

    expect(h.cell(1, 1)?.value).toBe('6');
    expect(h.cell(2, 1)?.value).toBe('4');
    expect(h.band()?.textContent).toContain('6-4');
  });

  it('leaves a digit ABOVE setTo alone — a 7 cannot be a loser score in a set to 6', () => {
    const h = mount();
    h.type(1, 1, '7');

    expect(h.cell(2, 1)?.value).toBe('');
  });

  it('does not fire twice in one set, so a correction by hand stands', () => {
    // Without the per-set record, correcting the filled value would have the correction complemented
    // in turn and the operator could never overrule it.
    const h = mount();
    h.type(1, 1, '4');
    expect(h.cell(2, 1)?.value).toBe('6');

    // The correction is on the side that was TYPED, and to a 5 rather than a 7: a 4-7 is not a legal score,
    // so the clamp refuses it, and an earlier version of this test asserted exactly that illegal value.
    // `complement(5)` is 7, so without the guard side 2 would move from 6 to 7 — a real discriminator
    // rather than a tautology.
    h.type(1, 1, '5');

    expect(h.cell(2, 1)?.value, 'the complement must not fire a second time').toBe('6');
    expect(h.cell(1, 1)?.value).toBe('5');
  });

  it('can be switched off, and then fills nothing', () => {
    const h = mount();
    expect(h.smart()?.getAttribute(ARIA_PRESSED)).toBe('true');

    h.smart()?.click();
    h.type(1, 1, '4');

    expect(h.smart()?.getAttribute(ARIA_PRESSED)).toBe('false');
    expect(h.cell(2, 1)?.value).toBe('');
  });

  it('starts off when asked, and can be switched on', () => {
    const h = mount({ smartComplements: false });
    expect(h.smart()?.getAttribute(ARIA_PRESSED)).toBe('false');

    h.type(1, 1, '4');
    expect(h.cell(2, 1)?.value).toBe('');

    h.smart()?.click();
    // Same set, cleared and re-typed: the 2nd set is not open until the 1st is finished.
    h.type(1, 1, '');
    h.type(1, 1, '4');

    expect(h.cell(2, 1)?.value).toBe('6');
  });

  it('is one compact word, not a labelled checkbox in its own row — CA, 2026-09-27', () => {
    // CA: "I don't think '[] Smart Complements' should take up a whole row of the modal ... Just (Smart)
    // maybe, something compact that toggles." A `<button aria-pressed>` rather than a checkbox, because one
    // word in a status bar carries its state through `aria-pressed` without needing a visible label beside
    // it.
    const h = mount();

    expect(h.smart()?.tagName).toBe('BUTTON');
    expect(h.smart()?.textContent?.trim()).toBe('Smart');
    // The draft sub-text read "type 6 → fills 6-4", which was clutter AND backwards. Pinned so it stays out.
    expect(h.smart()?.textContent).not.toMatch(/6-4|type 6|→/);
  });

  it('says what it does in its accessible name, since "Smart" alone does not', () => {
    const h = mount();

    expect(h.smart()?.getAttribute(ARIA_LABEL)).toMatch(/fill the opposing score/i);
    expect(h.smart()?.title).toMatch(/fill the opposing score/i);
  });

  it('sits on the result band, not in a row of its own', () => {
    const h = mount();

    expect(h.smart()?.closest('.chc-sec-band')).toBeTruthy();
    // And the region no longer contributes a block at all, so there is no spare row.
    expect(h.q('.chc-sec-score-region')?.children).toHaveLength(0);
  });

  it('stays reachable while the score is faulty — switching it off is how you fix one', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] });

    expect(h.band()?.textContent).toMatch(/must be at least 5/);
    expect(h.smart(), 'the toggle must survive the error band').toBeTruthy();
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

  it('shows the folded tiebreak as a RAISED digit on the LOSING side — CA, 2026-09-27', () => {
    // `7-6³`, the form a printed draw sheet uses, rather than `6(3)`. On the loser's cell, because that
    // is whose points they are.
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');

    expect(h.parenthetical(2, 1)).toBe('3');
    expect(h.parenthetical(1, 1), 'nothing on the winner').toBe('');
    expect(h.cell(2, 1)?.closest(GAMES_CELL)?.querySelector('sup')).toBeTruthy();
  });

  it('says the tiebreak in words too, since a raised digit reads as a bare number', () => {
    // Without this a screen reader announces "6" then "3" — two numbers with no stated relationship. The
    // `<sup>` is aria-hidden and a visually-hidden sibling carries the meaning.
    const h = mount();
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');

    expect(h.spokenTiebreak(2, 1)).toMatch(/tiebreak 3/);
    expect(h.spokenTiebreak(1, 1)).toBe('');
    expect(
      h.cell(2, 1)?.closest(GAMES_CELL)?.querySelector('sup')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('handles a two-digit tiebreak, which a Unicode superscript could not', () => {
    const h = mount({ matchUpFormat: 'SET3-S:6/TB10' });
    h.enterSet(1, '6', '7');
    h.typeTb(1, 1, '8');

    expect(h.parenthetical(1, 1)).toBe('8');
    h.focusCell(1, 1);
    expect(h.tb(2, 1)?.value).toBe('10');
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

/**
 * Integrity — the four holes CA found on 2026-09-27.
 *
 * Verbatim: *"It's possible to enter invalid set scores which wasn't possible in our previous dynamic sets
 * modal, e.g. the status line: 'Rosalind Lem def. Derrick Ellul 7-6(3) 3-7 6-3' should not be possible
 * because 3-7 is not a valid score and I can edit to be: '... 3-44 ...' and the problem with all cells
 * being editable is that the tiebreak score floats between entry cells. I was also able to edit a tiebreak
 * score to be 7-6 with the winning side having 3 and the losing side having tiebreak 7 ... so, there is
 * integrity checking missing somewhere that we have in the previous iterations."*
 *
 * Each of the four is asserted separately, because they were four different holes and they fail
 * independently. The tell throughout was that `validateSetScores` ALREADY knew about two of them — the
 * region simply never asked it.
 */
describe('integrity — CA, 2026-09-27', () => {
  const error = (h: ReturnType<typeof mount>) => h.region.error?.();

  // ── Two layers, and CA's 3-7 is stopped by the FIRST ──
  //
  // The clamp refuses a games value the format cannot produce, so 3-7 can no longer be typed at all: the
  // maximum for side 2 at 3-0 is six. That is stronger than flagging it and is what the previous modal did.
  // The validator still earns its place for scores that did NOT arrive through the keyboard — a saved
  // matchUp, or a format changed after entry.

  it('cannot type CA\'s 3-7 at all — the clamp refuses the 7', () => {
    const h = mount({ smartComplements: false });
    h.type(1, 1, '3');

    expect(h.type(2, 1, '7').value, 'a 7 is unreachable when the opponent has 3').toBe('');
    expect(error(h)).toBeUndefined();
  });

  it('catches a SEEDED 3-7, which never passed through the clamp', () => {
    // "With tiebreak format, if side 2 has 7 games, side 1 must be at least 5, got 3". A 7 is only reachable
    // through a tiebreak at 6-6, so the loser cannot have 3.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] });

    expect(error(h)).toMatch(/1st set:/);
    expect(error(h)).toMatch(/must be at least 5/);
    expect(h.submit()?.disabled).toBe(true);
  });

  it('names the set by its ordinal, not the validator\'s "Set 1"', () => {
    // The validator is handed ONE set at a time to separate a per-set breach from match-level
    // incompleteness, so its "Set 1" is always set one whatever the real index. Re-labelled, or a fault in
    // the second set would point at the first.
    const h = mount({
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 7, winningSide: 2 },
      ],
    });

    expect(error(h)).toMatch(/2nd set:/);
  });

  it('refuses to submit an impossible score even when an ending qualifies it', () => {
    // An impossible score stays impossible however it is labelled. A 3-7 is not made submittable by also
    // being marked Suspended.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] });
    h.matchEnding(SUSPENDED)?.click();

    expect(h.submit()?.disabled).toBe(true);
  });

  it('shows the fault in the band, ahead of anything else it might say', () => {
    // "not a finished result" would be true and useless. The operator needs to know which set and why.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] });

    expect(h.band()?.dataset.tone).toBe('warn');
    expect(h.band()?.textContent).toMatch(/must be at least 5/);
  });

  it('clears the fault when the score is corrected', () => {
    // The obvious way to get this wrong: a latched error that survives the fix.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] });
    expect(error(h)).toBeTruthy();

    h.type(2, 1, '4');
    h.type(1, 1, '6');

    expect(error(h)).toBeUndefined();
    expect(h.band()?.textContent).toContain('6-4');
  });

  it('does NOT flag an in-progress set, which is the commonest state there is', () => {
    // `isSetComplete` gates the per-set check. Without it the validator rejected every partial set with
    // "Set winner must reach 6 games" — so a 6-4 2-1 that an operator is about to mark Suspended read as
    // broken, and a band that cries wolf on the ordinary case is a band nobody reads.
    const h = mount({ smartComplements: false });
    h.enterSet(1, '6', '4');
    h.enterSet(2, '2', '1');

    expect(error(h)).toBeUndefined();
    expect(h.band()?.textContent).toContain('6-4 2-1');
  });

  it('drops a tiebreak whose games no longer call for one — the score stopped "floating"', () => {
    // Editing a 7-6(3) down to 6-3 used to leave the points attached, and the band read `6-3(3)` — a
    // tiebreak on a set that never had one.
    const h = mount({ smartComplements: false });
    h.enterSet(1, '7', '6');
    h.typeTb(2, 1, '3');
    expect(h.band()?.textContent).toContain('7-6(3)');

    h.type(1, 1, '6');
    h.type(2, 1, '3');

    expect(h.band()?.textContent).toContain('6-3');
    expect(h.band()?.textContent).not.toContain('(3)');
    expect(h.region.getSets()[0].side1TiebreakScore).toBeUndefined();
    expect(h.region.getSets()[0].side2TiebreakScore).toBeUndefined();
  });

  it('rejects a tiebreak that contradicts who won the set', () => {
    // `validateSetScores` does NOT catch this — measured — and the silent behaviour was worse than letting
    // it through: `buildSetScore` takes the LOWER value as the loser's points and derives the winner's, so
    // the card displayed 3 against the winner while submitting 7. Showing one thing and recording another
    // is the outcome worth failing loudly for.
    const h = mount({ smartComplements: false });
    h.enterSet(1, '7', '6');
    h.typeTb(1, 1, '3');
    h.typeTb(2, 1, '7');

    expect(error(h)).toMatch(/Rosalind Lem won it, so they must win the tiebreak/);
    expect(h.submit()?.disabled).toBe(true);
  });

  it('accepts the tiebreak when it agrees with the set', () => {
    const h = mount({ smartComplements: false });
    h.enterSet(1, '7', '6');
    h.typeTb(1, 1, '7');
    h.typeTb(2, 1, '3');

    expect(error(h)).toBeUndefined();
    expect(h.band()?.textContent).toContain('7-6(3)');
  });

  it('rejects a tied tiebreak, which decides nothing', () => {
    const h = mount({ smartComplements: false });
    h.enterSet(1, '7', '6');
    h.typeTb(1, 1, '5');
    h.typeTb(2, 1, '5');

    expect(error(h)).toMatch(/cannot be tied/);
  });

  it('still allows a legitimate match tiebreak of 10-8, which the shared max would have blocked', () => {
    // The upstream gap this surfaced: `getMaxAllowedScore` returns 7 for `SET1-S:TB10`, because it reads
    // `setFormat.setTo` and a tiebreak-only format keeps its target on `tiebreakSet.tiebreakTo`. Clamping
    // against it would make a match tiebreak unenterable, so tiebreak-only sets are exempt.
    const h = mount({ matchUpFormat: 'SET1-S:TB10', smartComplements: false });
    h.enterSet(1, '10', '8');

    expect(h.cell(1, 1)?.value).toBe('10');
    expect(h.region.getSets()[0].side1TiebreakScore).toBe(10);
    expect(h.submit()?.disabled).toBe(false);
  });
});
