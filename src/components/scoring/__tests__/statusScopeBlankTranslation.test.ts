/**
 * A BLANK translation of the scope refusal is not an absence of a refusal.
 *
 * `statusUnavailable: ''` made the refusal itself `''`, and the card's rules read a refusal by its truthiness: Submit
 * stayed live and the out-of-scope status was submitted. A blank word now falls back to the English default, as
 * `scoreEntryText` does for every other key, so the refusal always has words and always refuses.
 */
import { footerState, scoreEntryError, submission, clearGate, holdsEntry } from '../logic/scoreEntryRules';
import { scoringStatusScopeLabels, statusScopeError } from '../logic/statusScope';
import { chooseEnding, createScoreEntryModel } from '../logic/scoreEntryModel';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

const { WALKOVER } = matchUpStatusConstants;
const ENGLISH = 'Walkover is unavailable for this match';

describe('a blank scope translation', () => {
  it('falls back to the English refusal, for the template and for the status name', () => {
    expect(statusScopeError(WALKOVER, [WALKOVER], { statusUnavailable: '' })).toBe(ENGLISH);
    expect(statusScopeError(WALKOVER, [WALKOVER], { statusUnavailable: '   ', [WALKOVER]: '' })).toBe(ENGLISH);
    expect(
      statusScopeError(WALKOVER, [WALKOVER], { statusUnavailable: '{{status}} indisponible', [WALKOVER]: 'W.O.' })
    ).toBe('W.O. indisponible');
    expect(scoringStatusScopeLabels({ statusUnavailable: '', challenged: '' })).toMatchObject({
      statusUnavailable: '{{status}} is unavailable for this match',
      CHALLENGED: 'Challenged'
    });
  });

  it('still refuses: Submit is closed and nothing is submitted', () => {
    const model = chooseEnding(createScoreEntryModel(), { kind: 'side', sideNumber: 1, status: WALKOVER });
    const view = { model };
    const gate = clearGate({ openedOnRecordedOutcome: false, cleared: false, holdsEntry: holdsEntry(view) });
    const context = { disabledMatchUpStatuses: [WALKOVER], labels: { statusUnavailable: '' } };

    expect(scoreEntryError(view, context)).toBe(ENGLISH);
    expect(footerState(view, gate, context).submitDisabled).toBe(true);
    expect(submission(view, gate, context)).toBeUndefined();
  });
});
