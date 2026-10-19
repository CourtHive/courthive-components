/**
 * @vitest-environment happy-dom
 *
 * A decided matchUp opens in the scoring modal's inline approach as it stands: completed, keeping its
 * winner, and taking no input (CA, 2026-10-19: "should open as completed and take no input!"). The
 * approach used to claim IN_PROGRESS for every matchUp. Beside deciding sets the factory refuses that
 * state (7.16.0), so the old score showed while the first tap started from love; before the refusal the
 * taps went into a set beyond the match. Clear still resets to a fresh matchUp for a re-score.
 */
import { renderInlineScoringEntry } from '../inlineScoringApproach';
import { describe, it, expect, beforeEach } from 'vitest';

function makeMatchUp(overrides: any = {}): any {
  return {
    matchUpId: 'm1',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } }
    ],
    ...overrides
  };
}

const decided = {
  matchUpStatus: 'COMPLETED',
  winningSide: 1,
  score: {
    scoreStringSide1: '6-3 6-4',
    scoreStringSide2: '3-6 4-6',
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 3, winningSide: 1 },
      { setNumber: 2, side1Score: 6, side2Score: 4, winningSide: 1 }
    ]
  }
};

function mount(matchUp: any) {
  const outcomes: any[] = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderInlineScoringEntry({ matchUp, container, onScoreChange: (outcome) => outcomes.push(outcome), labels: {} });

  const liveChips = () => [...container.querySelectorAll('abbr')].filter((a) => a.textContent === 'LIVE');
  const clickable = () => [...container.querySelectorAll('.chc-inline-scoring-clickable')];
  const submit = () => container.querySelector('.chc-is-submit') as HTMLButtonElement;

  return { container, outcomes, liveChips, clickable, submit };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('inlineScoring approach — a decided matchUp opens completed and takes no input', () => {
  it('a COMPLETED matchUp is not presented as live', () => {
    const h = mount(makeMatchUp(decided));

    expect(h.liveChips()).toEqual([]);
  });

  it('a COMPLETED matchUp offers no score area to tap, emits nothing and cannot be submitted', () => {
    const h = mount(makeMatchUp(decided));

    expect(h.clickable()).toEqual([]);
    expect(h.submit().disabled).toBe(true);
    expect(h.outcomes).toEqual([]);
  });

  it('a COMPLETED matchUp keeps its score on screen', () => {
    const h = mount(makeMatchUp(decided));

    const text = (h.container.textContent ?? '').replaceAll(/\s+/g, '');
    expect(text).toContain('Alice66');
    expect(text).toContain('Bob34');
  });

  it('control: a TO_BE_PLAYED matchUp opens live, with score areas to tap', () => {
    const h = mount(makeMatchUp());

    expect(h.liveChips().length).toBeGreaterThan(0);
    expect(h.clickable().length).toBeGreaterThan(0);
  });
});
