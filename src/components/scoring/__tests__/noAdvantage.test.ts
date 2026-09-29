/**
 * @vitest-environment happy-dom
 *
 * No-advantage formats, which this module read under the wrong name and therefore never applied.
 *
 * ── What was wrong ──
 *
 * `SetFormat` in `logic/dynamicSetsLogic.ts` is a hand-written mirror of what
 * `matchUpFormatCode.parse` emits, and it called the no-advantage flag `noAd` while the factory emits
 * **`NoAD`**. Every read of `.noAd` in that module therefore answered `undefined` for every format,
 * and the TYPE is what made those reads look correct. Nothing threw; no-advantage was simply ignored.
 *
 * Every other reader in the package had it right — `freeScore.ts`, `matchUpFormat.ts`,
 * `matchUpFormatLogic.ts`, the format picker. This one type was the outlier.
 *
 * ── Why these assert against the FACTORY's answer rather than a number ──
 *
 * A test that hard-codes 7 proves the module returns 7. A test that asks `scoreGovernor` the same
 * question proves the module agrees with the engine, which is the property that was broken — and it
 * keeps agreeing if the engine's rule ever changes. The literal is stated in the comment so a reader
 * can see what is meant without running anything.
 */
import {
  shouldApplySmartComplement,
  getSetFormatForIndex,
  calculateComplement,
  matchUpConfigFor,
  buildSetScore
} from '../logic/dynamicSetsLogic';
import { matchUpFormatCode, scoreGovernor } from 'tods-competition-factory';
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { describe, it, expect, beforeEach } from 'vitest';
import { completeTiebreakOnly } from '../logic/tiebreakEntry';
import { renderScoreEntryCard } from '../scoreEntryCard';

const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];

/** The formats under test, named because each appears in several cases. */
const MATCH_TIEBREAK_NOAD = 'SET1-S:TB10NOAD';
const SET_TIEBREAK_NOAD = 'SET3-S:6/TB7NOAD';
const SET_TIEBREAK = 'SET3-S:6/TB7';
const SET_NOAD = 'SET3-S:6NOAD';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the parsed format carries `NoAD`, and this module now reads it', () => {
  it.each([
    [MATCH_TIEBREAK_NOAD, 'tiebreakSet'],
    [SET_TIEBREAK_NOAD, 'tiebreakFormat']
  ])('%s puts NoAD on %s — not `noAd`', (format, holder) => {
    // The measurement the whole fix rests on. If this ever reads `noAd`, the mirror has drifted back.
    const setFormat: any = getSetFormatForIndex(0, matchUpConfigFor(format));

    expect(setFormat?.[holder]?.NoAD).toBe(true);
    expect(setFormat?.[holder]?.noAd, 'the factory has never emitted this spelling').toBeUndefined();
  });

  it('puts it at the TOP level for a no-tiebreak set', () => {
    const setFormat: any = getSetFormatForIndex(0, matchUpConfigFor(SET_NOAD));

    expect(setFormat?.NoAD).toBe(true);
  });
});

describe('a no-advantage GAMES complement', () => {
  it("completes a 5 to the factory's answer, which for S:6NOAD is 6 and not 7", () => {
    const setFormat = getSetFormatForIndex(0, matchUpConfigFor(SET_NOAD));
    const expected = scoreGovernor.getSetComplement({ lowValue: 5, setTo: 6, NoAD: true, isSide1: true });

    // First to six, so a 5 faces a 6. Read with `noAd` — or from the tiebreak's flag, which this site
    // also did — the complement came back 7, offering a 7-5 the format cannot produce.
    expect(calculateComplement(5, setFormat)).toBe((expected as number[])[1]);
    expect(calculateComplement(5, setFormat)).toBe(6);
  });

  it('leaves an ADVANTAGE set alone, so the fix is not applied to everything', () => {
    // The control. Without it, a change that hard-wired no-ad everywhere would pass the test above.
    const setFormat = getSetFormatForIndex(0, matchUpConfigFor('SET3-S:6'));

    expect(calculateComplement(5, setFormat)).toBe(7);
  });
});

describe('a no-advantage TIEBREAK', () => {
  it('completes a 6 to 7, the way the factory does', () => {
    const setFormat = getSetFormatForIndex(0, matchUpConfigFor(SET_TIEBREAK_NOAD));
    const expected = scoreGovernor.getTiebreakComplement({
      lowValue: 6,
      tiebreakTo: 7,
      tiebreakNoAd: true,
      isSide1: true
    });

    expect(completeTiebreakOnly(6, 1, { ...setFormat, tiebreakSet: setFormat?.tiebreakFormat } as any)?.side2).toBe(
      (expected as number[])[1]
    );
  });

  it("derives the WINNER's points as 7, not 8, when building the set", () => {
    // `buildSetScore` derives the winner's tiebreak points from the loser's. Under no-ad that is one
    // more, not two — and this read the flag under the wrong name, so every no-ad tiebreak recorded a
    // winner's score one point too high.
    const config = matchUpConfigFor(SET_TIEBREAK_NOAD);
    const set = buildSetScore(0, '7', '6', '6', config);

    expect(set.side1TiebreakScore).toBe(7);
    expect(set.side2TiebreakScore).toBe(6);
  });

  it('still needs two under ADVANTAGE scoring — the control', () => {
    const config = matchUpConfigFor(SET_TIEBREAK);
    const set = buildSetScore(0, '7', '6', '6', config);

    expect(set.side1TiebreakScore).toBe(8);
  });

  it.each([
    [SET_TIEBREAK_NOAD, '7', 'no-ad: the winner needs one more point'],
    [SET_TIEBREAK, '8', 'advantage: the winner needs two']
  ])('%s reopens the tiebreak column showing %s', (matchUpFormat, expected) => {
    // The region never passed the flag to `getTiebreakComplement` at all, so this column wrote 8 for a
    // 6 whatever the format said.
    //
    // ── Why this reopens the column instead of reading it straight after typing ──
    //
    // Completing the pair FOLDS the column away, so the winner's cell is gone from the document the
    // moment it is written — a first version of this asserted on it and failed for that reason. And
    // `getSets()` cannot see it either: `tiebreakOf` takes the MINIMUM of the two cells and
    // `buildSetScore` re-derives the winner's points from it, so the complement's high value never
    // reaches the outcome at all. What it does reach is the operator, when they click back into the set
    // to check what was recorded — which is the state this drives.
    const region: any = createDynamicSetsRegion({
      matchUpFormat,
      sets: [{ setNumber: 1, side1Score: 7, side2Score: 6 }],
      onChange: () => card.refresh(),
      onStructureChange: () => card.rerender()
    });
    const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
    document.body.append(card.element);

    // Side 2 lost the set, so its cell is the one the complement fires from.
    const field = card.element.querySelector<HTMLInputElement>('input[data-tiebreak-side="2"][data-tiebreak-set="1"]')!;
    field.value = '6';
    field.dispatchEvent(new Event('input', { bubbles: true }));

    // Folded, as the design intends.
    expect(card.element.querySelector('input[data-tiebreak-set="1"]')).toBeNull();

    // Click back into the set: entering it reopens its tiebreak column.
    card.element
      .querySelector<HTMLInputElement>('input[data-side="1"][data-set="1"]')!
      .dispatchEvent(new FocusEvent('focus', { bubbles: true }));

    const winnerCell = card.element.querySelector<HTMLInputElement>(
      'input[data-tiebreak-side="1"][data-tiebreak-set="1"]'
    );
    expect(winnerCell?.value).toBe(expected);
  });
});

describe('the SHIPPING dialog is fixed too, not only the new card', () => {
  // `approaches/dynamicSetsApproach.ts` has no tiebreak complement and no flag reads of its own — it
  // goes through these two shared helpers, which is why correcting `SetFormat` reaches it. Asserted on
  // the entry points the shipping dialog actually calls, so a later change cannot fix the new card and
  // quietly regress the old one.

  it('the complement it calls honours no-advantage', () => {
    const result = shouldApplySmartComplement(5, false, 0, [], matchUpConfigFor(SET_NOAD), new Set(), true);

    expect(result.shouldApply).toBe(true);
    expect(result.field2Value, 'first to six, so a 5 faces a 6').toBe(6);
  });

  it('and leaves an advantage set alone — the control', () => {
    const result = shouldApplySmartComplement(5, false, 0, [], matchUpConfigFor('SET3-S:6'), new Set(), true);

    expect(result.field2Value).toBe(7);
  });

  it('the set it builds derives a no-ad tiebreak winner correctly', () => {
    expect(buildSetScore(0, '7', '6', '6', matchUpConfigFor(SET_TIEBREAK_NOAD)).side1TiebreakScore).toBe(7);
    expect(buildSetScore(0, '7', '6', '6', matchUpConfigFor(SET_TIEBREAK)).side1TiebreakScore).toBe(8);
  });
});

describe('a no-advantage MATCH tiebreak', () => {
  it('completes a 9 to 10, not 11', () => {
    const setFormat = getSetFormatForIndex(0, matchUpConfigFor(MATCH_TIEBREAK_NOAD));
    const expected = scoreGovernor.getTiebreakComplement({
      lowValue: 9,
      tiebreakTo: 10,
      tiebreakNoAd: true,
      isSide1: false
    });

    const completed = completeTiebreakOnly(9, 2, setFormat);
    expect(completed?.side1).toBe((expected as number[])[0]);
    expect(completed?.side1).toBe(10);
    expect(completed?.side2).toBe(9);
  });

  it('needs 11 under ADVANTAGE scoring — the control', () => {
    const setFormat = getSetFormatForIndex(0, matchUpConfigFor('SET1-S:TB10'));

    expect(completeTiebreakOnly(9, 2, setFormat)?.side1).toBe(11);
  });

  it('agrees with what the format string itself declares', () => {
    // A control on the FIXTURE rather than on the code: if `SET1-S:TB10NOAD` ever stopped parsing to a
    // no-ad tiebreak, every assertion above would pass while testing the wrong format.
    const parsed: any = matchUpFormatCode.parse(MATCH_TIEBREAK_NOAD);

    expect(parsed?.setFormat?.tiebreakSet?.NoAD).toBe(true);
  });
});
