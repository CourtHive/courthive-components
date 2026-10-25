/**
 * Structure — rendering cost play-function tests.
 *
 * Three costs the renderer used to pay on every matchUp, each now pinned:
 *
 * - the body font size, which the connector maths scales by, was read with `getComputedStyle` once
 *   per matchUp. It is read once per structure, and not at all when no row sized by it is shown;
 * - `transition: all` on `.chc-matchup` started a transition on every property morphdom patched.
 *   Only the hover border and shadow animate;
 * - every side carried an empty end-matter div, and every individual an empty seeding div and an
 *   empty participant-detail div. They are emitted only when they hold something.
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
  title: 'Draws/Structure/Tests/Rendering Cost',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'rendering-cost-host';
const DRAW_SIZE = 32;

function buildMatchUps(completeAllMatchUps: boolean): any[] {
  const { eventData } = generateEventData({ drawSize: DRAW_SIZE, completeAllMatchUps }) || {};
  const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
  return roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
}

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

/** Count `getComputedStyle(document.body)` calls made while `fn` runs. */
function countBodyStyleReads(fn: () => void): number {
  const original = globalThis.getComputedStyle;
  let reads = 0;
  globalThis.getComputedStyle = ((element: Element, pseudo?: string | null) => {
    if (element === document.body) reads += 1;
    return original.call(globalThis, element, pseudo);
  }) as typeof globalThis.getComputedStyle;
  try {
    fn();
  } finally {
    globalThis.getComputedStyle = original;
  }
  return reads;
}

export const FontSizeReadOncePerStructure: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUps = buildMatchUps(false);
    expect(matchUps.length).toBe(DRAW_SIZE - 1); // control: a real draw, not an empty one

    // scheduleInfo is a row the connector maths sizes by the font
    const scheduled = { ...compositions.Australian, configuration: { scheduleInfo: true } };
    let structure: HTMLElement | undefined;
    const scheduledReads = countBodyStyleReads(() => {
      structure = renderStructure({ composition: scheduled, matchUps });
    });
    host.appendChild(structure as HTMLElement);
    expect(host.querySelectorAll('.tmx-m').length).toBe(DRAW_SIZE - 1);
    expect(scheduledReads).toBe(1);

    // with no such row, nothing needs the font size at all
    const plain = { ...compositions.Australian, configuration: {} };
    const plainReads = countBodyStyleReads(() => renderStructure({ composition: plain, matchUps }));
    expect(plainReads).toBe(0);
  }
};

export const MatchUpTransitionIsNamed: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    host.appendChild(renderStructure({ composition: compositions.Australian, matchUps: buildMatchUps(false) }));

    const card = host.querySelector('.chc-matchup') as HTMLElement;
    expect(card).not.toBeNull();
    const properties = getComputedStyle(card)
      .transitionProperty.split(',')
      .map((property) => property.trim());
    expect(properties).not.toContain('all');
    expect(properties).toEqual(expect.arrayContaining(['border-color', 'box-shadow']));
  }
};

export const NoEmptyStructuralDivs: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    // completed, so winners carry a tick (end matter that IS emitted) and losers carry none
    host.appendChild(renderStructure({ composition: compositions.Australian, matchUps: buildMatchUps(true) }));

    const individuals = host.querySelectorAll('.tmx-i');
    const sides = host.querySelectorAll('.tmx-p');
    expect(individuals.length).toBeGreaterThan(DRAW_SIZE); // control: participants rendered

    const emptyClasslessDivs = (elements: NodeListOf<Element>) =>
      [...elements].flatMap((element) =>
        [...element.querySelectorAll('div')].filter((div) => !div.className && !div.childNodes.length)
      );
    expect(emptyClasslessDivs(individuals)).toEqual([]);
    expect(emptyClasslessDivs(sides)).toEqual([]);

    // the winner's tick still renders: end matter is dropped only when it is empty
    expect(host.querySelectorAll('.tmx-p svg').length).toBeGreaterThan(0);
  }
};
