/**
 * The score-entry card IN a modal — what a host actually opens.
 *
 * CA, 2026-09-27: *"we need a story that opens the matchUpFormat picker and we need the score entry
 * card to actually open in a modal so we can see what it looks like when the 'What happened to...'
 * section shows, and we need the [X] to work and we need the [Dynamic Sets] button to be able to select
 * in the modal [Free Score] or [Dial Pad]."*
 *
 * All four are behaviours of `openScoreEntryDialog`, not of these stories. That is deliberate: the
 * wiring used to live in a story, which meant the thing being reviewed in Storybook was not the thing a
 * host would get. These stories now open the shipped dialog and drive it, and the same behaviours are
 * asserted in `__tests__/scoreEntryDialog.test.ts` — which matters here, because `test-storybook` cannot
 * run in this package at all (measured 2026-09-27: 612/612 fail on a runner-internal error, test-runner
 * 0.24 against Storybook 10.2.17). Treat these as the surface to LOOK at; the vitest suite is the gate.
 *
 * ── Modal hygiene ──
 *
 * `cModal` mounts to `document.body`, outside the story canvas, and the runner visits every story in one
 * page. So every story closes any dialog standing from a previous one before opening its own, and play
 * functions query `document` rather than `canvasElement` — a modal is not in the canvas.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../components/scoring/scoreEntryDialog';
import { cModal } from '../components/modal/cmodal';
import { expect } from 'storybook/test';

import type { ScoreEntryDialog, ScoreEntryApproach } from '../components/scoring/scoreEntryDialog';
import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';

const { WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

/** The real shipped vocabulary, never a hand-mirror of it. */
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

export default {
  title: 'Scoring/Score Entry Dialog'
};

const FORMAT = 'SET3-S:6/TB7';
const OPEN_BUTTON = '#openScoreEntry';
/** Every `cModal` dialog is a `section` with an id of `cmdl-<n>`. */
const MODAL = 'section[id^="cmdl-"]';
const CARD = '[data-component="scoreEntryCard"]';
const CLOSE = 'button[data-action="close"]';
const SWITCH = 'button[data-action="switchApproach"]';
const SET_CELL = 'input[data-set]';
const BAND = '.chc-sec-band';

const SIDES: [{ participantName: string; seed?: string }, { participantName: string; seed?: string }] = [
  { participantName: 'Rosalind Lem', seed: '(4)' },
  { participantName: 'Derrick Ellul', seed: '(1)' }
];

/** The NEWEST dialog, because the format picker opens a second one on top. */
const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].pop();
const inModal = <T extends HTMLElement>(selector: string) => topModal()?.querySelector<T>(selector) ?? undefined;
/** Queried across every open dialog, for a control the picker may have covered. */
const anywhere = <T extends HTMLElement>(selector: string) =>
  document.querySelector<T>(`${MODAL} ${selector}`) ?? undefined;

function clickIn(selector: string) {
  const target = anywhere<HTMLElement>(selector);
  if (!target) throw new Error(`nothing matched ${selector}`);
  target.click();
}

/** Close anything a previous story left standing. */
function closeAll() {
  while (document.querySelector(MODAL)) cModal.close();
}

/**
 * The harness: a button that opens the dialog, and a log of what the dialog reports.
 *
 * The log is as much the point as the assertions are — a director can open a story, enter a score and
 * watch the outcome the host would receive, including the structured sets.
 */
function harness(note: string, openDialog: (append: (line: string) => void) => ScoreEntryDialog) {
  const container = document.createElement('div');
  container.style.cssText = 'padding:16px; display:flex; flex-direction:column; gap:12px; align-items:flex-start';

  const description = document.createElement('div');
  description.style.cssText = 'font-size:0.85rem; color: var(--chc-text-secondary); max-width:60ch';
  description.textContent = note;

  const launch = document.createElement('button');
  // This library's own button class, themed through --chc-* — hand-rolled inline styles lost the hover,
  // active and focus states it carries.
  launch.className = 'button is-info';
  launch.id = OPEN_BUTTON.slice(1);
  launch.textContent = 'Open score entry';

  const log = document.createElement('pre');
  log.id = 'scoreEntryLog';
  log.style.cssText =
    'margin:0; padding:8px; font-size:0.75rem; min-height:2.5em; white-space:pre-wrap; align-self:stretch;' +
    'background: var(--chc-bg-secondary); color: var(--chc-text-primary);' +
    'border:1px solid var(--chc-border-primary); border-radius:4px;';

  const append = (line: string) => {
    log.textContent = log.textContent ? `${log.textContent}\n${line}` : line;
  };

  launch.onclick = () => {
    closeAll();
    openDialog(append);
  };

  container.append(description, launch, log);
  return container;
}

/** `6-4` per set, so the log reads as a score rather than as a wall of set objects. */
function gamesPerSet(sets?: any[]): string[] {
  return (sets ?? []).map((set) => `${set.side1Score ?? ''}-${set.side2Score ?? ''}`);
}

/** The shared dialog params. A story overrides only what it is about. */
function dialogParams(append: (line: string) => void, over: Record<string, any> = {}) {
  return {
    sides: SIDES,
    matchUpFormat: FORMAT,
    context: 'R16 · Court 3',
    statusCodeGroups: REAL_GROUPS,
    onSubmit: (outcome: any) => append(`submit → ${JSON.stringify({ ...outcome, sets: gamesPerSet(outcome.sets) })}`),
    onClose: () => append('closed'),
    ...over
  };
}

export const InModal = {
  name: 'In a modal — and "What happened to…" in context',
  render: () =>
    harness('The card in a real cModal at 780px. Click a participant’s name to ask what happened to them.', (append) =>
      openScoreEntryDialog(dialogParams(append) as any)
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    // The card is in the modal, not in the canvas — which is the whole reason these play functions read
    // `document`.
    await expect(topModal()).toBeTruthy();
    await expect(canvasElement.querySelector(CARD)).toBeNull();
    await expect(inModal(CARD)).toBeTruthy();

    // Wide enough for the card: cModal's 450px default wraps the names and overflows the endings row.
    await expect((topModal()!.firstElementChild as HTMLElement).style.maxWidth).toBe('780px');

    // The panel CA wanted to see in context, opened from the participant's name.
    clickIn('button[data-action="endedEarly"][data-side="2"]');
    await expect(inModal('[data-panel-side="2"]')!.textContent).toContain('What happened to Derrick Ellul?');

    clickIn(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    await expect(inModal('[data-row-ending]')!.textContent).toBe('Walkover');
    await expect(inModal(BAND)!.textContent).toContain('Rosalind Lem advances');

    // [X] closes it, which is the other half of "the modal actually works".
    clickIn(CLOSE);
    await expect(document.querySelector(MODAL)).toBeNull();
  }
};

/**
 * The modal opened DIRECTLY in one flavor, rather than switched into.
 *
 * CA, 2026-09-28: *"Can the new Score Entry modal be opened in all three flavors?"* It can —
 * `openScoreEntryDialog({ approach })` — but nothing in Storybook showed it: every modal story opened on
 * the default and only `ApproachSwitching` reached the other two, by clicking. These open cold, which is
 * how a host will open them, and each carries a recorded score so the hydration is visible per flavor.
 */
const RECORDED = {
  matchUpFormat: FORMAT,
  score: {
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
      { setNumber: 2, side1Score: 2, side2Score: 1 }
    ]
  }
};

export const InModalFreeScore = {
  name: 'Opened cold in Free Score',
  render: () =>
    harness('Opened directly in Free Score, on a recorded 6-4 2-1 — not switched into.', (append) =>
      openScoreEntryDialog(dialogParams(append, { approach: 'freeScore', matchUp: RECORDED }) as any)
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    // The text field is the entry surface, and it carries the recorded score: this approach is the one
    // that opened EMPTY before the seed was fixed, because its whole input is text.
    await expect(inModal<HTMLInputElement>('input[data-free-score]')!.value).toBe('6-4 2-1');
    await expect(inModal(SET_CELL)).toBeUndefined();
    await expect(inModal('button[data-digit]')).toBeUndefined();

    // Same chrome as every other flavor — the endings, the band, the footer are the card's, not the
    // region's, which is the whole point of the card owning them.
    await expect(inModal(SWITCH)!.textContent).toBe('Free Score');
    await expect(inModal(BAND)!.textContent).toContain('6-4 2-1');
    await expect(inModal(CLOSE)).toBeTruthy();

    clickIn(CLOSE);
  }
};

export const InModalDialPad = {
  name: 'Opened cold in the Dial Pad',
  render: () =>
    harness('Opened directly in the Dial Pad, on a recorded 6-4 2-1 — not switched into.', (append) =>
      openScoreEntryDialog(dialogParams(append, { approach: 'dialPad', matchUp: RECORDED }) as any)
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    // Ten digit keys, and the rows READ rather than accept input.
    await expect(topModal()!.querySelectorAll('button[data-digit]')).toHaveLength(10);
    await expect(inModal(SET_CELL)).toBeUndefined();
    await expect([...topModal()!.querySelectorAll('.chc-sec-readout')].map((cell) => cell.textContent)).toEqual([
      '6  2',
      '4  1'
    ]);

    await expect(inModal(SWITCH)!.textContent).toBe('Dial Pad');
    await expect(inModal(BAND)!.textContent).toContain('6-4 2-1');

    clickIn(CLOSE);
  }
};

export const ApproachSwitching = {
  name: 'The switcher — Dynamic Sets, Free Score, Dial Pad',
  render: () =>
    harness(
      'Open, type a set, then switch approach from the header. The score and any ending come with you.',
      (append) =>
        openScoreEntryDialog(
          dialogParams(append, {
            onApproachChange: (approach: ScoreEntryApproach) => append(`approach → ${approach}`)
          }) as any
        )
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    const type = (selector: string, value: string) => {
      const field = inModal<HTMLInputElement>(selector)!;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    type('input[data-side="1"][data-set="1"]', '6');
    type('input[data-side="2"][data-set="1"]', '4');

    clickIn(SWITCH);
    const offered = [...topModal()!.querySelectorAll<HTMLElement>('[data-approach]')];
    await expect(offered.map((item) => item.dataset.approach)).toEqual(['dynamicSets', 'freeScore', 'dialPad']);
    // The active approach is listed and CHECKED rather than omitted — a menu missing its current state
    // makes the operator infer it from what is absent.
    await expect(inModal('[data-approach="dynamicSets"]')!.getAttribute('aria-pressed')).toBe('true');

    clickIn('[data-approach="freeScore"]');

    // The typed score came across, and the switcher says where you are.
    await expect(inModal<HTMLInputElement>('input[data-free-score]')!.value).toContain('6-4');
    await expect(inModal(SWITCH)!.textContent).toBe('Free Score');
    await expect(inModal('input[data-set="1"]')).toBeUndefined();

    clickIn(SWITCH);
    clickIn('[data-approach="dialPad"]');

    await expect(inModal('button[data-digit="6"]')).toBeTruthy();
    await expect([...topModal()!.querySelectorAll('.chc-sec-readout')].map((cell) => cell.textContent)).toEqual([
      '6',
      '4'
    ]);

    clickIn(CLOSE);
  }
};

export const FormatPicker = {
  name: 'The format chip — opens the real picker',
  render: () =>
    harness(
      'The format code in the header is a button. It opens this package’s matchUpFormat picker, on top.',
      (append) =>
        openScoreEntryDialog(
          dialogParams(append, {
            // Present, so the chip becomes a button: without a host that can accept a change it stays inert
            // text rather than opening a picker whose choice would go nowhere.
            onFormatChange: (matchUpFormat: string) => append(`format → ${matchUpFormat}`)
          }) as any
        )
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    closeAll();
    canvasElement.querySelector<HTMLButtonElement>(OPEN_BUTTON)!.click();

    const chip = inModal<HTMLButtonElement>('button[data-action="editFormat"]')!;
    await expect(chip.textContent).toBe(FORMAT);
    await expect(chip.getAttribute('aria-label')).toBe(`Scoring format ${FORMAT} — edit`);

    chip.click();

    // The REAL picker — `getMatchUpFormatModal`, which was barrel-exported and wired to nothing. It opens
    // as a second cModal on top, and the card is still underneath.
    await expect(document.querySelectorAll(MODAL)).toHaveLength(2);
    await expect(document.querySelectorAll(CARD)).toHaveLength(1);

    // Dismiss the picker and the card is still there, with its score intact — the nested-modal teardown
    // that cModal gets wrong when a whole stack is closed at once.
    cModal.close();
    await expect(document.querySelectorAll(MODAL)).toHaveLength(1);
    await expect(inModal(CARD)).toBeTruthy();

    clickIn(CLOSE);
    await expect(document.querySelector(MODAL)).toBeNull();
  }
};
