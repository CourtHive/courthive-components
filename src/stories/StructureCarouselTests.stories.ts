/**
 * Structure — `carousel` and `renderRoundPager` play-function tests.
 *
 * Structure rendering vNext item 9 (after the connector rework, item 10, as CA ordered). On a narrow screen
 * the rounds become a horizontal carousel: one round per scroll-snap stop, with a peek of the next round so
 * the connectors lead somewhere, round headers moving with their column, and a pager.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderRoundPager } from '../components/renderStructure/renderRoundPager';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Carousel',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'carousel-host';
const WIDTH = 400;
const COLUMNS = ':scope > .chc-round-container';
const ARIA_CURRENT = 'aria-current';

let draw: any[] | undefined;
const matchUps = () => {
  if (!draw) {
    const { eventData } = generateEventData({ drawSize: 16, completeAllMatchUps: true }) || {};
    const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
    draw = roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
  }
  return draw;
};

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  container.style.width = `${WIDTH}px`;
  return container;
};

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

export const SnapColumnsWithAPeek: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const structure = renderStructure({ composition: compositions.Australian, matchUps: matchUps(), carousel: true });
    host.appendChild(structure);

    const style = getComputedStyle(structure);
    expect(style.scrollSnapType).toContain('x');
    expect(style.scrollSnapType).toContain('mandatory');
    expect(style.overflowX).toBe('auto');

    const columns = [...structure.querySelectorAll<HTMLElement>(COLUMNS)];
    expect(columns.length).toBe(4); // control
    const first = columns[0].getBoundingClientRect();
    const second = columns[1].getBoundingClientRect();
    expect(Math.abs(first.width - WIDTH / 1.2)).toBeLessThan(1);
    expect(second.left).toBeLessThan(structure.getBoundingClientRect().right); // the next round peeks in
    expect(getComputedStyle(columns[0]).scrollSnapAlign).toContain('start');

    // every card fits its column, three-set scores and long names included
    for (const column of columns) {
      const right = (column.querySelector('.chc-round') as HTMLElement).getBoundingClientRect().right;
      for (const card of column.querySelectorAll<HTMLElement>('.chc-matchup')) {
        expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(right + 0.5);
      }
    }

    // the line out of a first-round matchUp still sits on its card's divider (item 10 geometry)
    const cell = columns[0].querySelector('.chc-link--m1') as HTMLElement;
    const line = cell.getBoundingClientRect().top + Number.parseFloat(getComputedStyle(cell, '::after').top);
    const divider = (cell.querySelector('.tmx-sd[sidenumber="2"]') as HTMLElement).getBoundingClientRect().top - 1;
    expect(Math.abs(line - divider)).toBeLessThanOrEqual(1.5);

    // no peek: a column per screen
    host.innerHTML = '';
    const full = renderStructure({ composition: compositions.Australian, matchUps: matchUps(), carousel: { peek: 0 } });
    host.appendChild(full);
    const fullColumn = full.querySelector<HTMLElement>(COLUMNS) as HTMLElement;
    expect(Math.abs(fullColumn.getBoundingClientRect().width - WIDTH)).toBeLessThan(1);

    // not a carousel unless asked
    expect(renderStructure({ composition: compositions.Australian, matchUps: matchUps() }).classList).not.toContain(
      'chc-structure--carousel'
    );
  }
};

export const PagerScrollsAndTracks: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const composition = { ...compositions.Australian, configuration: { roundHeader: true } };
    const structure = renderStructure({ composition, matchUps: matchUps(), carousel: true });
    const pager = renderRoundPager({ structure, behavior: 'instant' });
    host.append(pager.element, structure);

    const buttons = [...pager.element.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.length).toBe(4);
    // labels from the round headers
    const headerTexts = [...structure.querySelectorAll<HTMLElement>('.tmx-rh')].map((h) => h.textContent?.trim());
    expect(buttons.map((b) => b.textContent)).toEqual(headerTexts);
    expect(buttons[0].getAttribute(ARIA_CURRENT)).toBe('true');

    buttons[2].click();
    const third = structure.querySelectorAll<HTMLElement>(COLUMNS)[2];
    expect(Math.abs(structure.scrollLeft - (third.offsetLeft - structure.offsetLeft))).toBeLessThan(2);
    expect(buttons[2].getAttribute(ARIA_CURRENT)).toBe('true');
    expect(buttons[0].getAttribute(ARIA_CURRENT)).toBeNull();

    pager.destroy();

    // without round headers, R1..Rn
    const plain = renderRoundPager({
      structure: renderStructure({ composition: compositions.Australian, matchUps: matchUps(), carousel: true })
    });
    expect([...plain.element.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['R1', 'R2', 'R3', 'R4']);
    plain.destroy();
  }
};
