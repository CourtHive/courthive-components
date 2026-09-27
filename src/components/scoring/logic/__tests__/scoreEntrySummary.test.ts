/**
 * The result band's wording.
 *
 * This is tested as logic rather than looked at as markup because the band is the card's CONFIRMATION
 * STEP, not decoration. One sentence in it exists to prevent silent data loss — "the part-score of
 * 6-4 2-1 has been cleared" — and a confirmation that can go blank, or say "cleared" when nothing was
 * cleared, is worse than none.
 *
 * Assertions are on `tone` and on the substrings that carry meaning, not on whole sentences. Pinning
 * exact prose would make every copy edit a test failure and would tempt the next person to update the
 * expectation without reading whether the claim was still true.
 */
import { resolveScoreEntry, chooseSideEnding, chooseMatchEnding, toggleBothSidesOut, emptyScoreEntryState } from '../scoreEntryState';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { scoreEntrySummary } from '../scoreEntrySummary';
import { describe, it, expect } from 'vitest';

import type { SummaryParams } from '../scoreEntrySummary';

const { RETIRED, WALKOVER, DEFAULTED, ABANDONED, CANCELLED, SUSPENDED, DEAD_RUBBER } = matchUpStatusConstants;

const NAMES: [string, string] = ['Rosalind Lem', 'Derrick Ellul'];

function band(over: Partial<SummaryParams> & Pick<SummaryParams, 'resolution'>) {
  return scoreEntrySummary({ sideNames: NAMES, ...over });
}

describe('nothing chosen yet', () => {
  it('says so, quietly, on an empty card', () => {
    const result = band({ resolution: resolveScoreEntry(emptyScoreEntryState) });

    expect(result.tone).toBe('neutral');
    expect(result.headline).toMatch(/no result/i);
  });

  it('reports a complete score as a result, naming the winner first', () => {
    const result = band({
      resolution: resolveScoreEntry(emptyScoreEntryState),
      scoreString: '6-4 6-3',
      scoreComplete: true,
      scoreWinningSide: 1,
      advancesTo: 'the quarter-final',
    });

    expect(result.tone).toBe('good');
    expect(result.headline).toBe('Rosalind Lem def. Derrick Ellul 6-4 6-3');
    expect(result.detail).toBe('advances to the quarter-final');
  });

  it('names the other winner when side 2 won — not always the first participant', () => {
    // The obvious way to get a summary wrong, and it reads perfectly plausibly when wrong.
    const result = band({
      resolution: resolveScoreEntry(emptyScoreEntryState),
      scoreString: '4-6 3-6',
      scoreComplete: true,
      scoreWinningSide: 2,
    });

    expect(result.headline).toBe('Derrick Ellul def. Rosalind Lem 4-6 3-6');
  });

  it('stays neutral for a part-score, rather than warning about a match in progress', () => {
    // The most common state the dialog is ever in. Warning here would train operators to ignore the
    // band, which would cost exactly the one warning that matters.
    const result = band({ resolution: resolveScoreEntry(emptyScoreEntryState), scoreString: '6-4 2-1' });

    expect(result.tone).toBe('neutral');
    expect(result.headline).toContain('6-4 2-1');
  });

  it('omits the advances-to note when the draw position is unknown', () => {
    const result = band({
      resolution: resolveScoreEntry(emptyScoreEntryState),
      scoreString: '6-4 6-3',
      scoreComplete: true,
      scoreWinningSide: 1,
    });

    expect(result.detail).toBeUndefined();
  });
});

describe('an ending that names a winner', () => {
  it('a walkover says who advances, and that no score was recorded', () => {
    const result = band({
      resolution: resolveScoreEntry(chooseSideEnding(emptyScoreEntryState, 2, WALKOVER)),
      reasonDisplay: 'Wo [inj]',
    });

    expect(result.tone).toBe('good');
    expect(result.headline).toContain('Walkover');
    expect(result.headline).toContain('Rosalind Lem advances');
    expect(result.detail).toBe('Wo [inj] · no score recorded');
  });

  it('names the side that did NOT end early — the inversion, restated at the band', () => {
    // The state model owns this inversion, but the band is where an operator would SEE it go wrong,
    // so it is asserted here too. An ending on side 1 must never read as side 1 advancing.
    const result = band({ resolution: resolveScoreEntry(chooseSideEnding(emptyScoreEntryState, 1, WALKOVER)) });

    expect(result.headline).toContain('Derrick Ellul advances');
    expect(result.headline).not.toContain('Rosalind Lem');
  });

  it('a retirement keeps the score in the detail, because the match was partly played', () => {
    const result = band({
      resolution: resolveScoreEntry(chooseSideEnding(emptyScoreEntryState, 2, RETIRED)),
      scoreString: '6-4 2-1',
      reasonDisplay: 'Ret [inj]',
    });

    expect(result.tone).toBe('good');
    expect(result.detail).toBe('Ret [inj] · 6-4 2-1');
  });

  it('a walkover does NOT keep the score, even when one was typed', () => {
    // The distinction the detail line has to get right: a retirement's score is part of the result, a
    // walkover's is discarded. Showing "6-4 2-1" beside a walkover would assert a score that is not
    // being submitted.
    const result = band({
      resolution: resolveScoreEntry(chooseSideEnding(emptyScoreEntryState, 2, WALKOVER)),
      scoreString: '6-4 2-1',
    });

    expect(result.detail).toBe('no score recorded');
    expect(result.detail).not.toContain('6-4');
  });
});

describe('a double exit', () => {
  it.each([WALKOVER, DEFAULTED])('%s with neither side present warns and says nobody advances', (ending) => {
    const state = toggleBothSidesOut(chooseSideEnding(emptyScoreEntryState, 1, ending));
    const result = band({ resolution: resolveScoreEntry(state) });

    expect(result.tone).toBe('warn');
    expect(result.headline).toContain('neither side advances');
    expect(result.detail).toContain('propagates');
  });

  it('borrows the existing warning rather than writing a second one', () => {
    // `doubleExitWarning` already says this for the inline popover. Two copies of a warning about the
    // most consequential outcome in the draw is how they come to disagree.
    const doubleWalkover = band({
      resolution: resolveScoreEntry(toggleBothSidesOut(chooseSideEnding(emptyScoreEntryState, 1, WALKOVER))),
    });
    const doubleDefault = band({
      resolution: resolveScoreEntry(toggleBothSidesOut(chooseSideEnding(emptyScoreEntryState, 1, DEFAULTED))),
    });

    expect(doubleWalkover.detail).toContain('Double walkover');
    expect(doubleDefault.detail).toContain('Double default');
  });
});

describe('a match-level ending that discards the score — the sentence this band exists for', () => {
  it.each([CANCELLED, DEAD_RUBBER])('%s states the part-score it cleared, by value', (status) => {
    // Not "a score was cleared" but WHICH score. An operator who sees their own 6-4 2-1 quoted back
    // knows what they are losing; a generic notice is dismissed without being read.
    const result = band({
      resolution: resolveScoreEntry(chooseMatchEnding(emptyScoreEntryState, status)),
      scoreString: '6-4 2-1',
    });

    expect(result.tone).toBe('warn');
    expect(result.headline).toContain('6-4 2-1');
    expect(result.headline).toMatch(/cleared/i);
    expect(result.detail).toBe('nobody advances');
  });

  it('does NOT claim a clearing when there was no score to clear', () => {
    // The false-alarm case. Cancelling an unplayed match discards nothing, and saying otherwise
    // teaches operators that the warning is noise.
    const result = band({ resolution: resolveScoreEntry(chooseMatchEnding(emptyScoreEntryState, CANCELLED)) });

    expect(result.headline).not.toMatch(/cleared/i);
    expect(result.tone).not.toBe('warn');
  });

  it.each([ABANDONED, SUSPENDED])('%s keeps its part-score and says it was recorded', (status) => {
    const result = band({
      resolution: resolveScoreEntry(chooseMatchEnding(emptyScoreEntryState, status)),
      scoreString: '6-4 2-1',
    });

    expect(result.headline).toContain('6-4 2-1');
    expect(result.headline).toMatch(/recorded/i);
    expect(result.headline).not.toMatch(/cleared/i);
    expect(result.detail).toContain('nobody advances');
  });
});

describe('the band is never blank', () => {
  it('always returns a headline, for every reachable state', () => {
    // A blank band beside a live Submit reads as "nothing will happen". Every state must say something.
    const states = [
      emptyScoreEntryState,
      chooseSideEnding(emptyScoreEntryState, 1, RETIRED),
      chooseSideEnding(emptyScoreEntryState, 2, WALKOVER),
      toggleBothSidesOut(chooseSideEnding(emptyScoreEntryState, 1, WALKOVER)),
      chooseMatchEnding(emptyScoreEntryState, SUSPENDED),
      chooseMatchEnding(emptyScoreEntryState, CANCELLED),
    ];

    for (const state of states) {
      for (const scoreString of [undefined, '6-4 2-1']) {
        const result = band({ resolution: resolveScoreEntry(state), scoreString });
        expect(result.headline, `blank headline for ${JSON.stringify(state)}`).toBeTruthy();
        expect(['good', 'warn', 'neutral']).toContain(result.tone);
      }
    }
  });

  it('survives a resolution that should not exist, rather than going blank', () => {
    // A winner-requiring ending with no winner cannot come out of `resolveScoreEntry` — an ending is
    // chosen ON a side. Asserted anyway, because the band is what an operator trusts and a defensive
    // branch that is never exercised is a branch nobody knows is broken.
    const result = band({
      resolution: { matchUpStatus: WALKOVER, isValid: false, awaitingWinner: true, isDoubleExit: false, clearsScore: true, hasEnding: true },
    });

    expect(result.tone).toBe('warn');
    expect(result.headline).toBeTruthy();
    expect(result.detail).toMatch(/not ready/i);
  });
});

describe('labels come from the caller, so a locale can supply them', () => {
  it('uses a supplied label instead of the English default', () => {
    const result = band({
      resolution: resolveScoreEntry(chooseSideEnding(emptyScoreEntryState, 2, WALKOVER)),
      labels: { [WALKOVER]: 'Forfait' },
    });

    expect(result.headline).toContain('Forfait');
    expect(result.headline).not.toContain('Walkover');
  });

  it('falls back to English when none is supplied', () => {
    const result = band({ resolution: resolveScoreEntry(chooseMatchEnding(emptyScoreEntryState, DEAD_RUBBER)) });

    expect(result.headline).toContain('Dead Rubber');
  });
});
