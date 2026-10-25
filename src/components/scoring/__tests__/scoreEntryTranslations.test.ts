/**
 * @vitest-environment happy-dom
 *
 * Every word the score entry dialog shows can be translated.
 *
 * CA, 2026-10-25: the dialog replaced three scoring modals that were translated, and it shipped with its
 * buttons, headings and messages in English only. This opens the dialog with EVERY key of
 * `SCORE_ENTRY_TEXT` (and every status name) replaced by a marker, walks it through the states an
 * operator sees, and fails if any of the English defaults is still on screen — in text, a `title` or an
 * `aria-label`. A string added to the dialog without a key fails here the first time it renders in
 * one of these states.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { SCORE_ENTRY_TEXT, scoreEntryText } from '../logic/scoreEntryText';
import { describe, it, expect, afterEach } from 'vitest';
import { endingLabels } from '../logic/irregularEnding';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

import type { StatusCodeGroups } from '../logic/statusCodes';

const { POLICY_TYPE_SCORING } = policyConstants;
const { RETIRED } = matchUpStatusConstants;

const GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];
const MODAL = 'section[id^="cmdl-"]';
const FORMAT = 'SET3-S:6/TB7';
const SET_1_SIDE_1 = 'input[data-side="1"][data-set="1"]';
const SET_1_SIDE_2 = 'input[data-side="2"][data-set="1"]';
const FREE_SCORE_INPUT = '.chc-sec-score-region input';
const CLEAR = 'button[data-action="clear"]';
const BOTH_OUT = 'input[data-action="bothSidesOut"]';

/**
 * `⟦7 {{a}} {{b}}⟧`: a numbered marker that keeps the key's placeholders, so filling them is exercised
 * too. Numbered rather than named: a key's name holds English (`gamesAria`), and the check would find it.
 */
function marker(index: number, template: string): string {
  const placeholders = [...template.matchAll(/{{\s*\w+\s*}}/g)].map((match) => match[0]);
  return `⟦${[index, ...placeholders].join(' ')}⟧`;
}

const LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(SCORE_ENTRY_TEXT).map(([key, template], index) => [key, marker(index, template)])
  ),
  ...Object.fromEntries(Object.keys(endingLabels()).map((status, index) => [status, `⟦S${index}⟧`]))
};

/** The English that must not survive: each default's literal parts, long enough to mean something. */
const ENGLISH = [
  ...new Set(
    [...Object.values(SCORE_ENTRY_TEXT), ...Object.values(endingLabels())]
      .flatMap((template) => template.split(/{{\s*\w+\s*}}/))
      .map((part) => part.trim())
      .filter((part) => part.length >= 4 && /[a-z]{3}/i.test(part))
  )
];

const modal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].at(-1)!;
const find = <T extends HTMLElement>(selector: string) => modal().querySelector<T>(selector)!;
const click = (selector: string) => find<HTMLElement>(selector).click();
function type(selector: string, value: string): void {
  const field = find<HTMLInputElement>(selector);
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Everything a person or a screen reader gets: text, and every `title` and `aria-label`. */
function shown(): string {
  const root = modal();
  const attributes = [...root.querySelectorAll<HTMLElement>('[title], [aria-label]')].flatMap((element) => [
    element.title,
    element.getAttribute('aria-label') ?? ''
  ]);
  return [root.textContent ?? '', ...attributes].join('\n');
}

/** Every screen the walk-through below looked at, so the last test can ask which keys never rendered. */
const SEEN: string[] = [];

function expectTranslated(where: string): void {
  const text = shown();
  SEEN.push(text);
  const leftovers = ENGLISH.filter((english) => text.includes(english));
  expect(leftovers, `English left in ${where}`).toEqual([]);
  expect(text, `an unfilled placeholder in ${where}`).not.toMatch(/{{\s*\w+\s*}}/);
}

afterEach(() => {
  for (let attempt = 0; attempt < 5 && document.querySelector(MODAL); attempt += 1) cModal.close();
});

describe('scoreEntryText', () => {
  it('fills placeholders, and falls back to English for a key the host left out', () => {
    expect(
      scoreEntryText({ sidePanelHead: 'Que s’est-il passé pour {{name}} ?' }, 'sidePanelHead', { name: 'Ann' })
    ).toBe('Que s’est-il passé pour Ann ?');
    expect(scoreEntryText({}, 'sidePanelHead', { name: 'Ann' })).toBe('What happened to Ann?');
    expect(scoreEntryText(undefined, 'submit')).toBe('Submit');
  });

  it('leaves a placeholder with no value as written, so a missing variable is visible', () => {
    expect(scoreEntryText({}, 'sidePanelHead')).toBe('What happened to {{name}}?');
  });

  it('control: the check below can see English — the defaults are on screen without labels', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: GROUPS });
    const text = shown();
    expect(ENGLISH.filter((english) => text.includes(english)).length).toBeGreaterThan(5);
  });
});

describe('the dialog with every key translated', () => {
  it('Dynamic Sets: blank, a part-score, the ended-early panel with reasons, a retirement', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: GROUPS, labels: LABELS });
    expectTranslated('the blank card');

    type(SET_1_SIDE_1, '3');
    type(SET_1_SIDE_2, '2');
    expectTranslated('a part-score');

    click('button[data-action="endedEarly"][data-side="2"]');
    expectTranslated('the ended-early panel');

    click(`[data-panel-side="2"] button[data-ending="${RETIRED}"]`);
    expect(modal().querySelectorAll('.chc-sec-reasons button[data-reason]').length).toBeGreaterThan(0);
    expectTranslated('a retirement with its reasons');

    click('button[data-action="other"]');
    expectTranslated('the Other menu');
  });

  it('Dynamic Sets: a completed set folds to its readout, and a finished match names the winner', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, labels: LABELS });
    type(SET_1_SIDE_1, '7');
    type(SET_1_SIDE_2, '6');
    // 7-6 opens the set's tiebreak; the loser's points are what the operator is asked for
    type('input[data-tiebreak-side="2"][data-tiebreak-set="1"]', '4');
    expectTranslated('a tiebreak being entered');
    type('input[data-side="1"][data-set="2"]', '6');
    type('input[data-side="2"][data-set="2"]', '3');
    expectTranslated('a finished match');
  });

  it('Free Score and Dial Pad, through the approach menu', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, labels: LABELS, approach: 'freeScore' });
    expectTranslated('Free Score, blank');
    type(FREE_SCORE_INPUT, '6-4 3');
    expectTranslated('Free Score, part-typed');
    type(FREE_SCORE_INPUT, '6-4 6-3');
    expectTranslated('Free Score, finished');
    type(FREE_SCORE_INPUT, 'qqq');
    expectTranslated('Free Score, not a score');

    click('button[data-action="switchApproach"]');
    expectTranslated('the approach menu');
    click('button[data-approach="dialPad"]');
    expectTranslated('Dial Pad');
  });

  it('a recorded result being cleared, and one that cannot be', () => {
    const recorded = {
      matchUpFormat: FORMAT,
      winningSide: 1,
      score: {
        sets: [
          { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
          { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
        ]
      }
    };
    openScoreEntryDialog({ sides: SIDES, matchUp: recorded, labels: LABELS });
    click(CLEAR);
    expectTranslated('a cleared result');
    cModal.close();

    openScoreEntryDialog({ sides: SIDES, matchUp: recorded, labels: LABELS, clearable: false });
    click(CLEAR);
    expectTranslated('a clear the host refuses');
  });

  it('a walkover and a double walkover; a default and a double default', () => {
    for (const ending of ['WALKOVER', 'DEFAULTED']) {
      openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, labels: LABELS });
      click('button[data-action="endedEarly"][data-side="1"]');
      click(`[data-panel-side="1"] button[data-ending="${ending}"]`);
      expectTranslated(`a single ${ending}`);
      // A click toggles the box AND fires `change`; dispatching `change` as well would toggle it back.
      find<HTMLInputElement>(BOTH_OUT).click();
      expectTranslated(`a double ${ending}, whose warning is assembled from three keys`);
      cModal.close();
    }
  });

  it('a match-level ending: one that clears the part-score, and one that keeps it', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, labels: LABELS });
    type(SET_1_SIDE_1, '3');
    type(SET_1_SIDE_2, '2');
    click('button[data-action="other"]');
    click('.chc-sec-other-menu button[data-ending="CANCELLED"]');
    expectTranslated('a cancellation that clears the part-score, named on its Other chip');
    cModal.close();

    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, labels: LABELS });
    type(SET_1_SIDE_1, '3');
    type(SET_1_SIDE_2, '2');
    click('.chc-sec-endings button[data-ending="SUSPENDED"]');
    expectTranslated('a suspension that keeps the part-score');
  });

  it('a set that is not finished before the next one', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, labels: LABELS, approach: 'freeScore' });
    type(FREE_SCORE_INPUT, '3-2 6-4');
    expectTranslated('an unfinished first set');
  });
});

/**
 * Keys no state above can reach, each for a reason. Anything NOT listed must have rendered, so a new key
 * that no walk-through reaches is a decision, not an accident.
 */
const UNREACHED: Record<string, string> = {
  advancesTo: 'the card never passes `advancesTo` to the band',
  noWinnerYet: 'unreachable by design: an ending that names a winner is always chosen on a side',
  notReadyToSubmit: 'the detail of `noWinnerYet`',
  tiebreakContradiction: 'needs both tiebreak scores, and the Dynamic Sets cell takes only the loser’s points',
  sideFallback: 'only for a host that passes no participant names',
  setHasNoScore: 'needs an empty set before an entered one, which no region lets an operator type'
};

describe('coverage of the walk-through', () => {
  it('rendered every key except the ones listed as unreachable, and nothing listed has started rendering', () => {
    const all = SEEN.join('\n');
    const rendered = (index: number) => all.includes(`⟦${index}`);
    const keys = Object.keys(SCORE_ENTRY_TEXT);
    const missing = keys.filter((key, index) => !rendered(index) && !(key in UNREACHED));
    const nowReached = keys.filter((key, index) => rendered(index) && key in UNREACHED);
    expect(missing, 'keys no state rendered').toEqual([]);
    expect(nowReached, 'listed as unreachable but rendered — take them off the list').toEqual([]);
  });
});
