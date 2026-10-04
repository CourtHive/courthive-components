/**
 * The two invariants, proved by ENUMERATION rather than by example.
 *
 * CA, 2026-09-30: *"a state engine approach gives us more complete unit testing capabilities"*. This
 * file is that claim made good. Every sequence of set outcomes a format admits is typed into a model,
 * and an independent oracle — one that knows only how many sets win a match and nothing about how the
 * model works — says what must be true of the result:
 *
 *   10B  no set exists beyond the one that decides the match;
 *   10A  a model with an unfinished or empty set before its last entered one is never complete and
 *        always carries an error.
 *
 * And, because they follow from the same oracle: which sets are visible, who won, and that nothing
 * typed short of the decider is ever lost. The digit ceiling is enumerated the same way against the
 * factory's own answer.
 */
import { isComplete, winningSide, columns, error } from '../scoreEntrySelectors';
import { createScoreEntryModel, typeDigit, setCell } from '../scoreEntryModel';
import { matchUpFormatCode, scoreGovernor } from 'tods-competition-factory';
import { deepFreeze, G } from './scoreEntryModelTestHelpers';
import { describe, it, expect } from 'vitest';

import type { ScoreEntryModel, SetEntry } from '../scoreEntryModel';

const TIMED = 'SET3X-S:T10';

/** What an operator can leave one set as: won by either side, unfinished, half-entered, or untouched. */
type Token = 'W1' | 'W2' | 'I' | 'P' | 'E';

const ENTRY: Record<Token, SetEntry> = {
  W1: { side1: 6, side2: 2 },
  W2: { side1: 2, side2: 6 },
  I: { side1: 4, side2: 2 },
  P: { side1: 6 },
  E: {}
};

const isWin = (token: Token) => token === 'W1' || token === 'W2';

function sequences<T>(alphabet: T[], length: number): T[][] {
  if (length === 0) return [[]];
  return sequences(alphabet, length - 1).flatMap((prefix) => alphabet.map((token) => [...prefix, token]));
}

/** Type a sequence in set order, each cell through `setCell`, freezing between steps. */
function play(matchUpFormat: string, tokens: Token[], entries: Record<Token, SetEntry> = ENTRY): ScoreEntryModel {
  let model = deepFreeze(createScoreEntryModel({ matchUpFormat }));
  for (const [index, token] of tokens.entries()) {
    const entry = entries[token];
    if (entry.side1 !== undefined) model = deepFreeze(setCell(model, G(index, 1), entry.side1));
    if (entry.side2 !== undefined) model = deepFreeze(setCell(model, G(index, 2), entry.side2));
  }
  return model;
}

/**
 * The oracle for a best-of. It counts wins in order and knows nothing else.
 */
function bestOfOracle(tokens: Token[], setsToWin: number) {
  let wins1 = 0;
  let wins2 = 0;
  let decider: number | undefined;
  for (const [index, token] of tokens.entries()) {
    if (token === 'W1') wins1 += 1;
    if (token === 'W2') wins2 += 1;
    if (wins1 === setsToWin || wins2 === setsToWin) {
      decider = index;
      break;
    }
  }

  const kept = decider === undefined ? tokens : tokens.slice(0, decider + 1);
  const last = kept
    .map((token, index) => (token === 'E' ? -1 : index))
    .reduce((max, index) => Math.max(max, index), -1);
  const complete = decider !== undefined && kept.every(isWin);
  const winner = complete ? (wins1 === setsToWin ? 1 : 2) : undefined;
  const errorExpected = last >= 0 && kept.slice(0, last).some((token) => !isWin(token));
  const opensNext = last + 1 < tokens.length && decider === undefined && kept.slice(0, last + 1).every(isWin);
  const visible =
    last < 0 ? [0] : [...Array.from({ length: last + 1 }, (_, index) => index), ...(opensNext ? [last + 1] : [])];

  return { decider, kept, complete, winner, errorExpected, visible };
}

describe.each([
  { matchUpFormat: 'SET3-S:6/TB7', setsToWin: 2, alphabet: ['W1', 'W2', 'I', 'P', 'E'] as Token[] },
  { matchUpFormat: 'SET5-S:6/TB7', setsToWin: 3, alphabet: ['W1', 'W2', 'I', 'E'] as Token[] }
])('every sequence of set outcomes under $matchUpFormat', ({ matchUpFormat, setsToWin, alphabet }) => {
  const count = matchUpFormatCode.parse(matchUpFormat)?.bestOf as number;
  const cases = sequences(alphabet, count);

  it(`enumerates ${cases.length} sequences`, () => {
    expect(cases.length).toBe(alphabet.length ** count);
  });

  it('10B: no set exists beyond the decider, and nothing before it is lost', () => {
    for (const tokens of cases) {
      const model = play(matchUpFormat, tokens);
      const { decider } = bestOfOracle(tokens, setsToWin);
      const label = tokens.join(' ');

      for (const [index, entry] of model.sets.entries()) {
        if (decider !== undefined && index > decider) {
          expect(entry, `${label}: set ${index + 1} must be empty beyond the decider at ${decider + 1}`).toEqual({});
        } else {
          expect(entry, `${label}: set ${index + 1} must hold what was typed`).toEqual(ENTRY[tokens[index]]);
        }
      }
    }
  });

  it('10A: complete only when every set up to the decider is won, with an error whenever an earlier set is not', () => {
    for (const tokens of cases) {
      const model = play(matchUpFormat, tokens);
      const oracle = bestOfOracle(tokens, setsToWin);
      const label = tokens.join(' ');

      expect(isComplete(model), `${label}: isComplete`).toBe(oracle.complete);
      expect(winningSide(model), `${label}: winningSide`).toBe(oracle.winner);
      expect(error(model) !== undefined, `${label}: error (${error(model)})`).toBe(oracle.errorExpected);
    }
  });

  it('shows every set that holds anything, and opens the next only after an unbroken run of finished sets', () => {
    for (const tokens of cases) {
      const model = play(matchUpFormat, tokens);
      const { visible } = bestOfOracle(tokens, setsToWin);
      const shown = columns(model).map((slot) => slot.setIndex);

      expect(shown, `${tokens.join(' ')}: visible sets`).toEqual(visible);
    }
  });
});

describe('every sequence of bolts under SET3X-S:T10, which plays every set', () => {
  type Bolt = 'W1' | 'W2' | 'T' | 'P' | 'E';
  const BOLT: Record<Bolt, SetEntry> = {
    W1: { side1: 22, side2: 21 },
    W2: { side1: 21, side2: 22 },
    T: { side1: 21, side2: 21 },
    P: { side1: 22 },
    E: {}
  };
  const settled = (bolt: Bolt) => bolt === 'W1' || bolt === 'W2' || bolt === 'T';
  const cases = sequences<Bolt>(['W1', 'W2', 'T', 'P', 'E'], 3);

  it('never trims: every bolt typed is kept', () => {
    for (const bolts of cases) {
      const model = play(TIMED, bolts as unknown as Token[], BOLT as unknown as Record<Token, SetEntry>);
      expect(model.sets, bolts.join(' ')).toEqual(bolts.map((bolt) => BOLT[bolt]));
    }
  });

  it('10A holds for bolts too, and a tie is a finished bolt', () => {
    for (const bolts of cases) {
      const model = play(TIMED, bolts as unknown as Token[], BOLT as unknown as Record<Token, SetEntry>);
      const last = bolts
        .map((bolt, index) => (bolt === 'E' ? -1 : index))
        .reduce((max, index) => Math.max(max, index), -1);
      const earlierUnsettled = last >= 0 && bolts.slice(0, last).some((bolt) => !settled(bolt));
      const label = bolts.join(' ');

      expect(error(model) !== undefined, `${label}: error`).toBe(earlierUnsettled);
      if (earlierUnsettled || (last >= 0 && !settled(bolts[last]))) {
        expect(isComplete(model), `${label}: cannot be complete`).toBe(false);
      }

      const opensNext = last + 1 < 3 && bolts.slice(0, last + 1).every(settled);
      const visible =
        last < 0 ? [0] : [...Array.from({ length: last + 1 }, (_, index) => index), ...(opensNext ? [last + 1] : [])];
      expect(
        columns(model).map((slot) => slot.setIndex),
        `${label}: visible`
      ).toEqual(visible);
    }
  });
});

describe("the digit ceiling is the factory's, for every opponent score and every digit", () => {
  const formats = ['SET3-S:6/TB7', 'SET3-S:4/TB7', 'SET3-S:6', 'SET3-S:6NOAD/TB7', TIMED, 'SET1-S:5WB1'];
  const opponents = [undefined, 0, 1, 2, 3, 4, 5, 6, 7];
  const currents = [undefined, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  it.each(formats)('%s', (matchUpFormat) => {
    const setFormat = matchUpFormatCode.parse(matchUpFormat)?.setFormat as any;
    expect(setFormat, 'the format must parse, or the fallback is being measured').toBeDefined();
    let accepted = 0;

    for (const opponent of opponents) {
      for (const current of currents) {
        for (let digit = 0; digit <= 9; digit += 1) {
          let model = deepFreeze(createScoreEntryModel({ matchUpFormat }));
          if (opponent !== undefined) model = deepFreeze(setCell(model, G(0, 2), opponent));
          if (current !== undefined) model = deepFreeze(setCell(model, G(0, 1), current));

          const ceiling = scoreGovernor.getMaxSetScore({
            opponentScore: opponent,
            setTo: setFormat.setTo,
            tiebreakAt: setFormat.tiebreakAt,
            NoAD: setFormat.NoAD,
            winBy: setFormat.winBy,
            timed: !!setFormat.timed
          });
          const value = current === undefined ? digit : current * 10 + digit;
          const expectAccepted = String(value).length <= 2 && (ceiling === undefined || value <= ceiling);

          const next = typeDigit(model, { cell: G(0, 1), digit });
          const label = `${matchUpFormat} ${current ?? '_'}+${digit} vs ${opponent ?? '_'} (ceiling ${ceiling})`;
          expect(next !== model, label).toBe(expectAccepted);
          if (expectAccepted) {
            accepted += 1;
            expect(next.sets[0].side1, label).toBe(value);
          }
        }
      }
    }

    // A sweep that accepts nothing has measured nothing.
    expect(accepted).toBeGreaterThan(0);
  });
});
