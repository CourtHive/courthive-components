/**
 * @vitest-environment happy-dom
 */
import { renderSideScore } from '../renderSideScore';
import { describe, it, expect, vi } from 'vitest';
import { renderMatchUp } from '../renderMatchUp';

// constants and types
import type { Composition, MatchUp } from '../../../types';

/**
 * Every click handler in a rendered structure must be bound as a PROPERTY (`el.onclick = …`).
 *
 * TMX refreshes a draw in place with morphdom, which patches a fresh render onto the nodes already in
 * the page. It copies attributes and children, never listeners, so TMX carries the handler PROPERTIES
 * across (`carryHandlerProperties`, TMX #1526). A listener bound with `addEventListener` cannot be
 * read back, so it stays on the reused node with the closure of the render that created it — still
 * answering for the matchUp as it was, and still answering when the fresh render has no handler at
 * all (a set score that is no longer in play).
 *
 * `refresh` below does exactly what TMX does to a reused node: it takes the fresh render's handler.
 */
const refresh = (reused: HTMLElement, fresh: HTMLElement) => {
  reused.onclick = fresh.onclick;
};

const LIVE_CHIP = '.chc-live-chip';

const inlineScoring: Composition = { configuration: { inlineScoring: { mode: 'games' } } } as Composition;

function matchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-refresh',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 2,
    roundPosition: 1,
    finishingRound: 2,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Alice Smith' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Bob Jones' } }
    ],
    ...overrides
  } as MatchUp;
}

describe('draw click handlers survive an in-place refresh', () => {
  it('a live pill answers with the matchUp of the latest render', () => {
    const pillClick = vi.fn();
    const before = matchUp({ readyToScore: true });
    const after = matchUp({ readyToScore: true, matchUpFormat: 'SET3-S:6/TB7' });
    const reused = renderMatchUp({ matchUp: before, composition: inlineScoring, eventHandlers: { pillClick } });
    const fresh = renderMatchUp({ matchUp: after, composition: inlineScoring, eventHandlers: { pillClick } });

    const reusedPill = reused.querySelector(LIVE_CHIP) as HTMLElement;
    refresh(reusedPill, fresh.querySelector(LIVE_CHIP) as HTMLElement);
    reusedPill.click();

    expect(pillClick).toHaveBeenCalledTimes(1);
    expect(pillClick.mock.calls[0][0].matchUp).toBe(after);
  });

  it('an exit pill answers with the matchUp of the latest render', () => {
    const pillClick = vi.fn();
    const before = matchUp({ matchUpStatus: 'RETIRED', winningSide: 1 });
    const after = matchUp({ matchUpStatus: 'RETIRED', winningSide: 1, matchUpFormat: 'SET3-S:6/TB7' });
    const reused = renderMatchUp({ matchUp: before, composition: inlineScoring, eventHandlers: { pillClick } });
    const fresh = renderMatchUp({ matchUp: after, composition: inlineScoring, eventHandlers: { pillClick } });

    const reusedPill = reused.querySelector(LIVE_CHIP) as HTMLElement;
    refresh(reusedPill, fresh.querySelector(LIVE_CHIP) as HTMLElement);
    reusedPill.click();

    expect(pillClick).toHaveBeenCalledTimes(1);
    expect(pillClick.mock.calls[0][0].matchUp).toBe(after);
  });

  it('a set score stops incrementing once the refresh shows the set won', () => {
    const scoreIncrement = vi.fn();
    const inPlay = matchUp({ score: { sets: [{ setNumber: 1, side1Score: 5, side2Score: 4 }] } });
    const won = matchUp({ score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] } });
    const props = { composition: inlineScoring, eventHandlers: { scoreIncrement }, sideNumber: 1 };
    const reused = renderSideScore({ ...props, matchUp: inPlay });
    const fresh = renderSideScore({ ...props, matchUp: won });

    const reusedSet = reused.querySelector('.tmx-st') as HTMLElement;
    refresh(reusedSet, fresh.querySelector('.tmx-st') as HTMLElement);
    reusedSet.click();

    expect(scoreIncrement).not.toHaveBeenCalled();
  });

  it('a point score stops incrementing once the refresh shows the set won', () => {
    const scoreIncrement = vi.fn();
    const points = { side1PointScore: '40', side2PointScore: '30' };
    const inPlay = matchUp({ score: { sets: [{ setNumber: 1, side1Score: 5, side2Score: 4, ...points }] } });
    const won = matchUp({
      score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1, ...points }] }
    });
    const composition = {
      configuration: { inlineScoring: { mode: 'points' }, gameScore: { position: 'trailing' } }
    } as Composition;
    const props = { composition, eventHandlers: { scoreIncrement }, sideNumber: 1 };
    const reused = renderSideScore({ ...props, matchUp: inPlay });
    const fresh = renderSideScore({ ...props, matchUp: won });

    const reusedPoint = reused.querySelector('.chc-point-score') as HTMLElement;
    refresh(reusedPoint, fresh.querySelector('.chc-point-score') as HTMLElement);
    reusedPoint.click();

    expect(scoreIncrement).not.toHaveBeenCalled();
  });
});
