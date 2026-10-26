/**
 * MatchUp — `configuration.upsetMarker` and `configuration.entryStatus` play-function tests.
 *
 * Structure rendering vNext item 7 ("live state on the card"). The LIVE / suspended / retired / walkover
 * pills already existed; what it adds is:
 *
 * - an upset marker: a ▲ before the winner's tick when a seed was beaten ON COURT (completed or retired)
 *   by an unseeded side or a lower seed. `data-upset` on `.tmx-m` either way;
 * - the entry status beside the seed: `[1, WC]` inside the seed's brackets, or a tag when there are none.
 *
 * Both are off by default, and off renders exactly what it did.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Configuration, MatchUp } from '../types';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/MatchUps/MatchUp/Tests/Upset And Entry Status',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'upset-entry-host';
const MARKER = '.chc-upset-marker';

function matchUp({
  seeds = [undefined, undefined],
  entryStatuses = ['DIRECT_ACCEPTANCE', 'DIRECT_ACCEPTANCE'],
  winningSide = 2,
  matchUpStatus = 'COMPLETED'
}: {
  seeds?: (number | undefined)[];
  entryStatuses?: string[];
  winningSide?: number;
  matchUpStatus?: string;
}): MatchUp {
  const side = (sideNumber: number) => ({
    sideNumber,
    ...(seeds[sideNumber - 1] !== undefined && { seedValue: seeds[sideNumber - 1] }),
    participant: {
      participantId: `p${sideNumber}`,
      participantName: `Player ${sideNumber}`,
      entryStatus: entryStatuses[sideNumber - 1]
    }
  });
  return {
    matchUpId: 'mu-upset',
    structureId: 's',
    matchUpType: 'SINGLES',
    roundNumber: 1,
    roundPosition: 1,
    matchUpStatus,
    winningSide,
    sides: [side(1), side(2)],
    score: { scoreStringSide1: '4-6 4-6', scoreStringSide2: '6-4 6-4', sets: [] }
  } as unknown as MatchUp;
}

const render = (m: MatchUp, configuration: Configuration = {}) =>
  renderMatchUp({
    matchUp: m,
    composition: {
      ...compositions.Australian,
      configuration: { ...compositions.Australian.configuration, ...configuration }
    }
  });

const sideEl = (el: HTMLElement, sideNumber: number) =>
  el.querySelector(`.tmx-sd[sidenumber="${sideNumber}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

export const UpsetMarker: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const upset = matchUp({ seeds: [1, undefined], winningSide: 2 });

    const off = render(upset);
    host.appendChild(off);
    expect(sideEl(off, 2)).not.toBeNull(); // control
    expect(off.querySelectorAll(MARKER).length).toBe(0);
    expect(off.dataset.upset).toBe('true'); // a fact, set whether or not the marker shows

    const on = render(upset, { upsetMarker: true });
    host.appendChild(on);
    expect(sideEl(on, 1).querySelector(MARKER)).toBeNull();
    const marker = sideEl(on, 2).querySelector(MARKER) as HTMLElement;
    expect(marker.title).toBe('Upset: An unseeded player beat seed 1');
    expect(sideEl(on, 2).querySelector('svg')).not.toBeNull(); // the tick is still there

    // a lower seed beating a higher one
    const seeded = render(matchUp({ seeds: [2, 7], winningSide: 2 }), { upsetMarker: true });
    expect((seeded.querySelector(MARKER) as HTMLElement).title).toBe('Upset: Seed 7 beat seed 2');

    // not upsets: the favourite won; a walkover; an unseeded loser
    const notUpsets = [
      matchUp({ seeds: [1, 4], winningSide: 1 }),
      matchUp({ seeds: [1, undefined], winningSide: 2, matchUpStatus: 'WALKOVER' }),
      matchUp({ seeds: [undefined, 3], winningSide: 2 })
    ];
    for (const m of notUpsets) {
      const el = render(m, { upsetMarker: true });
      expect(el.querySelectorAll(MARKER).length).toBe(0);
      expect(el.dataset.upset).toBeUndefined();
    }

    // a retirement is decided on court
    expect(render(matchUp({ seeds: [1, undefined], matchUpStatus: 'RETIRED' })).dataset.upset).toBe('true');
  }
};

export const EntryStatusBesideSeed: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const m = matchUp({ seeds: [1, undefined], entryStatuses: ['WILDCARD', 'QUALIFIER'] });
    const seedText = (el: HTMLElement, sideNumber: number) =>
      (sideEl(el, sideNumber).querySelector('.chc-seed') as HTMLElement | null)?.textContent ?? '';

    // off: the seed alone, unchanged; the unseeded side shows nothing
    const off = render(m, { bracketedSeeds: 'square' });
    host.appendChild(off);
    expect(seedText(off, 1)).toBe('[1]');
    expect(sideEl(off, 2).querySelector('.chc-seed')).toBeNull();

    // inside the brackets
    const square = render(m, { bracketedSeeds: 'square', entryStatus: true });
    host.appendChild(square);
    expect(seedText(square, 1)).toBe('[1, WC]');
    expect(seedText(square, 2)).toBe('[Q]');
    expect((sideEl(square, 1).querySelector('.chc-seed') as HTMLElement).title).toBe('Wildcard');

    // no brackets: a tag
    const bare = render(m, { entryStatus: true });
    const tag = sideEl(bare, 1).querySelector('.chc-entry-status') as HTMLElement;
    expect(tag.textContent).toBe('WC');
    expect(tag.title).toBe('Wildcard');

    // direct acceptance only with 'all'; a lucky loser keeps its own badge
    const plain = matchUp({ seeds: [1, undefined], entryStatuses: ['DIRECT_ACCEPTANCE', 'LUCKY_LOSER'] });
    expect(seedText(render(plain, { bracketedSeeds: 'square', entryStatus: true }), 1)).toBe('[1]');
    expect(seedText(render(plain, { bracketedSeeds: 'square', entryStatus: 'all' }), 1)).toBe('[1, DA]');
    expect(
      sideEl(render(plain, { bracketedSeeds: 'square', entryStatus: 'all' }), 2).querySelector('.chc-seed')
    ).toBeNull();
  }
};
