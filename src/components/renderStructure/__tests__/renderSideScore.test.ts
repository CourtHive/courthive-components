import { enrichTiebreakSet, setScoreView, sideScoreCells } from '../sideScoreModel';
import { makeMatchUp } from './helpers/matchUpFixtures';
import { describe, it, expect } from 'vitest';

// constants and types
import type { Composition, MatchUp, SetScore } from '../../../types';
import type { SideScoreCell } from '../sideScoreModel';

/**
 * What one side's score shows, computed by `../sideScoreModel`, which `renderSideScore` and `setScore`
 * draw. The drawn result — the elements and classes, the stripe's paint, the click, the leading point
 * score's place on screen, `participantHeight` and the `resultsInfo` labels — is asserted in a browser
 * by `StructureSideScoreTests.stories.ts`.
 */

const STRIPE = 'var(--chc-bg-secondary)';

function makeSet(overrides: Partial<SetScore> = {}): SetScore {
  return { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1, ...overrides };
}

function scoreMatchUp(sets: SetScore[], score: Partial<MatchUp['score']> = {}): MatchUp {
  return makeMatchUp({ score: { sets, scoreStringSide1: '6-4', ...score } });
}

const cells = (matchUp: MatchUp, sideNumber: number, configuration: Composition['configuration'] = {}) =>
  sideScoreCells({ matchUp, sideNumber, gameScore: configuration.gameScore, resultsInfo: configuration.resultsInfo });

/** Each cell as `kind:text`, so a test reads the order and the values at once. */
const describeCells = (list: SideScoreCell[], sideNumber: number) =>
  list.map((cell) =>
    cell.kind === 'point' ? `point:${cell.point.text}` : `set:${setScoreView({ set: cell.set, sideNumber }).text}`
  );

describe('setScoreView', () => {
  it('displays side1Score for sideNumber 1', () => {
    expect(setScoreView({ set: makeSet({ side1Score: 6, side2Score: 4, winningSide: 1 }), sideNumber: 1 }).text).toBe(
      '6'
    );
  });

  it('displays side2Score for sideNumber 2', () => {
    expect(setScoreView({ set: makeSet({ side1Score: 6, side2Score: 4, winningSide: 1 }), sideNumber: 2 }).text).toBe(
      '4'
    );
  });

  // CA, 2026-11-11: *"It is standard to only show the tiebreak points for the losing side, so 7-6(0) is
  // assumed to be 7-6(7-0)"*. The draw cell follows the scoring dialog's rule (`lowerTiebreakPoints`).
  it('raises the tiebreak points on the side that lost the set, and nothing on the winner', () => {
    const set = makeSet({ side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 4 });
    expect(setScoreView({ set, sideNumber: 2 }).tiebreak).toBe('4');
    expect(setScoreView({ set, sideNumber: 1 }).tiebreak).toBe('');
    const mirrored = makeSet({
      side1Score: 6,
      side2Score: 7,
      winningSide: 2,
      side1TiebreakScore: 9,
      side2TiebreakScore: 11
    });
    expect(setScoreView({ set: mirrored, sideNumber: 1 }).tiebreak).toBe('9');
    expect(setScoreView({ set: mirrored, sideNumber: 2 }).tiebreak).toBe('');
  });

  it('raises a love tiebreak: 7-6(0) shows the 0 on the loser', () => {
    const set = makeSet({ side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 0 });
    expect(setScoreView({ set, sideNumber: 2 }).tiebreak).toBe('0');
    expect(setScoreView({ set, sideNumber: 1 }).tiebreak).toBe('');
  });

  it('raises nothing on either side unless BOTH tiebreak values are recorded', () => {
    // CA, 2026-11-11: *"if we don't have both tiebreak values just show the games score (for a tiebreak
    // set we must have both values, I'd assume)"*. Only ONE side's points can reach a stored set (TMX's
    // inline-scoring submit sends each side only when non-null); that is incomplete data, so the cell
    // shows the games alone rather than guessing whose points they are. (It never shows "undefined".)
    const set = makeSet({ side1Score: 7, side2Score: 6, side1TiebreakScore: 7 });
    expect(setScoreView({ set, sideNumber: 1 })).toMatchObject({ text: '7', tiebreak: '' });
    expect(setScoreView({ set, sideNumber: 2 })).toMatchObject({ text: '6', tiebreak: '' });
    const mirrored = makeSet({ side1Score: 6, side2Score: 7, winningSide: 2, side1TiebreakScore: 4 });
    expect(setScoreView({ set: mirrored, sideNumber: 1 })).toMatchObject({ text: '6', tiebreak: '' });
    expect(setScoreView({ set: mirrored, sideNumber: 2 })).toMatchObject({ text: '7', tiebreak: '' });
  });

  it('raises neither side of an impossible tied tiebreak', () => {
    const set = makeSet({ side1Score: 7, side2Score: 6, side1TiebreakScore: 6, side2TiebreakScore: 6 });
    expect(setScoreView({ set, sideNumber: 1 }).tiebreak).toBe('');
    expect(setScoreView({ set, sideNumber: 2 }).tiebreak).toBe('');
  });

  it('shows an empty superscript for a set without a tiebreak', () => {
    expect(setScoreView({ set: makeSet(), sideNumber: 1 }).tiebreak).toBe('');
  });

  it('drops the tiebreak superscript when gameScoreOnly is true', () => {
    const set = makeSet({ side1TiebreakScore: 7, side2TiebreakScore: 5 });
    expect(setScoreView({ set, sideNumber: 1, gameScoreOnly: true }).tiebreak).toBeUndefined();
  });

  // The variant was `(isWinningSide && 'winner') || set?.winningSide ? 'loser' : undefined`, which by operator
  // precedence marked BOTH sides of a decided set `loser` (2023-08 until 2026-10-19).
  it.each([1, 2])('marks the winning side %s of a decided set as the winner, and only that side', (winningSide) => {
    const loserSide = 3 - winningSide;
    expect(setScoreView({ set: makeSet({ winningSide }), sideNumber: winningSide }).variant).toBe('winner');
    expect(setScoreView({ set: makeSet({ winningSide }), sideNumber: loserSide }).variant).toBe('loser');
  });

  it('marks neither side of an undecided set', () => {
    for (const sideNumber of [1, 2]) {
      expect(setScoreView({ set: makeSet({ winningSide: undefined }), sideNumber }).variant).toBeUndefined();
    }
  });

  it('renders empty string for undefined score', () => {
    const set = { setNumber: 1, side1Score: undefined, side2Score: undefined } as SetScore;
    expect(setScoreView({ set, sideNumber: 1 }).text).toBe('');
  });

  it('stripes odd set numbers with the secondary background token', () => {
    expect(setScoreView({ set: makeSet({ setNumber: 1 }), sideNumber: 1, scoreStripes: true }).background).toBe(STRIPE);
    expect(setScoreView({ set: makeSet({ setNumber: 3 }), sideNumber: 1, scoreStripes: true }).background).toBe(STRIPE);
  });

  it('leaves even set numbers transparent', () => {
    expect(setScoreView({ set: makeSet({ setNumber: 2 }), sideNumber: 1, scoreStripes: true }).background).toBe(
      'transparent'
    );
  });

  it('CONTROL — no stripes at all without scoreStripes', () => {
    expect(setScoreView({ set: makeSet({ setNumber: 1 }), sideNumber: 1 }).background).toBe('transparent');
  });

  it('handles tiebreak-only set (no game score, only tiebreak)', () => {
    const set: SetScore = { setNumber: 3, side1TiebreakScore: 10, side2TiebreakScore: 8, winningSide: 1 };
    const view = setScoreView({ set, sideNumber: 1 });
    // the tiebreak points ARE the score, so they are not repeated as a superscript
    expect(view.text).toBe('10');
    expect(view.tiebreak).toBe('');
  });

  it('a tiebreak-only set is assumed to carry both values; with one missing, that side reads blank', () => {
    // Not special-cased (CA: "for a tiebreak set we must have both values"). Recorded as it stands: the
    // recorded side shows its points as the score, the other side has neither games nor points to show.
    const set: SetScore = { setNumber: 3, side1TiebreakScore: 10, winningSide: 1 };
    expect(setScoreView({ set, sideNumber: 1 })).toMatchObject({ text: '10', tiebreak: '' });
    expect(setScoreView({ set, sideNumber: 2 })).toMatchObject({ text: '', tiebreak: '' });
  });

  it('handles match-tiebreak final set normalised by the engine (tiebreakSet flag set, game score collapsed to 1/0)', () => {
    // For SET3-S:6/TB7-F:TB10, the engine normalises the final-set match tiebreak to
    // side1Score/side2Score 1/0 with the actual points carried on side*TiebreakScore and
    // `tiebreakSet: true` on the set. The renderer must honour the flag and show the
    // tiebreak points; otherwise the draw cell collapses to 1/0 and the points disappear.
    const set: SetScore = {
      setNumber: 3,
      side1Score: 1,
      side2Score: 0,
      side1TiebreakScore: 10,
      side2TiebreakScore: 7,
      tiebreakSet: true,
      winningSide: 1
    };
    expect(setScoreView({ set, sideNumber: 1 })).toMatchObject({ text: '10', tiebreak: '' });
    expect(setScoreView({ set, sideNumber: 2 })).toMatchObject({ text: '7', tiebreak: '' });
  });
});

describe('sideScoreCells', () => {
  it('has one cell per set, in order', () => {
    const sets = [
      makeSet({ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }),
      makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })
    ];
    expect(describeCells(cells(scoreMatchUp(sets), 1), 1)).toEqual(['set:6', 'set:3']);
    expect(describeCells(cells(scoreMatchUp(sets), 2), 2)).toEqual(['set:4', 'set:6']);
  });

  it('puts the point score after the sets when gameScore is trailing', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: '30', side2PointScore: '40' }
    ];
    const list = cells(scoreMatchUp(sets), 1, { gameScore: { position: 'trailing', inverted: true } });
    expect(describeCells(list, 1)).toEqual(['set:4', 'point:30']);
  });

  it('puts the point score before the sets when gameScore is leading', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: '15', side2PointScore: '0' }
    ];
    const list = cells(scoreMatchUp(sets), 1, { gameScore: { position: 'leading' } });
    expect(describeCells(list, 1)).toEqual(['point:15', 'set:4']);
    expect(describeCells(cells(scoreMatchUp(sets), 2, { gameScore: { position: 'leading' } }), 2)).toEqual([
      'point:0',
      'set:5'
    ]);
  });

  it('still shows the point score, trailing and inverted, when gameScore config is absent', () => {
    // This test used to be titled "does not render point scores when gameScore config is absent" and
    // asserted only that the text contained '4' — which the game score alone satisfies. The point
    // score DOES render without the config, deliberately: until 2026-04-03 the code read "Renders
    // whenever the last set has point score data, regardless of gameScore config". The config only
    // places and inverts it.
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: '30', side2PointScore: '40' }
    ];
    const list = cells(scoreMatchUp(sets), 1);
    expect(describeCells(list, 1)).toEqual(['set:4', 'point:30']);
    expect(list[1]).toMatchObject({ kind: 'point', point: { position: 'trailing', inverted: true } });
  });

  it('CONTROL — no point cell when the last set carries no point score', () => {
    expect(describeCells(cells(scoreMatchUp([makeSet()]), 1, { gameScore: { position: 'trailing' } }), 1)).toEqual([
      'set:6'
    ]);
  });

  it('handles empty sets array', () => {
    expect(cells(scoreMatchUp([]), 1)).toEqual([]);
  });

  it('labels each cell with resultsInfo, on side 1 only', () => {
    const sets = [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })];
    const side1 = cells(scoreMatchUp(sets), 1, { resultsInfo: true });
    expect(side1.map((cell) => cell.label)).toEqual(['1', '2']);
    const side2 = cells(scoreMatchUp(sets), 2, { resultsInfo: true });
    expect(side2.map((cell) => cell.label)).toEqual([undefined, undefined]);
    // and without the flag, no labels at all
    expect(cells(scoreMatchUp(sets), 1).map((cell) => cell.label)).toEqual([undefined, undefined]);
  });

  it('renders tiebreak points from scoreStringSide bracket token when the set lacks side*TiebreakScore', () => {
    // Reproduces the SET3-S:6/TB7-F:TB10 case: factory persists the final-set match tiebreak
    // with side1Score:1/side2Score:0/tiebreakSet:true and parks the actual points (e.g. "[10-7]")
    // only in scoreStringSide1/2. The renderer must recover the TB points from those strings.
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 7, side2Score: 5, winningSide: 1 },
      { setNumber: 2, side1Score: 6, side2Score: 7, side1TiebreakScore: 4, side2TiebreakScore: 7, winningSide: 2 },
      { setNumber: 3, side1Score: 1, side2Score: 0, tiebreakSet: true, winningSide: 1 }
    ];
    const matchUp = scoreMatchUp(sets, {
      scoreStringSide1: '7-5 6-7(4) [10-7]',
      scoreStringSide2: '5-7 7-6(4) [7-10]'
    });

    expect(describeCells(cells(matchUp, 1), 1)).toEqual(['set:7', 'set:6', 'set:10']);
    expect(describeCells(cells(matchUp, 2), 2)).toEqual(['set:5', 'set:7', 'set:7']);
  });
});

describe('enrichTiebreakSet', () => {
  const tiebreakSet: SetScore = { setNumber: 3, side1Score: 1, side2Score: 0, tiebreakSet: true, winningSide: 1 };

  it('reads both sides from one side’s token when only that one is present', () => {
    expect(enrichTiebreakSet(tiebreakSet, 0, { scoreStringSide1: '[10-7]' })).toMatchObject({
      side1TiebreakScore: 10,
      side2TiebreakScore: 7
    });
    expect(enrichTiebreakSet(tiebreakSet, 0, { scoreStringSide2: '[7-10]' })).toMatchObject({
      side1TiebreakScore: 10,
      side2TiebreakScore: 7
    });
  });

  it('CONTROL — leaves a set that already carries tiebreak points, or is not a tiebreak set, untouched', () => {
    const carried = { ...tiebreakSet, side1TiebreakScore: 10, side2TiebreakScore: 8 };
    expect(enrichTiebreakSet(carried, 0, { scoreStringSide1: '[10-7]' })).toBe(carried);
    const ordinary = makeSet();
    expect(enrichTiebreakSet(ordinary, 0, { scoreStringSide1: '[10-7]' })).toBe(ordinary);
  });
});
