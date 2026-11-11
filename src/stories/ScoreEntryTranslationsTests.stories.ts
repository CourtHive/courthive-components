/**
 * Every word the score entry dialog shows can be translated.
 *
 * CA, 2026-10-25: the dialog replaced three scoring modals that were translated, and it shipped with its
 * buttons, headings and messages in English only. This opens the dialog with EVERY key of
 * `SCORE_ENTRY_TEXT` (and every status name) replaced by a marker, walks it through the states an
 * operator sees, and fails if any of the English defaults is still on screen — in text, a `title` or an
 * `aria-label`. A string added to the dialog without a key fails here the first time it renders in one
 * of these states.
 *
 * ONE play, in steps, because the last step asks which keys no earlier step rendered: the walk-through
 * and its coverage check share the record of every screen seen, and splitting them would make the check
 * depend on test order. `scoreEntryText` itself is a node test (`__tests__/scoreEntryTranslations.test.ts`).
 */
import { SCORE_ENTRY_TEXT } from '../components/scoring/logic/scoreEntryText';
import { endingLabels } from '../components/scoring/logic/irregularEnding';
import { fixtures, policyConstants } from 'tods-competition-factory';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';
import {
  closeAllModals,
  dialogLauncher,
  inModal,
  launchers,
  openFrom,
  topModal
} from './helpers/scoreEntryDialogLauncher';

import type { ScoreEntryDialogParams } from '../components/scoring/scoreEntryDialog';
import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Translations',
  tags: ['!dev']
};
export default meta;

const { POLICY_TYPE_SCORING } = policyConstants;
const GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];
const FORMAT = 'SET3-S:6/TB7';
const FREE_SCORE_INPUT = '.chc-sec-score-region input';
const CLEAR = 'button[data-action="clear"]';
const OTHER = 'button[data-action="other"]';
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

/**
 * Keys no state below can reach, each for a reason. Anything NOT listed must have rendered, so a new key
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

const RECORDED = {
  matchUpFormat: FORMAT,
  winningSide: 1,
  score: {
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
      { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
    ]
  }
};
const OVERTIME_SETS = [
  [1, 0],
  [0, 1],
  [0, 0],
  [0, 0]
].map(([side1Score, side2Score], index) => ({ setNumber: index + 1, side1Score, side2Score }));

const CONFIGS: Record<string, ScoreEntryDialogParams> = {
  control: { sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: GROUPS },
  reasons: { sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: GROUPS, labels: LABELS },
  plain: { sides: SIDES, matchUpFormat: FORMAT, labels: LABELS },
  free: { sides: SIDES, matchUpFormat: FORMAT, labels: LABELS, approach: 'freeScore' },
  recorded: { sides: SIDES, matchUp: RECORDED, labels: LABELS },
  refused: { sides: SIDES, matchUp: RECORDED, labels: LABELS, clearable: false },
  overtime: { sides: SIDES, matchUpFormat: 'HAL2XA-S:T45P-O:2X/T15P-F:SO5', sets: OVERTIME_SETS, labels: LABELS }
};

/** Everything a person or a screen reader gets: text, and every `title` and `aria-label`. */
function shown(): string {
  const root = topModal()!;
  const attributes = [...root.querySelectorAll<HTMLElement>('[title], [aria-label]')].flatMap((element) => [
    element.title,
    element.getAttribute('aria-label') ?? ''
  ]);
  return [root.textContent ?? '', ...attributes].join('\n');
}

/** A set cell, reopening its set first when it has folded to its result — the way an operator gets back in. */
async function fill(side: number, set: number, value: string): Promise<void> {
  const input = inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
  if (!input.checkVisibility()) await user.click(inModal(`button[data-done-side="${side}"][data-done-set="${set}"]`));
  await user.fill(input.isConnected ? input : inModal(`input[data-side="${side}"][data-set="${set}"]`), value);
}

export const EveryKeyTranslated: StoryObj = {
  render: () =>
    launchers(...Object.keys(CONFIGS).map((key) => dialogLauncher(() => CONFIGS[key], `Open: ${key}`, key))),
  play: async ({ canvasElement, step }) => {
    /** Every screen the walk-through looked at, so the last step can ask which keys never rendered. */
    const seen: string[] = [];
    const expectTranslated = async (where: string) => {
      const text = shown();
      seen.push(text);
      await expect(
        ENGLISH.filter((english) => text.includes(english)),
        `English left in ${where}`
      ).toEqual([]);
      await expect(text, `an unfilled placeholder in ${where}`).not.toMatch(/{{\s*\w+\s*}}/);
    };
    const open = async (key: string) => {
      closeAllModals();
      await openFrom(canvasElement, key);
    };

    try {
      await step('control: the check can see English — the defaults are on screen without labels', async () => {
        await open('control');
        await expect(ENGLISH.filter((english) => shown().includes(english)).length).toBeGreaterThan(5);
      });

      await step('Dynamic Sets: blank, a part-score, the ended-early panel with reasons, a retirement', async () => {
        await open('reasons');
        await expectTranslated('the blank card');
        await fill(1, 1, '3');
        await fill(2, 1, '2');
        await expectTranslated('a part-score');
        await user.click(inModal('button[data-action="endedEarly"][data-side="2"]'));
        await expectTranslated('the ended-early panel');
        await user.click(inModal('[data-panel-side="2"] button[data-ending="RETIRED"]'));
        await expect(topModal()!.querySelectorAll('.chc-sec-reasons button[data-reason]').length).toBeGreaterThan(0);
        await expectTranslated('a retirement with its reasons');
        await user.click(inModal(OTHER));
        await expectTranslated('the Other menu');
      });

      await step('Dynamic Sets: a tiebreak left out, entered, and folded into a finished match', async () => {
        await open('plain');
        await fill(1, 1, '7');
        await fill(2, 1, '6');
        // 7-6 opens the set's tiebreak and the second set beside it: the points are offered, not owed.
        await fill(1, 2, '6');
        await fill(2, 2, '3');
        await expectTranslated('a finished match whose tiebreak points were left out — the band says so');
        await user.fill(inModal('input[data-tiebreak-side="2"][data-tiebreak-set="1"]'), '4');
        await expectTranslated('a tiebreak being entered');
        // Back into the second set: the first set's column folds to its readout, 7-6⁴.
        await fill(2, 2, '3');
        await expectTranslated('a finished match');
      });

      await step('Free Score and Dial Pad, through the approach menu', async () => {
        await open('free');
        await expectTranslated('Free Score, blank');
        const field = () => inModal<HTMLInputElement>(FREE_SCORE_INPUT);
        await user.fill(field(), '6-4 3');
        await expectTranslated('Free Score, part-typed');
        await user.fill(field(), '6-4 6-3');
        await expectTranslated('Free Score, finished');
        await user.fill(field(), 'qqq');
        await expectTranslated('Free Score, not a score');
        await user.click(inModal('button[data-action="switchApproach"]'));
        await expectTranslated('the approach menu');
        await user.click(inModal('button[data-approach="dialPad"]'));
        await expectTranslated('Dial Pad');
      });

      await step('a recorded result being cleared, and one that cannot be', async () => {
        await open('recorded');
        await user.click(inModal(CLEAR));
        await expectTranslated('a cleared result');
        await open('refused');
        await user.click(inModal(CLEAR));
        await expectTranslated('a clear the host refuses');
      });

      for (const ending of ['WALKOVER', 'DEFAULTED']) {
        await step(`a single and a double ${ending}`, async () => {
          await open('plain');
          await user.click(inModal('button[data-action="endedEarly"][data-side="1"]'));
          await user.click(inModal(`[data-panel-side="1"] button[data-ending="${ending}"]`));
          await expectTranslated(`a single ${ending}`);
          await user.click(inModal(BOTH_OUT));
          await expectTranslated(`a double ${ending}, whose warning is assembled from three keys`);
        });
      }

      await step('a side ending chosen from Other…, waiting for its player', async () => {
        await open('plain');
        await user.click(inModal(OTHER));
        await user.click(inModal('.chc-sec-other-menu button[data-side-ending="WALKOVER"]'));
        await expectTranslated('a walkover signposted to the player names');
      });

      await step('a match-level ending: one that clears the part-score, and one that keeps it', async () => {
        await open('plain');
        await fill(1, 1, '3');
        await fill(2, 1, '2');
        await user.click(inModal(OTHER));
        await user.click(inModal('.chc-sec-other-menu button[data-ending="CANCELLED"]'));
        await expectTranslated('a cancellation that clears the part-score, named on its Other chip');

        await open('plain');
        await fill(1, 1, '3');
        await fill(2, 1, '2');
        await user.click(inModal('.chc-sec-endings button[data-ending="SUSPENDED"]'));
        await expectTranslated('a suspension that keeps the part-score');
      });

      await step('an overtime format: its extra periods and its shootout are headed by what they are', async () => {
        await open('overtime');
        await expectTranslated('extra time ended level, the shootout open');
      });

      await step('a set that is not finished before the next one', async () => {
        await open('free');
        await user.fill(inModal(FREE_SCORE_INPUT), '3-2 6-4');
        await expectTranslated('an unfinished first set');
      });

      await step('every key rendered except the ones listed as unreachable', async () => {
        const all = seen.join('\n');
        const rendered = (index: number) => all.includes(`⟦${index}`);
        const keys = Object.keys(SCORE_ENTRY_TEXT);
        await expect(
          keys.filter((key, index) => !rendered(index) && !(key in UNREACHED)),
          'keys no state rendered'
        ).toEqual([]);
        await expect(
          keys.filter((key, index) => rendered(index) && key in UNREACHED),
          'listed as unreachable but rendered — take them off the list'
        ).toEqual([]);
      });
    } finally {
      closeAllModals();
    }
  }
};
