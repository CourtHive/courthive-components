// @vitest-environment happy-dom
/**
 * Two findings from CA's Free Score pass, 2026-09-30, and they share a cause: a value kept in two
 * places, where the stale one won.
 *
 * 1. *"The text in the entry field is all selected, when the cursor should be at the end of the entry
 *    field. as it is hitting any key deletes the score!"*
 * 2. *"when I select (Other... Dead Rubber) it clears the score, AS IT SHOULD, but if I then change
 *    from [Free Score] to [Dynamic Sets] or [Dial Pad], the score reappears! ... it shouldn't be
 *    possible to have both a score and a matchUpStatus of DEAD_RUBBER! And this round-trips too!"*
 */
import { describe, expect, it } from 'vitest';

import { matchUpStatusConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const { DEAD_RUBBER } = matchUpStatusConstants;

const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const FORMAT = 'SET3-S:6/TB7';
const RECORDED: any = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 2, side2Score: 1 }
];

const freeScoreField = () =>
  document.querySelector<HTMLInputElement>('.chc-sec-score-region input, .chc-sec-score-region textarea')!;
const endings = () => document.querySelector('.chc-sec-endings') as HTMLElement;
const otherChip = () => endings().querySelector('button[data-action="other"]') as HTMLButtonElement;
const cells = () => [...document.querySelectorAll<HTMLInputElement>('input.chc-sec-set-input')];
const band = () => document.querySelector('.chc-sec-band')?.textContent ?? '';

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

function openInFreeScore(onSubmit?: (outcome: any) => void) {
  closeAll();
  return openScoreEntryDialog({
    sides: SIDES,
    matchUpFormat: FORMAT,
    approach: 'freeScore',
    sets: RECORDED,
    onSubmit
  } as any);
}

function chooseDeadRubber() {
  otherChip().click();
  endings().querySelector<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${DEAD_RUBBER}"]`)!.click();
}

describe('Free Score opens ready to be EXTENDED', () => {
  it('puts the caret at the end rather than selecting the score', () => {
    openInFreeScore();
    const field = freeScoreField();

    expect(field.value, 'it opened on the recorded score').toBe('6-4 2-1');
    expect(document.activeElement).toBe(field);

    // `select()` is right for a per-set CELL, where typing over a one-character score is the
    // correction. For a whole match it turns the next keystroke into a delete.
    expect(field.selectionStart).toBe(field.value.length);
    expect(field.selectionEnd).toBe(field.value.length);

    closeAll();
  });
});

describe('a score cleared by an ending stays cleared', () => {
  it('does not come back when the approach changes', () => {
    const dialog: any = openInFreeScore();

    chooseDeadRubber();
    expect(freeScoreField().value, 'DEAD_RUBBER carries no score').toBe('');

    dialog.setApproach('dynamicSets');

    // The defect: the dialog kept its own copy of the sets and fell back to it whenever the live
    // region reported nothing — so "cleared" and "this region cannot express it" resolved the same way.
    expect(
      cells().every((input) => input.value === ''),
      'every cell is empty'
    ).toBe(true);

    // The band DOES still name the score — "Dead Rubber — the part-score of 6-4 2-1 has been cleared".
    // That is the confirmation added deliberately when endings began clearing scores, and it is a past
    // tense, not a value: it is remembered for the band alone and never re-enters the region. Asserted
    // rather than banned, because a first draft of this test read the mention as the defect.
    expect(band()).toContain('cleared');

    closeAll();
  });

  it('and it does not come back through the Dial Pad either', () => {
    const dialog: any = openInFreeScore();
    chooseDeadRubber();

    dialog.setApproach('dialPad');

    // The Dial Pad does not use `<input>` cells — it shows a READOUT per side. Asserting on inputs
    // here counted zero of them and passed trivially, against the fix AND against the defect, until
    // this was measured.
    const readouts = [...document.querySelectorAll('[data-readout-side]')];
    expect(readouts.length, 'the dial pad rendered its readouts').toBeGreaterThan(0);
    expect(readouts.map((r) => r.textContent?.trim()).join('')).toBe('');
    closeAll();
  });

  it('SUBMITS a dead rubber with no score, after a round trip through two approaches', () => {
    let outcome: any;
    const dialog: any = openInFreeScore((result) => (outcome = result));
    chooseDeadRubber();

    dialog.setApproach('dynamicSets');
    dialog.setApproach('freeScore');

    document.querySelector<HTMLButtonElement>('button[data-action="submit"]')!.click();

    // A DEAD_RUBBER carrying a score is a contradiction the factory would reject, and it round-tripped.
    expect(outcome.matchUpStatus).toBe(DEAD_RUBBER);
    expect(outcome.score, 'no score on a dead rubber').toBeUndefined();
    expect(outcome.sets ?? []).toHaveLength(0);

    closeAll();
  });

  it('still carries a REAL score across a switch', () => {
    const dialog: any = openInFreeScore();
    expect(freeScoreField().value).toBe('6-4 2-1');

    // The fallback existed for a reason, so the reason is pinned: a switch must still bring the score.
    dialog.setApproach('dynamicSets');

    expect(cells()[0].value, 'the first set survived the switch').toBe('6');
    closeAll();
  });
});
