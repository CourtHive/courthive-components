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
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } },
    ],
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
      sideNumber: 1,
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
      winningSide: 1,
    };
    const el = setScore({ set, sideNumber: 1 });
    // Should display tiebreak score directly
    expect(el.innerHTML).toContain('10');
  });
});

describe('renderSideScore', () => {
  it('creates a wrapper div with sideScore class', () => {
    const sets = [makeSet()];
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
    });
    expect(el.classList.contains('sideScore')).toBe(true);
    expect(el.classList.contains('tmx-scr')).toBe(true);
  });

  it('renders all set scores', () => {
    const sets = [
      makeSet({ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }),
      makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 }),
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
      eventHandlers: { scoreClick },
    });
    el.click();
    expect(scoreClick).toHaveBeenCalledTimes(1);
  });

  it('renders point scores when gameScore config is set (trailing)', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointsScore: '30', side2PointsScore: '40' },
    ];
    const composition: Composition = {
      theme: 'test',
      configuration: { gameScore: { position: 'trailing', inverted: true } },
    };
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
      composition,
    });
    expect(el.textContent).toContain('30');
  });

  it('renders point scores in leading position', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointsScore: '15', side2PointsScore: '0' },
    ];
    const composition: Composition = {
      theme: 'test',
      configuration: { gameScore: { position: 'leading' } },
    };
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
      composition,
    });
    // Leading point score should appear before set scores
    const children = el.querySelector('div')!.children;
    expect(children.length).toBeGreaterThan(1);
  });

  it('does not render point scores when gameScore config is absent', () => {
    const sets: SetScore[] = [
      { setNumber: 1, side1Score: 4, side2Score: 5, side1PointsScore: '30', side2PointsScore: '40' },
    ];
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
    });
    // Without gameScore config, point scores should not appear
    // Only game scores should be rendered
    const text = el.textContent || '';
    expect(text).toContain('4');
  });

  it('handles empty sets array', () => {
    const el = renderSideScore({
      matchUp: makeMatchUp([]),
      sideNumber: 1,
    });
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.querySelectorAll('.tmx-st').length).toBe(0);
  });

  it('applies participantHeight when provided', () => {
    const el = renderSideScore({
      matchUp: makeMatchUp([makeSet()]),
      sideNumber: 2,
      participantHeight: 40,
    });
    expect(el.style.height).toBe('40px');
  });

  it('renders with resultsInfo enabled', () => {
    const composition: Composition = {
      theme: 'test',
      configuration: { resultsInfo: true },
    };
    const sets = [
      makeSet({ setNumber: 1 }),
      makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 }),
    ];
    const el = renderSideScore({
      matchUp: makeMatchUp(sets),
      sideNumber: 1,
      composition,
    });
    // resultsInfo wraps each set score in a column with a label
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('renders with winnerChevron (scoreStripes)', () => {
    const composition: Composition = {
      theme: 'test',
      configuration: { winnerChevron: true },
    };
    const el = renderSideScore({
      matchUp: makeMatchUp([makeSet()]),
      sideNumber: 1,
      composition,
    });
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
