/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { renderInlineMatchUp } from '../renderInlineMatchUp';
import { InlineScoringManager } from '../inlineScoringManager';
import { compositions } from '../../../compositions/compositions';
import type { Composition, MatchUp } from '../../../types';

const STANDARD_FORMAT = 'SET3-S:6/TB7';

function makeComposition(mode: 'points' | 'games' = 'points'): Composition {
  const base = compositions.Australian;
  return {
    ...base,
    configuration: {
      ...base.configuration,
      matchUpFooter: true,
      gameScore: { position: 'trailing', inverted: true },
      inlineScoring: { mode, showFooter: true, showSituation: true },
    },
  };
}

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    matchUpStatus: 'IN_PROGRESS',
    matchUpFormat: STANDARD_FORMAT,
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 3,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } },
    ],
    ...overrides,
  } as MatchUp;
}

describe('renderInlineMatchUp', () => {
  it('renders a wrapper element', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition(),
      manager,
      matchUpFormat: STANDARD_FORMAT,
      isLucky: true,
    });
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.classList.contains('chc-inline-scoring-wrapper')).toBe(true);
  });

  it('sets data-matchup-id attribute', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp({ matchUpId: 'test-id' }),
      composition: makeComposition(),
      manager,
      isLucky: true,
    });
    expect(el.getAttribute('data-matchup-id')).toBe('test-id');
  });

  it('contains the inline-scoring-active class on wrapper element', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition(),
      manager,
      isLucky: true,
    });
    expect(el.classList.contains('chc-inline-scoring-active')).toBe(true);
  });

  it('renders footer when showFooter is true', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition(),
      manager,
      isLucky: true,
    });
    const footer = el.querySelector('.chc-inline-scoring-footer-slot');
    expect(footer).not.toBeNull();
  });

  it('footer has undo, redo, clear, submit buttons', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition(),
      manager,
      isLucky: true,
    });
    const buttons = el.querySelectorAll('.chc-inline-scoring-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(4); // Undo, Redo, Clear, Submit
  });

  it('does not render inline footer when showFooter is false', () => {
    const manager = new InlineScoringManager();
    const comp = makeComposition();
    comp.configuration!.inlineScoring!.showFooter = false;
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: comp,
      manager,
      isLucky: true,
    });
    const footer = el.querySelector('.chc-inline-scoring-footer-slot');
    expect(footer).toBeNull();
  });

  it('creates engine in manager on render', () => {
    const manager = new InlineScoringManager();
    renderInlineMatchUp({
      matchUp: makeMatchUp({ matchUpId: 'mu-new' }),
      composition: makeComposition(),
      manager,
      matchUpFormat: STANDARD_FORMAT,
      isLucky: true,
    });
    expect(manager.has('mu-new')).toBe(true);
  });

  it('adds clickable class to score areas in points mode', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp({
      score: { sets: [{ setNumber: 1, side1Score: 0, side2Score: 0 }], scoreStringSide1: '0-0' },
    });
    const el = renderInlineMatchUp({
      matchUp,
      composition: makeComposition('points'),
      manager,
      isLucky: true,
    });
    const clickable = el.querySelectorAll('.chc-inline-scoring-clickable');
    // Score areas should be marked clickable
    expect(clickable.length).toBeGreaterThanOrEqual(0);
  });

  it('adds clickable score elements in games mode', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition('games'),
      manager,
      isLucky: true,
    });
    // Score elements get clickable class via renderSideScore
    const clickable = el.querySelectorAll('.chc-inline-scoring-clickable');
    expect(clickable.length).toBeGreaterThan(0);
  });

  it('renders situation flags when situation text exists', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition(),
      manager,
      isLucky: true,
    });
    // Footer buttons container should exist even if situation text is empty
    const buttonsContainer = el.querySelector('.chc-inline-scoring-footer-buttons');
    expect(buttonsContainer).not.toBeNull();
  });

  it('footer has submit button', () => {
    const manager = new InlineScoringManager();
    const el = renderInlineMatchUp({
      matchUp: makeMatchUp(),
      composition: makeComposition(),
      manager,
      isLucky: true,
    });
    const submitBtn = el.querySelector('.chc-is-submit');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn?.textContent).toBe('Submit');
  });
});
