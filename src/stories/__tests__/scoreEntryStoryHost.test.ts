/**
 * @vitest-environment happy-dom
 *
 * `asRecord` — turning a submitted outcome back into a stored matchUp.
 *
 * This is the mapping a real host performs between the card and the factory, and the stories exercise
 * it on every Submit so that each one reopens on what it produced (CA, 2026-09-28). It is pinned here
 * as well as in the stories because a reason code has THREE possible homes and `recordedStatusCode`
 * reads them in order — so a record that writes the wrong one round-trips for some endings and loses
 * the reason for the rest, which is exactly the shape that hides.
 *
 * The property asserted is a round trip rather than a field layout: `recordedStatusCode(asRecord(x))`
 * must return the code that went in. Asserting the shape instead would pass against a record that is
 * internally tidy and unreadable by the function that has to read it.
 *
 * One home cannot be reached from the stories at all — an ending that resolves nobody needs a status
 * with reason codes, and the shipped USTA policy attaches none to SUSPENDED (measured: codes exist for
 * ABANDONED, CANCELLED, INCOMPLETE, DEFAULTED, WALKOVER, RETIRED and WITHDRAWN). CANCELLED is used
 * below for that branch.
 */
import { hydrateScoreEntryState } from '../../components/scoring/logic/scoreEntryState';
import { recordedStatusCode } from '../../components/scoring/logic/statusCodes';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { asRecord } from '../helpers/scoreEntryStoryHost';
import { describe, it, expect } from 'vitest';

const { WALKOVER, DOUBLE_WALKOVER, RETIRED, CANCELLED } = matchUpStatusConstants;

const FORMAT = 'SET3-S:6/TB7';
const record = (outcome: Record<string, any>, sets: any[] = []) => asRecord(outcome, sets, FORMAT);

describe('a reason code survives the trip, whichever ending carries it', () => {
  it('a single exit — stored against the side that did NOT win', () => {
    const stored = record({ matchUpStatus: WALKOVER, winningSide: 1, reasonCode: 'W1' });

    expect(stored.sideStatusCodes).toEqual({ 2: 'W1' });
    expect(recordedStatusCode(stored as any)).toBe('W1');
  });

  it('the other side of the same case, so the inversion is asserted and not assumed', () => {
    // A mapping that ignored `winningSide` entirely would satisfy the test above. This one pins that
    // the side MOVES with the winner.
    const stored = record({ matchUpStatus: RETIRED, winningSide: 2, reasonCode: 'RJ' });

    expect(stored.sideStatusCodes).toEqual({ 1: 'RJ' });
    expect(recordedStatusCode(stored as any)).toBe('RJ');
  });

  it('a double exit — on BOTH sides, because neither is distinguished', () => {
    const stored = record({ matchUpStatus: DOUBLE_WALKOVER, winningSide: undefined, reasonCode: 'W1' });

    expect(stored.sideStatusCodes).toEqual({ 1: 'W1', 2: 'W1' });
    expect(
      stored.matchUpStatusCode,
      'not ALSO at match level — a second copy makes the first untestable'
    ).toBeUndefined();
    expect(recordedStatusCode(stored as any)).toBe('W1');
  });

  it('an ending that resolves nobody — at MATCH level, since there is no side to ask', () => {
    const stored = record({ matchUpStatus: CANCELLED, winningSide: undefined, reasonCode: 'OC' });

    expect(stored.matchUpStatusCode).toBe('OC');
    expect(stored.sideStatusCodes).toBeUndefined();
    expect(recordedStatusCode(stored as any)).toBe('OC');
  });

  it('writes no reason fields at all when the operator chose none', () => {
    const stored = record({ matchUpStatus: WALKOVER, winningSide: 1 });

    expect(stored.sideStatusCodes).toBeUndefined();
    expect(stored.matchUpStatusCode).toBeUndefined();
    expect(recordedStatusCode(stored as any)).toBeUndefined();
  });
});

describe('the ending itself survives, with the one inversion the card turns on', () => {
  it('reopens against the side the ending HAPPENED to, not the winner', () => {
    // A stored matchUp names the winner; the card records the side that exited. Applying that inversion
    // twice, or not at all, leaves every intermediate value looking plausible.
    const stored = record({ matchUpStatus: WALKOVER, winningSide: 1, reasonCode: 'W1' });

    expect(hydrateScoreEntryState(stored as any)).toEqual({
      sideEnding: { sideNumber: 2, status: WALKOVER },
      reasonCode: 'W1'
    });
  });

  it('reopens a double exit as the ending an operator CLICKS, plus "no one advances"', () => {
    // Nobody clicks `DOUBLE_WALKOVER`. They click Walkover and tick the box, so that is what has to come
    // back — the reverse lookup lives in `hydrateIrregularEnding` and this is the round trip over it.
    const stored = record({ matchUpStatus: DOUBLE_WALKOVER, winningSide: undefined, reasonCode: 'W1' });
    const state = hydrateScoreEntryState(stored as any);

    expect(state.sideEnding?.status).toBe(WALKOVER);
    expect(state.bothSidesOut).toBe(true);
    expect(state.reasonCode).toBe('W1');
  });

  it('keeps the score alongside a retirement, which is a part-score that was played', () => {
    const sets = [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }];
    const stored = record({ matchUpStatus: RETIRED, winningSide: 1, reasonCode: 'RJ' }, sets);

    expect(stored.score).toEqual({ sets });
    expect(stored.matchUpFormat).toBe(FORMAT);
  });
});
