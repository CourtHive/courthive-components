/**
 * Structure — `renderMatchUpInPlace` play-function tests.
 *
 * Structure rendering vNext item 11. A live score update re-renders one matchUp and swaps it in, instead of
 * rebuilding the structure and diffing the whole tree. The matchUp's place in the structure is read from
 * what `renderMatchUp` recorded on `.tmx-m`, so the swapped node must be exactly what a full render would
 * have produced, which these tests compare markup for markup.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderMatchUpInPlace } from '../components/renderStructure/renderMatchUpInPlace';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderSideScore } from '../components/renderStructure/renderSideScore';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Composition, MatchUp } from '../types';
import { user } from './helpers/trustedUser';
import { expect, fn } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/MatchUp In Place',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'in-place-host';

function structureMatchUps(): any[] {
  const { eventData } = generateEventData({ drawSize: 16, completionGoal: 50 }) || {};
  const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
  return roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
}

const nodeOf = (root: Element, matchUpId: string) =>
  root.querySelector(`.tmx-m[id="${CSS.escape(matchUpId)}"]`) as HTMLElement;

export const SwapEqualsAFullRender: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.dataset.testid = HOST_TESTID;
    return container;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const matchUps = structureMatchUps();
    const composition = { ...compositions.Australian, configuration: { scheduleInfo: true } };
    const matchUpClick = fn();
    const eventHandlers = { matchUpClick };

    // a scoped view (from round 2), so the display round factor differs from the matchUp's own
    const args = { initialRoundNumber: 2, composition, eventHandlers };
    const target = matchUps.find((m) => m.roundNumber === 3 && m.roundPosition === 2);
    const favourite = target.sides.find((s: any) => s.participant)?.participant?.participantId;
    const structure = renderStructure({ ...args, matchUps, favourites: favourite ? [favourite] : [] });
    host.appendChild(structure);

    const before = nodeOf(structure, target.matchUpId);
    // another matchUp's node (each card is alone in its connector cell, so not a sibling)
    const neighbour = [...structure.querySelectorAll('.tmx-m')].find((node) => node !== before);
    expect(before.dataset.initialRound).toBe('2'); // control: the params were recorded

    // a live update: the matchUp in progress with a score
    const updated = {
      ...target,
      matchUpStatus: 'IN_PROGRESS',
      winningSide: undefined,
      score: { scoreStringSide1: '6-4 2-1', scoreStringSide2: '4-6 1-2', sets: [] }
    };
    const fresh = renderMatchUpInPlace({
      root: structure,
      matchUp: updated,
      favourites: favourite ? [favourite] : [],
      composition,
      eventHandlers
    }) as HTMLElement;

    // swapped in, in the same place; the rest of the tree is untouched
    expect(fresh).toBe(nodeOf(structure, target.matchUpId));
    expect(before.isConnected).toBe(false);
    expect(neighbour?.isConnected).toBe(true);
    expect(fresh.dataset.live).toBe('true');

    // exactly what a full render of the updated draw produces for that matchUp
    const full = renderStructure({
      ...args,
      matchUps: matchUps.map((m) => (m.matchUpId === target.matchUpId ? updated : m)),
      favourites: favourite ? [favourite] : []
    });
    expect(fresh.outerHTML).toBe(nodeOf(full, target.matchUpId).outerHTML);

    // its handler answers for the updated matchUp
    await user.click(fresh);
    expect(matchUpClick.mock.calls.at(-1)?.[0].matchUp).toBe(updated);

    // a matchUp that is not there
    expect(renderMatchUpInPlace({ root: structure, matchUp: { ...updated, matchUpId: 'nope' }, composition })).toBe(
      undefined
    );
  }
};

/*
 * Handlers after a refresh — moved from an emulated-DOM unit test whose `refresh` hand-copied one `onclick`.
 *
 * Two refresh paths reach a rendered card, and each needs the handler to answer for the LATEST render:
 *
 * 1. `renderMatchUpInPlace` (this package): swaps a fresh render in. Driven for real below.
 * 2. TMX's morphdom refresh: patches a fresh render onto the nodes already in the page, carrying only the
 *    handler PROPERTIES (`carryHandlerProperties`, TMX `renderDrawView.ts`, #1526(TMX)). A listener bound
 *    with `addEventListener` cannot be read back, so it would stay on the reused node with the closure of
 *    the render that created it. morphdom is TMX's dependency, not this package's, so `carryHandlers`
 *    below applies exactly the three properties TMX carries, to every node pair of the two trees; the click
 *    is then a real one on the node still in the page.
 */

const LIVE_CHIP = '.chc-live-chip';
const inlineGames: Composition = { configuration: { inlineScoring: { mode: 'games' } } } as Composition;

function refreshMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
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

/** TMX's `carryHandlerProperties`, applied to every node of `reused` from its counterpart in `fresh`. */
function carryHandlers(reused: Element, fresh: Element): void {
  if (reused instanceof HTMLElement && fresh instanceof HTMLElement) {
    reused.onclick = fresh.onclick;
    reused.onmouseenter = fresh.onmouseenter;
    reused.onmouseleave = fresh.onmouseleave;
  }
  const freshChildren = Array.from(fresh.children);
  Array.from(reused.children).forEach((child, index) => {
    const counterpart = freshChildren[index];
    if (counterpart?.tagName === child.tagName) carryHandlers(child, counterpart);
  });
}

function hostFor(canvasElement: HTMLElement, testid: string): HTMLElement {
  const host = canvasElement.querySelector(`[data-testid="${testid}"]`) as HTMLElement;
  host.replaceChildren();
  return host;
}

const emptyHost = (testid: string) => () => {
  const container = document.createElement('div');
  container.dataset.testid = testid;
  container.style.cssText = 'width:360px; padding:12px;';
  return container;
};

export const PillsAnswerForTheSwappedRender: StoryObj = {
  render: emptyHost('pill-swap'),
  play: async ({ canvasElement }) => {
    const host = hostFor(canvasElement, 'pill-swap');
    const pillClick = fn();
    const matchUpClick = fn();
    const eventHandlers = { pillClick, matchUpClick };

    const cases = [
      // a live pill on a matchUp ready to score
      { before: refreshMatchUp({ readyToScore: true }), extra: { readyToScore: true } },
      // an exit pill (RET on the losing side), clickable under inline scoring
      {
        before: refreshMatchUp({ matchUpStatus: 'RETIRED', winningSide: 1 }),
        extra: { matchUpStatus: 'RETIRED', winningSide: 1 }
      }
    ];
    for (const { before, extra } of cases) {
      pillClick.mockClear();
      host.replaceChildren(renderMatchUp({ matchUp: before, composition: inlineGames, eventHandlers }));
      const after = refreshMatchUp({ ...extra, matchUpFormat: 'SET3-S:6/TB7' } as Partial<MatchUp>);
      const fresh = renderMatchUpInPlace({ root: host, matchUp: after, composition: inlineGames, eventHandlers });

      const pill = fresh?.querySelector<HTMLElement>(LIVE_CHIP);
      await expect(pill).toBeVisible();
      await user.click(pill!);
      await expect(pillClick).toHaveBeenCalledTimes(1);
      await expect(pillClick.mock.calls[0][0].matchUp).toBe(after);
    }
    // the pill keeps its click to itself
    await expect(matchUpClick).not.toHaveBeenCalled();
  }
};

export const PillsAnswerForTheLatestRenderAfterACarry: StoryObj = {
  render: emptyHost('pill-carry'),
  play: async ({ canvasElement }) => {
    const host = hostFor(canvasElement, 'pill-carry');
    const pillClick = fn();
    const eventHandlers = { pillClick };

    const cases = [{ readyToScore: true }, { matchUpStatus: 'RETIRED', winningSide: 1 }] as Partial<MatchUp>[];
    for (const extra of cases) {
      pillClick.mockClear();
      const before = refreshMatchUp(extra);
      const after = refreshMatchUp({ ...extra, matchUpFormat: 'SET3-S:6/TB7' });
      const reused = renderMatchUp({ matchUp: before, composition: inlineGames, eventHandlers });
      host.replaceChildren(reused);
      carryHandlers(reused, renderMatchUp({ matchUp: after, composition: inlineGames, eventHandlers }));

      const pill = reused.querySelector<HTMLElement>(LIVE_CHIP)!;
      await expect(pill).toBeVisible();
      await user.click(pill);
      await expect(pillClick).toHaveBeenCalledTimes(1);
      await expect(pillClick.mock.calls[0][0].matchUp).toBe(after);
    }
  }
};

export const ScoreStopsIncrementingOnceTheSetIsWon: StoryObj = {
  render: emptyHost('score-carry'),
  play: async ({ canvasElement }) => {
    const host = hostFor(canvasElement, 'score-carry');
    const scoreIncrement = fn();
    const eventHandlers = { scoreIncrement };
    const points = { side1PointScore: '40', side2PointScore: '30' };
    const inlinePoints = {
      configuration: { inlineScoring: { mode: 'points' }, gameScore: { position: 'trailing' } }
    } as Composition;

    const cases = [
      {
        selector: '.tmx-st',
        composition: inlineGames,
        inPlay: { sets: [{ setNumber: 1, side1Score: 5, side2Score: 4 }] },
        won: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] }
      },
      {
        selector: '.chc-point-score',
        composition: inlinePoints,
        inPlay: { sets: [{ setNumber: 1, side1Score: 5, side2Score: 4, ...points }] },
        won: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1, ...points }] }
      }
    ];
    for (const { selector, composition, inPlay, won } of cases) {
      const props = { composition, eventHandlers, sideNumber: 1 };
      const reused = renderSideScore({ ...props, matchUp: refreshMatchUp({ score: inPlay } as Partial<MatchUp>) });
      host.replaceChildren(reused);
      const target = reused.querySelector<HTMLElement>(selector)!;
      await expect(target).toBeVisible();

      // CONTROL — while the set is in play, a real click on it increments: the "not called" below is earned
      scoreIncrement.mockClear();
      await user.click(target);
      await expect(scoreIncrement).toHaveBeenCalledTimes(1);

      carryHandlers(reused, renderSideScore({ ...props, matchUp: refreshMatchUp({ score: won } as Partial<MatchUp>) }));
      scoreIncrement.mockClear();
      await user.click(target);
      await expect(scoreIncrement).not.toHaveBeenCalled();
    }
  }
};
