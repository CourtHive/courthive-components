/**
 * The card holds one model, and every region renders it — the parts of that only a browser can show.
 *
 * The transitions and the rules are node tests (`logic/__tests__/scoreEntryModel.test.ts`,
 * `scoreEntryRules.test.ts`). Here: the regions drawing the same store across a switch, the band naming
 * what an ending cleared, Free Score's caret on open and its half-typed text, the no-ad tiebreak column
 * a director reopens, CA's deferred note 10B typed end to end, and the dialog's engine-ready outcome.
 */
import { fixtures, matchUpStatusConstants, policyConstants, tournamentEngine } from 'tods-competition-factory';
import { buildDrawBehind, engineMatchUp, DRAW_BEHIND_FORMAT } from './helpers/scoreEntryEngineHost';
import { createDynamicSetsRegion } from '../components/scoring/regions/dynamicSetsRegion';
import { enteredSets } from '../components/scoring/logic/scoreEntrySelectors';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';
import {
  closeAllModals,
  dialogLauncher,
  inModal,
  inModalOrNull,
  openFrom,
  topModal
} from './helpers/scoreEntryDialogLauncher';

import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { EngineMatchUpRef } from './helpers/scoreEntryEngineHost';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { CANCELLED, COMPLETED, DEAD_RUBBER, TO_BE_PLAYED, WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Card Model',
  tags: ['!dev']
};
export default meta;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];
const SUBMIT = 'button[data-action="submit"]';
const SWITCH = 'button[data-action="switchApproach"]';
const BAND = '.chc-sec-band';
const FREE_FIELD = 'input[data-free-score]';

const cell = (side: number, set: number) => inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

async function switchTo(approach: string): Promise<void> {
  await user.click(inModal(SWITCH));
  await user.click(inModal(`button[data-approach="${approach}"]`));
}

/**
 * Every region renders the card's ONE store: a set typed in Dynamic Sets is Free Score's text and the Dial
 * Pad's readout, by identity in the model. And a score-clearing ending empties the model while the band
 * still names what it took — across a further switch.
 */
export const EveryRegionRendersTheStore: StoryObj = {
  render: () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, approach: 'dynamicSets' })),
  play: async ({ canvasElement, step }) => {
    const launched = await openFrom(canvasElement);
    const card = () => launched.dialog!.card;
    try {
      await step('a typed set reaches every approach, by identity', async () => {
        await user.fill(cell(1, 1), '6');
        await user.fill(cell(2, 1), '4');
        const sets = card().getModel().sets;
        await expect(enteredSets(card().getModel())).toMatchObject([{ side1Score: 6, side2Score: 4 }]);

        await switchTo('freeScore');
        await expect(card().getModel().sets, 'no translation into text and back').toBe(sets);
        await expect(card().store.get()).toBe(card().getModel());
        await expect(inModal<HTMLInputElement>(FREE_FIELD)).toHaveValue('6-4');

        await switchTo('dialPad');
        await expect(card().getModel().sets).toBe(sets);
        await expect(card().store.get()).toBe(card().getModel());
        await expect(inModal('[data-readout-side="1"]')).toHaveTextContent('6');

        await switchTo('dynamicSets');
      });

      await step('Cancelled empties the model, and the band quotes the 6-4 it cleared', async () => {
        await user.click(inModal('.chc-sec-endings button[data-action="other"]'));
        await user.click(inModal(`.chc-sec-other-menu button[data-ending="${CANCELLED}"]`));
        await expect(enteredSets(card().getModel())).toEqual([]);
        await expect(card().getModel().ending.matchEnding).toBe(CANCELLED);
        await expect(inModal(BAND)).toHaveTextContent('6-4');
        await expect(inModal(BAND)).toHaveTextContent(/cleared/i);

        await switchTo('dialPad');
        await expect(enteredSets(card().getModel()), 'and it stays cleared across a switch').toEqual([]);
      });
    } finally {
      closeAllModals();
    }
  }
};

const RECORDED: any = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 2, side2Score: 1 }
];

/**
 * Free Score opens ready to be EXTENDED: focused, with the caret at the end rather than the score selected
 * — CA, 2026-09-30: *"as it is hitting any key deletes the score!"* Then a Dead Rubber clears it, and no
 * approach brings it back.
 */
export const FreeScoreOpensAtTheEnd: StoryObj = {
  render: () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, approach: 'freeScore', sets: RECORDED })),
  play: async ({ canvasElement, step }) => {
    const launched = await openFrom(canvasElement);
    try {
      const field = inModal<HTMLInputElement>(FREE_FIELD);
      await expect(field).toHaveValue('6-4 2-1');
      await waitFor(() => expect(field).toHaveFocus());
      await expect(field.selectionStart).toBe(field.value.length);
      await expect(field.selectionEnd).toBe(field.value.length);

      await step('the next keystroke extends the score rather than replacing it', async () => {
        await user.keyboard(' 6');
        await expect(field).toHaveValue('6-4 2-1 6');
      });

      await step('a Dead Rubber clears it, and neither approach brings it back', async () => {
        await user.click(inModal('.chc-sec-endings button[data-action="other"]'));
        await user.click(inModal(`.chc-sec-other-menu button[data-ending="${DEAD_RUBBER}"]`));
        await expect(inModal<HTMLInputElement>(FREE_FIELD)).toHaveValue('');

        await switchTo('dynamicSets');
        for (const input of topModal()!.querySelectorAll<HTMLInputElement>('input.chc-sec-set-input')) {
          await expect(input).toHaveValue('');
        }
        await switchTo('dialPad');
        const readouts = [...topModal()!.querySelectorAll('[data-readout-side]')];
        await expect(readouts.length, 'the dial pad rendered its readouts').toBeGreaterThan(0);
        await expect(readouts.map((readout) => readout.textContent?.trim()).join('')).toBe('');

        await switchTo('freeScore');
        await user.click(inModal(SUBMIT));
        await expect(launched.submitted.at(-1).matchUpStatus).toBe(DEAD_RUBBER);
        await expect(launched.submitted.at(-1).score).toBeUndefined();
        await expect(launched.submitted.at(-1).sets).toHaveLength(0);
      });
    } finally {
      closeAllModals();
    }
  }
};

/**
 * Free Score keeps the operator's text: a half-typed `6-4 re` stays in the field while the model takes
 * the 6-4, and a typed `wo` — an ending the TEXT reports — leaves the field it was typed into usable.
 */
export const FreeScoreKeepsItsText: StoryObj = {
  render: () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, approach: 'freeScore' })),
  play: async ({ canvasElement }) => {
    const launched = await openFrom(canvasElement);
    try {
      const field = inModal<HTMLInputElement>(FREE_FIELD);
      await user.click(field);
      await user.keyboard('6-4 re');
      await expect(field, "the field is the operator's, mid-word").toHaveValue('6-4 re');
      await expect(enteredSets(launched.dialog!.card.getModel())).toMatchObject([{ side1Score: 6, side2Score: 4 }]);

      await user.fill(field, 'wo');
      await expect(field).toBeEnabled();
      await expect(inModal(BAND)).toHaveTextContent(/walkover/i);
      await user.keyboard('{Backspace}{Backspace}6-4');
      await expect(field).toHaveValue('6-4');
      await expect(inModal(BAND)).not.toHaveTextContent(/walkover/i);
    } finally {
      closeAllModals();
    }
  }
};

/**
 * CA's note 10B typed through the dialog with complements off: 6-2 2-6 6-3, then set 2 corrected to 6-2.
 * The third set goes, the band names the two-set result, and Submit is live. The rule is the model's
 * (`scoreEntryModel.test.ts`); this is the one end-to-end proof that the dialog renders it.
 */
export const StaleThirdSetIsTrimmed: StoryObj = {
  render: () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, approach: 'dynamicSets' })),
  play: async ({ canvasElement }) => {
    await openFrom(canvasElement);
    try {
      await user.click(inModal('button[data-action="smartComplements"]'));
      for (const [set, side1, side2] of [
        [1, '6', '2'],
        [2, '2', '6'],
        [3, '6', '3']
      ] as const) {
        await user.fill(cell(1, set), side1);
        await user.fill(cell(2, set), side2);
      }
      await expect(inModal(BAND)).toHaveTextContent('6-2 2-6 6-3');

      // The finished second set shows its result; clicking it is the way back in (CA, 2026-10-01).
      await user.click(inModal('button[data-done-side="1"][data-done-set="2"]'));
      await user.fill(cell(1, 2), '6');
      await user.fill(cell(2, 2), '2');

      await expect(inModalOrNull('input[data-side="1"][data-set="3"]'), 'no third column').toBeNull();
      await expect(inModal(BAND)).toHaveTextContent('Rosalind Lem def. Derrick Ellul 6-2 6-2');
      await expect(inModal(SUBMIT)).toBeEnabled();
    } finally {
      closeAllModals();
    }
  }
};

/** An inline card over a 7-6 set, for the tiebreak column a director clicks back into. */
function tiebreakCard(matchUpFormat: string): HTMLElement {
  const region: any = createDynamicSetsRegion({
    matchUpFormat,
    sets: [{ setNumber: 1, side1Score: 7, side2Score: 6 }],
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region });
  return card.element;
}

async function reopenedWinnerPoints(canvasElement: HTMLElement): Promise<HTMLInputElement> {
  const loser = canvasElement.querySelector<HTMLInputElement>('input[data-tiebreak-side="2"][data-tiebreak-set="1"]')!;
  await user.fill(loser, '6');
  await user.keyboard('{Enter}');
  // Confirmed entry folds the column away.
  await waitFor(() => expect(canvasElement.querySelector('input[data-tiebreak-set="1"]')).toBeNull());

  // Clicking the folded set reopens it with its tiebreak column, which is what the operator then reads.
  await user.click(canvasElement.querySelector<HTMLButtonElement>('button[data-done-side="1"][data-done-set="1"]')!);
  const winner = canvasElement.querySelector<HTMLInputElement>('input[data-tiebreak-side="1"][data-tiebreak-set="1"]')!;
  await expect(winner).toBeVisible();
  return winner;
}

/** A no-ad tiebreak reopens showing the winner's 7 for a 6 — not 8, which is what the advantage rule gives. */
export const NoAdTiebreakReopens: StoryObj = {
  render: () => tiebreakCard('SET3-S:6/TB7NOAD'),
  play: async ({ canvasElement }) => {
    await expect(await reopenedWinnerPoints(canvasElement)).toHaveValue('7');
  }
};

/** The control: under advantage scoring the same 6 reopens as 8. */
export const AdvantageTiebreakReopens: StoryObj = {
  render: () => tiebreakCard('SET3-S:6/TB7'),
  play: async ({ canvasElement }) => {
    await expect(await reopenedWinnerPoints(canvasElement)).toHaveValue('8');
  }
};

const WALKOVER_INJURY = 'W1';
const FAST4 = 'SET3-S:4/TB7';
let drawRef: EngineMatchUpRef | undefined;

/**
 * The dialog's `outcome` is engine-ready: each case submits through the UI over a real draw and hands
 * `outcome` to `setMatchUpStatus` with nothing added. The mapping itself is pinned in
 * `src/stories/__tests__/scoringStories.test.ts`; this pins that the DIALOG applies it — including the
 * reason codes and a format changed through the chip.
 */
export const DialogReportsEngineOutcome: StoryObj = {
  render: () => {
    drawRef = buildDrawBehind(DRAW_BEHIND_FORMAT);
    const opened = () => {
      const matchUp = engineMatchUp(drawRef!);
      return {
        matchUp,
        sides: matchUp.sides.map((side: any) => ({ participantName: side.participant.participantName })),
        matchUpFormat: matchUp.matchUpFormat,
        statusCodeGroups: REAL_GROUPS,
        approach: 'dialPad' as const,
        onFormatChange: () => undefined,
        // The dialog is inert until the picker reports it has closed.
        openFormatPicker: ({ callback, onClose }: { callback: (format: string) => void; onClose?: () => void }) => {
          callback(FAST4);
          onClose?.();
        }
      };
    };
    return dialogLauncher(opened);
  },
  play: async ({ canvasElement, step }) => {
    const ref = drawRef!;
    const sendAsIs = (launched: any): any =>
      tournamentEngine.setMatchUpStatus({ ...ref, outcome: structuredClone(launched.submitted.at(-1).outcome) });
    const press = async (...digits: number[]) => {
      for (const digit of digits) await user.click(inModal(`button[data-digit="${digit}"]`));
    };
    try {
      await step('a played result: score.sets, the winner, COMPLETED — accepted as is', async () => {
        const launched = await openFrom(canvasElement);
        await press(4, 6, 3, 6);
        await user.click(inModal(SUBMIT));
        const { outcome } = launched.submitted.at(-1);
        await expect(outcome.score.sets).toHaveLength(2);
        await expect(outcome.winningSide).toBe(1);
        await expect(outcome.matchUpStatus).toBe(COMPLETED);
        await expect('matchUpStatusCodes' in outcome, 'no reason chosen: codes are not sent').toBe(false);
        await expect('matchUpFormat' in outcome, 'the format was not changed').toBe(false);
        await expect(sendAsIs(launched).success).toBe(true);
        await expect(engineMatchUp(ref).score.scoreStringSide1).toBe('6-4 6-3');
      });

      await step('a clear: the empty-sets outcome that resets the matchUp', async () => {
        const launched = await openFrom(canvasElement);
        await user.click(inModal('button[data-action="clear"]'));
        await user.click(inModal(SUBMIT));
        await expect(launched.submitted.at(-1).outcome).toEqual({ score: { sets: [] }, matchUpStatusCodes: [] });
        await expect(sendAsIs(launched).success).toBe(true);
        await expect(engineMatchUp(ref).matchUpStatus).toBe(TO_BE_PLAYED);
        await expect(engineMatchUp(ref).winningSide).toBeUndefined();
      });

      await step('a walkover with a reason: positional codes against the exiting side', async () => {
        const launched = await openFrom(canvasElement);
        await user.click(inModal('button[data-action="endedEarly"][data-side="2"]'));
        await user.click(inModal(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`));
        await user.click(inModal(`button[data-reason="${WALKOVER_INJURY}"]`));
        await user.click(inModal(SUBMIT));
        const { outcome } = launched.submitted.at(-1);
        await expect(outcome.matchUpStatus).toBe(WALKOVER);
        await expect(outcome.winningSide).toBe(1);
        await expect(outcome.matchUpStatusCodes).toEqual(['', WALKOVER_INJURY]);
        await expect(outcome.score.sets).toEqual([]);
        await expect(sendAsIs(launched).success).toBe(true);
        await expect(engineMatchUp(ref).matchUpStatus).toBe(WALKOVER);
        await expect(engineMatchUp(ref).sideStatusCodes).toEqual({ 2: WALKOVER_INJURY });
      });

      await step('a format changed through the chip rides to the engine and is persisted', async () => {
        const launched = await openFrom(canvasElement);
        // Back to nothing played, then the chip: the injected picker answers FAST4.
        await user.click(inModal('button[data-action="clear"]'));
        await user.click(inModal('button[data-action="editFormat"]'));
        await expect(inModal('button[data-action="editFormat"]')).toHaveTextContent(FAST4);
        await press(2, 4, 1, 4);
        await user.click(inModal(SUBMIT));
        await expect(launched.submitted.at(-1).outcome.matchUpFormat).toBe(FAST4);
        await expect(sendAsIs(launched).success).toBe(true);
        await expect(engineMatchUp(ref).matchUpFormat).toBe(FAST4);
        await expect(engineMatchUp(ref).score.scoreStringSide1).toBe('4-2 4-1');
      });
    } finally {
      closeAllModals();
    }
  }
};
