/**
 * @vitest-environment happy-dom
 *
 * The dialog reports an outcome the engine reads as is (CA, 2026-10-08).
 *
 * Each case opens the dialog over a real mocks-engine draw, submits through the UI, and hands the
 * reported `outcome` to `tournamentEngine.setMatchUpStatus` with nothing added. What the engine then
 * holds is the assertion. The stories test pins the mapping function; this pins that the DIALOG applies
 * it, which is the part a host used to have to do.
 */
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { afterEach, describe, expect, it } from 'vitest';
import { cModal } from '../../modal/cmodal';
import {
  fixtures,
  matchUpStatusConstants,
  mocksEngine,
  policyConstants,
  tournamentEngine
} from 'tods-competition-factory';

import type { StatusCodeGroups } from '../logic/statusCodes';

const { COMPLETED, WALKOVER, TO_BE_PLAYED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;
const MODAL = 'section[id^="cmdl-"]';
const FORMAT = 'SET3-S:6/TB7';
const FAST4 = 'SET3-S:4/TB7';
const WALKOVER_INJURY = 'W1';
const SUBMIT = 'button[data-action="submit"]';

type Ref = { drawId: string; matchUpId: string };

function drawBehind(): Ref {
  const {
    tournamentRecord,
    drawIds: [drawId]
  } = mocksEngine.generateTournamentRecord({ drawProfiles: [{ drawSize: 4, matchUpFormat: FORMAT }], nonRandom: 1 });
  tournamentEngine.setState(tournamentRecord);
  const { matchUps = [] } = tournamentEngine.allTournamentMatchUps({ inContext: true });
  const first = matchUps.find((m: any) => m.roundNumber === 1 && m.sides?.every((s: any) => s.participant));
  return { drawId, matchUpId: first.matchUpId };
}

const held = (ref: Ref) => tournamentEngine.findMatchUp({ ...ref, inContext: true }).matchUp;
const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].pop();
const inModal = <T extends HTMLElement>(selector: string) => topModal()?.querySelector<T>(selector);
const press = (digit: number) => inModal<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();
const click = (selector: string) => {
  const target = inModal<HTMLElement>(selector);
  if (!target) throw new Error(`nothing matched ${selector}`);
  target.click();
};

/** Open over the engine's matchUp with the Dial Pad, capture what Submit reports, and send its `outcome` as is. */
function open(ref: Ref) {
  const matchUp = held(ref);
  const sides: any = matchUp.sides.map((s: any) => ({ participantName: s.participant.participantName }));
  let reported: any;
  const dialog = openScoreEntryDialog({
    matchUp,
    sides,
    matchUpFormat: matchUp.matchUpFormat,
    statusCodeGroups: REAL_GROUPS,
    approach: 'dialPad',
    onFormatChange: () => undefined,
    onSubmit: (outcome) => {
      reported = outcome;
    }
  });
  const sendAsIs = (): any => tournamentEngine.setMatchUpStatus({ ...ref, outcome: structuredClone(reported.outcome) });
  return { dialog, reported: () => reported, sendAsIs };
}

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.replaceChildren();
});

describe('the dialog reports an engine-ready outcome', () => {
  it('a played result: score.sets, the winner, COMPLETED — accepted as is', () => {
    const ref = drawBehind();
    const h = open(ref);
    for (const digit of [4, 6, 3, 6]) press(digit);
    click(SUBMIT);

    const { outcome } = h.reported();
    expect(outcome.score.sets).toHaveLength(2);
    expect(outcome.winningSide).toBe(1);
    expect(outcome.matchUpStatus).toBe(COMPLETED);
    expect('matchUpStatusCodes' in outcome, 'no reason chosen: codes are not sent').toBe(false);
    expect('matchUpFormat' in outcome, 'the format was not changed: left to the engine').toBe(false);

    expect(h.sendAsIs().success).toBe(true);
    expect(held(ref).score.scoreStringSide1).toBe('6-4 6-3');
    expect(held(ref).winningSide).toBe(1);
  });

  it('a walkover with a reason: positional codes against the exiting side', () => {
    const ref = drawBehind();
    const h = open(ref);
    click('button[data-action="endedEarly"][data-side="2"]');
    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    click(`button[data-reason="${WALKOVER_INJURY}"]`);
    click(SUBMIT);

    const { outcome } = h.reported();
    expect(outcome.matchUpStatus).toBe(WALKOVER);
    expect(outcome.winningSide).toBe(1);
    expect(outcome.matchUpStatusCodes).toEqual(['', WALKOVER_INJURY]);
    expect(outcome.score.sets).toEqual([]);

    expect(h.sendAsIs().success).toBe(true);
    expect(held(ref).matchUpStatus).toBe(WALKOVER);
    expect(held(ref).sideStatusCodes).toEqual({ 2: WALKOVER_INJURY });
  });

  it('a clear: the empty-sets outcome that resets the matchUp and blanks the codes', () => {
    const ref = drawBehind();
    const scored = open(ref);
    for (const digit of [4, 6, 3, 6]) press(digit);
    click(SUBMIT);
    expect(scored.sendAsIs().success).toBe(true);
    expect(held(ref).matchUpStatus).toBe(COMPLETED);

    const reopened = open(ref);
    click('button[data-action="clear"]');
    click(SUBMIT);
    expect(reopened.reported().outcome).toEqual({ score: { sets: [] }, matchUpStatusCodes: [] });
    expect(reopened.sendAsIs().success).toBe(true);
    expect(held(ref).matchUpStatus).toBe(TO_BE_PLAYED);
    expect(held(ref).winningSide).toBeUndefined();
  });

  it('a format changed through the chip rides to the engine and is persisted', () => {
    const ref = drawBehind();
    const h = open(ref);
    h.dialog.setMatchUpFormat(FAST4);
    for (const digit of [2, 4, 1, 4]) press(digit);
    click(SUBMIT);

    expect(h.reported().outcome.matchUpFormat).toBe(FAST4);
    expect(h.sendAsIs().success).toBe(true);
    expect(held(ref).matchUpFormat).toBe(FAST4);
    expect(held(ref).score.scoreStringSide1).toBe('4-2 4-1');
  });
});
