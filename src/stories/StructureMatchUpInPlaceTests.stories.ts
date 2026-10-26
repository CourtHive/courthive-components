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
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
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
    fresh.click();
    expect(matchUpClick.mock.calls.at(-1)?.[0].matchUp).toBe(updated);

    // a matchUp that is not there
    expect(renderMatchUpInPlace({ root: structure, matchUp: { ...updated, matchUpId: 'nope' }, composition })).toBe(
      undefined
    );
  }
};
