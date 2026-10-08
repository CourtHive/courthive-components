/**
 * The score-entry dialog over a REAL draw, so Submit reaches the engine and the answer can be seen.
 *
 * CA, 2026-09-30, note 10 of `scoreEntryNotes.txt`: *"I'm sure if this went to the factory it would
 * return an error (why don't we actually have a draw behind the modal in stories so that we can see what
 * happens on [Submit])?"* Every other dialog story reopens on a record the story built. This one holds
 * no record: a mocks-engine tournament is loaded, the first-round matchUp is handed to the dialog as the
 * engine holds it, Submit goes to `tournamentEngine.setMatchUpStatus`, and the reopen reads
 * `tournamentEngine.findMatchUp` — CA, 2026-09-28: *"we need to be able to open existing outcomes!"*
 *
 * ── What it showed, measured 2026-10-01 against published factory 7.4.0 ──
 *
 * The answer to CA's "I'm sure it would return an error" is NO. The engine ACCEPTS `4-2 2-6 2-6` as a
 * COMPLETED match won by side 2, and `3-7 6-4 6-4` as one won by side 1. `analyzeScore` counts only
 * sets that carry a `winningSide` toward the match winner — a 4-2 with none is simply not counted — and
 * `validateSet` checks that no side exceeds `setTo + 1`, so a 7 is within bounds whatever stands
 * opposite it. The factory validates BOUNDS, not completeness. The card's refusal before Submit is the
 * only guard those two scores meet, which is the strongest argument for the state engine CA asked for.
 * Each is pinned in `__tests__/scoringStories.test.ts`, driven through this story's own handlers, so
 * the day the engine starts refusing them the pin says so.
 *
 * ── Modal hygiene ──
 *
 * `cModal` mounts to `document.body`, outside the canvas, and the runner visits every story in one page:
 * the story closes anything standing before it opens, and the play function reads `document`.
 */
import { fixtures, policyConstants, matchUpStatusConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../components/scoring/scoreEntryDialog';
import { gamesPerSet, storyLog } from './helpers/scoreEntryStoryHost';
import { cModal } from '../components/modal/cmodal';
import { expect } from 'storybook/test';
import {
  describeAnswer,
  describeHeld,
  buildDrawBehind,
  engineMatchUp,
  recordOutcome,
  sidesOf
} from './helpers/scoreEntryEngineHost';

import type { DialogOutcome, EngineAnswer, EngineMatchUpRef } from './helpers/scoreEntryEngineHost';
import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { ScoreEntryDialog } from '../components/scoring/scoreEntryDialog';

const { POLICY_TYPE_SCORING } = policyConstants;
const { COMPLETED, TO_BE_PLAYED } = matchUpStatusConstants;

/** The real shipped vocabulary, never a hand-mirror of it. */
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

export default {
  title: 'Scoring/Score Entry Over a Draw',
  // Storybook renders EVERY named export of a stories file as a story. `renderDrawBehind` is exported for
  // `__tests__/scoringStories.test.ts`, and returns `{ element, host }`, not a node — so without this it
  // appeared as a broken story, "Render Draw Behind", next to the real one.
  excludeStories: ['renderDrawBehind']
};

const OPEN_BUTTON = '#openOverDraw';
const HELD_READOUT = '#engineHeld';
const LOG = '#overDrawLog';
const MODAL = 'section[id^="cmdl-"]';
const SUBMIT = 'button[data-action="submit"]';
const BAND = '.chc-sec-band';

const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].pop();
const inModal = <T extends HTMLElement>(selector: string) => topModal()?.querySelector<T>(selector) ?? undefined;

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/**
 * The story's handlers, exposed so a test can drive the same path an operator does — and the one path
 * an operator CANNOT: `submitToEngine` is exactly what Submit calls, reachable without the card, which
 * is how the scores the card now refuses are shown to the engine anyway.
 */
export type DrawBehindHost = {
  /** The matchUp the dialog sits over. */
  ref: EngineMatchUpRef;
  /** The matchUp as the engine holds it now. */
  held: () => any;
  /** Open the dialog on `held()` — never on a record this story built. */
  open: () => ScoreEntryDialog;
  /** What Submit does: the outcome to the engine, the answer to the log, the readout refreshed. */
  submitToEngine: (outcome: DialogOutcome) => EngineAnswer;
};

/**
 * The harness and its handlers together, because the handlers close over the log and the readout.
 *
 * A fresh tournament per render: the engine is a singleton, and a story that reused one across renders
 * would open on whatever the previous visitor left in it.
 */
export function renderDrawBehind(): { element: HTMLElement; host: DrawBehindHost } {
  const ref = buildDrawBehind();
  const held = () => engineMatchUp(ref);

  const container = document.createElement('div');
  container.style.cssText = 'padding:16px; display:flex; flex-direction:column; gap:12px; align-items:flex-start';

  const description = document.createElement('div');
  description.style.cssText = 'font-size:0.85rem; color: var(--chc-text-secondary); max-width:64ch';
  description.textContent =
    'A 4-draw generated by mocksEngine sits behind this dialog. Submit calls tournamentEngine.setMatchUpStatus; ' +
    'the log shows what was sent and what the engine answered; reopening reads the matchUp back from the engine. ' +
    'Clear and Submit removes the stored result.';

  const launch = document.createElement('button');
  launch.className = 'button is-info';
  launch.id = OPEN_BUTTON.slice(1);
  launch.textContent = 'Open score entry over the draw';

  const readout = document.createElement('div');
  readout.id = HELD_READOUT.slice(1);
  readout.style.cssText = 'font-size:0.8rem; font-family: monospace; color: var(--chc-text-primary)';

  const log = storyLog(LOG.slice(1));

  /** The format chosen through the chip since the last submit; undefined means the engine's. */
  let chosenFormat: string | undefined;

  const refresh = () => {
    readout.textContent = `engine holds: ${describeHeld(held())}`;
  };

  const submitToEngine = (outcome: DialogOutcome): EngineAnswer => {
    log.append(`submit → ${JSON.stringify({ ...outcome, sets: gamesPerSet(outcome.sets) })}`);
    const answer = recordOutcome(ref, outcome, chosenFormat);
    chosenFormat = undefined;
    log.append(`sent → ${JSON.stringify(answer.sent)}`);
    log.append(describeAnswer(answer));
    refresh();
    return answer;
  };

  const open = (): ScoreEntryDialog => {
    closeAll();
    const matchUp = held();
    const sides = sidesOf(matchUp);
    return openScoreEntryDialog({
      sides,
      matchUpFormat: matchUp.matchUpFormat,
      // The engine's matchUp, as is. It carries the sets, the status, the winner and the split reason
      // codes, which is everything the dialog hydrates from.
      matchUp,
      context: `${matchUp.roundName ?? 'Round 1'} · ${sides[0].participantName} v ${sides[1].participantName}`,
      statusCodeGroups: REAL_GROUPS,
      // Live, as in every modal story. The choice rides to the engine with the next Submit as
      // `outcome.matchUpFormat`, which the engine persists onto the matchUp once it accepts the result.
      onFormatChange: (format: string) => {
        chosenFormat = format;
        log.append(`format → ${format} (goes to the engine with the next Submit)`);
      },
      onSubmit: (outcome: DialogOutcome) => {
        submitToEngine(outcome);
        log.append('the modal closed — press the button again to reopen on what the engine holds');
      },
      onClose: () => log.append('closed')
    });
  };

  launch.onclick = () => open();

  refresh();
  container.append(description, launch, readout, log.element);
  return { element: container, host: { ref, held, open, submitToEngine } };
}

export const DrawBehindTheModal = {
  // CA's own words for it. The thing being shown is the draw, not the dialog.
  name: 'A draw behind the modal — Submit reaches the engine',
  render: () => renderDrawBehind().element,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    const reopen = () => canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();
    const logText = () => canvasElement.querySelector(LOG)!.textContent ?? '';
    const readout = () => canvasElement.querySelector(HELD_READOUT)!.textContent ?? '';
    const cell = (side: number, set: number) =>
      inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
    const type = (side: number, set: number, value: string) => {
      const input = cell(side, set);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // Nobody has played yet, and the readout says so before anything is opened.
    await expect(readout()).toContain(TO_BE_PLAYED);
    reopen();

    // The names on the card are the engine's participants, not a fixture. A control first: the names
    // are non-empty, so an equal pair of blanks cannot pass this.
    const shown = [...topModal()!.querySelectorAll('.chc-sec-name')].map((name) => name.textContent);
    await expect(shown.every(Boolean), 'the engine named both participants').toBe(true);
    await expect(shown).toHaveLength(2);

    type(2, 1, '4');
    type(1, 1, '6');
    type(2, 2, '3');
    type(1, 2, '6');
    await expect(inModal(BAND)!.textContent).toContain('6-4 6-3');
    inModal<HTMLButtonElement>(SUBMIT)!.click();

    // The engine took it, and said so in its own score string. The modal closed.
    await expect(topModal(), 'Submit closes the dialog').toBeUndefined();
    await expect(logText()).toContain('engine accepted');
    await expect(readout()).toContain(COMPLETED);
    await expect(readout()).toContain('6-4 6-3');

    // Reopened on what the ENGINE holds — the cells carry the stored sets.
    reopen();
    await expect(cell(1, 1).value, 'reopened on the engine’s matchUp').toBe('6');
    await expect(cell(2, 1).value).toBe('4');
    await expect(cell(2, 2).value).toBe('3');
    await expect(inModal(BAND)!.textContent).toContain('6-4 6-3');

    // ── The clear leg: Clear + Submit is how a stored result is removed ──
    inModal<HTMLButtonElement>('button[data-action="clear"]')!.click();
    await expect(inModal<HTMLButtonElement>(SUBMIT)!.disabled, 'a cleared stored score is submittable').toBe(false);
    inModal<HTMLButtonElement>(SUBMIT)!.click();

    await expect(topModal()).toBeUndefined();
    await expect(readout(), 'the engine is back to nothing played').toContain(TO_BE_PLAYED);
    await expect(readout()).not.toContain('6-4');

    reopen();
    await expect(cell(1, 1).value, 'and the dialog reopens blank').toBe('');
    closeAll();
  }
};
