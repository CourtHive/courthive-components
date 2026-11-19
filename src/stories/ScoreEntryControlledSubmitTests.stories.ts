/**
 * A CONTROLLED submission, in Chromium: the host's `onSubmit` returns a promise, and the dialog waits on it.
 *
 * A host that sends the outcome somewhere that can refuse it (CFS's executionQueue, an engine answering `{ error }`)
 * used to have the dialog close the moment it was handed the outcome, so a refusal had nowhere to go. Now Submit
 * says it is saving while the promise is pending; an accepted one closes the dialog, a refused one keeps it open
 * with the reason shown and the footer usable again. A host that returns nothing still closes at once
 * (`SubmitReportsTheWinnerThenCloses` in `ScoreEntryDialogTests.stories.ts`).
 */
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';
import {
  closeAllModals,
  dialogLauncher,
  inModal,
  inModalOrNull,
  openFrom,
  topModal
} from './helpers/scoreEntryDialogLauncher';

import type { ScoreEntryDialogParams } from '../components/scoring/scoreEntryDialog';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Controlled Submit',
  tags: ['!dev']
};
export default meta;

const SUBMIT = 'button[data-action="submit"]';
const CLEAR = 'button[data-action="clear"]';
const NOTE = '.chc-sec-submit-note';

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];
const FINISHED = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
];

/** A promise the play settles by hand, so it can look at the dialog while the submission is pending. */
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let pending = deferred();
const onClose = fn();
const onSubmit = fn(() => pending.promise);

const opens = () => () =>
  dialogLauncher((): ScoreEntryDialogParams => ({
    sides: SIDES,
    matchUpFormat: 'SET3-S:6/TB7',
    sets: FINISHED,
    onSubmit,
    onClose
  }));

/** Leave nothing for the next story on this page: the submission settled, every dialog closed. */
function tidy(): void {
  pending.resolve(undefined);
  closeAllModals();
}

/** A play, run so that whatever it asserts, it tidies up after itself. */
const tidily =
  (play: (canvasElement: HTMLElement) => Promise<void>) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    try {
      await play(canvasElement);
    } finally {
      tidy();
    }
  };

function fresh(): void {
  closeAllModals();
  onClose.mockClear();
  onSubmit.mockClear();
  pending = deferred();
}

/** Submit pressed: the outcome went to the host, and the dialog waits, saying so. */
async function submitAndWait(canvasElement: HTMLElement): Promise<void> {
  fresh();
  await openFrom(canvasElement);
  await user.click(inModal(SUBMIT));

  await expect(onSubmit).toHaveBeenCalledTimes(1);
  await expect(topModal(), 'pending: the dialog stays open').toBeDefined();
  await expect(inModal(SUBMIT)).toBeDisabled();
  await expect(inModal(SUBMIT)).toHaveTextContent('Saving…');
  await expect(inModal(SUBMIT).getAttribute('aria-busy')).toBe('true');
  await expect(inModal(CLEAR), 'nothing is cleared under a submission in flight').toBeDisabled();
}

export const AcceptedCloses: StoryObj = {
  name: 'Controlled: pending holds the dialog open and saving; accepted closes it',
  render: opens(),
  play: tidily(async (canvasElement) => {
    await submitAndWait(canvasElement);

    pending.resolve({ success: true });
    await waitFor(() => expect(topModal()).toBeUndefined());
    await expect(onClose).toHaveBeenCalledTimes(1);
  })
};

export const RejectedStaysOpen: StoryObj = {
  name: 'Controlled: a rejection keeps the dialog open, says why, and Submit works again',
  render: opens(),
  play: tidily(async (canvasElement) => {
    await submitAndWait(canvasElement);

    pending.reject(new Error('the server is unreachable'));
    await waitFor(() => expect(inModal(SUBMIT)).toBeEnabled());
    await expect(topModal()).toBeDefined();
    await expect(onClose).not.toHaveBeenCalled();
    await expect(inModal(SUBMIT)).toHaveTextContent('Submit');
    await expect(inModal(SUBMIT).getAttribute('aria-busy')).toBe('false');
    await expect(inModal(NOTE)).toBeVisible();
    await expect(inModal(NOTE)).toHaveTextContent('Not saved: the server is unreachable');
    await expect(inModal(NOTE).getAttribute('role')).toBe('alert');

    // a second attempt clears the refusal while it waits, and closes when it is accepted
    pending = deferred();
    await user.click(inModal(SUBMIT));
    await expect(onSubmit).toHaveBeenCalledTimes(2);
    await expect(inModalOrNull(NOTE)?.hidden).toBe(true);
    pending.resolve(undefined);
    await waitFor(() => expect(topModal()).toBeUndefined());
  })
};

export const FactoryErrorStaysOpen: StoryObj = {
  name: "Controlled: the factory's { error } result is a refusal, with its message",
  render: opens(),
  play: tidily(async (canvasElement) => {
    await submitAndWait(canvasElement);

    pending.resolve({ error: { message: 'Cannot change winningSide', code: 'ERR_CANNOT_CHANGE_WINNING_SIDE' } });
    await waitFor(() => expect(inModal(NOTE)).toBeVisible());
    await expect(topModal()).toBeDefined();
    await expect(inModal(NOTE)).toHaveTextContent('Not saved: Cannot change winningSide');
    await expect(inModal(SUBMIT)).toBeEnabled();
  })
};

export const RefusalWithoutReason: StoryObj = {
  name: 'Controlled: a refusal with no words still says it was not saved',
  render: opens(),
  play: tidily(async (canvasElement) => {
    await submitAndWait(canvasElement);

    pending.reject(undefined);
    await waitFor(() => expect(inModal(NOTE)).toBeVisible());
    await expect(inModal(NOTE)).toHaveTextContent('Not saved. Try again.');
  })
};

export const ClosedWhilePending: StoryObj = {
  name: 'Controlled: closing while the submission is pending leaves nothing behind when it settles',
  render: opens(),
  play: tidily(async (canvasElement) => {
    await submitAndWait(canvasElement);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(topModal()).toBeUndefined());
    await expect(onClose).toHaveBeenCalledTimes(1);

    // settling after the card is gone touches no element and closes nothing twice
    pending.reject(new Error('late'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(onClose).toHaveBeenCalledTimes(1);
    await expect(document.querySelector(NOTE)).toBeNull();
  })
};
