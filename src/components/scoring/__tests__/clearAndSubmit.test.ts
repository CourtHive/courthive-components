// @vitest-environment happy-dom
/**
 * Submitting an EMPTY score removes a recorded one.
 *
 * CA, 2026-09-29: *"I should be able to [Clear] and [Submit] a cleared score... the current scoring
 * modals allow for an empty score to be submitted which clears a submitted score in the factory for
 * the matchUp being modified... this scoring dialog needs to support that too!"*
 *
 * Measured before the fix, on `dev` at `2c9da7e`: opening on a recorded `6-4 6-3` and pressing
 * `[Clear]` left `submit.disabled === true`, so a score entered through this dialog could never be
 * taken back out through it.
 *
 * The rule is `scoringModal.ts`'s, not a new one: `wasCleared && hadExistingScore`. Each part is
 * asserted separately below, because a gate that is right for the wrong reason passes the happy case
 * and fails the two that matter — a blank card offering to clear nothing, and a retyped score
 * submitting as a deletion.
 */
import { describe, expect, it } from 'vitest';

import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const FORMAT = 'SET3-S:6/TB7';
const RECORDED_SETS = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
];

const modal = () => [...document.querySelectorAll<HTMLElement>('section[id^="cmdl-"]')].pop();
const inModal = <T extends HTMLElement>(selector: string) => modal()?.querySelector<T>(selector) as T;
const submit = () => inModal<HTMLButtonElement>('button[data-action="submit"]');
const clear = () => inModal<HTMLButtonElement>('button[data-action="clear"]');
const band = () => inModal<HTMLElement>('.chc-sec-band');

function closeAll() {
  for (let attempt = 0; attempt < 5 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
}

function type(side: number, set: number, value: string) {
  const input = inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Open on a matchUp that already holds `6-4 6-3`, which is the only state a clear is meaningful in. */
function openOnARecordedScore(onSubmit?: (outcome: any) => void) {
  closeAll();
  return openScoreEntryDialog({
    sides: SIDES,
    matchUp: { matchUpFormat: FORMAT, winningSide: 1, score: { sets: RECORDED_SETS } },
    onSubmit
  } as any);
}

describe('clearing a recorded outcome', () => {
  it('SUBMITS the empty result, which is how a stored score is removed', () => {
    let outcome: any;
    openOnARecordedScore((result) => (outcome = result));

    expect(submit().disabled, 'a complete recorded score is submittable as it stands').toBe(false);

    clear().click();

    expect(submit().disabled, 'and stays submittable once cleared — this is the fix').toBe(false);

    submit().click();

    // `cleared: true` and nothing else. A host reading four undefined fields cannot tell this from a
    // submission that says nothing, and the two mean opposite things.
    expect(outcome).toBeDefined();
    expect(outcome.cleared).toBe(true);
    expect(outcome.score).toBeUndefined();
    expect(outcome.winningSide).toBeUndefined();
    expect(outcome.matchUpStatus).toBeUndefined();

    closeAll();
  });

  it('says so in the band, rather than reading as an empty new entry', () => {
    openOnARecordedScore();
    clear().click();

    expect(band().textContent).toContain('removed');
    expect(band().dataset.tone).toBe('warn');
    expect(band().textContent).not.toContain('No result entered yet');

    closeAll();
  });

  it('does NOT offer to clear a matchUp that never had a score', () => {
    closeAll();
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT } as any);

    // Nothing to clear, so nothing to submit. Offering it would be offering to delete nothing, and
    // the shipping modal does not offer it either — `hadExistingScore` is half its rule.
    expect(clear().disabled).toBe(true);
    expect(submit().disabled).toBe(true);

    closeAll();
  });

  it('stops being a clear the moment a score is typed again', () => {
    let outcome: any;
    openOnARecordedScore((result) => (outcome = result));
    clear().click();

    type(2, 1, '4');
    type(1, 1, '6');
    type(2, 2, '3');
    type(1, 2, '6');

    expect(band().textContent, 'the band went back to describing a result').toContain('6-4 6-3');

    submit().click();

    // The retyped score, NOT a deletion. This is the assertion that fails if the flag is never reset.
    expect(outcome.cleared).toBeUndefined();
    expect(outcome.score).toBe('6-4 6-3');
    expect(outcome.winningSide).toBe(1);

    closeAll();
  });

  it('needs the BUTTON — emptying the cells by hand is not a clear', () => {
    openOnARecordedScore();

    // Every cell blanked, so the card holds nothing. The shipping modal gates on `wasCleared`, not on
    // emptiness, and this dialog mirrors it: `[Clear]` is the act that says "remove it", and a cell
    // emptied mid-correction is somebody halfway through typing a different score.
    // Last set first: emptying set 1 folds set 2's column away, and its cells go with it.
    for (const setNumber of [2, 1]) {
      type(1, setNumber, '');
      type(2, setNumber, '');
    }

    expect(submit().disabled, 'an empty card that was never cleared submits nothing').toBe(true);
    expect(clear().disabled, 'and there is nothing left for Clear to take either').toBe(true);

    closeAll();
  });

  it('does not arm on a score the operator typed and then cleared, with nothing recorded', () => {
    closeAll();
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT } as any);

    type(2, 1, '4');
    type(1, 1, '6');
    type(2, 2, '3');
    type(1, 2, '6');
    expect(submit().disabled, 'the typed score is submittable').toBe(false);

    clear().click();

    // `[Clear]` was pressed and the card is empty — the other two conditions hold. Only
    // `openedOnRecordedOutcome` refuses it, and refusing is right: there is nothing stored to remove,
    // so submitting would ask the factory to delete a score that was never there.
    expect(submit().disabled).toBe(true);

    closeAll();
  });

  it('treats a recorded ENDING as something to clear, with no score at all', () => {
    let outcome: any;
    closeAll();
    openScoreEntryDialog({
      sides: SIDES,
      matchUp: { matchUpFormat: FORMAT, matchUpStatus: 'WALKOVER', winningSide: 1, score: { sets: [] } },
      onSubmit: (result: any) => (outcome = result)
    } as any);

    // A walkover has no score, so a gate that asked "were there sets?" would refuse to clear it — and
    // a walkover recorded against the wrong participant is exactly what an operator needs to undo.
    expect(clear().disabled).toBe(false);
    clear().click();
    expect(submit().disabled).toBe(false);

    submit().click();
    expect(outcome.cleared).toBe(true);

    closeAll();
  });
});
