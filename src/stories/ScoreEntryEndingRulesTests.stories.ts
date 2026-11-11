/**
 * The ending rules in the browser: what the card's controls DO with `logic/scoreEntryRules.ts`.
 *
 * The rules themselves — which endings a score refuses, the retraction, the clear gate, what Submit
 * sends — are node tests in `logic/__tests__/scoreEntryRules.test.ts`. What is left for Chromium is
 * the wiring: a control disabling AS a score finishes, Tab skipping a chip it cannot focus, a trusted
 * click refused on a disabled button, the Other… signpost arming and abandoning a player pick, the
 * walkover lock on the cells, and the host's scope across every approach.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';
import {
  closeAllModals,
  dialogLauncher,
  inModal,
  inModalOrNull,
  launchers,
  openFrom,
  topModal
} from './helpers/scoreEntryDialogLauncher';

import type { Meta, StoryObj } from '@storybook/html-vite';

const { RETIRED, WALKOVER, DEFAULTED, SUSPENDED, CANCELLED, DEAD_RUBBER } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Ending Rules',
  tags: ['!dev']
};
export default meta;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const SUBMIT = 'button[data-action="submit"]';
const CLEAR = 'button[data-action="clear"]';
const OTHER = '.chc-sec-endings button[data-action="other"]';
const BAND = '.chc-sec-band';
const PICKING = 'button[data-picking="true"]';
const ROW_ENDING = '[data-row-ending]';
const CELLS = 'input.chc-sec-set-input';

const cell = (side: number, set: number) => inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
const matchEnding = (status: string) => inModal<HTMLButtonElement>(`.chc-sec-endings button[data-ending="${status}"]`);
const signpost = (status: string) =>
  inModalOrNull<HTMLButtonElement>(`.chc-sec-other-menu button[data-side-ending="${status}"]`);
const opener = (side: number) => inModal<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`);
const cells = () => [...topModal()!.querySelectorAll<HTMLInputElement>(CELLS)];

/** Entry begins on the LOWER row, so the loser's games go in first. */
async function enterSet(set: number, side1: string, side2: string): Promise<void> {
  await user.fill(cell(2, set), side2);
  await user.fill(cell(1, set), side1);
}

/**
 * A finished score refuses Suspended, and the refusal is LIVE: the button was drawn while the score was
 * partial, and only the derived refresh runs as the last digit lands. A trusted click on it is refused,
 * so Submit sends the ordinary result. Then Tab from Submit lands on the first chip that can take focus,
 * not on the disabled leading ones.
 */
export const FinishedScoreRefusesEndings: StoryObj = {
  render: () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT })),
  play: async ({ canvasElement, step }) => {
    const launched = await openFrom(canvasElement);
    try {
      await enterSet(1, '6', '4');
      await expect(matchEnding(SUSPENDED), 'legitimate while one set is played').toBeEnabled();

      await enterSet(2, '6', '3');
      await expect(inModal(BAND)).toHaveTextContent('6-4 6-3');
      await expect(matchEnding(SUSPENDED), 'refused as the score finishes').toBeDisabled();
      await expect(matchEnding(SUSPENDED).title).toMatch(/score is complete/i);

      await step('Tab from Submit lands on a chip that can take focus', async () => {
        // The last score cell Tabs straight to Submit (`tabFromScoreToSubmit`), and Submit on to the chips.
        await user.click(cell(1, 2));
        await user.tab();
        await expect(inModal(SUBMIT)).toHaveFocus();
        await user.tab();
        const focused = document.activeElement as HTMLButtonElement;
        await expect(inModal('.chc-sec-endings').contains(focused)).toBe(true);
        await expect(focused).toBeEnabled();
        await expect(focused.checkVisibility()).toBe(true);
        await expect(focused).toBeVisible();
      });

      await step('Submit sends the ordinary result, not SUSPENDED', async () => {
        await user.click(inModal(SUBMIT));
        await expect(launched.submitted).toHaveLength(1);
        await expect(launched.submitted[0].matchUpStatus).toBeUndefined();
        await expect(launched.submitted[0].winningSide).toBe(1);
        await expect(launched.submitted[0].score).toBe('6-4 6-3');
      });
    } finally {
      closeAllModals();
    }
  }
};

/** Per-side endings, signposted from Other…: arming a player pick, finishing it, and every way to abandon it. */
export const SideEndingSignpost: StoryObj = {
  render: () =>
    launchers(
      dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT })),
      dialogLauncher(
        () => ({ sides: SIDES, matchUpFormat: FORMAT, disabledMatchUpStatuses: [DEFAULTED] }),
        'Open with Defaulted out of scope',
        'scoped'
      )
    ),
  play: async ({ canvasElement, step }) => {
    const arm = async (status: string) => {
      await user.click(inModal(OTHER));
      await user.click(signpost(status)!);
    };

    await openFrom(canvasElement);
    try {
      await step('Other… lists the side endings first, above a divider', async () => {
        await user.click(inModal(OTHER));
        const items = [...topModal()!.querySelectorAll<HTMLElement>('.chc-sec-other-menu button')];
        await expect(items.filter((item) => item.dataset.sideEnding).map((item) => item.dataset.sideEnding)).toEqual(
          expect.arrayContaining([WALKOVER, RETIRED, DEFAULTED])
        );
        await expect(items[0].dataset.sideEnding).toBeTruthy();
        await expect(items.some((item) => item.dataset.ending === CANCELLED)).toBe(true);
        await expect(inModal('.chc-sec-other-divider')).toBeVisible();
        // Refused on the panel's own terms: Retired needs a score.
        await expect(signpost(RETIRED)).toBeDisabled();
        await expect(signpost(WALKOVER)).toBeEnabled();
        await user.click(inModal(OTHER));
      });

      await step('arming records nothing, highlights both names and asks in the band', async () => {
        await arm(WALKOVER);
        await expect(inModalOrNull('.chc-sec-other-menu'), 'the menu closes').toBeNull();
        const picking = [...topModal()!.querySelectorAll<HTMLElement>(PICKING)];
        await expect(picking).toHaveLength(2);
        for (const name of picking) {
          await expect(name.checkVisibility()).toBe(true);
          await expect(name).toBeVisible();
        }
        await expect(inModalOrNull(ROW_ENDING), 'nothing recorded yet').toBeNull();
        await expect(inModal(BAND).dataset.tone).toBe('pick');
        await expect(inModal(BAND)).toHaveTextContent('Walkover');
        await expect(inModal(SUBMIT), 'nothing to submit').toBeDisabled();
        await expect(inModal(OTHER), 'the chip claims no selection').toHaveTextContent(/^Other…$/);
      });

      await step('clicking a player records it against that row and opens their panel', async () => {
        await user.click(opener(2));
        await expect(topModal()!.querySelectorAll(PICKING), 'the highlight clears').toHaveLength(0);
        await expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(WALKOVER);
        await expect(inModal(ROW_ENDING).closest<HTMLElement>('.chc-sec-row')?.dataset.side).toBe('2');
        const pressed = inModal(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
        await expect(pressed).toBeVisible();
        await expect(pressed.getAttribute('aria-pressed')).toBe('true');
        await expect(inModal(BAND).dataset.tone).not.toBe('pick');
      });

      await step('picking the row that already holds it keeps it rather than toggling it off', async () => {
        await arm(WALKOVER);
        await user.click(opener(2));
        await expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(WALKOVER);
        // Back to a blank card for the abandon steps.
        await user.click(inModal(CLEAR));
        await expect(inModalOrNull(ROW_ENDING)).toBeNull();
      });

      await step('a click elsewhere abandons the pick', async () => {
        await arm(DEFAULTED);
        await user.click(inModal(BAND));
        await expect(topModal()!.querySelectorAll(PICKING)).toHaveLength(0);
        await expect(inModal(BAND).dataset.tone).not.toBe('pick');
        await expect(inModalOrNull(ROW_ENDING)).toBeNull();
      });

      await step('Escape abandons the pick and leaves the dialog open', async () => {
        await arm(DEFAULTED);
        await user.keyboard('{Escape}');
        await expect(topModal()!.querySelectorAll(PICKING)).toHaveLength(0);
        await expect(topModal(), 'Escape cancels the pick, not the dialog').toBeDefined();
      });

      await step('reopening Other… abandons the pick and opens the menu as usual', async () => {
        await arm(DEFAULTED);
        await user.click(inModal(OTHER));
        await expect(topModal()!.querySelectorAll(PICKING)).toHaveLength(0);
        await expect(inModal('.chc-sec-other-menu')).toBeVisible();
      });
      closeAllModals();

      await step('an ending the host put out of scope is not signposted', async () => {
        await openFrom(canvasElement, 'scoped');
        await user.click(inModal(OTHER));
        await expect(signpost(DEFAULTED)).toBeNull();
        await expect(signpost(WALKOVER)).toBeVisible();
      });
    } finally {
      closeAllModals();
    }
  }
};

/** A selected walkover disables the cells and `w` again gives them back; Free Score's own `w/o` locks nothing. */
export const WalkoverLocksScore: StoryObj = {
  render: () =>
    launchers(
      dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT })),
      dialogLauncher(
        () => ({ sides: SIDES, matchUp: { matchUpFormat: FORMAT, matchUpStatus: WALKOVER, winningSide: 1 } }),
        'Open on a recorded walkover',
        'recorded'
      ),
      dialogLauncher(
        () => ({ sides: SIDES, matchUpFormat: FORMAT, approach: 'freeScore' }),
        'Open in Free Score',
        'free'
      )
    ),
  play: async ({ canvasElement, step }) => {
    try {
      await step('a recorded walkover opens locked — cells shown, every one disabled', async () => {
        await openFrom(canvasElement, 'recorded');
        await expect(cells().length).toBeGreaterThan(0);
        for (const input of cells()) await expect(input).toBeDisabled();
        await expect(inModal('[data-component="scoreEntryCard"]').dataset.scoreLocked).toBe('true');
        closeAllModals();
      });

      await step('w locks the cells and w again unlocks them', async () => {
        await openFrom(canvasElement);
        await user.click(cell(2, 1));
        await user.keyboard('w');
        await expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(WALKOVER);
        for (const input of cells()) await expect(input).toBeDisabled();

        // Focus follows the shortcut to the ending's own control, from where the same letter toggles it off.
        await user.keyboard('w');
        await expect(inModalOrNull(ROW_ENDING)).toBeNull();
        await expect(inModal('[data-component="scoreEntryCard"]').dataset.scoreLocked).toBe('false');
        for (const input of cells()) await expect(input).toBeEnabled();
        closeAllModals();
      });

      await step("Free Score's field stays usable when the text itself says walkover", async () => {
        await openFrom(canvasElement, 'free');
        const field = inModal<HTMLInputElement>('.chc-sec-score-region input');
        await user.click(field);
        await user.keyboard('w/o');
        await expect(field).toHaveValue('w/o');
        await expect(field).toBeEnabled();
        await expect(field).toHaveFocus();
        await user.fill(field, '6-4');
        await expect(field).toHaveValue('6-4');
      });
    } finally {
      closeAllModals();
    }
  }
};

const DISABLED = [DEAD_RUBBER, 'CHALLENGED'];
const UNAVAILABLE = 'Dead Rubber is unavailable for this match';
const APPROACHES = ['dynamicSets', 'dialPad', 'freeScore'] as const;
const SWITCH = 'button[data-action="switchApproach"]';

/**
 * The host's scope holds in every approach and across the switcher: Other… omits Dead Rubber and says
 * why, and a STORED Dead Rubber is shown, refused, and removable by Clear + Submit in each approach.
 */
export const StatusScopeAcrossApproaches: StoryObj = {
  render: () =>
    launchers(
      dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, disabledMatchUpStatuses: DISABLED })),
      ...APPROACHES.map((approach) =>
        dialogLauncher(
          () => ({
            sides: SIDES,
            matchUp: { matchUpFormat: FORMAT, matchUpStatus: DEAD_RUBBER },
            approach,
            disabledMatchUpStatuses: DISABLED
          }),
          `Stored dead rubber, ${approach}`,
          `stored-${approach}`
        )
      )
    ),
  play: async ({ canvasElement, step }) => {
    try {
      await openFrom(canvasElement);
      for (const approach of ['freeScore', 'dialPad', 'dynamicSets']) {
        await step(`the menu omits Dead Rubber after switching to ${approach}`, async () => {
          await user.click(inModal(SWITCH));
          await user.click(inModal(`button[data-approach="${approach}"]`));
          await user.click(inModal(OTHER));
          await expect(inModalOrNull(`[data-ending="${DEAD_RUBBER}"]`)).toBeNull();
          await expect(inModal(`[data-ending="${CANCELLED}"]`)).toBeVisible();
          await expect(topModal()).toHaveTextContent(UNAVAILABLE);
          await user.click(inModal(OTHER));
        });
      }
      closeAllModals();

      for (const approach of APPROACHES) {
        await step(`a stored Dead Rubber is refused and clearable in ${approach}`, async () => {
          const launched = await openFrom(canvasElement, `stored-${approach}`);
          await expect(topModal()!.textContent?.toLowerCase()).toContain('dead rubber');
          await expect(inModal(SUBMIT)).toBeDisabled();
          await user.click(inModal(CLEAR));
          await expect(inModal(SUBMIT)).toBeEnabled();
          await user.click(inModal(SUBMIT));
          await expect(launched.submitted.at(-1)).toMatchObject({ cleared: true });
          await waitFor(() => expect(topModal()).toBeUndefined());
        });
      }
    } finally {
      closeAllModals();
    }
  }
};

const IMPORTED_RETIREMENT = {
  matchUpStatus: RETIRED,
  winningSide: 2,
  matchUpFormat: 'SET3-S:6/TB7-F:TB10',
  score: { sets: [] }
};

/**
 * An imported retirement with no score, in every approach: Clear is live, and Submit sends the removal
 * when the host allows it and nothing when it does not. The engine shape of the removal is the node
 * test's (`scoreEntryRules.test.ts`); this is the dialog delivering it.
 */
export const ClearAnImportedRetirement: StoryObj = {
  render: () =>
    launchers(
      ...APPROACHES.flatMap((approach) =>
        [true, false].map((clearable) =>
          dialogLauncher(
            () => ({ sides: SIDES, matchUp: IMPORTED_RETIREMENT, approach, clearable }),
            `${approach}, clearable ${clearable}`,
            `${approach}-${clearable}`
          )
        )
      )
    ),
  play: async ({ canvasElement, step }) => {
    try {
      for (const approach of APPROACHES) {
        await step(`${approach}: the imported status can be cleared`, async () => {
          const launched = await openFrom(canvasElement, `${approach}-true`);
          await expect(inModal(CLEAR)).toBeEnabled();
          await user.click(inModal(CLEAR));
          await expect(inModal(SUBMIT)).toBeEnabled();
          await user.click(inModal(SUBMIT));
          await expect(launched.submitted.at(-1)).toEqual({
            cleared: true,
            sets: [],
            outcome: { score: { sets: [] }, matchUpStatusCodes: [] }
          });
          closeAllModals();
        });

        await step(`${approach}: Clear resets the form, the empty removal stays refused`, async () => {
          const launched = await openFrom(canvasElement, `${approach}-false`);
          await user.click(inModal(CLEAR));
          await expect(inModal(SUBMIT)).toBeDisabled();
          await expect(launched.submitted).toHaveLength(0);
          closeAllModals();
        });
      }
    } finally {
      closeAllModals();
    }
  }
};
