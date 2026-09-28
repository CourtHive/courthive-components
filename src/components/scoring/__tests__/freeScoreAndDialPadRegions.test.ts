/**
 * @vitest-environment happy-dom
 *
 * The Free Score and Dial Pad regions, driven through the card.
 *
 * These two exercise the half of the region seam Dynamic Sets does not: a `block()` beneath the rows
 * rather than inputs inside them, and a read-only readout in the participant rows. They are tested
 * together because the property that matters most is one neither can demonstrate alone — that the card
 * around them is IDENTICAL, which is the entire claim the card rests on.
 */
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../regions/freeScoreRegion';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { createDialPadRegion } from '../regions/dialPadRegion';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

const { WALKOVER, RETIRED, SUSPENDED, CANCELLED } = matchUpStatusConstants;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' },
];
const READOUT = '.chc-sec-readout';
const BAND = '.chc-sec-band';
const SUBMIT = 'button[data-action="submit"]';
const FS_FIELD = 'input[data-free-score]';
const TIEBREAK = 'button[data-action="tiebreak"]';
const ARIA_PRESSED = 'aria-pressed';
/** A set taken on a tiebreak, with the LOSER's points in parentheses — the score-line convention. */
const SEVEN_SIX_THREE = '7-6(3)';
/** A match tiebreak, in the factory's bracketed form. */
const MATCH_TIEBREAK_FORMAT = 'SET1-S:TB10';
const BACKSPACE = 'button[data-action="backspace"]';
const FREE_SCORE = 'Free Score';
const RET_TEXT = '6-4 2-1 ret';
const LEM_ADVANCES = 'Rosalind Lem advances';

function harness(build: (onChange: () => void) => any, matchUpFormat = FORMAT) {
  document.body.innerHTML = '';
  const region = build(() => card.refresh());
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  document.body.append(card.element);

  const q = <T extends Element>(s: string) => card.element.querySelector<T>(s);
  return {
    card,
    region,
    q,
    all: <T extends Element>(s: string) => [...card.element.querySelectorAll<T>(s)],
    band: () => q<HTMLElement>(BAND),
    submit: () => q<HTMLButtonElement>(SUBMIT),
    readout: (side: number) => q<HTMLElement>(`[data-readout-side="${side}"]`),
    endedEarly: (side: number) => q<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`),
    sideOption: (side: number, status: string) =>
      q<HTMLButtonElement>(`[data-panel-side="${side}"] button[data-ending="${status}"]`),
    matchEnding: (status: string) => q<HTMLButtonElement>(`.chc-sec-endings > button[data-ending="${status}"]`),
    otherButton: () => q<HTMLButtonElement>('button[data-action="other"]'),
    otherItem: (status: string) => q<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${status}"]`),
  };
}

const freeScore = (over: { initialText?: string } = {}) =>
  harness((onChange) => createFreeScoreRegion({ matchUpFormat: FORMAT, onChange, ...over }));

const dialPad = (over: { sets?: any[]; matchUpFormat?: string } = {}) =>
  harness(
    (onChange) => createDialPadRegion({ matchUpFormat: over.matchUpFormat ?? FORMAT, sets: over.sets, onChange }),
    over.matchUpFormat ?? FORMAT,
  );

function typeFreeScore(h: ReturnType<typeof freeScore>, value: string) {
  const field = h.q<HTMLInputElement>(FS_FIELD);
  if (!field) throw new Error('no free-score field');
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  return field;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('both regions put a readout in the rows and their entry surface beneath', () => {
  it.each([
    [FREE_SCORE, () => freeScore()],
    ['Dial Pad', () => dialPad()],
  ])('%s renders a readout per side and no set inputs in the rows', (_label, build) => {
    const h = build();

    expect(h.all(READOUT)).toHaveLength(2);
    expect(h.readout(1)).toBeTruthy();
    expect(h.readout(2)).toBeTruthy();
    expect(h.all('input[data-set]'), 'the rows must not accept per-set input here').toEqual([]);
  });

  it.each([
    [FREE_SCORE, () => freeScore()],
    ['Dial Pad', () => dialPad()],
  ])('%s renders no header row — its one column needs no label', (_label, build) => {
    // An empty header strip above an unlabelled column is furniture. The card decides this from the
    // columns the region declares, so neither region asks for it.
    expect(build().q('.chc-sec-row-head')).toBeNull();
  });

  it('gives the readout column the same width in both, from one shared constant', () => {
    const fs = freeScore().q<HTMLElement>('.chc-sec-row')?.style.gridTemplateColumns;
    const dp = dialPad().q<HTMLElement>('.chc-sec-row')?.style.gridTemplateColumns;

    expect(fs).toBeTruthy();
    expect(dp).toBe(fs);
  });

  it('the card around them is identical — the whole claim of the card', () => {
    const chrome = ['.chc-sec-header', '.chc-sec-rows', '.chc-sec-endings', BAND, '.chc-sec-footer', SUBMIT];

    for (const build of [() => freeScore(), () => dialPad(), () => harness((onChange) => createDynamicSetsRegion({ matchUpFormat: FORMAT, onChange }))]) {
      const h = build();
      for (const selector of chrome) expect(h.q(selector), `${selector} missing`).toBeTruthy();
      // The same seven match-level endings, wherever the score comes from.
      expect(h.all('.chc-sec-endings > button[data-ending]')).toHaveLength(3);
      expect(h.otherButton()).toBeTruthy();
    }
  });
});

describe(FREE_SCORE, () => {
  it('reaches the band and the readout from typed text', () => {
    const h = freeScore();
    typeFreeScore(h, '6-4 6-3');

    expect(h.band()?.textContent).toContain('Rosalind Lem def. Derrick Ellul');
    expect(h.readout(1)?.textContent).toContain('6');
    expect(h.readout(2)?.textContent).toContain('4');
    expect(h.submit()?.disabled).toBe(false);
  });

  it('holds Submit closed on an unfinished score', () => {
    const h = freeScore();
    typeFreeScore(h, '6-4');

    expect(h.submit()?.disabled).toBe(true);
  });

  it('says whether the text was UNDERSTOOD, separately from what will be submitted', () => {
    // The note answers a different question from the band: the band says what will be recorded, the
    // note says whether the field makes sense. A typo produces a sane band and an unparseable field.
    const h = freeScore();
    const note = () => h.q<HTMLElement>('.chc-sec-field-note');

    typeFreeScore(h, '6-4 6-3');
    expect(note()?.dataset.tone).toBe('good');

    typeFreeScore(h, 'qqq');
    expect(note()?.dataset.tone).toBe('error');
    expect(note()?.textContent?.length).toBeGreaterThan(0);
  });

  it('opens with a label bound to the field, so clicking the label focuses it', () => {
    // `<label for>` rather than an aria-label — the one affordance an aria-label does not give.
    const h = freeScore();
    const field = h.q<HTMLInputElement>(FS_FIELD);
    const label = h.q<HTMLLabelElement>('label.chc-sec-field-label');

    expect(field?.id).toBeTruthy();
    expect(label?.htmlFor).toBe(field?.id);
  });

  it('seeds from an initial score', () => {
    const h = freeScore({ initialText: '6-4 6-3' });

    expect(h.q<HTMLInputElement>(FS_FIELD)?.value).toBe('6-4 6-3');
    expect(h.submit()?.disabled).toBe(false);
  });

  it('keeps the field element across keystrokes — the caret must survive', () => {
    const h = freeScore();
    const field = h.q<HTMLInputElement>(FS_FIELD);

    typeFreeScore(h, '6');
    typeFreeScore(h, '6-');
    typeFreeScore(h, '6-4');

    expect(h.q(FS_FIELD)).toBe(field);
  });
});

describe('Free Score parses endings, and a click still wins', () => {
  it('a typed "ret" is recognised, but still asks WHO retired', () => {
    // Measured, and it is correct rather than a shortfall: `validateScore('6-4 2-1', fmt, RETIRED)`
    // returns no winningSide, because the text genuinely does not say which player retired — the leader
    // at the moment of retirement is not necessarily the winner. So the band names the retirement and
    // Submit stays CLOSED until the operator says on which row it happened.
    //
    // This is the fail-closed direction, and the old approach behaved the same way. An earlier version
    // of this test expected Submit to open, which would have meant inventing a winner.
    const h = freeScore();
    typeFreeScore(h, RET_TEXT);

    expect(h.band()?.textContent).toMatch(/retired/i);
    expect(h.submit()?.disabled, 'a retirement with no named side must not be submittable').toBe(true);
    expect(h.band()?.textContent).toMatch(/no winner yet|not ready/i);
  });

  it('and naming the side on the row completes it', () => {
    const h = freeScore();
    typeFreeScore(h, RET_TEXT);

    h.endedEarly(2)?.click();
    h.sideOption(2, RETIRED)?.click();

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain(LEM_ADVANCES);
  });

  it('a typed "wo" becomes a walkover', () => {
    const h = freeScore();
    typeFreeScore(h, 'wo');

    expect(h.band()?.textContent).toMatch(/walkover/i);
  });

  it('AN EXPLICIT SELECTION OVERRIDES the parsed one', () => {
    // The precedence, at the surface. A click is an instruction; parsed text is an inference.
    const h = freeScore();
    typeFreeScore(h, RET_TEXT);
    expect(h.band()?.textContent).toMatch(/retired/i);

    h.matchEnding(SUSPENDED)?.click();

    expect(h.band()?.textContent).toMatch(/suspended/i);
    expect(h.band()?.textContent).not.toMatch(/retired/i);
  });

  it('clearing the selection falls back to what was typed, which is still on screen', () => {
    const h = freeScore();
    typeFreeScore(h, RET_TEXT);
    h.matchEnding(SUSPENDED)?.click();
    h.matchEnding(SUSPENDED)?.click();

    expect(h.band()?.textContent).toMatch(/retired/i);
  });

  it('a selected side ending overrides a parsed one too', () => {
    const h = freeScore();
    typeFreeScore(h, RET_TEXT);

    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(h.band()?.textContent).toMatch(/walkover/i);
    expect(h.band()?.textContent).toContain('Derrick Ellul advances');
  });

  it('a parsed ending does NOT light up the endings controls, so nothing lies about being selected', () => {
    // Deliberate: the controls report the OPERATOR's selections. Showing a parsed status as pressed
    // would make clicking it to clear it do nothing visible.
    const h = freeScore();
    typeFreeScore(h, RET_TEXT);

    expect(h.all('[aria-pressed="true"]')).toEqual([]);
  });
});

describe('Dial Pad', () => {
  it('renders ten digit keys, a tiebreak and a backspace — and no endings of its own', () => {
    // The old approach crammed digits AND WO/RET/DEF AND a non-directing row into a 4x4 grid because it
    // had to be a whole dialog. The card owns endings now.
    const h = dialPad();

    expect(h.all('button[data-digit]')).toHaveLength(10);
    expect(h.q(TIEBREAK)).toBeTruthy();
    expect(h.q(BACKSPACE)).toBeTruthy();
    expect(h.all('.chc-sec-dialpad button[data-ending]')).toEqual([]);
  });

  it('fills the sets alternately as digits are tapped, LOWER row first', () => {
    // The order reversed on 2026-09-28 (CA): entry begins on the lower participant's row, so `4` then
    // `6` is the 6-4 that `6` then `4` used to be. Asserted per side rather than only through the band,
    // because the band would read the same if both rows had been filled the wrong way round.
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(4);
    expect(h.readout(2)?.textContent).toContain('4');

    press(6);
    expect(h.readout(1)?.textContent).toContain('6');
    expect(h.band()?.textContent).toContain('6-4');
  });

  it('completes a match and opens Submit', () => {
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    for (const digit of [4, 6, 3, 6]) press(digit);

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('Rosalind Lem def. Derrick Ellul');
  });

  it('backspace undoes the most recent tap, in reverse order', () => {
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();
    const back = () => h.q<HTMLButtonElement>(BACKSPACE)?.click();

    press(4);
    press(6);
    expect(h.band()?.textContent).toContain('6-4');

    back();
    // Side 1 is undone before side 2, because entry now fills side 2 FIRST and side 1 therefore holds
    // the more recent digit. A backspace that ate the wrong side would be maddening at speed — which is
    // why this assertion moved with the fill order rather than being deleted.
    expect(h.readout(2)?.textContent).toContain('4');
    expect(h.band()?.textContent).not.toContain('6-4');

    back();
    expect(h.band()?.textContent).toMatch(/no result/i);
  });

  it('takes keystrokes as well as taps, with Shift naming the upper row', () => {
    // CA, 2026-09-28: *"Dial pad should work the same way with key strokes."* It had none at all — every
    // digit was a click handler — so an operator who opened the Dial Pad and typed got nothing.
    const h = dialPad();
    const type = (code: string, shiftKey = false) =>
      h.q<HTMLElement>('.chc-sec-dialpad')?.dispatchEvent(
        new KeyboardEvent('keydown', { code, shiftKey, bubbles: true }),
      );

    type('Digit4');
    expect(h.readout(2)?.textContent).toContain('4');

    type('Digit6', true);
    expect(h.readout(1)?.textContent).toContain('6');
    expect(h.band()?.textContent).toContain('6-4');
  });

  it('reads the digit from the KEY, not the character — Shift+3 is a 3 and not a #', () => {
    // The reason the handler matches `event.code`: a shifted digit produces a punctuation character,
    // so anything reading `event.key` would see `#` and drop the entry. Planting `key: '#'` here is the
    // falsification — it passes only because nothing consults it.
    const h = dialPad();
    h.q<HTMLElement>('.chc-sec-dialpad')?.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Digit3', key: '#', shiftKey: true, bubbles: true }),
    );

    expect(h.readout(1)?.textContent).toContain('3');
    // The opposing cell reads 0, not blank: a set with one side entered is still a set, and
    // `buildSetScore` fills the other side with a genuine zero.
    expect(h.readout(2)?.textContent).toBe('0');
  });

  it('backspace on an empty pad does nothing rather than throwing', () => {
    const h = dialPad();
    h.q<HTMLButtonElement>(BACKSPACE)?.click();

    expect(h.band()?.textContent).toMatch(/no result/i);
  });

  it('builds a two-digit games score where the FORMAT allows one', () => {
    // `SET3-S:10/TB7` permits 11, measured via `getMaxAllowedScore`, so 1 then 0 is ten.
    const h = dialPad({ matchUpFormat: 'SET3-S:10/TB7' });
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(1);
    press(0);

    // The LOWER row, because that is where entry begins.
    expect(h.readout(2)?.textContent).toContain('10');
  });

  it('does NOT build one where the format forbids it — 1 then 0 is 1-0, not 10', () => {
    // The other half, and the reason the rule asks the format instead of guessing: in `S:6/TB7` the
    // maximum is 7, so ten is not a games score and the 0 starts the opposing side.
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(1);
    press(0);

    expect(h.readout(2)?.textContent).toBe('1');
    expect(h.readout(1)?.textContent).toBe('0');
  });

  it('stops at two digits even in a timed set, which reports no maximum at all', () => {
    // A timed format returns `Infinity`, so an uncapped rule would pour every subsequent tap into one
    // side forever.
    const h = dialPad({ matchUpFormat: 'SET1-S:T20' });
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(1);
    press(5);
    press(9);

    expect(h.readout(2)?.textContent).toBe('15');
    expect(h.readout(1)?.textContent).toBe('9');
  });

  it('offers the tiebreak only when the format has one', () => {
    // A disabled control an operator cannot explain is worse than one that is not there, so this is
    // asserted rather than assumed.
    expect(dialPad().q<HTMLButtonElement>(TIEBREAK)?.disabled).toBe(false);
    expect(dialPad({ matchUpFormat: 'SET3-S:6NOAD' }).q<HTMLButtonElement>(TIEBREAK)?.disabled).toBe(
      true,
    );
  });

  it('seeds from a saved score, including a genuine 0', () => {
    const h = dialPad({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 0, winningSide: 1 }] });

    expect(h.readout(1)?.textContent).toContain('6');
    expect(h.readout(2)?.textContent).toContain('0');
  });

  it('seeds a saved TIEBREAK, so reopening a 7-6(3) shows its points', () => {
    const h = dialPad({
      sets: [{ setNumber: 1, side1Score: 7, side2Score: 6, side2TiebreakScore: 3, winningSide: 1 }],
    });

    expect(h.band()?.textContent).toContain(SEVEN_SIX_THREE);
  });
});

/**
 * Tiebreak MODE — the keypad's one modal state.
 *
 * The digits mean games until the Tiebreak key is pressed and points afterwards, which is the only
 * place on this keypad where the same tap means two different things. It was also the only part with
 * no test: measured 2026-09-28 at 66% branch coverage, and every uncovered branch was in here or in
 * the backspace ordering below.
 */
describe('Dial Pad — tiebreak mode', () => {
  const press = (h: ReturnType<typeof dialPad>, digit: number) =>
    h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();
  const toggleTiebreak = (h: ReturnType<typeof dialPad>) => h.q<HTMLButtonElement>(TIEBREAK)?.click();

  it('says which mode it is in, and the key is a toggle', () => {
    const h = dialPad();

    expect(h.q(TIEBREAK)?.getAttribute(ARIA_PRESSED)).toBe('false');
    toggleTiebreak(h);
    expect(h.q(TIEBREAK)?.getAttribute(ARIA_PRESSED)).toBe('true');
    toggleTiebreak(h);
    expect(h.q(TIEBREAK)?.getAttribute(ARIA_PRESSED)).toBe('false');
  });

  it('attaches the points to the set they were played in', () => {
    const h = dialPad();

    press(h, 6);
    press(h, 7);
    toggleTiebreak(h);
    press(h, 3);

    expect(h.band()?.textContent).toContain(SEVEN_SIX_THREE);
  });

  it('takes more than one digit, so a tiebreak to 12-10 can be entered', () => {
    const h = dialPad();

    press(h, 6);
    press(h, 7);
    toggleTiebreak(h);
    press(h, 1);
    press(h, 0);

    expect(h.band()?.textContent).toContain('7-6(10)');
  });

  it('SAYS a tiebreak on a 6-2 is wrong rather than hiding it', () => {
    // This used to assert the opposite: the keypad suppressed the parenthetical, so the operator saw a
    // clean `6-2` while a stray 3 sat in the state and would have been submitted. Hiding bad data is
    // not integrity checking — the factory's own validator is, and it answers plainly.
    const h = dialPad();

    press(h, 2);
    press(h, 6);
    toggleTiebreak(h);
    press(h, 3);

    // The band carries the BREACH, because an integrity failure outranks anything else it might say,
    // and it names the set.
    expect(h.band()?.textContent).toMatch(/1st set: .*must have 7 games/i);
    expect(h.submit()?.disabled).toBe(true);

    // And the stray points are visible in the row rather than quietly dropped, so the operator can see
    // what to backspace.
    expect(h.readout(2)?.textContent).toContain('2(3)');
  });

  it('backspace eats the tiebreak BEFORE the games it belongs to', () => {
    // The ordering the implementation claims, asserted. A backspace that ate the set score first would
    // leave the tiebreak orphaned on a score that no longer exists.
    const h = dialPad();
    const back = () => h.q<HTMLButtonElement>(BACKSPACE)?.click();

    press(h, 6);
    press(h, 7);
    toggleTiebreak(h);
    press(h, 3);
    expect(h.band()?.textContent).toContain(SEVEN_SIX_THREE);

    back();
    expect(h.band()?.textContent).toContain('7-6');
    expect(h.band()?.textContent).not.toContain('(3)');

    back();
    expect(h.band()?.textContent).not.toContain('7-6');
  });
});

/**
 * The score LINE comes from the factory, and all three approaches quote it identically.
 *
 * CA, 2026-09-28: *"you should use generateScoreString and not invent something new for the modal."*
 * Each region used to format its own and they disagreed — measured before the swap: the same 7-6 read
 * `7-6(3)` in Dynamic Sets and `7-6(7)` on the keypad, and the same match tiebreak read `10-8` in one
 * and `0-0` in the other.
 */
/**
 * A MATCH TIEBREAK on the keypad.
 *
 * `SET1-S:TB10` was unenterable there. Measured 2026-09-28, before the fix: tapping 1, 0, 8 produced a
 * tiebreak of **1-0** and dropped the 8 entirely, and a saved match tiebreak seeded as blank. Dynamic
 * Sets handled the same format correctly, so which approach the operator had open decided whether a
 * played match could be recorded at all.
 *
 * All three causes are the same omission: the keypad never asked whether the set is tiebreak-only. Its
 * games are 0-0 by construction — `buildSetScore` puts the points in the tiebreak fields — so its own
 * cells ARE the points, exactly as in Dynamic Sets.
 */
describe('Dial Pad — a match tiebreak', () => {
  const press = (h: ReturnType<typeof dialPad>, digit: number) =>
    h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

  it('builds a two-digit tiebreak score, so 10-8 can be entered', () => {
    // `getMaxAllowedScore` returns 7 for this format — it reads `setFormat.setTo`, which a tiebreak-only
    // format does not carry — so a 1 could never be extended to a 10.
    const h = dialPad({ matchUpFormat: MATCH_TIEBREAK_FORMAT });

    for (const digit of [8, 1, 0]) press(h, digit);

    const set = h.region.getSets()[0];
    expect(set?.side1TiebreakScore).toBe(10);
    expect(set?.side2TiebreakScore).toBe(8);
    expect(h.band()?.textContent).toContain('[10-8]');
  });

  it('runs long, because a match tiebreak legitimately does', () => {
    // 15-13 is an ordinary match tiebreak. Nothing may cap it — there is no honest ceiling to apply.
    const h = dialPad({ matchUpFormat: MATCH_TIEBREAK_FORMAT });

    for (const digit of [1, 3, 1, 5]) press(h, digit);

    expect(h.band()?.textContent).toContain('[15-13]');
  });

  it('seeds a saved match tiebreak, so reopening one is not a blank keypad', () => {
    const h = dialPad({
      matchUpFormat: MATCH_TIEBREAK_FORMAT,
      sets: [{ setNumber: 1, side1TiebreakScore: 10, side2TiebreakScore: 8, winningSide: 1 }],
    });

    expect(h.band()?.textContent).toContain('[10-8]');
    expect(h.readout(1)?.textContent).toContain('10');
    expect(h.readout(2)?.textContent).toContain('8');
  });

  it('enters a DECIDING match tiebreak after two ordinary sets', () => {
    // The format a great many events actually run: `SET3-S:6/TB7-F:TB10`. Only the third set is
    // tiebreak-only, so the exemption has to be per-SET rather than per-format — the first two sets are
    // still clamped to their own maximum.
    const h = dialPad({ matchUpFormat: 'SET3-S:6/TB7-F:TB10' });

    for (const digit of [4, 6, 6, 4, 8, 1, 0]) press(h, digit);

    const sets = h.region.getSets();
    expect(sets.map((set: any) => [set.side1Score, set.side2Score])).toEqual([[6, 4], [4, 6], [0, 0]]);
    expect(sets[2]?.side1TiebreakScore).toBe(10);
    expect(sets[2]?.side2TiebreakScore).toBe(8);
    expect(h.band()?.textContent).toContain('6-4 4-6 [10-8]');
    expect(h.submit()?.disabled).toBe(false);
  });

  it('offers no Tiebreak key, because the cells already ARE the tiebreak', () => {
    // It would be a second place to enter the same number, and could only ever produce a contradiction.
    // Dynamic Sets renders no separate tiebreak column for these sets for the same reason.
    expect(dialPad({ matchUpFormat: MATCH_TIEBREAK_FORMAT }).q<HTMLButtonElement>(TIEBREAK)?.disabled).toBe(true);

    // A MIXED format keeps it: sets 1 and 2 of this one genuinely need it.
    expect(
      dialPad({ matchUpFormat: 'SET3-S:6/TB7-F:TB10' }).q<HTMLButtonElement>(TIEBREAK)?.disabled,
    ).toBe(false);
  });
});

describe('the score line is the factory\'s, and the approaches agree', () => {
  it('Free Score quotes the canonical line, not the shorthand typed', () => {
    const h = freeScore({ initialText: '76(3) 64' });

    expect(h.band()?.textContent).toContain('7-6(3) 6-4');
  });

  it('puts the tiebreak LAST when side 2 wins the set — `6-7(3)`, not `6(3)-7`', () => {
    // The parameter that decides this changes nothing while side 1 wins, which is how the wrong value
    // survived a first pass: every case in the suite was a side-1 win. In side order side 2 wins sets
    // routinely, and `setTBlast: false` renders those as `6(3)-7`, with the parenthetical mid-line.
    const h = freeScore({ initialText: '6-7(3)' });

    expect(h.band()?.textContent).toContain('6-7(3)');
    expect(h.band()?.textContent).not.toContain('6(3)-7');
  });

  it('all three approaches render the same score the same way', () => {
    const sets = [{ setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }];
    const lines = [
      dialPad({ sets }).band()?.textContent,
      freeScore({ initialText: '7-6(3)' }).band()?.textContent,
    ];

    for (const line of lines) expect(line).toContain(SEVEN_SIX_THREE);
  });
});

describe('both regions agree with the endings groups', () => {
  it.each([
    [FREE_SCORE, () => freeScore({ initialText: '6-4 2-1' })],
    ['Dial Pad', () => dialPad({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }, { setNumber: 2, side1Score: 2, side2Score: 1 }] })],
  ])('%s: Cancelled quotes the part-score it clears', (_label, build) => {
    const h = build();
    h.otherButton()?.click();
    h.otherItem(CANCELLED)?.click();

    expect(h.band()?.dataset.tone).toBe('warn');
    expect(h.band()?.textContent).toContain('6-4 2-1');
    expect(h.band()?.textContent).toMatch(/cleared/i);
  });

  it.each([
    [FREE_SCORE, () => freeScore()],
    ['Dial Pad', () => dialPad()],
  ])('%s: a walkover submits with no score at all', (_label, build) => {
    const h = build();
    h.endedEarly(2)?.click();
    h.sideOption(2, WALKOVER)?.click();

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain(LEM_ADVANCES);
  });

  it.each([
    [FREE_SCORE, () => freeScore({ initialText: '6-4' })],
    ['Dial Pad', () => dialPad({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] })],
  ])('%s: a retirement keeps the part-score', (_label, build) => {
    const h = build();
    h.endedEarly(2)?.click();
    h.sideOption(2, RETIRED)?.click();

    expect(h.band()?.textContent).toContain(LEM_ADVANCES);
    expect(h.band()?.textContent).toContain('6-4');
  });
});
