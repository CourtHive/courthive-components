/**
 * The score-entry dialog over a REAL draw, driven by an operator's input: each Submit reaches
 * `tournamentEngine.setMatchUpStatus`, and each reopen reads the matchUp back from the engine.
 *
 * The round-trip stories (`scoreEntryRoundTrip.stories.ts`) reopen on a record the story built with
 * `asRecord`; these reopen on what the ENGINE stored, which is where a walkover's split reason codes, a
 * tiebreak's two scores, a double exit and a chosen format can each be lost. Moved from the retired
 * happy-dom `__tests__/scoringStories.test.ts`; the engine contract without the dialog is a node test,
 * `__tests__/scoreEntryEngineHost.test.ts`.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderDrawBehind } from './scoreEntryOverADraw.stories';
import { cModal } from '../components/modal/cmodal';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

import type { StoryObj } from '@storybook/html-vite';

export default {
  title: 'Scoring/Score Entry/Tests/Over a Draw',
  tags: ['!dev']
};

const { WALKOVER, DOUBLE_WALKOVER, TO_BE_PLAYED } = matchUpStatusConstants;

const MODAL = 'section[id^="cmdl-"]';
const SUBMIT = 'button[data-action="submit"]';
const BAND = '.chc-sec-band';
const ROW_ENDING = '[data-row-ending]';
/** "Wo [inj]" — a real entry in the shipped vocabulary. */
const WALKOVER_INJURY = 'W1';
const TIEBREAK_LINE = '7-6(3) 6-4';
const FAST4 = 'SET3-S:4/TB7';

const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].pop();
const inModal = <T extends HTMLElement>(selector: string) => topModal()?.querySelector<T>(selector) ?? undefined;
const cell = (side: number, set: number) => inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
const tiebreak = (side: number, set: number) =>
  inModal<HTMLInputElement>(`input[data-tiebreak-side="${side}"][data-tiebreak-set="${set}"]`)!;
const done = (side: number, set: number) =>
  inModal<HTMLButtonElement>(`button[data-done-side="${side}"][data-done-set="${set}"]`);
const press = async (selector: string) => {
  const target = inModal<HTMLElement>(selector);
  if (!target) throw new Error(`nothing matched ${selector}`);
  await user.click(target);
};
const reason = (side: number) =>
  inModal<HTMLElement>(`[data-panel-side="${side}"] button[data-reason="${WALKOVER_INJURY}"]`);

function closeAll(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/** A fresh tournament behind the dialog, its harness on the canvas. */
function mount(canvasElement: HTMLElement) {
  closeAll();
  const { element, host } = renderDrawBehind();
  canvasElement.replaceChildren(element);
  const logText = () => element.querySelector('#overDrawLog')!.textContent ?? '';
  return { host, logText };
}

const empty = () => document.createElement('div');

export const WalkoverReopensOnTheExitingSide: StoryObj = {
  name: 'A walkover with no score: accepted, its reason filed against the exiting side, and it reopens that way',
  render: empty,
  play: async ({ canvasElement }) => {
    const { host, logText } = mount(canvasElement);
    host.open();

    await press('button[data-action="endedEarly"][data-side="2"]');
    await press(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    await press(`[data-panel-side="2"] button[data-reason="${WALKOVER_INJURY}"]`);
    await expect(inModal(BAND)!.textContent).toContain('advances');
    await press(SUBMIT);

    await expect(topModal(), 'Submit closes the dialog').toBeUndefined();
    await expect(logText()).toContain('engine accepted');
    const held = host.held();
    await expect(held.matchUpStatus).toBe(WALKOVER);
    await expect(held.winningSide).toBe(1);
    await expect(held.score?.scoreStringSide1 ?? '').toBe('');
    // Sent positionally, read back SPLIT — the engine files a single exit's reason by side.
    await expect(held.sideStatusCodes).toEqual({ 2: WALKOVER_INJURY });

    // Reopened on the engine's matchUp: the ending on the row that exited, the reason chip pressed.
    host.open();
    const row = inModal<HTMLElement>(ROW_ENDING)!;
    await expect(row).toBeVisible();
    await expect(row.dataset.rowEnding).toBe(WALKOVER);
    await expect(row.closest<HTMLElement>('.chc-sec-row')?.dataset.side).toBe('2');
    await press('button[data-action="endedEarly"][data-side="2"]');
    await expect(reason(2)).toBeVisible();
    await expect(reason(2)!.ariaPressed, 'the reason survived the trip through sideStatusCodes').toBe('true');
    closeAll();
  }
};

export const TiebreakReopensFolded: StoryObj = {
  name: 'A submitted 7-6(3) comes back as 7-6(3), the tiebreak raised on the LOW side, nothing focused',
  render: empty,
  play: async ({ canvasElement }) => {
    const { host } = mount(canvasElement);
    host.open();

    await user.fill(cell(1, 1), '7');
    await user.fill(cell(2, 1), '6');
    await user.fill(tiebreak(1, 1), '7');
    await user.fill(tiebreak(2, 1), '3');
    await user.fill(cell(2, 2), '4');
    await user.fill(cell(1, 2), '6');
    await expect(inModal(BAND)!.textContent).toContain(TIEBREAK_LINE);
    await press(SUBMIT);

    // The engine's own string, and both tiebreak scores on the set — the engine refuses a set that
    // carries only the loser's points, so what the model reports is what makes this acceptable.
    const held = host.held();
    await expect(held.score.scoreStringSide1).toBe(TIEBREAK_LINE);
    await expect(held.score.sets[0]).toMatchObject({ side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 });

    // Reopened on the engine's matchUp, every set folded: 7 over 6³, nothing raised beside the winner.
    // A reopened result focuses no entry cell (CA, 2026-10-01), so no set is pulled open by a caret.
    host.open();
    await expect(done(1, 1)).toBeVisible();
    await expect(done(1, 1)?.textContent).toBe('7');
    await expect(done(2, 1)?.textContent).toBe('63');
    await expect(done(2, 1)?.querySelector('sup')?.textContent, 'raised on the LOW side').toBe('3');
    await expect(done(1, 1)?.querySelector('sup'), 'nothing beside the winner').toBeNull();
    await expect(done(1, 2)?.textContent).toBe('6');
    await expect(done(2, 2)?.textContent).toBe('4');
    for (const [side, set] of [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2]
    ]) {
      await expect(cell(side, set), `set ${set} side ${side}: its field is folded away`).not.toBeVisible();
      await expect(cell(side, set).checkVisibility()).toBe(false);
    }

    // Where focus actually is: on the dialog's own section, so Escape and Tab start inside it.
    await waitFor(() => expect(topModal()).toHaveFocus());
    await expect(inModal(BAND)!.textContent).toContain(TIEBREAK_LINE);
    closeAll();
  }
};

export const DoubleWalkoverClears: StoryObj = {
  name: 'A DOUBLE_WALKOVER round-trips through the engine, and its reason does not outlive a clear',
  render: empty,
  play: async ({ canvasElement }) => {
    const { host } = mount(canvasElement);
    host.open();

    await press('button[data-action="endedEarly"][data-side="1"]');
    await press(`[data-panel-side="1"] button[data-ending="${WALKOVER}"]`);
    const both = inModal<HTMLInputElement>('[data-panel-side="1"] input[data-action="bothSidesOut"]')!;
    await user.click(both);
    await expect(both, 'one real click ticks "no one advances"').toBeChecked();
    await press(`[data-panel-side="1"] button[data-reason="${WALKOVER_INJURY}"]`);
    await expect(topModal()!.querySelectorAll(ROW_ENDING), 'both rows marked before submitting').toHaveLength(2);
    await press(SUBMIT);

    const held = host.held();
    await expect(held.matchUpStatus).toBe(DOUBLE_WALKOVER);
    await expect(held.winningSide).toBeUndefined();
    await expect(held.sideStatusCodes).toEqual({ 1: WALKOVER_INJURY, 2: WALKOVER_INJURY });

    // Hydrated from the engine's matchUp: both rows, and the reason offered as the pressed chip.
    host.open();
    await expect(topModal()!.querySelectorAll(ROW_ENDING)).toHaveLength(2);
    await press('button[data-action="endedEarly"][data-side="1"]');
    await expect(reason(1)!.ariaPressed).toBe('true');

    // Clear and submit: the empty-sets outcome with `matchUpStatusCodes: []`. Without the empty array the
    // engine keeps the reason of the outcome just removed — measured.
    await press('button[data-action="clear"]');
    await press(SUBMIT);
    await expect(host.held().matchUpStatus).toBe(TO_BE_PLAYED);
    await expect(host.held().sideStatusCodes).toBeUndefined();
    await expect(host.held().matchUpStatusCodes).toBeUndefined();

    host.open();
    await expect(inModal(ROW_ENDING), 'reopens with no ending').toBeUndefined();
    closeAll();
  }
};

export const ChosenFormatRidesToTheEngine: StoryObj = {
  name: 'A format chosen for the dialog rides to the engine with the Submit, and the reopen shows it',
  render: empty,
  play: async ({ canvasElement }) => {
    const { host, logText } = mount(canvasElement);
    const dialog = host.open();

    // The real picker is a second modal, driven by `MatchUpFormatOverScoreEntryTests`; the dialog's own
    // `setMatchUpFormat` is what the picker's callback calls, and it reports through `onFormatChange`.
    dialog.setMatchUpFormat(FAST4);
    await expect(logText()).toContain(`format → ${FAST4}`);
    await expect(inModal('button[data-action="editFormat"]')!.textContent).toBe(FAST4);
    await user.fill(cell(2, 1), '2');
    await user.fill(cell(1, 1), '4');
    await user.fill(cell(2, 2), '1');
    await user.fill(cell(1, 2), '4');
    await expect(inModal(BAND)!.textContent).toContain('4-2 4-1');
    await press(SUBMIT);

    // Persisted by the engine with the result: the score string is read under the new format.
    await expect(host.held().matchUpFormat).toBe(FAST4);
    await expect(host.held().score.scoreStringSide1).toBe('4-2 4-1');

    host.open();
    const chip = inModal('button[data-action="editFormat"]')!;
    await expect(chip).toBeVisible();
    await expect(chip.textContent, 'the chip reads the engine’s format').toBe(FAST4);
    closeAll();
  }
};
