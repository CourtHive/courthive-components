/**
 * The card's ending, clear and submit rules, asked directly of `scoreEntryRules.ts`.
 *
 * These were DOM tests that rendered the dialog and clicked through it to reach a rule that never needed
 * a page: `endingAndScoreAgree`, `retiredNeedsAScore`, `clearAndSubmit`, `scorelessRecordedOutcome`,
 * `walkoverLocksScore`, `clearedScoreStaysCleared`, `cardHoldsModel` and the rule halves of
 * `statusScope` and `sideEndingSignpost`. The card calls these functions; the wiring that is left —
 * focus, a disabled control refusing a click, the panels and menus — is in
 * `src/stories/ScoreEntryEndingRulesTests.stories.ts`.
 *
 * Every model is built frozen (`scoreEntryModelTestHelpers`), so a rule that wrote into its input would
 * throw rather than pass.
 */
import { createScoreEntryModel, chooseEnding, clearAll, setCell, switchApproach } from '../scoreEntryModel';
import { matchUpStatusConstants, tournamentEngine, mocksEngine } from 'tods-competition-factory';
import { NO_SCORE_STATUSES, carriesNoScore, endingLabels } from '../irregularEnding';
import { enteredSets, error, isComplete, scoreString } from '../scoreEntrySelectors';
import { deepFreeze, frozen, typed, G } from './scoreEntryModelTestHelpers';
import { parseScore } from '../../../../tools/freeScore/freeScore';
import { scoreEntrySummary } from '../scoreEntrySummary';
import { toEngineOutcome } from '../engineOutcome';
import { scoreEntryText } from '../scoreEntryText';
import { replaceSets } from '../scoreEntryModel';
import { describe, expect, it } from 'vitest';
import {
  retractEndingContradictedByScore,
  contradictsFinishedScore,
  endingRefusalReason,
  clearScoreForEnding,
  resolutionInForce,
  scoreEntryError,
  scoreIsFinished,
  endingOffered,
  clearHeadline,
  footerState,
  scoreLocked,
  holdsEntry,
  submission,
  clearGate
} from '../scoreEntryRules';

import type { ScoreEntryView, ScoreEntryRulesContext, ClearGateInput } from '../scoreEntryRules';
import type { ScoreEntryModel, EndingIntent } from '../scoreEntryModel';

const {
  AWAITING_RESULT,
  DEAD_RUBBER,
  IN_PROGRESS,
  INCOMPLETE,
  ABANDONED,
  CANCELLED,
  COMPLETED,
  DEFAULTED,
  SUSPENDED,
  WALKOVER,
  RETIRED
} = matchUpStatusConstants;

const FORMAT = 'SET3-S:6/TB7';
const LABELS = endingLabels();
const CONTEXT: ScoreEntryRulesContext = { labels: LABELS, sideNames: ['Lower', 'Upper'] };
const RECORDED_SETS = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
];

const view = (model: ScoreEntryModel, over: Partial<ScoreEntryView> = {}): ScoreEntryView => ({ model, ...over });
const choose = (model: ScoreEntryModel, intent: EndingIntent) => deepFreeze(chooseEnding(model, intent));
const side = (status: string, sideNumber: 1 | 2 = 2): EndingIntent => ({ kind: 'side', sideNumber, status });
const match = (status: string): EndingIntent => ({ kind: 'match', status });

/** One set played: a part-score, which every ending is legitimate against. */
const partScore = () => typed(FORMAT, [6, 4]);
/** A finished 6-4 6-3. */
const finished = () => typed(FORMAT, [6, 4], [6, 3]);

/** A card opened on what `model` holds, with the gate the card computes from it. */
function gateFor(model: ScoreEntryModel, over: Partial<ClearGateInput> = {}) {
  return clearGate({ openedOnRecordedOutcome: false, cleared: false, holdsEntry: holdsEntry(view(model)), ...over });
}

describe('which endings a score refuses — endingOffered', () => {
  it('refuses a retirement, a default and every score-keeping match ending on a finished score', () => {
    for (const status of [RETIRED, DEFAULTED, SUSPENDED, ABANDONED, INCOMPLETE, IN_PROGRESS, AWAITING_RESULT]) {
      expect(endingOffered(status, view(finished())), status).toBe(false);
      expect(endingRefusalReason(status, view(finished()), CONTEXT)).toMatch(/score is complete/i);
    }
  });

  it('offers the endings that CLEAR the score instead — a walkover, Cancelled, Dead Rubber', () => {
    // A blanket refusal would be the easy wrong fix; these resolve the contradiction the other way.
    for (const status of [WALKOVER, CANCELLED, DEAD_RUBBER]) {
      expect(endingOffered(status, view(finished())), status).toBe(true);
    }
  });

  it('offers every ending against a part-score', () => {
    for (const status of [RETIRED, DEFAULTED, SUSPENDED, ABANDONED, WALKOVER, CANCELLED]) {
      expect(endingOffered(status, view(partScore())), status).toBe(true);
    }
  });

  it('names exactly the endings that keep a score and say the match did not finish', () => {
    expect([...NO_SCORE_STATUSES].some(contradictsFinishedScore), 'nothing that clears the score').toBe(false);
    for (const status of [RETIRED, DEFAULTED, SUSPENDED, ABANDONED, INCOMPLETE, IN_PROGRESS, AWAITING_RESULT]) {
      expect(contradictsFinishedScore(status), status).toBe(true);
    }
  });

  it('a score Free Score reports as ended is not finished, so a retirement stays offered beside it', () => {
    // `6-4 6-3 ret`: the parser says the match ended in a retirement, so the sets are not claiming a result.
    const reported = view(finished(), { reportedStatus: RETIRED });
    expect(isComplete(reported.model), 'the model alone calls the sets complete').toBe(true);
    expect(scoreIsFinished(reported)).toBe(false);
    expect(endingOffered(RETIRED, reported)).toBe(true);
  });

  it('refuses anything the host put out of scope, and says so in the scope message', () => {
    expect(endingOffered(DEFAULTED, view(frozen()), [DEFAULTED])).toBe(false);
    expect(endingOffered(WALKOVER, view(frozen()), [DEFAULTED])).toBe(true);
    expect(endingRefusalReason(DEFAULTED, view(frozen()), { ...CONTEXT, disabledMatchUpStatuses: [DEFAULTED] })).toBe(
      'Defaulted is unavailable for this match'
    );
  });
});

describe('Retired needs a score (CA, 2026-10-08)', () => {
  it('is refused with nothing entered, and says why; Walkover and Default stay offered', () => {
    expect(endingOffered(RETIRED, view(frozen()))).toBe(false);
    expect(endingRefusalReason(RETIRED, view(frozen()), CONTEXT)).toMatch(/no score yet/i);
    expect(endingOffered(WALKOVER, view(frozen()))).toBe(true);
    expect(endingOffered(DEFAULTED, view(frozen())), 'a player can be defaulted before the first ball').toBe(true);
  });

  it('is offered from the first digit — in the model, or as text only the region holds', () => {
    expect(endingOffered(RETIRED, view(deepFreeze(setCell(frozen(), G(0, 2), 4))))).toBe(true);
    expect(endingOffered(RETIRED, view(frozen(), { regionHasEntry: true }))).toBe(true);
  });

  it('is withdrawn again when the score is cleared', () => {
    const one = deepFreeze(setCell(frozen(), G(0, 2), 4));
    expect(endingOffered(RETIRED, view(deepFreeze(clearAll(one))))).toBe(false);
  });
});

describe('a finished score retracts an ending that says otherwise — retractEndingContradictedByScore', () => {
  it('drops SUSPENDED once the score finishes, and Submit then sends an ordinary result', () => {
    const suspended = choose(partScore(), match(SUSPENDED));
    expect(retractEndingContradictedByScore(view(suspended)), 'nothing to retract while one set is played').toBe(
      undefined
    );

    const completed = choose(typed(FORMAT, [6, 4], [6, 3]), match(SUSPENDED));
    const retraction = retractEndingContradictedByScore(view(completed));
    expect(retraction).toEqual(match(SUSPENDED));

    const retracted = choose(completed, retraction!);
    expect(retracted.ending.matchEnding).toBeUndefined();
    // An ordinary completed result carries NO matchUpStatus — the defect sent SUSPENDED here.
    expect(submission(view(retracted), gateFor(retracted), CONTEXT)).toEqual({
      matchUpStatus: undefined,
      winningSide: 1,
      reasonCode: undefined,
      score: '6-4 6-3'
    });
  });

  it('drops an Other… ending (Abandoned) the same way', () => {
    const abandoned = choose(finished(), match(ABANDONED));
    expect(retractEndingContradictedByScore(view(abandoned))).toEqual(match(ABANDONED));
  });

  it('drops a retirement and a default reached from the other order — the side intent un-chooses them', () => {
    for (const status of [RETIRED, DEFAULTED]) {
      const ended = choose(finished(), side(status));
      const retraction = retractEndingContradictedByScore(view(ended));
      expect(retraction, status).toEqual(side(status));
      expect(choose(ended, retraction!).ending.sideEnding, status).toBeUndefined();
    }
  });

  it('drops a DOUBLE default with it — the "no one advances" flag goes with the default', () => {
    const doubleDefault = choose(choose(finished(), side(DEFAULTED)), { kind: 'bothSidesOut' });
    expect(doubleDefault.ending.bothSidesOut, 'the double default was recorded').toBe(true);

    const retracted = choose(doubleDefault, retractEndingContradictedByScore(view(doubleDefault))!);
    expect(retracted.ending.sideEnding).toBeUndefined();
    expect(retracted.ending.bothSidesOut).toBeUndefined();
  });

  it('leaves a walkover alone — it carries no score, so there is no finished score to contradict it', () => {
    expect(retractEndingContradictedByScore(view(choose(finished(), side(WALKOVER))))).toBeUndefined();
  });
});

describe('an ending that carries no score clears it — clearScoreForEnding', () => {
  it('a walkover CLEARS the sets, not just the submitted outcome, and names what it took', () => {
    const cleared = clearScoreForEnding(choose(partScore(), side(WALKOVER)));

    expect(cleared?.discarded).toBe('6-4');
    expect(enteredSets(cleared!.model)).toEqual([]);
    expect(cleared!.model.ending.sideEnding?.status, 'the ending stays').toBe(WALKOVER);
  });

  it('a retirement and a default keep their part-score', () => {
    for (const status of [RETIRED, DEFAULTED]) {
      expect(clearScoreForEnding(choose(partScore(), side(status))), status).toBeUndefined();
    }
  });

  it('Cancelled clears the model, and the band still quotes the part-score it cleared', () => {
    const cancelled = choose(partScore(), match(CANCELLED));
    const cleared = clearScoreForEnding(cancelled)!;
    expect(enteredSets(cleared.model)).toEqual([]);

    const band = scoreEntrySummary({
      resolution: resolutionInForce(view(cleared.model)),
      sideNames: ['Lower', 'Upper'],
      scoreString: scoreString(cleared.model) || cleared.discarded
    });
    expect(band.headline + (band.detail ?? '')).toContain('6-4');
    expect(band.headline + (band.detail ?? '')).toMatch(/cleared/i);
  });

  it('a Dead Rubber score stays cleared across an approach switch, and submits with no score', () => {
    const recorded = deepFreeze(
      createScoreEntryModel({
        matchUpFormat: FORMAT,
        approach: 'freeScore',
        sets: [
          { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
          { setNumber: 2, side1Score: 2, side2Score: 1 }
        ]
      })
    );
    const { model: deadRubber, discarded } = clearScoreForEnding(choose(recorded, match(DEAD_RUBBER)))!;
    expect(discarded).toBe('6-4 2-1');

    // The sets were emptied for real, so no region can bring them back.
    const roundTrip = switchApproach(switchApproach(deadRubber, 'dynamicSets'), 'freeScore');
    expect(enteredSets(roundTrip)).toEqual([]);

    const outcome = submission(view(roundTrip), gateFor(roundTrip), CONTEXT);
    expect(outcome?.matchUpStatus).toBe(DEAD_RUBBER);
    expect(outcome?.score, 'no score on a dead rubber').toBeUndefined();
  });
});

describe('a selected walkover locks score entry — scoreLocked', () => {
  it('locks for every ending that carries no score, and for nothing else', () => {
    for (const status of [RETIRED, DEFAULTED])
      expect(scoreLocked(choose(partScore(), side(status))), status).toBe(false);
    expect(scoreLocked(choose(frozen(), side(WALKOVER)))).toBe(true);
    expect(scoreLocked(choose(frozen(), match(CANCELLED)))).toBe(true);
    expect(scoreLocked(frozen()), 'a blank card is enterable').toBe(false);
    expect(carriesNoScore(WALKOVER) && carriesNoScore(DEAD_RUBBER) && !carriesNoScore(DEFAULTED)).toBe(true);
  });

  it('opens locked on a recorded walkover, and unlocks when it is taken back', () => {
    const recorded = deepFreeze(
      createScoreEntryModel({
        matchUpFormat: FORMAT,
        matchUp: { matchUpStatus: WALKOVER, winningSide: 1 }
      })
    );
    expect(scoreLocked(recorded)).toBe(true);
    expect(scoreLocked(choose(recorded, side(WALKOVER, 2))), 'the same control is the way out').toBe(false);
  });

  it('does not lock on a walkover Free Score only REPORTED from its text', () => {
    const reported = view(frozen(), { reportedStatus: WALKOVER });
    expect(resolutionInForce(reported).clearsScore, 'the reported ending would clear the score').toBe(true);
    expect(scoreLocked(reported.model)).toBe(false);
  });
});

describe('clearing a recorded outcome — clearGate, footerState, submission', () => {
  const recorded = () =>
    deepFreeze(
      createScoreEntryModel({
        matchUpFormat: FORMAT,
        sets: RECORDED_SETS,
        matchUp: { winningSide: 1 }
      })
    );
  const opened = { openedOnRecordedOutcome: true };

  it('SUBMITS the empty result as `{ cleared: true }` and nothing else', () => {
    const before = recorded();
    expect(footerState(view(before), gateFor(before, opened), CONTEXT).submitDisabled, 'submittable as it stands').toBe(
      false
    );

    const emptied = deepFreeze(clearAll(before));
    const gate = gateFor(emptied, { ...opened, cleared: true });
    expect(gate.submitsAClear).toBe(true);
    expect(footerState(view(emptied), gate, CONTEXT).submitDisabled, 'and stays submittable once cleared').toBe(false);
    expect(submission(view(emptied), gate, CONTEXT)).toEqual({ cleared: true });
  });

  it("says so in the band, in CA's one sentence", () => {
    const emptied = deepFreeze(clearAll(recorded()));
    const headline = clearHeadline(gateFor(emptied, { ...opened, cleared: true }));
    expect(headline).toBe('clearedHeadline');
    expect(scoreEntryText(LABELS, headline!)).toBe('The recorded result will be removed — Submit to clear it.');
  });

  it('does not offer to clear a matchUp that never had a score', () => {
    const blank = frozen();
    const footer = footerState(view(blank), gateFor(blank), CONTEXT);
    expect(footer.clearDisabled).toBe(true);
    expect(footer.submitDisabled).toBe(true);
    expect(clearHeadline(gateFor(blank, { cleared: true }))).toBeUndefined();
  });

  it('stops being a clear the moment a score is typed again', () => {
    const retyped = finished();
    const gate = gateFor(retyped, { ...opened, cleared: true });
    expect(gate.submitsAClear).toBe(false);
    expect(submission(view(retyped), gate, CONTEXT)).toEqual({
      matchUpStatus: undefined,
      winningSide: 1,
      reasonCode: undefined,
      score: '6-4 6-3'
    });
  });

  it('needs the BUTTON — a card emptied by hand is not a clear', () => {
    const emptied = deepFreeze(clearAll(recorded()));
    const footer = footerState(view(emptied), gateFor(emptied, opened), CONTEXT);
    expect(footer.submitDisabled, 'an empty card that was never cleared submits nothing').toBe(true);
    expect(footer.clearDisabled, 'and there is nothing left for Clear to take').toBe(true);
  });

  it('does not arm on a typed-then-cleared score with nothing recorded', () => {
    const emptied = deepFreeze(clearAll(finished()));
    const gate = gateFor(emptied, { cleared: true });
    expect(gate.submitsAClear).toBe(false);
    expect(footerState(view(emptied), gate, CONTEXT).submitDisabled).toBe(true);
  });

  it('treats a recorded ENDING as something to clear, with no score at all', () => {
    const walkover = deepFreeze(
      createScoreEntryModel({ matchUpFormat: FORMAT, matchUp: { matchUpStatus: WALKOVER, winningSide: 1 } })
    );
    expect(holdsEntry(view(walkover)), 'the walkover is something to clear').toBe(true);
    expect(footerState(view(walkover), gateFor(walkover, opened), CONTEXT).clearDisabled).toBe(false);

    const emptied = deepFreeze(clearAll(walkover));
    expect(submission(view(emptied), gateFor(emptied, { ...opened, cleared: true }), CONTEXT)).toEqual({
      cleared: true
    });
  });
});

describe('a recorded outcome the host says cannot be removed — clearable: false', () => {
  const refused = { openedOnRecordedOutcome: true, clearable: false };
  const recorded = () =>
    deepFreeze(createScoreEntryModel({ matchUpFormat: FORMAT, sets: RECORDED_SETS, matchUp: { winningSide: 1 } }));

  it('Clear stays live; only submitting the empty replacement is refused, with the reason as its title', () => {
    const before = recorded();
    const footer = footerState(view(before), gateFor(before, refused), CONTEXT);
    expect(footer.clearDisabled).toBe(false);
    expect(footer.submitTitle).toBe('');

    const emptied = deepFreeze(clearAll(before));
    const gate = gateFor(emptied, { ...refused, cleared: true });
    expect(gate).toEqual({ removalRefused: true, refusedNow: true, submitsAClear: false });
    expect(footerState(view(emptied), gate, CONTEXT)).toEqual({
      submitDisabled: true,
      submitTitle: 'Enter a replacement score: a later match depends on this result.',
      clearDisabled: true
    });
    expect(clearHeadline(gate)).toBe('clearRefused');
    expect(submission(view(emptied), gate, CONTEXT), 'nothing is sent').toBeUndefined();
  });

  it('still submits a corrected score', () => {
    const corrected = typed(FORMAT, [6, 3], [6, 2]);
    const gate = gateFor(corrected, { ...refused, cleared: true });
    expect(gate.refusedNow).toBe(false);
    expect(submission(view(corrected), gate, CONTEXT)?.score).toBe('6-3 6-2');
    expect(submission(view(corrected), gate, CONTEXT)?.cleared).toBeUndefined();
  });

  it('the host may name the reason', () => {
    const emptied = deepFreeze(clearAll(recorded()));
    const labels = { ...LABELS, clearRefused: 'Clear the later match first.' };
    expect(footerState(view(emptied), gateFor(emptied, { ...refused, cleared: true }), { labels }).submitTitle).toBe(
      'Clear the later match first.'
    );
  });

  it('clearable true, or omitted, changes nothing', () => {
    const emptied = deepFreeze(clearAll(recorded()));
    for (const clearable of [true, undefined]) {
      const gate = gateFor(emptied, { openedOnRecordedOutcome: true, cleared: true, clearable });
      expect(gate.removalRefused, String(clearable)).toBe(false);
      expect(footerState(view(emptied), gate, CONTEXT).submitDisabled, String(clearable)).toBe(false);
    }
  });

  it('a matchUp with nothing recorded is unaffected', () => {
    const oneDigit = deepFreeze(setCell(frozen(), G(0, 1), 6));
    const gate = gateFor(oneDigit, { clearable: false });
    expect(gate.removalRefused).toBe(false);
    const footer = footerState(view(oneDigit), gate, CONTEXT);
    expect(footer.clearDisabled, '[Clear] still empties a half-typed entry').toBe(false);
    expect(footer.submitTitle).toBe('');
  });
});

describe('an imported retirement with no score (scorelessRecordedOutcome)', () => {
  const retired = () =>
    deepFreeze(
      createScoreEntryModel({
        matchUpFormat: 'SET3-S:6/TB7-F:TB10',
        sets: [],
        matchUp: { matchUpStatus: RETIRED, winningSide: 2 }
      })
    );

  it('opens holding the retirement, so Clear is live', () => {
    expect(retired().ending.sideEnding).toEqual({ sideNumber: 1, status: RETIRED });
    expect(holdsEntry(view(retired()))).toBe(true);
  });

  it('clearable: the clear is submitted, and the engine outcome resets the score and blanks the codes', () => {
    const emptied = deepFreeze(clearAll(retired()));
    const gate = gateFor(emptied, { openedOnRecordedOutcome: true, cleared: true, clearable: true });
    const outcome = submission(view(emptied), gate, CONTEXT)!;

    expect(outcome).toEqual({ cleared: true });
    expect(enteredSets(emptied)).toEqual([]);
    expect(toEngineOutcome({ ...outcome, sets: enteredSets(emptied) })).toEqual({
      score: { sets: [] },
      matchUpStatusCodes: []
    });
  });

  it('not clearable: Clear resets the form, the empty removal is refused, a retyped score submits', () => {
    const emptied = deepFreeze(clearAll(retired()));
    const refused = { openedOnRecordedOutcome: true, cleared: true, clearable: false };
    expect(footerState(view(emptied), gateFor(emptied, refused), CONTEXT).submitDisabled).toBe(true);
    expect(submission(view(emptied), gateFor(emptied, refused), CONTEXT)).toBeUndefined();

    const retyped = deepFreeze(typed('SET3-S:6/TB7-F:TB10', [3, 6], [4, 6]));
    expect(scoreLocked(retyped), 'the cells are enterable').toBe(false);
    const outcome = submission(view(retyped), gateFor(retyped, refused), CONTEXT)!;
    expect(footerState(view(retyped), gateFor(retyped, refused), CONTEXT).submitDisabled).toBe(false);
    expect(toEngineOutcome({ ...outcome, sets: enteredSets(retyped) })).toMatchObject({
      matchUpStatus: COMPLETED,
      winningSide: 2
    });
  });
});

describe('the host status scope reaches the footer (statusScope)', () => {
  const DISABLED = ['DEAD_RUBBER', 'CHALLENGED'];
  const scoped: ScoreEntryRulesContext = { ...CONTEXT, disabledMatchUpStatuses: DISABLED };

  it.each(['dr', 'dead', 'dead r', 'dead rubber'])('refuses the typed alias "%s"', (alias) => {
    // Free Score parses the alias to the status and REPORTS it; the card refuses what is reported.
    const reportedStatus = parseScore(alias, FORMAT).matchUpStatus;
    expect(reportedStatus).toBe(DEAD_RUBBER);

    const typedAlias = view(frozen(), { reportedStatus, regionHasEntry: true });
    expect(scoreEntryError(typedAlias, scoped)).toBe('Dead Rubber is unavailable for this match');
    expect(footerState(typedAlias, gateFor(typedAlias.model), scoped).submitDisabled).toBe(true);
    expect(submission(typedAlias, gateFor(typedAlias.model), scoped), 'nothing is sent').toBeUndefined();
  });

  it("uses the host's template and status names", () => {
    const labels = {
      ...LABELS,
      DEAD_RUBBER: 'Match sans enjeu',
      statusUnavailable: '{{status}} indisponible pour ce match'
    };
    const typedAlias = view(frozen(), { reportedStatus: parseScore('dr', FORMAT).matchUpStatus });
    expect(scoreEntryError(typedAlias, { ...scoped, labels })).toBe('Match sans enjeu indisponible pour ce match');
  });

  it('a stored forbidden ending is held and refused, and Clear makes the removal submittable', () => {
    const stored = deepFreeze(
      createScoreEntryModel({ matchUpFormat: FORMAT, matchUp: { matchUpStatus: DEAD_RUBBER } })
    );
    expect(stored.ending.matchEnding, 'the stored ending is kept, so it can be seen and corrected').toBe(DEAD_RUBBER);
    expect(footerState(view(stored), gateFor(stored, { openedOnRecordedOutcome: true }), scoped).submitDisabled).toBe(
      true
    );

    const emptied = deepFreeze(clearAll(stored));
    const gate = gateFor(emptied, { openedOnRecordedOutcome: true, cleared: true });
    expect(footerState(view(emptied), gate, scoped).submitDisabled).toBe(false);
    expect(submission(view(emptied), gate, scoped)).toEqual({ cleared: true });
  });

  it('without a scope, Dead Rubber is offered and submittable', () => {
    const deadRubber = choose(frozen(), match(DEAD_RUBBER));
    expect(endingOffered(DEAD_RUBBER, view(frozen()))).toBe(true);
    expect(footerState(view(deadRubber), gateFor(deadRubber), CONTEXT).submitDisabled).toBe(false);
  });
});

describe('the footer follows the model through CA’s deferred notes 9, 10A and 10B', () => {
  // The same sequences `deferredNotesAsModelRules` drove through the dialog; the transitions are pinned in
  // `scoreEntryModel.test.ts` and the messages in `scoreEntrySelectors.test.ts`. This is what Submit does.
  const gate = (model: ScoreEntryModel) => gateFor(model);

  it('note 9: clearing set 1 of 6-2 6-2 leaves an empty first set, and Submit closes', () => {
    const holed = deepFreeze(setCell(setCell(typed(FORMAT, [6, 2], [6, 2]), G(0, 1), undefined), G(0, 2), undefined));
    expect(holed.sets[1]).toEqual({ side1: 6, side2: 2 });
    expect(scoreEntryError(view(holed), CONTEXT)).toBe('1st set: has no score');
    expect(footerState(view(holed), gate(holed), CONTEXT).submitDisabled).toBe(true);
  });

  it('note 10A: 6-2 2-6 2-6 with set 1 edited to 4-2 is not submittable, and says which set', () => {
    const edited = deepFreeze(setCell(typed(FORMAT, [6, 2], [2, 6], [2, 6]), G(0, 1), 4));
    expect(enteredSets(edited).map((set) => [set.side1Score, set.side2Score])).toEqual([
      [4, 2],
      [2, 6],
      [2, 6]
    ]);
    expect(scoreEntryError(view(edited), CONTEXT)).toBe('1st set: is not finished');
    expect(footerState(view(edited), gate(edited), CONTEXT).submitDisabled).toBe(true);
  });

  it('note 10B: 6-4 4-6 2-6 edited to 6-3 6-3 trims the 2-6 and submits the two sets', () => {
    let model: ScoreEntryModel = typed(FORMAT, [6, 4], [4, 6], [2, 6]);
    for (const [cell, value] of [
      [G(0, 2), 3],
      [G(1, 1), 6],
      [G(1, 2), 3]
    ] as const) {
      model = deepFreeze(setCell(model, cell, value));
    }
    expect(enteredSets(model).map((set) => [set.side1Score, set.side2Score])).toEqual([
      [6, 3],
      [6, 3]
    ]);
    expect(footerState(view(model), gate(model), CONTEXT).submitDisabled).toBe(false);
    expect(submission(view(model), gate(model), CONTEXT)?.score).toBe('6-3 6-3');
  });
});

describe('typed text reaches the rules the way Free Score commits it (freeScoreRendersModel)', () => {
  /** What Free Score does on every keystroke: parse the text, and give the model the sets. */
  function freeScore(text: string): ScoreEntryView {
    const result = parseScore(text, FORMAT);
    const model = deepFreeze(replaceSets(frozen({ matchUpFormat: FORMAT }), (result.sets ?? []) as any));
    return { model, reportedStatus: result.matchUpStatus, regionHasEntry: !!text.trim() };
  }

  it('a half-typed ending keeps the sets it parsed so far', () => {
    expect(enteredSets(freeScore('6-4 re').model)).toMatchObject([{ side1Score: 6, side2Score: 4 }]);
  });

  it('text that parses to nothing leaves the model empty, and is still something entered', () => {
    const halfTyped = freeScore('6-');
    expect(enteredSets(halfTyped.model)).toEqual([]);
    expect(holdsEntry(halfTyped)).toBe(true);
  });

  it('a keystroke that changes no set is not a transition', () => {
    const before = freeScore('6-4 6-3').model;
    expect(replaceSets(before, (parseScore('6-4 6-3 ', FORMAT).sets ?? []) as any)).toBe(before);
  });

  it('note 10A: an unfinished set inside a decided match does not submit, though the parser calls it complete', () => {
    const typedText = freeScore('4-2 2-6 2-6');
    expect(parseScore('4-2 2-6 2-6', FORMAT).matchComplete, 'the parser alone would submit it').toBe(true);
    expect(error(typedText.model)).toBe('1st set: is not finished');
    expect(footerState(typedText, gateFor(typedText.model), CONTEXT).submitDisabled).toBe(true);
  });

  it('note 10B: a set beyond the decider is not kept', () => {
    const typedText = freeScore('6-2 6-2 6-3');
    expect(enteredSets(typedText.model)).toHaveLength(2);
    expect(scoreString(typedText.model)).toBe('6-2 6-2');
    expect(footerState(typedText, gateFor(typedText.model), CONTEXT).submitDisabled).toBe(false);
  });

  it('a set the format cannot produce is refused, not quietly accepted', () => {
    const typedText = freeScore('3-7');
    expect(error(typedText.model)).toMatch(/1st set: .*must be at least 5/);
    expect(footerState(typedText, gateFor(typedText.model), CONTEXT).submitDisabled).toBe(true);
  });

  it('an impossible score stays impossible however it is qualified: 3-7 marked Suspended does not submit', () => {
    // The ending alone resolves, so only the error gate closes Submit here; every case above is also
    // closed by the score not being finished, which is why this one is needed to pin the gate at all.
    const qualified = view(choose(freeScore('3-7').model, match(SUSPENDED)));
    expect(resolutionInForce(qualified).isValid, 'Suspended on its own would be submittable').toBe(true);
    expect(footerState(qualified, gateFor(qualified.model), CONTEXT).submitDisabled).toBe(true);
  });

  it('a retirement after a finished score keeps the score and reports the ending', () => {
    const typedText = freeScore('6-4 6-3 ret');
    expect(enteredSets(typedText.model)).toHaveLength(2);
    expect(typedText.reportedStatus).toBe(RETIRED);
    expect(isComplete(typedText.model), 'the model answers for the score alone').toBe(true);
    expect(scoreIsFinished(typedText), 'the card does not call it a finished result').toBe(false);
  });

  it('a typed "wo" is reported, not selected, so it locks nothing', () => {
    const typedText = freeScore('wo');
    expect(typedText.reportedStatus).toBe(WALKOVER);
    expect(scoreLocked(typedText.model)).toBe(false);
    expect(freeScore('6-4').reportedStatus).toBeUndefined();
  });
});

describe('what Submit sends is read from the model (cardHoldsModel)', () => {
  it('the score string and the winner come from the selectors', () => {
    const model = finished();
    expect(submission(view(model), gateFor(model), CONTEXT)).toMatchObject({
      score: scoreString(model),
      winningSide: 1
    });
  });

  it("an ending's winner outranks the score's, and a reason code rides with it", () => {
    const walkover = choose(choose(frozen(), side(WALKOVER, 2)), { kind: 'reasonCode', code: 'W1' });
    expect(submission(view(walkover), gateFor(walkover), CONTEXT)).toEqual({
      matchUpStatus: WALKOVER,
      winningSide: 1,
      reasonCode: 'W1',
      score: undefined
    });
  });

  it('a walkover with a reason reaches the engine as positional codes against the exiting side', () => {
    const {
      tournamentRecord,
      drawIds: [drawId]
    } = mocksEngine.generateTournamentRecord({ drawProfiles: [{ drawSize: 4, matchUpFormat: FORMAT }], nonRandom: 1 });
    tournamentEngine.setState(tournamentRecord);
    const { matchUps = [] } = tournamentEngine.allTournamentMatchUps({ inContext: true });
    const first = matchUps.find((m: any) => m.roundNumber === 1 && m.sides?.every((s: any) => s.participant));
    const ref = { drawId, matchUpId: first.matchUpId };

    const walkover = choose(choose(frozen(), side(WALKOVER, 2)), { kind: 'reasonCode', code: 'W1' });
    const outcome = toEngineOutcome({ ...submission(view(walkover), gateFor(walkover), CONTEXT), sets: [] });
    expect(outcome.matchUpStatusCodes).toEqual(['', 'W1']);

    let result: any = tournamentEngine.setMatchUpStatus({ ...ref, outcome: structuredClone(outcome) });
    expect(result.success).toBe(true);
    result = tournamentEngine.findMatchUp({ ...ref, inContext: true }).matchUp;
    expect(result.matchUpStatus).toBe(WALKOVER);
    expect(result.winningSide).toBe(1);
    expect(result.sideStatusCodes).toEqual({ 2: 'W1' });
  });
});
