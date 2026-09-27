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
import { createFreeScoreRegion } from '../regions/freeScoreRegion';
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { createDialPadRegion } from '../regions/dialPadRegion';
import { renderScoreEntryCard } from '../scoreEntryCard';
import { describe, it, expect, beforeEach } from 'vitest';

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

  it('fills the sets alternately as digits are tapped', () => {
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(6);
    expect(h.readout(1)?.textContent).toContain('6');

    press(4);
    expect(h.readout(2)?.textContent).toContain('4');
    expect(h.band()?.textContent).toContain('6-4');
  });

  it('completes a match and opens Submit', () => {
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    for (const digit of [6, 4, 6, 3]) press(digit);

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('Rosalind Lem def. Derrick Ellul');
  });

  it('backspace undoes the most recent tap, in reverse order', () => {
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();
    const back = () => h.q<HTMLButtonElement>(BACKSPACE)?.click();

    press(6);
    press(4);
    expect(h.band()?.textContent).toContain('6-4');

    back();
    // Side 2 is undone before side 1 — a backspace that ate the wrong side would be maddening at speed.
    expect(h.readout(1)?.textContent).toContain('6');
    expect(h.band()?.textContent).not.toContain('6-4');

    back();
    expect(h.band()?.textContent).toMatch(/no result/i);
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

    expect(h.readout(1)?.textContent).toContain('10');
  });

  it('does NOT build one where the format forbids it — 1 then 0 is 1-0, not 10', () => {
    // The other half, and the reason the rule asks the format instead of guessing: in `S:6/TB7` the
    // maximum is 7, so ten is not a games score and the 0 starts the opposing side.
    const h = dialPad();
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(1);
    press(0);

    expect(h.readout(1)?.textContent).toBe('1');
    expect(h.readout(2)?.textContent).toBe('0');
  });

  it('stops at two digits even in a timed set, which reports no maximum at all', () => {
    // A timed format returns `Infinity`, so an uncapped rule would pour every subsequent tap into one
    // side forever.
    const h = dialPad({ matchUpFormat: 'SET1-S:T20' });
    const press = (digit: number) => h.q<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    press(1);
    press(5);
    press(9);

    expect(h.readout(1)?.textContent).toBe('15');
    expect(h.readout(2)?.textContent).toBe('9');
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
