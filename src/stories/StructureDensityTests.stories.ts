/**
 * Structure — geometry tokens and `configuration.density` play-function tests.
 *
 * Structure rendering vNext item 5. The round gap, participant minimum width and name size are tokens, and
 * `density: 'compact'` sets a tighter set. Connectors are drawn from the layout (item 10), so a density
 * change cannot misalign them: `Connector Geometry` runs a compact variant for that. These pin the tokens.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Configuration } from '../types';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Density',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'density-host';

let draw: any[] | undefined;
const matchUps = () => {
  if (!draw) {
    const { eventData } = generateEventData({ drawSize: 8, completeAllMatchUps: true }) || {};
    const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
    draw = roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
  }
  return draw;
};

const composition = (configuration: Configuration) => ({
  ...compositions.Australian,
  configuration: { ...compositions.Australian.configuration, ...configuration }
});

function measure(host: HTMLElement, configuration: Configuration) {
  host.innerHTML = '';
  const structure = renderStructure({ composition: composition(configuration), matchUps: matchUps() });
  host.appendChild(structure);
  const card = structure.querySelector('.chc-matchup') as HTMLElement;
  const rounds = [...structure.querySelectorAll<HTMLElement>('.chc-round')];
  const name = structure.querySelector('.chc-participant-name') as HTMLElement;
  return {
    cardHeight: card.getBoundingClientRect().height,
    cardWidth: card.getBoundingClientRect().width,
    roundGap: rounds[1].getBoundingClientRect().left - rounds[0].getBoundingClientRect().right,
    nameSize: getComputedStyle(name).fontSize
  };
}

export const CompactIsTighter: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.dataset.testid = HOST_TESTID;
    return container;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

    const comfortable = measure(host, {});
    // the existing look: the default tokens equal the values they replaced
    expect(comfortable.roundGap).toBe(32);
    expect(comfortable.nameSize).toBe('14px');
    expect(measure(host, { density: 'comfortable' })).toEqual(comfortable);

    const compact = measure(host, { density: 'compact' });
    expect(compact.cardHeight).toBeLessThan(comfortable.cardHeight);
    expect(compact.cardWidth).toBeLessThan(comfortable.cardWidth);
    expect(compact.roundGap).toBe(20);
    expect(compact.nameSize).toBe('12.8px');

    // a configured connector width sets the gap it spans
    expect(measure(host, { connectorWidth: 24 }).roundGap).toBe(48);

    // a matchUp rendered on its own takes the density too
    const card = renderMatchUp({ matchUp: matchUps()[0], composition: composition({ density: 'compact' }) });
    expect(card.classList.contains('chc-density--compact')).toBe(true);
  }
};
