/**
 * An outcome has to survive the trip out of the new dialog and back in.
 *
 * CA, 2026-09-28: *"we need a story for round-tripping like we have with the existing scoring dialogs...
 * we need to be able to open existing outcomes!"* The companion is
 * `reasonCodeRoundTrip.stories.ts`, which does this for the shipping modal; this is the same discipline
 * applied to `openScoreEntryDialog`.
 *
 * ── Why a ROUND TRIP, and not two tests of two halves ──
 *
 * The dialog opened BLANK on a scored matchUp: it took `sides`, `sets` and a vocabulary, and had no
 * matchUp parameter at all, so neither a recorded ending nor its reason code could be shown. That was
 * never going to be caught by testing submission and hydration separately, because each half was
 * internally consistent. What breaks is the shape in between — and specifically ONE inversion:
 *
 *   - a stored matchUp names the **winner**;
 *   - this card records the side the ending **happened to**, and derives the winner from it.
 *
 * Apply that inversion once too often, or not at all, and every intermediate value still looks
 * plausible while the wrong participant advances. So these stories feed the dialog's own output back to
 * it as input, which is the only arrangement where a double inversion cannot hide.
 *
 * ── Modal hygiene ──
 *
 * `cModal` mounts to `document.body`, outside the story canvas, and the runner visits every story in one
 * page — so each story closes anything standing before it opens its own, and the play functions read
 * `document`, not `canvasElement`.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../components/scoring/scoreEntryDialog';
import { asRecord } from './helpers/scoreEntryStoryHost';
import { cModal } from '../components/modal/cmodal';
import { expect } from 'storybook/test';

import { codesForStatus, statusCodeDisplay } from '../components/scoring/logic/statusCodes';

import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';

const { WALKOVER, DOUBLE_WALKOVER, RETIRED, SUSPENDED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

/** The real shipped vocabulary, never a hand-mirror of it. */
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

export default {
  title: 'Scoring/Score Entry Round Trip'
};

const FORMAT = 'SET3-S:6/TB7';
const OPEN_BUTTON = '#openRecordedOutcome';
const MODAL = 'section[id^="cmdl-"]';
const ROW_ENDING = '[data-row-ending]';
/** `aria-pressed`, and the value it reads as — both repeat enough to be named. */
const ARIA_PRESSED = 'aria-pressed';
const PRESSED = 'true';
const BAND = '.chc-sec-band';
const SUBMIT = 'button[data-action="submit"]';
/** Asserted in three stories now, which is the point — Submit closing is not one story's concern. */
const SUBMIT_CLOSES = 'Submit closes the dialog';

const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];

/** "Wo [inj]" — a real entry in the shipped vocabulary. */
const WALKOVER_INJURY = 'W1';

/**
 * How the card will render that code, taken FROM the vocabulary rather than guessed.
 *
 * Hardcoding "Wo [inj]" would make the story assert a label rather than the round trip, and would go
 * stale the day the vocabulary is relabelled.
 */
const walkoverInjuryDisplay = () => {
  const entry = codesForStatus(REAL_GROUPS, WALKOVER).find((code) => code.matchUpStatusCode === WALKOVER_INJURY);
  return entry ? statusCodeDisplay(entry) : WALKOVER_INJURY;
};

const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].pop();
const inModal = <T extends HTMLElement>(selector: string) => topModal()?.querySelector<T>(selector) ?? undefined;

function closeAll() {
  for (let attempt = 0; attempt < 5 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/**
 * A matchUp as the FACTORY stores one.
 *
 * `winningSide` is the winner, and the reason sits on the side that exited — which for a walkover won by
 * side 1 is side 2. Written out rather than generated so the story reads as the record it stands for.
 */
function recordedWalkover() {
  return {
    matchUpFormat: FORMAT,
    matchUpStatus: WALKOVER,
    winningSide: 1,
    sideStatusCodes: { 2: WALKOVER_INJURY },
    score: { sets: [] }
  };
}

function recordedRetirement() {
  return {
    matchUpFormat: FORMAT,
    matchUpStatus: RETIRED,
    winningSide: 1,
    sideStatusCodes: { 2: 'RJ' },
    score: {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 2, side2Score: 1 }
      ]
    }
  };
}

/** A button that opens the dialog on a recorded matchUp, and a log of what came back out. */
function harness(note: string, open: (append: (line: string) => void) => void) {
  const container = document.createElement('div');
  container.style.cssText = 'padding:16px; display:flex; flex-direction:column; gap:12px; align-items:flex-start';

  const description = document.createElement('div');
  description.style.cssText = 'font-size:0.85rem; color: var(--chc-text-secondary); max-width:64ch';
  description.textContent = note;

  const launch = document.createElement('button');
  launch.className = 'button is-info';
  launch.id = OPEN_BUTTON.slice(1);
  launch.textContent = 'Open the recorded outcome';

  const log = document.createElement('pre');
  log.id = 'roundTripLog';
  log.style.cssText =
    'margin:0; padding:8px; font-size:0.75rem; min-height:2.5em; white-space:pre-wrap; align-self:stretch;' +
    'background: var(--chc-bg-secondary); color: var(--chc-text-primary);' +
    'border:1px solid var(--chc-border-primary); border-radius:4px;';

  const append = (line: string) => {
    log.textContent = log.textContent ? `${log.textContent}\n${line}` : line;
  };

  launch.onclick = () => {
    closeAll();
    open(append);
  };

  container.append(description, launch, log);
  return container;
}

/**
 * A round trip driven by the OPEN BUTTON, which is how an operator drives one.
 *
 * CA, 2026-09-29: *"NONE of the Score Entry Round Trip stories close the modal upon clicking
 * [Submit]!"* — and he was right, though not for the reason the sentence suggests. Every story used
 * to reopen itself on a `setTimeout(…, 0)`, so the modal DID close and was replaced in the same
 * frame. Nothing on screen ever went away, which is indistinguishable from never closing, and it also
 * made the dialog's own close untestable: an assertion "it closed" could never be written between
 * two synchronous statements.
 *
 * Now Submit closes and STOPS. The submitted outcome is remembered here, and pressing the story's
 * own button again opens on it — CA, 2026-09-28: *"All of the stories should allow me to Submit and
 * then re-open on the score I just submitted."* "Allow me to re-open" is a button, not a timer.
 *
 * Returns the click handler rather than opening, so `current` survives between presses. Built once
 * per render; each story keeps its own.
 */
function roundTrip(initial: any, matchUpFormat = FORMAT) {
  let current = initial;

  return (append: (line: string) => void) =>
    openScoreEntryDialog({
      sides: SIDES,
      // Passed explicitly so `matchUp: undefined` is a legitimate start: a story that opens BLANK gets
      // its format from here, and a record's own format never disagrees because `asRecord` writes this
      // one into it.
      matchUpFormat,
      statusCodeGroups: REAL_GROUPS,
      matchUp: current,
      onSubmit: (outcome: any) => {
        append(`submit → ${JSON.stringify(outcome)}`);
        current = asRecord(outcome, outcome.sets ?? [], matchUpFormat);
        append('the modal closed — press the button again to reopen on what was saved');
      }
    } as any);
}

export const OutAndBackIn = {
  name: 'The round trip — what it submits is what it reopens on',
  render: () =>
    harness(
      'Opens on a recorded walkover and submits it untouched. The modal closes; press the button again and it opens on the outcome that came back. The winner must survive both directions.',
      // Was a hand-written open with its own record mapping. `asRecord` inside `roundTrip` performs
      // the same one, and the hand copy could disagree with it without either being obviously wrong.
      roundTrip(recordedWalkover())
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    const reopen = () => canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();
    reopen();

    // ── It opened on the right side, with its reason ──
    //
    // Stored as WALKOVER with `winningSide: 1` and the reason on side 2, so the ending belongs to
    // DERRICK — the side that did not win. Getting this inversion wrong advances the wrong participant,
    // and the card would look perfectly correct while doing it.
    const sideOf = () => inModal<HTMLElement>(ROW_ENDING)?.closest<HTMLElement>('.chc-sec-row')?.dataset.side;
    await expect(inModal<HTMLElement>(ROW_ENDING)!.dataset.rowEnding).toBe(WALKOVER);
    await expect(sideOf()).toBe('2');
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem advances');

    // The reason came back with it — the defect that started this: the picker read side 1. In the BAND
    // first, because that is where it is visible without the operator doing anything.
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain(walkoverInjuryDisplay());

    // Then in the panel, which proves the STATE carries it and not merely the prose: the chip for the
    // recorded code is the pressed one.
    inModal<HTMLButtonElement>('button[data-action="endedEarly"][data-side="2"]')!.click();
    const reason = inModal<HTMLElement>(`[data-panel-side="2"] button[data-reason="${WALKOVER_INJURY}"]`);
    await expect(reason).toBeTruthy();
    await expect(reason!.getAttribute(ARIA_PRESSED)).toBe(PRESSED);

    // Submittable as it stands: reopening a complete outcome must not require re-declaring it.
    await expect(inModal<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);

    inModal<HTMLButtonElement>(SUBMIT)!.click();

    // It CLOSED, and reopening is a press of the story's own button.
    await expect(topModal(), SUBMIT_CLOSES).toBeUndefined();
    reopen();

    // THE assertion: the ending is still on side 2. A double inversion — or none — puts it on side 1,
    // and every value in between looks plausible.
    await expect(sideOf(), 'the exiting side survives the round trip').toBe('2');
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem advances');

    closeAll();
  }
};

/**
 * The ORDINARY case, which this file did not have.
 *
 * CA, 2026-09-29: *"On the 'Score Entry Round Trip' I was expecting to be able to enter a score
 * [Submit] have the modal close and then re-open on the last saved score."* Every other story here
 * opens on an irregular ending — a walkover, a retirement, a suspension, a double walkover — so the
 * 95% case, a match somebody actually played, had no round trip at all. Measured 2026-09-29: the
 * reopen itself was never broken; the case was simply absent.
 *
 * It carries the CLEAR leg too, because the two belong together. A score that can go in and come back
 * out but can never be REMOVED is a one-way door, and an operator who records a result on the wrong
 * matchUp needs the way back — CA, same day: *"the current scoring modals allow for an empty score to
 * be submitted which clears a submitted score in the factory for the matchUp being modified... this
 * scoring dialog needs to support that too!"*
 */
export const EnterSubmitReopenClear = {
  name: 'Enter a score, submit, reopen on it — then clear it and submit that',
  render: () =>
    harness(
      'Opens BLANK. Type a score and Submit: the modal closes and reopens on what you just saved. Then press Clear and Submit again — the empty result is submittable, and that is how a recorded score is removed.',
      roundTrip(undefined)
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    const reopen = () => canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();
    reopen();

    const cell = (side: number, set: number) =>
      inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
    const submit = () => inModal<HTMLButtonElement>(SUBMIT)!;
    const clear = () => inModal<HTMLButtonElement>('button[data-action="clear"]')!;
    const type = (side: number, set: number, value: string) => {
      const input = cell(side, set);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // Opens blank, and nothing is submittable yet.
    await expect(submit().disabled, 'a blank card submits nothing').toBe(true);

    // Entry begins on the LOWER row, so the loser's games are typed first in each column.
    type(2, 1, '4');
    type(1, 1, '6');
    type(2, 2, '3');
    type(1, 2, '6');

    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain('6-4 6-3');
    await expect(submit().disabled).toBe(false);
    submit().click();

    // IT CLOSED. This assertion could not exist while the story reopened itself on a timer — the
    // modal was replaced in the same frame, so there was no moment at which nothing was on screen.
    // CA, 2026-09-29: *"NONE of the Score Entry Round Trip stories close the modal upon clicking
    // [Submit]!"*
    await expect(topModal(), SUBMIT_CLOSES).toBeUndefined();

    // And reopening is a BUTTON, which is what "allow me to re-open" means.
    reopen();

    // THE assertion CA went looking for: the score that was submitted is the score it reopened on,
    // in the cells rather than only in the prose.
    await expect(cell(1, 1).value, 'reopened on the submitted score').toBe('6');
    await expect(cell(2, 1).value).toBe('4');
    await expect(cell(2, 2).value).toBe('3');
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain('6-4 6-3');

    // ── The clear leg ──
    clear().click();

    // Submit stays live, and the band says what it will do rather than reading as an empty new entry.
    await expect(submit().disabled, 'a cleared recorded score is still submittable').toBe(false);
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain('removed');

    submit().click();
    await expect(topModal(), 'and the clear closes it too').toBeUndefined();

    reopen();

    // It reopened on nothing, which is the point: the recorded score is gone, and the dialog now has
    // the same blank card it started with.
    await expect(cell(1, 1).value, 'the cleared score did not come back').toBe('');
    await expect(document.querySelector('#roundTripLog')!.textContent).toContain('cleared');

    closeAll();
  }
};

export const ReopenARetirement = {
  name: 'A retirement reopens with its part-score intact',
  render: () =>
    harness(
      'Stored as RETIRED at 6-4 2-1. The sets come from the matchUp, so the dialog opens on the score that was played as well as the ending.',
      roundTrip(recordedRetirement())
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    // The part-score is in the cells, read off `matchUp.score.sets` rather than passed separately.
    await expect(inModal<HTMLInputElement>('input[data-side="1"][data-set="1"]')!.value).toBe('6');
    await expect(inModal<HTMLInputElement>('input[data-side="2"][data-set="2"]')!.value).toBe('1');

    // And the retirement is against the side that did not win, with the part-score preserved beside it —
    // a retirement keeps its score, unlike a walkover.
    await expect(inModal<HTMLElement>(ROW_ENDING)!.dataset.rowEnding).toBe(RETIRED);
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain('6-4 2-1');

    closeAll();
  }
};

export const ReopenAMatchLevelEnding = {
  name: 'An ending that resolves nobody reopens at match level',
  render: () =>
    harness(
      'Stored as SUSPENDED with no winningSide. There is no side to attach it to, so it must come back in the match-level group and not on a row.',
      roundTrip({ matchUpFormat: FORMAT, matchUpStatus: SUSPENDED, score: { sets: [] } })
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    // On the match-level control, and NOT on a row: a suspension resolves nobody, so a row pill would
    // be claiming it happened to one participant.
    await expect(inModal(`.chc-sec-endings button[data-ending="${SUSPENDED}"]`)!.getAttribute(ARIA_PRESSED)).toBe(
      'true'
    );
    await expect(inModal(ROW_ENDING)).toBeUndefined();

    closeAll();
  }
};

export const ReopenADoubleExit = {
  name: 'A double walkover reopens on BOTH rows',
  render: () =>
    harness(
      'Stored as DOUBLE_WALKOVER with no winningSide. The ending an operator clicks is WALKOVER plus "no one advances", so it must come back that way — marked on both participants.',
      roundTrip({ matchUpFormat: FORMAT, matchUpStatus: DOUBLE_WALKOVER, score: { sets: [] } })
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    const reopen = () => canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();
    reopen();

    // Both rows carry the chip — CA, 2026-09-27: *"If 'no one advances' is selected shouldn't (Defaulted)
    // or (Walkover) chip appear next to the other player as well?"*
    await expect(topModal()!.querySelectorAll(ROW_ENDING)).toHaveLength(2);

    // A reason, before submitting. A double exit has no winning side, so its reason cannot be stored
    // "against the side that lost" — it goes on BOTH, and side 1 is what `recordedStatusCode` reads.
    // Without this the round trip below passes just as well against a record that stored no reason at
    // all, which is the one thing about a double exit that is easy to get wrong.
    inModal<HTMLButtonElement>('button[data-action="endedEarly"][data-side="1"]')!.click();
    inModal<HTMLButtonElement>(`[data-panel-side="1"] button[data-reason="${WALKOVER_INJURY}"]`)!.click();
    await expect(
      inModal<HTMLElement>(`[data-panel-side="1"] button[data-reason="${WALKOVER_INJURY}"]`)!.getAttribute(ARIA_PRESSED)
    ).toBe(PRESSED);

    // And it resolves back to the DOUBLE status, not to the single ending that was clicked.
    inModal<HTMLButtonElement>(SUBMIT)!.click();
    await expect(document.querySelector('#roundTripLog')!.textContent).toContain(DOUBLE_WALKOVER);

    // It closed, then reopened on the press of the story's own button. This replaced a timer, which
    // also removed a hazard in its own right: a timer that fires after the story has finished opens a
    // dialog into whatever is on screen next.
    await expect(topModal(), SUBMIT_CLOSES).toBeUndefined();
    reopen();

    // Both rows again — a double exit that reopened as a single one would have lost the second
    // participant, which is the failure this whole file exists to catch.
    await expect(topModal()!.querySelectorAll(ROW_ENDING)).toHaveLength(2);

    // And the reason survived the trip, through the both-sides field a double exit has to use.
    //
    // In the BAND first. It did not appear there until 2026-09-29: `scoreEntrySummary`'s double-exit
    // branch returned the propagation warning alone and dropped `reasonDisplay`, so this comment used
    // to explain why the assertion could only be made in the panel. It is fixed, and both are asserted
    // — the band is what an operator sees without doing anything, the chip proves the STATE carries the
    // code rather than merely the prose.
    await expect(inModal<HTMLElement>(BAND)!.textContent).toContain(walkoverInjuryDisplay());

    inModal<HTMLButtonElement>('button[data-action="endedEarly"][data-side="1"]')!.click();
    const reason = inModal<HTMLElement>(`[data-panel-side="1"] button[data-reason="${WALKOVER_INJURY}"]`);
    await expect(reason, 'the reason chip is offered again').toBeTruthy();
    await expect(reason!.getAttribute(ARIA_PRESSED), 'and it is the pressed one').toBe('true');

    closeAll();
  }
};
