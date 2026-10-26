/**
 * Structure — round-factor purity play-function tests.
 *
 * Since structure rendering vNext item 10, connector heights are not computed at all: a round is a grid of
 * equal rows and the connector is drawn from each matchUp's cell. The invariant below still holds and is now
 * measured as drawn. The history, kept because it is why these tests exist:
 *
 * Connector heights scaled by `roundFactor`, and a view scoped to a later round
 * (the R1|R2|QF|SF|F chips consumers render) has to rescale so the first visible
 * round draws at 1. `renderRound` used to do that by dividing
 * `matchUp.roundFactor` IN PLACE, which made the division compound: render the
 * SAME matchUp objects at R1 then QF then SF and the semifinal connectors came
 * out at half length, and returning to R1 left every round at an eighth — with
 * no way back, because the recompute branch only fires when `roundFactor` is
 * absent.
 *
 * Both consumers had independently worked around it by handing `renderStructure`
 * a fresh deep copy on every render (TMX `a478588b`; courthive-public's
 * `renderEvent`). The scale is now a per-render parameter instead, so the
 * workaround is not required of anyone.
 *
 * These render the same array repeatedly on purpose — that reuse IS the test.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Round Factor',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const ROUND_CONTAINER_SELECTOR = '.tmx-rd';
const LINK_SELECTOR = '.chc-link--m1';
const DRAW_SIZE = 16;

function buildMatchUps(): any[] {
  const { eventData } = generateEventData({ drawSize: DRAW_SIZE, completeAllMatchUps: false }) || {};
  const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
  return roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
}

/**
 * The first RENDERED round always scales at 1, whatever its number, so its
 * connector height is the same value for every choice of `initialRoundNumber`.
 * That invariant is what makes a single number comparable across the sequence.
 */
function firstRoundLinkHeight(structure: HTMLElement): string {
  const round = structure.querySelector(ROUND_CONTAINER_SELECTOR);
  const link = round?.querySelector(LINK_SELECTOR) as HTMLElement | null;
  // the connector as DRAWN, in px (structure rendering vNext item 10 removed the --chc-link-m1-h property
  // this used to read; the invariant is unchanged)
  return link ? getComputedStyle(link, '::after').height : '';
}

export const ScopingDoesNotShrinkConnectors: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.dataset.testid = 'round-factor-host';
    return container;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-testid="round-factor-host"]') as HTMLElement;
    const composition = compositions.Australian;

    // ONE array, reused for every render — a consumer holding its matchUps
    // across chip clicks, which is what broke.
    const matchUps = buildMatchUps();
    const render = (initialRoundNumber: number) => {
      host.innerHTML = '';
      const structure = renderStructure({ initialRoundNumber, composition, matchUps });
      host.appendChild(structure);
      return firstRoundLinkHeight(structure);
    };

    const baseline = render(1);
    expect(baseline).not.toBe('');

    // R16 -> QF -> SF -> R16. The old in-place rescale gave 0.5x on the third
    // hop and 0.125x on the fourth.
    for (const initialRoundNumber of [2, 3, 1]) {
      expect(render(initialRoundNumber)).toBe(baseline);
    }
  }
};

export const RenderDoesNotMutateMatchUps: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.dataset.testid = 'round-factor-purity-host';
    return container;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('[data-testid="round-factor-purity-host"]') as HTMLElement;
    const composition = compositions.Australian;

    const matchUps = buildMatchUps();
    const before = matchUps.map((m) => m.roundFactor);

    for (const initialRoundNumber of [1, 2, 3, 1]) {
      host.innerHTML = '';
      host.appendChild(renderStructure({ initialRoundNumber, composition, matchUps }));
    }

    // The caller's records are the caller's. A scale that belongs to one render
    // must not survive it.
    expect(matchUps.map((m) => m.roundFactor)).toEqual(before);
  }
};
