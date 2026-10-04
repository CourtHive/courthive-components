/**
 * @vitest-environment happy-dom
 *
 * The scoring STORIES, executed.
 *
 * `test-storybook` cannot run in this package — measured 2026-09-27, 612/612 fail on a runner-internal
 * error (test-runner 0.24 against Storybook 10.2.17) — and it appears in no workflow. The consequence is
 * that a play function here is unexecuted code: it can reference a selector that no longer exists, or
 * assert something that has quietly become false, and nothing says so until a person opens Storybook and
 * reads a red panel.
 *
 * So the play functions are driven here instead, in happy-dom, exactly as the runner would: render into
 * a canvas attached to the document, then `play({ canvasElement })`. That does NOT make this a browser —
 * layout, real pointer events and focus rings are still unchecked, and those remain reasons to open
 * Storybook. What it does mean is that a broken story fails CI rather than waiting to be noticed.
 */
import * as overADrawStories from '../scoreEntryOverADraw.stories';
import * as roundTripStories from '../scoreEntryRoundTrip.stories';
import { toEngineOutcome } from '../helpers/scoreEntryEngineHost';
import { renderDrawBehind } from '../scoreEntryOverADraw.stories';
import * as dialogStories from '../scoreEntryDialog.stories';
import * as cardStories from '../scoreEntryCard.stories';
import { describe, it, expect, afterEach } from 'vitest';
import { cModal } from '../../components/modal/cmodal';

import { tournamentEngine, matchUpStatusConstants } from 'tods-competition-factory';

const { COMPLETED, WALKOVER, DOUBLE_WALKOVER, TO_BE_PLAYED, IN_PROGRESS } = matchUpStatusConstants;

const MODAL = 'section[id^="cmdl-"]';

type Story = { name?: string; render: () => HTMLElement; play: (context: any) => Promise<void> };

/** Every export that looks like a story: a `render` plus the `play` this file exists to execute. */
function playableIn(module: Record<string, any>): [string, Story][] {
  return Object.entries(module).filter(
    ([, story]) => typeof story?.render === 'function' && typeof story?.play === 'function'
  ) as [string, Story][];
}

const playable = [
  ...playableIn(cardStories),
  ...playableIn(dialogStories),
  ...playableIn(roundTripStories),
  ...playableIn(overADrawStories)
];

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.replaceChildren();
});

describe('the dialog stories run', () => {
  // A guard, not a formality: a rename that broke the filter above would leave this file silently
  // asserting nothing, which is the failure mode it was written to prevent.
  // Listed by name rather than counted, so a story that stops being picked up is named in the failure.
  it('found every story in both modules', () => {
    expect(playable.map(([name]) => name)).toEqual([
      'PlayedOut',
      'Walkover',
      'ClearedPartScore',
      'Tiebreak',
      'MatchTiebreak',
      'SubmitAndReopen',
      'NineTimedBolts',
      'InModal',
      'InModalFreeScore',
      'InModalDialPad',
      'ApproachSwitching',
      'FormatPicker',
      'OutAndBackIn',
      'EnterSubmitReopenClear',
      'ReopenARetirement',
      'ReopenAMatchLevelEnding',
      'ReopenADoubleExit',
      'DrawBehindTheModal'
    ]);
  });

  for (const [name, story] of playable) {
    it(`${name} — ${story.name ?? ''}`, async () => {
      const canvasElement = document.createElement('div');
      document.body.append(canvasElement);
      canvasElement.append(story.render());

      await story.play({ canvasElement });
    });
  }
});

/**
 * The draw behind the modal, driven through the story's own handlers.
 *
 * Each case here is one CA asked to see the engine's answer to (`scoreEntryNotes.txt` note 10, and the
 * S7 brief in `Mentat/planning/SCORE_ENTRY_STATE_ENGINE.md`). Where the answer is not the one CA
 * expected, the test pins what was MEASURED — against published factory 7.4.0 on 2026-10-01 — so that
 * a factory release which changes it announces itself here rather than in a director's draw.
 *
 * One tournament per test: `renderDrawBehind` loads a fresh mocks-engine record into the singleton
 * engine, so nothing a previous test scored is standing when the next one opens.
 */
describe('the draw behind the modal', () => {
  const MODAL_SEL = MODAL;
  const SUBMIT = 'button[data-action="submit"]';
  const BAND = '.chc-sec-band';
  const ROW_ENDING = '[data-row-ending]';
  const PRESSED = 'aria-pressed';
  /** "Wo [inj]" — a real entry in the shipped vocabulary. */
  const WALKOVER_INJURY = 'W1';
  const TIEBREAK_LINE = '7-6(3) 6-4';
  const FAST4 = 'SET3-S:4/TB7';

  const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL_SEL)].pop();
  const inModal = <T extends HTMLElement>(selector: string) => topModal()?.querySelector<T>(selector) ?? undefined;
  const cell = (side: number, set: number) =>
    inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
  const tiebreak = (side: number, set: number) =>
    inModal<HTMLInputElement>(`input[data-tiebreak-side="${side}"][data-tiebreak-set="${set}"]`)!;
  const done = (side: number, set: number) =>
    inModal<HTMLButtonElement>(`button[data-done-side="${side}"][data-done-set="${set}"]`);
  const fill = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const click = (selector: string) => {
    const target = inModal<HTMLElement>(selector);
    if (!target) throw new Error(`nothing matched ${selector}`);
    target.click();
  };
  const set = (setNumber: number, side1Score: number, side2Score: number, winningSide?: number) => ({
    setNumber,
    side1Score,
    side2Score,
    ...(winningSide ? { winningSide } : {})
  });

  function mount() {
    const { element, host } = renderDrawBehind();
    document.body.append(element);
    const logText = () => element.querySelector('#overDrawLog')!.textContent ?? '';
    return { host, logText };
  }

  it('REFUSES 4-2 2-6 2-6 from a host that bypasses the card — a first set at 4-2 never finished', () => {
    // CA, note 10: *"I'm sure if this went to the factory it would return an error"*. Through 7.4.0 it
    // did not: the engine checked set bounds, not completeness, and recorded this as COMPLETED. Factory
    // #5096 refuses it — every set before the last must be finished — so the card is no longer the only
    // guard.
    const { host } = mount();
    const sets = [set(1, 4, 2), set(2, 2, 6, 2), set(3, 2, 6, 2)];

    const answer = host.submitToEngine({ sets, winningSide: 2, matchUpStatus: COMPLETED });

    expect(answer.result.error?.code).toBe('ERR_INVALID_SCORE');
    expect(host.held().matchUpStatus, 'a refusal writes nothing').toBe(TO_BE_PLAYED);
    expect(host.held().winningSide).toBeUndefined();
  });

  it('REFUSES a 3-7 as well — it is inside the bounds, but no set under a tiebreak at six ends 7-3', () => {
    const { host } = mount();

    const answer = host.submitToEngine({
      sets: [set(1, 3, 7, 2), set(2, 6, 4, 1), set(3, 6, 4, 1)],
      winningSide: 1,
      matchUpStatus: COMPLETED
    });
    expect(answer.result.error?.code).toBe('ERR_INVALID_SCORE');
    expect(host.held().matchUpStatus).toBe(TO_BE_PLAYED);

    // The control: the same match with a finished first set is recorded, so the refusal is about 3-7.
    const control = host.submitToEngine({
      sets: [set(1, 3, 6, 2), set(2, 6, 4, 1), set(3, 6, 4, 1)],
      winningSide: 1,
      matchUpStatus: COMPLETED
    });
    expect(control.result.error).toBeUndefined();
    expect(host.held().score.scoreStringSide1).toBe('3-6 6-4 6-4');
  });

  it("REFUSES the dialog's score STRING, so a host that spreads the outcome is refused on every Submit", () => {
    const { host } = mount();
    const dialogOutcome = {
      score: '6-4 6-3',
      sets: [set(1, 6, 4, 1), set(2, 6, 3, 1)],
      winningSide: 1,
      matchUpStatus: COMPLETED
    };

    // The raw spread — what a host does when it has not read the engine's shape.
    const raw: any = tournamentEngine.setMatchUpStatus({ ...host.ref, outcome: { ...dialogOutcome } });
    expect(raw.error?.code).toBe('ERR_INVALID_VALUES');
    expect(host.held().matchUpStatus, 'and nothing was written').toBe(TO_BE_PLAYED);

    // The mapping: no string, the sets as `score.sets`. Falsified by forwarding `score` in `toEngineOutcome`.
    expect('score' in toEngineOutcome(dialogOutcome) && typeof toEngineOutcome(dialogOutcome).score).toBe('object');
    const mapped = host.submitToEngine(dialogOutcome);
    expect(mapped.result.success).toBe(true);
    expect(host.held().score.scoreStringSide1).toBe('6-4 6-3');
  });

  it('a `cleared` outcome sent as-is is NOT a clear; the empty-sets outcome is (measured 7.4.0)', () => {
    const { host } = mount();
    host.submitToEngine({ sets: [set(1, 6, 4, 1), set(2, 6, 3, 1)], winningSide: 1, matchUpStatus: COMPLETED });
    expect(host.held().matchUpStatus).toBe(COMPLETED);

    // The field the dialog reports means nothing to the engine: the winner goes, the stale score stays,
    // and the matchUp reads as still being played.
    const raw: any = tournamentEngine.setMatchUpStatus({ ...host.ref, outcome: { cleared: true } });
    expect(raw.success).toBe(true);
    expect(host.held().matchUpStatus, 'a stale score left standing as in progress').toBe(IN_PROGRESS);
    expect(host.held().winningSide).toBeUndefined();
    expect(host.held().score.scoreStringSide1).toBe('6-4 6-3');

    // Through the host's mapping it is the clear CA asked for.
    const mapped = host.submitToEngine({ cleared: true });
    expect(mapped.sent).toEqual({ score: { sets: [] }, matchUpStatusCodes: [] });
    expect(mapped.result.success).toBe(true);
    expect(host.held().matchUpStatus).toBe(TO_BE_PLAYED);
    expect(host.held().score?.scoreStringSide1 ?? '').toBe('');
  });

  it('a walkover with no score: accepted, the reason filed against the exiting side, and it reopens that way', () => {
    const { host, logText } = mount();
    host.open();

    click('button[data-action="endedEarly"][data-side="2"]');
    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    click(`[data-panel-side="2"] button[data-reason="${WALKOVER_INJURY}"]`);
    expect(inModal(BAND)!.textContent).toContain('advances');
    click(SUBMIT);

    expect(topModal(), 'Submit closes the dialog').toBeUndefined();
    expect(logText()).toContain('engine accepted');
    const held = host.held();
    expect(held.matchUpStatus).toBe(WALKOVER);
    expect(held.winningSide).toBe(1);
    expect(held.score?.scoreStringSide1 ?? '').toBe('');
    // Sent positionally, read back SPLIT — the engine files a single exit's reason by side.
    expect(held.sideStatusCodes).toEqual({ 2: WALKOVER_INJURY });

    // Reopened on the engine's matchUp: the ending on the row that exited, the reason chip pressed.
    host.open();
    const row = inModal<HTMLElement>(ROW_ENDING)!;
    expect(row.dataset.rowEnding).toBe(WALKOVER);
    expect(row.closest<HTMLElement>('.chc-sec-row')?.dataset.side).toBe('2');
    click('button[data-action="endedEarly"][data-side="2"]');
    expect(
      inModal(`[data-panel-side="2"] button[data-reason="${WALKOVER_INJURY}"]`)!.getAttribute(PRESSED),
      'the reason survived the trip through sideStatusCodes'
    ).toBe('true');
  });

  it('a submitted 7-6(3) comes back as 7-6(3), the tiebreak raised on the LOW side', () => {
    const { host } = mount();
    host.open();

    fill(cell(1, 1), '7');
    fill(cell(2, 1), '6');
    fill(tiebreak(1, 1), '7');
    fill(tiebreak(2, 1), '3');
    fill(cell(2, 2), '4');
    fill(cell(1, 2), '6');
    expect(inModal(BAND)!.textContent).toContain(TIEBREAK_LINE);
    click(SUBMIT);

    // The engine's own string, and both tiebreak scores on the set — the engine refuses a set that
    // carries only the loser's points, so what the model reports is what makes this acceptable.
    const held = host.held();
    expect(held.score.scoreStringSide1).toBe(TIEBREAK_LINE);
    expect(held.score.sets[0]).toMatchObject({ side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 });

    // Reopened on the engine's matchUp, every set folded: 7 over 6³, nothing raised beside the winner.
    // A reopened result focuses no entry cell (CA, 2026-10-01), so no set is pulled open by a caret —
    // which is what used to leave set 1 showing its fields while set 2 was folded.
    host.open();
    expect(done(1, 1)?.textContent).toBe('7');
    expect(done(2, 1)?.textContent).toBe('63');
    expect(done(2, 1)?.querySelector('sup')?.textContent, 'raised on the LOW side').toBe('3');
    expect(done(1, 1)?.querySelector('sup'), 'nothing beside the winner').toBeNull();
    expect(cell(1, 1).hidden, 'the fields are hidden behind the fold').toBe(true);
    expect(done(1, 2)?.textContent).toBe('6');
    expect(done(2, 2)?.textContent).toBe('4');
    expect(inModal('input:focus, button[data-digit]:focus'), 'no entry cell holds focus').toBeUndefined();
    expect(inModal(BAND)!.textContent).toContain(TIEBREAK_LINE);
  });

  it('a DOUBLE_WALKOVER round-trips through hydration, and its reason does not outlive a clear', () => {
    const { host } = mount();
    host.open();

    click('button[data-action="endedEarly"][data-side="1"]');
    click(`[data-panel-side="1"] button[data-ending="${WALKOVER}"]`);
    const both = inModal<HTMLInputElement>('[data-panel-side="1"] input[data-action="bothSidesOut"]')!;
    both.click();
    if (!both.checked) {
      both.checked = true;
      both.dispatchEvent(new Event('change', { bubbles: true }));
    }
    click(`[data-panel-side="1"] button[data-reason="${WALKOVER_INJURY}"]`);
    expect(topModal()!.querySelectorAll(ROW_ENDING), 'both rows marked before submitting').toHaveLength(2);
    click(SUBMIT);

    const held = host.held();
    expect(held.matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect(held.winningSide).toBeUndefined();
    expect(held.sideStatusCodes).toEqual({ 1: WALKOVER_INJURY, 2: WALKOVER_INJURY });

    // Hydrated from the engine's matchUp: both rows, and the reason offered as the pressed chip.
    host.open();
    expect(topModal()!.querySelectorAll(ROW_ENDING)).toHaveLength(2);
    click('button[data-action="endedEarly"][data-side="1"]');
    expect(inModal(`[data-panel-side="1"] button[data-reason="${WALKOVER_INJURY}"]`)!.getAttribute(PRESSED)).toBe(
      'true'
    );

    // Clear and submit: the empty-sets outcome with `matchUpStatusCodes: []`. Without the empty array
    // the engine keeps the reason of the outcome just removed — measured.
    click('button[data-action="clear"]');
    click(SUBMIT);
    expect(host.held().matchUpStatus).toBe(TO_BE_PLAYED);
    expect(host.held().sideStatusCodes).toBeUndefined();
    expect(host.held().matchUpStatusCodes).toBeUndefined();

    host.open();
    expect(inModal(ROW_ENDING), 'reopens with no ending').toBeUndefined();
    closeAllModals();
  });

  it('a format chosen through the chip rides to the engine with the Submit, and the reopen shows it', () => {
    const { host, logText } = mount();
    const dialog = host.open();

    // The real picker is a second modal; the dialog's own `setMatchUpFormat` is what its callback calls,
    // and it reports through `onFormatChange` exactly as the picker would.
    dialog.setMatchUpFormat(FAST4);
    expect(logText()).toContain(`format → ${FAST4}`);
    fill(cell(2, 1), '2');
    fill(cell(1, 1), '4');
    fill(cell(2, 2), '1');
    fill(cell(1, 2), '4');
    expect(inModal(BAND)!.textContent).toContain('4-2 4-1');
    click(SUBMIT);

    // Persisted by the engine with the result: the score string is read under the new format.
    expect(host.held().matchUpFormat).toBe(FAST4);
    expect(host.held().score.scoreStringSide1).toBe('4-2 4-1');

    host.open();
    expect(inModal('button[data-action="editFormat"]')!.textContent, 'the chip reads the engine’s format').toBe(FAST4);
  });

  function closeAllModals() {
    for (let attempt = 0; attempt < 6 && document.querySelector(MODAL_SEL); attempt += 1) cModal.close();
  }
});
