/**
 * A reason code has to survive the trip out of the dialog and back in.
 *
 * Reported from a live demo (CA, 2026-09-24) on the Reason Codes Invitational: a reason could be
 * submitted, but re-opening the scoring dialog showed the control on "none". Saving again then
 * dropped the reason, because the modal returns whatever the control currently holds.
 *
 * The value was never lost from the record — verified against the factory, `setMatchUpStatus` with
 * `matchUpStatusCodes: ['RJ']` reads straight back as `["RJ"]`. The dialog simply never read it:
 * `buildStatusCodePicker` started `selectedCode` at `undefined` and only user interaction set it.
 *
 * ── Why a ROUND TRIP, when both halves are already unit-tested ──
 *
 * `statusCodePickerModal.test.ts` proves the dialog submits the chosen code, and the story below
 * proves it re-opens on a recorded one. Those are two tests of two halves, each written against its
 * own idea of the shape in between — and the shape is exactly where this can break:
 *
 *   - the modal EMITS bare strings (`matchUpStatusCodes: ['W2']`), because `modifyMatchUpScore`
 *     types the field `string[]`;
 *   - the factory's `updateMatchUpStatusCodes` REWRAPS stored strings as `{ code }`, so the same
 *     code reads back as `[{ code: 'W2' }]` once propagation has touched the matchUp;
 *   - and `matchUpStatusCodes` means two different things depending on which object it is on — the
 *     policy's vocabulary on the modal's params, what this matchUp recorded on the matchUp. The
 *     factory's own type comments flag the same conflation.
 *
 * So these stories close the loop instead of asserting the halves: what the dialog writes is fed
 * back in as what the dialog reads, in both shapes the record legitimately takes.
 *
 * ── Why Storybook and not another unit test ──
 *
 * This is the library's DOM layer, and the visible round-trip log is the point as much as the
 * assertions are: a director can open these and watch a reason go out and come back. Note that
 * `test-storybook` runs in NO CI workflow here (see the NOTE in `.github/workflows/npm-publish.yml`
 * — the runner's injected harness fails on Linux), so play functions are local evidence. Run them
 * with `pnpm test-storybook` against a running `pnpm storybook`.
 *
 * ── Running these: wait for the BUILD, not for the index ──
 *
 * Two false failures were measured here before a real one, and both were the harness rather than the
 * code. `pnpm storybook` answers `/index.json` **before** it has finished compiling story bundles, so
 * a `test-storybook` run started as soon as that endpoint responds can execute against a half-built
 * graph — it reported "expected 0 to be greater than 1" for a picker that has 7 options. And after
 * editing a story, a still-running dev server serves the OLD play function, which reported a value
 * from a different story entirely. Both were "fixed" by diagnoses that turned out to be wrong.
 *
 * So: restart Storybook after editing, give it time past `/index.json`, and treat an unexplained
 * play-function failure as a question about the server before it is a question about the story. The
 * suite is 608 tests / 88 suites green, and was green with and without the modal guards below —
 * which is how their necessity was checked rather than assumed.
 *
 * ── Modal hygiene, kept on its own merits ──
 *
 * `cModal` mounts to `document.body`, OUTSIDE the story canvas, and the runner visits every story in
 * ONE page, so a dialog left open really does stand into the next story. Nothing in the suite fails
 * over it today — measured, by removing the guards and re-running green — but the hazard is
 * structural and the guard is a line: each story closes any open dialog before opening its own,
 * reads the NEWEST picker rather than the first, and closes up after itself. This file used to leave
 * its dialog standing for everything that followed.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { expect, userEvent } from 'storybook/test';

import { scoringModal } from '../components/scoring/scoringModal';
import { setScoringConfig } from '../components/scoring/config';
import { cModal } from '../components/modal/cmodal';

const { RETIRED, WALKOVER, DOUBLE_WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as any;

/** "Ret [inj]" — a real entry in the shipped USTA vocabulary. */
const RETIRED_INJURY = 'RJ';
/** "Wo [inj]" / "Wo [ill]" — the pair a director actually has to choose between. */
const WALKOVER_INJURY = 'W1';
const WALKOVER_ILLNESS = 'W2';
/** "Wo/Wo" — filed inside the WALKOVER group, because a double walkover IS a walkover. */
const DOUBLE_WALKOVER_CODE = 'WOWO';

const SELECT = '#statusCodeSelectV2';
const SUBMIT = '#submitScoreV2';
const OPEN_BUTTON = '#openScoringDialog';
/** Every `cModal` dialog is a `section` with an id of `cmdl-<n>`. */
const MODAL_SECTION = 'section[id^="cmdl-"]';
const LOG = '#roundTripLog';

const sides = () => [
  { sideNumber: 1, participant: { participantName: 'A. Player' } },
  { sideNumber: 2, participant: { participantName: 'B. Player' } }
];

function retiredMatchUp() {
  return {
    matchUpId: 'reason-round-trip-retired',
    matchUpStatus: RETIRED,
    matchUpStatusCodes: [RETIRED_INJURY],
    winningSide: 1,
    score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 2, winningSide: 1 }], scoreStringSide1: '6-2 Ret.' },
    sides: sides()
  };
}

/**
 * A walkover, carrying whatever the record currently holds.
 *
 * `codes` is passed in rather than fixed so a story can feed the dialog's own output back to it —
 * which is the difference between testing two halves and testing a round trip.
 */
function walkoverMatchUp(codes: unknown[], matchUpStatus: string = WALKOVER) {
  return {
    matchUpId: 'reason-round-trip-walkover',
    matchUpStatus,
    matchUpStatusCodes: codes,
    matchUpFormat: 'SET3-S:6/TB7',
    sides: sides()
  };
}

// ── The harness every story renders ────────────────────────────────────────

/** A button that opens the dialog, and a log the round trip writes to. */
function buildHarness(note: string, onOpen: (append: (line: string) => void) => void) {
  const container = document.createElement('div');
  container.style.cssText = 'padding:12px;';

  const description = document.createElement('div');
  description.style.cssText = 'font-size:0.85rem; margin-bottom:10px; color: var(--chc-text-secondary);';
  description.textContent = note;

  const button = document.createElement('button');
  // `.button.is-info` is THIS library's own class (src/styles/components/buttons.css), themed via
  // --chc-* custom properties. It is Bulma-SHAPED naming, but Bulma is not a dependency and there
  // are no --bulma-* variables anywhere in it — so the ecosystem's no-Bulma rule does not apply.
  // Hand-rolled inline styles here lost the hover, active and focus states the class carries.
  button.className = 'button is-info';
  button.id = OPEN_BUTTON.slice(1);
  button.textContent = 'Open scoring dialog';

  const log = document.createElement('pre');
  log.id = LOG.slice(1);
  log.style.cssText =
    'margin-top:12px; padding:8px; font-size:0.75rem; min-height:2.5em; white-space:pre-wrap;' +
    'background: var(--chc-bg-secondary); color: var(--chc-text-primary);' +
    'border:1px solid var(--chc-border-primary); border-radius:4px;';

  const append = (line: string) => {
    const existing = log.textContent;
    log.textContent = existing ? `${existing}\n${line}` : line;
  };

  button.onclick = () => {
    // Set per open rather than once at module scope: the config is global, and another story
    // switching approaches would otherwise decide which controls this one gets.
    setScoringConfig({ scoringApproach: 'dynamicSets' });
    // A dialog another story left standing would otherwise sit underneath this one, and the
    // play function would read ITS picker.
    closeAnyOpenDialog();
    onOpen(append);
  };

  container.append(description, button, log);
  return container;
}

// ── Play-function helpers ──────────────────────────────────────────────────

/**
 * The NEWEST reason control in the document.
 *
 * `.at(-1)`, not `querySelector`: the modal mounts to `document.body` and a dialog left open by an
 * earlier story is still there, earlier in document order. The dialog just opened is appended last.
 */
const reasonSelect = () => [...document.querySelectorAll<HTMLSelectElement>(SELECT)].at(-1) ?? null;

/** Tear down any dialog still standing, whoever opened it. Bounded, because `close()` pops a stack. */
function closeAnyOpenDialog() {
  for (let attempt = 0; attempt < 5 && document.querySelector(MODAL_SECTION); attempt++) {
    cModal.close();
  }
}

async function openDialog(canvasElement: HTMLElement) {
  const button = canvasElement.querySelector(OPEN_BUTTON) as HTMLElement | null;
  await expect(button).toBeTruthy();
  await userEvent.click(button as HTMLElement);
}

/** Pick a radio by name and value, the way an operator clicks one. */
async function pickRadio(name: string, value: string) {
  const radio = [...document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].find(
    (input) => input.value === value
  );
  await expect(radio).toBeTruthy();
  await userEvent.click(radio as HTMLInputElement);
}

/** Declare an irregular ending and who it went to — what makes the outcome submittable. */
async function declareWalkover(winner = '1') {
  await pickRadio('matchOutcome', WALKOVER);
  await pickRadio('irregularWinner', winner);
}

/**
 * The reason control, asserted present AND visible — a hidden control reads as "no reason".
 *
 * The visibility check is on the picker's OWN root, which is the element `buildStatusCodePicker`
 * sets `display` on. Reading `closest('div')?.parentElement` instead — as this file did — walks one
 * level too far and inspects the container the picker was appended into, which never carries the
 * style. That check passed on a hidden control, which is how a 0-option picker got this far.
 */
async function visibleReasonSelect() {
  const select = reasonSelect();
  await expect(select).toBeTruthy();
  await expect((select as HTMLSelectElement).parentElement?.style.display).not.toBe('none');
  // A control showing the right value but offering no alternatives would mean the status context
  // never resolved — the vocabulary has to actually be attached.
  await expect((select as HTMLSelectElement).options.length).toBeGreaterThan(1);
  return select as HTMLSelectElement;
}

export default {
  title: 'Components/Scoring/Reason Code Round Trip',
  tags: ['autodocs']
};

// ── The original defect: a recorded reason must be read back ───────────────

export const ReopensWithTheRecordedReason = {
  render: () =>
    buildHarness(
      `This matchUp already records reason "${RETIRED_INJURY}" (Ret [inj]). Opening the dialog must show it.`,
      (append) => {
        setScoringConfig({ scoringApproach: 'freeScore' });
        scoringModal({
          matchUp: retiredMatchUp(),
          matchUpStatusCodes: GROUPS,
          callback: (outcome: any) => append(`emitted ${JSON.stringify(outcome?.matchUpStatusCodes)}`)
        });
      }
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await openDialog(canvasElement);
    const select = await visibleReasonSelect();
    // The assertion that fails without the fix: it opened on '' (none).
    await expect(select.value).toBe(RETIRED_INJURY);

    closeAnyOpenDialog();
  }
};

// ── WALKOVER: the family the reason field is most used for ─────────────────

export const WalkoverInjuryReopensWithItsReason = {
  render: () =>
    buildHarness(
      `A walkover recorded as "${WALKOVER_INJURY}" (Wo [inj]). The dialog must open on it, and must offer Wo [ill] beside it.`,
      (append) => {
        scoringModal({
          matchUp: walkoverMatchUp([WALKOVER_INJURY]),
          matchUpStatusCodes: GROUPS,
          callback: (outcome: any) => append(`emitted ${JSON.stringify(outcome?.matchUpStatusCodes)}`)
        });
      }
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await openDialog(canvasElement);
    const select = await visibleReasonSelect();
    await expect(select.value).toBe(WALKOVER_INJURY);

    // Injury and illness are separate codes a director must be able to tell apart — the reason the
    // field exists at all. Asserted on the OPTIONS so a vocabulary that silently collapsed them,
    // or lost its display text, fails here rather than looking fine.
    const options = [...select.options];
    const injury = options.find((option) => option.value === WALKOVER_INJURY);
    const illness = options.find((option) => option.value === WALKOVER_ILLNESS);
    await expect(injury).toBeTruthy();
    await expect(illness).toBeTruthy();
    await expect(injury?.textContent).toContain('Wo [inj]');
    await expect(illness?.textContent).toContain('Wo [ill]');
    await expect(injury?.textContent).not.toBe(illness?.textContent);

    closeAnyOpenDialog();
  }
};

export const AFullRoundTripThroughTheDialog = {
  render: () => {
    // THE RECORD. It starts as what the tournament stored and is replaced by whatever the dialog
    // emits — so the second open reads the dialog's own output. That substitution is the story.
    let recorded: unknown[] = [WALKOVER_INJURY];

    return buildHarness(
      'Open → change Wo [inj] to Wo [ill] → Submit → open again. The second open must show the illness code, ' +
        'because what the dialog emitted has become what the record holds.',
      (append) => {
        append(`record holds ${JSON.stringify(recorded)}`);
        scoringModal({
          matchUp: walkoverMatchUp(recorded),
          matchUpStatusCodes: GROUPS,
          callback: (outcome: any) => {
            recorded = outcome?.matchUpStatusCodes ?? [];
            append(`dialog emitted ${JSON.stringify(outcome?.matchUpStatusCodes)}`);
          }
        });
      }
    );
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Leg 1 — the dialog opens on what the record holds.
    await openDialog(canvasElement);
    await expect((await visibleReasonSelect()).value).toBe(WALKOVER_INJURY);

    // Leg 2 — declare the ending so the outcome is submittable, then change the reason.
    // Re-declaring WALKOVER must not disturb the selection: W1 is still offered, and `update()`
    // only clears a code the new status does not carry.
    await declareWalkover();
    const select = await visibleReasonSelect();
    await expect(select.value).toBe(WALKOVER_INJURY);

    await userEvent.selectOptions(select, WALKOVER_ILLNESS);
    await expect(select.value).toBe(WALKOVER_ILLNESS);

    const submit = document.querySelector(SUBMIT) as HTMLButtonElement | null;
    await expect(submit).toBeTruthy();
    await expect((submit as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(submit as HTMLButtonElement);

    // The emitted shape, read off the log rather than inferred: bare strings, not policy objects,
    // because `modifyMatchUpScore` types the field `string[]`.
    const log = canvasElement.querySelector(LOG) as HTMLElement;
    await expect(log.textContent).toContain(`dialog emitted ["${WALKOVER_ILLNESS}"]`);

    // Leg 3 — the loop closes. This is the whole point: the record now holds what the dialog wrote,
    // and the dialog must be able to read it. Two separate half-tests cannot catch a divergence here.
    await openDialog(canvasElement);
    await expect((await visibleReasonSelect()).value).toBe(WALKOVER_ILLNESS);

    closeAnyOpenDialog();
  }
};

export const TheFactorysWrappedShapeReadsBack = {
  render: () =>
    buildHarness(
      `The same code as the factory stores it after propagation has touched the matchUp: ` +
        `[{ code: "${WALKOVER_ILLNESS}" }], not ["${WALKOVER_ILLNESS}"]. The dialog must read it just the same.`,
      (append) => {
        scoringModal({
          // `updateMatchUpStatusCodes` rewraps stored strings as `{ code }`, so this is not a
          // hypothetical shape — it is what the record holds for any matchUp whose exit has
          // propagated. A reader that assumes a string is wrong only sometimes, which is worse.
          matchUp: walkoverMatchUp([{ code: WALKOVER_ILLNESS }]),
          matchUpStatusCodes: GROUPS,
          callback: (outcome: any) => append(`emitted ${JSON.stringify(outcome?.matchUpStatusCodes)}`)
        });
      }
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await openDialog(canvasElement);
    await expect((await visibleReasonSelect()).value).toBe(WALKOVER_ILLNESS);

    closeAnyOpenDialog();
  }
};

export const ADoubleWalkoverOffersTheWalkoverReasons = {
  render: () =>
    buildHarness(
      'A double walkover has no code group of its own — the policy files "Wo/Wo" inside WALKOVER, because ' +
        'a double walkover IS a walkover. The dialog must reach that group rather than showing nothing.',
      (append) => {
        scoringModal({
          matchUp: walkoverMatchUp([DOUBLE_WALKOVER_CODE], DOUBLE_WALKOVER),
          matchUpStatusCodes: GROUPS,
          callback: (outcome: any) => append(`emitted ${JSON.stringify(outcome?.matchUpStatusCodes)}`)
        });
      }
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await openDialog(canvasElement);
    const select = await visibleReasonSelect();
    await expect(select.value).toBe(DOUBLE_WALKOVER_CODE);

    // The group really is WALKOVER's: the single-sided reasons are offered alongside Wo/Wo. Without
    // the status→group mapping this control would be empty and hidden, and the double-exit choice
    // and the code list would have become two controls that can disagree.
    const values = [...select.options].map((option) => option.value);
    await expect(values).toContain(DOUBLE_WALKOVER_CODE);
    await expect(values).toContain(WALKOVER_INJURY);
    await expect(values).toContain(WALKOVER_ILLNESS);

    closeAnyOpenDialog();
  }
};
