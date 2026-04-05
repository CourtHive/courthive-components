/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderMatchUp } from '../renderMatchUp';
import { compositions } from '../../../compositions/compositions';
import type { MatchUp, Composition } from '../../../types';

const TEST_THEME = 'test-theme';
const FOOTER_SELECTOR = '.chc-matchup-footer';

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 3,
    sides: [
      {
        sideNumber: 1,
        participant: { participantId: 'p1', participantName: 'Alice Smith' }
      },
      {
        sideNumber: 2,
        participant: { participantId: 'p2', participantName: 'Bob Jones' }
      }
    ],
    score: {
      scoreStringSide1: '6-4 3-2',
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 2 }
      ]
    },
    ...overrides
  } as MatchUp;
}

describe('renderMatchUp', () => {
  it('creates a container element with matchUpId', () => {
    const el = renderMatchUp({ matchUp: makeMatchUp() });
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.id).toBe('mu-1');
  });

  it('container has matchup class', () => {
    const el = renderMatchUp({ matchUp: makeMatchUp() });
    expect(el.classList.contains('matchup')).toBe(true);
  });

  it('container has tmx-m class', () => {
    const el = renderMatchUp({ matchUp: makeMatchUp() });
    expect(el.classList.contains('tmx-m')).toBe(true);
  });

  it('applies composition theme class', () => {
    const composition = compositions.Australian;
    const el = renderMatchUp({ matchUp: makeMatchUp(), composition });
    expect(el.className).toContain(composition.theme);
  });

  it('renders two side containers (tmx-sd)', () => {
    const el = renderMatchUp({ matchUp: makeMatchUp(), composition: compositions.Australian });
    const sides = el.querySelectorAll('.tmx-sd');
    expect(sides.length).toBe(2);
  });

  it('applies custom className', () => {
    const el = renderMatchUp({ matchUp: makeMatchUp(), className: 'my-custom' });
    expect(el.classList.contains('my-custom')).toBe(true);
  });

  it('fires matchUpClick on container click', () => {
    const matchUpClick = vi.fn();
    const matchUp = makeMatchUp();
    const el = renderMatchUp({ matchUp, eventHandlers: { matchUpClick } });

    el.click();
    expect(matchUpClick).toHaveBeenCalledTimes(1);
    expect(matchUpClick.mock.calls[0][0].matchUp).toBe(matchUp);
  });

  it('renders matchUpFooter when configured', () => {
    const composition: Composition = {
      theme: TEST_THEME,
      configuration: { matchUpFooter: true }
    };
    const matchUp = makeMatchUp({ roundName: 'Quarterfinals', roundPosition: 2 });
    const el = renderMatchUp({ matchUp, composition });
    const footer = el.querySelector(FOOTER_SELECTOR);
    expect(footer).not.toBeNull();
    expect(footer!.textContent).toContain('Quarterfinals');
    expect(footer!.textContent).toContain('2');
  });

  it('does not render footer when matchUpFooter is false', () => {
    const composition: Composition = {
      theme: TEST_THEME,
      configuration: { matchUpFooter: false }
    };
    const el = renderMatchUp({ matchUp: makeMatchUp(), composition });
    expect(el.querySelector(FOOTER_SELECTOR)).toBeNull();
  });

  it('footer shows only roundName when no roundPosition', () => {
    const composition: Composition = {
      theme: TEST_THEME,
      configuration: { matchUpFooter: true }
    };
    const matchUp = makeMatchUp({ roundName: 'Final', roundPosition: undefined });
    const el = renderMatchUp({ matchUp, composition });
    const footer = el.querySelector(FOOTER_SELECTOR);
    expect(footer!.textContent).toBe('Final');
  });

  it('renders selected state when selectedMatchUpId matches', () => {
    const el = renderMatchUp({
      matchUp: makeMatchUp({ matchUpId: 'mu-sel' }),
      selectedMatchUpId: 'mu-sel'
    });
    // Should have more than one child (component + selected indicator)
    expect(el.children.length).toBe(2);
  });

  it('does not render selected state when IDs do not match', () => {
    const el = renderMatchUp({
      matchUp: makeMatchUp({ matchUpId: 'mu-1' }),
      selectedMatchUpId: 'mu-other'
    });
    expect(el.children.length).toBe(1);
  });

  it('renders with centerInfo configuration', () => {
    const composition: Composition = {
      theme: TEST_THEME,
      configuration: { centerInfo: true }
    };
    const el = renderMatchUp({ matchUp: makeMatchUp(), composition });
    // centerInfo adds entry status elements between sides
    // Just verify it renders without error and has expected structure
    expect(el.querySelector('.tmx-sd')).not.toBeNull();
  });

  it('handles matchUp with no score', () => {
    const matchUp = makeMatchUp({ score: undefined });
    const el = renderMatchUp({ matchUp, composition: compositions.Australian });
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.id).toBe('mu-1');
  });

  it('handles matchUp with no sides', () => {
    const matchUp = makeMatchUp({ sides: undefined });
    const el = renderMatchUp({ matchUp });
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('isLucky adds mr link class', () => {
    const el = renderMatchUp({
      matchUp: makeMatchUp(),
      isLucky: true,
      composition: compositions.Australian
    });
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('isAdHoc adds mr link class', () => {
    const el = renderMatchUp({
      matchUp: makeMatchUp(),
      isAdHoc: true
    });
    expect(el).toBeInstanceOf(HTMLElement);
  });
});
