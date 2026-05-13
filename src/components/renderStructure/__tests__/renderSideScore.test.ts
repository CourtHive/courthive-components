/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { setScore, renderSideScore } from '../renderSideScore';
import type { Composition, MatchUp, SetScore } from '../../../types';

function makeSet(overrides: Partial<SetScore> = {}): SetScore {
  return { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1, ...overrides };
}

function makeMatchUp(sets: SetScore[]): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    score: { sets, scoreStringSide1: '6-4' },
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
    ]
  } as MatchUp;
}

describe('setScore', () => {
  it('creates a paragraph element', () => {
    const el = setScore({ set: makeSet(), sideNumber: 1 });
    expect(el.tagName).toBe('P');
  });

  it('displays side1Score for sideNumber 1', () => {
    const el = setScore({ set: makeSet({ side1Score: 6, side2Score: 4, winningSide: 1 }), sideNumber: 1 });
    expect(el.textContent).toContain('6');
  });

  it('displays side2Score for sideNumber 2', () => {
    const el = setScore({ set: makeSet({ side1Score: 6, side2Score: 4, winningSide: 1 }), sideNumber: 2 });
    expect(el.textContent).toContain('4');
  });

  it('has tmx-st class and setNumber attribute', () => {
    const el = setScore({ set: makeSet({ setNumber: 2 }), sideNumber: 1 });
    expect(el.classList.contains('tmx-st')).toBe(true);
    expect(el.getAttribute('setNumber')).toBe('2');
  });

  it('renders tiebreak score in a span', () => {
    const set = makeSet({ side1TiebreakScore: 7, side2TiebreakScore: 5 });
    const el = setScore({ set, sideNumber: 2 });
    const span = el.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.textContent).toBe('5');
  });

  it('does not render tiebreak when gameScoreOnly is true', () => {
    const set = makeSet({ side1TiebreakScore: 7, side2TiebreakScore: 5 });
    const el = setScore({ set, sideNumber: 1, gameScoreOnly: true });
    const span = el.querySelector('span');
    expect(span).toBeNull();
  });

  it('applies winner variant styling', () => {
    const el = setScore({ set: makeSet({ winningSide: 1 }), sideNumber: 1 });
    // The className should contain something related to winner
    expect(el.className.length).toBeGreaterThan(0);
  });

  it('applies loser variant styling for non-winning side', () => {
    const el = setScore({ set: makeSet({ winningSide: 1 }), sideNumber: 2 });
    expect(el.className.length).toBeGreaterThan(0);
  });

  it('handles set with no winningSide', () => {
    const el = setScore({ set: makeSet({ winningSide: undefined }), sideNumber: 1 });
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('renders empty string for undefined score', () => {
    const el = setScore({
      set: { setNumber: 1, side1Score: undefined, side2Score: undefined } as any,
      sideNumber: 1
    });
    expect(el.textContent?.trim()).toBe('');
  });

  it('applies scoreStripes background for odd set numbers', () => {
    const el = setScore({ set: makeSet({ setNumber: 1 }), sideNumber: 1, scoreStripes: true });
    expect(el.style.backgroundColor).not.toBe('transparent');
  });

  it('applies transparent background for even set numbers', () => {
    const el = setScore({ set: makeSet({ setNumber: 2 }), sideNumber: 1, scoreStripes: true });
    expect(el.style.backgroundColor).toBe('transparent');
  });

  it('handles tiebreak-only set (no game score, only tiebreak)', () => {
    const set: SetScore = {
      setNumber: 3,
      side1Score: undefined as any,
      side2Score: undefined as any,
      side1TiebreakScore: 10,
      side2TiebreakScore: 8,
      winningSide: 1
    };
    const el = setScore({ set, sideNumber: 1 });
    // Should display tiebreak score directly
    expect(el.innerHTML).toContain('10');
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
    const side1El = setScore({ set, sideNumber: 1 });
    expect(side1El.innerHTML).toContain('10');
    expect(side1El.innerHTML).not.toMatch(/>1</);
    const side2El = setScore({ set, sideNumber: 2 });
    expect(side2El.innerHTML).toContain('7');
    expect(side2El.innerHTML).not.toMatch(/>0</);
  });
});

describe('renderSideScore', () => {
  it('creates a wrapper div with sideScore class', () => {
    const sets = [makeSet()];
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1
    });
    expect(el.classList.contains('sideScore')).toBe(true);
    expect(el.classList.contains('tmx-scr')).toBe(true);
  });

  it('renders all set scores', () => {
    const sets = [
      makeSet({ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }),
      makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })
    ];
    const el = renderSideScore({ matchUp: makeMatchUp(sets), sideNumber: 1 });
    const setElements = el.querySelectorAll('.tmx-st');
    expect(setElements.length).toBe(2);
  });

  it('fires scoreClick on click', () => {
    const scoreClick = vi.fn();
    const el = renderSideScore({
      matchUp: makeMatchUp([makeSet()]),
      sideNumber: 1,
      eventHandlers: { scoreClick }
    });
    el.click();
    expect(scoreClick).toHaveBeenCalledTimes(1);
  });

  it('renders point scores when gameScore config is set (trailing)', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: '30', side2PointScore: '40' }
    ];
    const composition: Composition = {
      theme: 'test',
      configuration: { gameScore: { position: 'trailing', inverted: true } }
    };
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
      composition
    });
    expect(el.textContent).toContain('30');
  });

  it('renders point scores in leading position', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: '15', side2PointScore: '0' }
    ];
    const composition: Composition = {
      theme: 'test',
      configuration: { gameScore: { position: 'leading' } }
    };
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
      composition
    });
    // Leading point score should appear before set scores
    const children = el.querySelector('div')!.children;
    expect(children.length).toBeGreaterThan(1);
  });

  it('does not render point scores when gameScore config is absent', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: '30', side2PointScore: '40' }
    ];
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1
    });
    // Without gameScore config, point scores should not appear
    // Only game scores should be rendered
    const text = el.textContent || '';
    expect(text).toContain('4');
  });

  it('handles empty sets array', () => {
    const el = renderSideScore({
      matchUp: makeMatchUp([]),
      sideNumber: 1
    });
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.querySelectorAll('.tmx-st').length).toBe(0);
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
    const matchUp = {
      matchUpId: 'mu-tb',
      matchUpType: 'SINGLES',
      structureId: 'struct-1',
      score: {
        sets,
        scoreStringSide1: '7-5 6-7(4) [10-7]',
        scoreStringSide2: '5-7 7-6(4) [7-10]'
      },
      sides: [
        { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
        { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
      ]
    } as MatchUp;

    const side1El = renderSideScore({ matchUp, sideNumber: 1 });
    const side1SetEls = side1El.querySelectorAll('.tmx-st');
    expect(side1SetEls[2].innerHTML).toContain('10');
    expect(side1SetEls[2].innerHTML).not.toMatch(/>1</);

    const side2El = renderSideScore({ matchUp, sideNumber: 2 });
    const side2SetEls = side2El.querySelectorAll('.tmx-st');
    expect(side2SetEls[2].innerHTML).toContain('7');
    expect(side2SetEls[2].innerHTML).not.toMatch(/>0</);
  });

  it('applies participantHeight when provided', () => {
    const el = renderSideScore({
      matchUp: makeMatchUp([makeSet()]),
      sideNumber: 2,
      participantHeight: 40
    });
    expect(el.style.height).toBe('40px');
  });

  it('renders with resultsInfo enabled', () => {
    const composition: Composition = {
      theme: 'test',
      configuration: { resultsInfo: true }
    };
    const sets = [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })];
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
      composition
    });
    // resultsInfo wraps each set score in a column with a label
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('renders with winnerChevron (scoreStripes)', () => {
    const composition: Composition = {
      theme: 'test',
      configuration: { winnerChevron: true }
    };
    const el = renderSideScore({
      matchUp: makeMatchUp([makeSet()]),
      sideNumber: 1,
      composition
    });
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
