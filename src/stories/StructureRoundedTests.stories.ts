/**
 * Structure — `configuration.rounded` play-function tests.
 *
 * The toggle puts `.chc-rounded` on each matchUp, which swaps the radius tokens
 * (`--chc-radius-matchup`, `-connector`, `-pill`, `-score`) from their square defaults to rounded
 * values. Pinned here:
 *
 * - off, nothing changes: square cards, the connectors' existing 2px, pills at 4px;
 * - on, the card, its corner children, the connector elbows and the pills round;
 * - the card is NOT clipped (`overflow` stays visible), which would cut the connectors and the
 *   draw-position badges;
 * - BasicCard keeps its rounded card without the toggle (it now sets the token);
 * - the radii are the same in light and dark.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Composition } from '../types';
import { expect } from 'storybook/test';

const { RETIRED } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Draws/Structure/Tests/Rounded',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'rounded-host';
const DRAW_SIZE = 16;

let draw: any[] | undefined;
const matchUps = (): any[] => {
  if (!draw) {
    const { eventData } = generateEventData({ drawSize: DRAW_SIZE, completeAllMatchUps: true }) || {};
    const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
    draw = roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
  }
  return draw;
};

const withConfiguration = (base: Composition, configuration: Composition['configuration']): Composition => ({
  ...base,
  configuration: { ...base.configuration, ...configuration }
});

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

/** Mount a structure and read the radii that matter. */
function measure(host: HTMLElement, composition: Composition) {
  host.innerHTML = '';
  const structure = renderStructure({ composition, matchUps: matchUps() });
  host.appendChild(structure);

  const card = structure.querySelector('.chc-matchup') as HTMLElement;
  // the element at the card's top corners: the schedule header when shown, else the first row
  const topRow = card.firstElementChild?.firstElementChild as HTMLElement;
  const topStart = (topRow.matches('.chc-scheduling') ? topRow : topRow.firstElementChild) as HTMLElement;
  const m1 = structure.querySelector('.chc-link--m1') as HTMLElement;
  const m2 = structure.querySelector('.chc-link--m2') as HTMLElement;

  return {
    cards: structure.querySelectorAll('.chc-matchup').length,
    card: getComputedStyle(card).borderTopLeftRadius,
    cardOverflow: getComputedStyle(card).overflow,
    topStart: getComputedStyle(topStart).borderTopLeftRadius,
    topStartBottom: getComputedStyle(topStart).borderBottomLeftRadius,
    notches: innerCornerRadii(structure),
    // LTR: inline-end is the right, so the m1 elbow is top-right and the m2 elbow bottom-right
    m1Elbow: getComputedStyle(m1, '::after').borderTopRightRadius,
    m2Elbow: getComputedStyle(m2, '::after').borderBottomRightRadius
  };
}

/**
 * Every corner INSIDE a row, where the participant meets the score, and every corner of a row that sits
 * under the schedule header. Any non-zero value is a notch.
 */
function innerCornerRadii(structure: HTMLElement): string[] {
  const radii = (element: Element, corners: string[]) => {
    const style = getComputedStyle(element);
    return corners.map((corner) => style.getPropertyValue(corner));
  };
  const rows = [...structure.querySelectorAll('.chc-side-row')];
  expect(rows.some((row) => row.querySelector(':scope > .chc-score-wrapper'))).toBe(true); // control
  return rows
    .flatMap((row) => {
      const participant = row.querySelector(':scope > .chc-participant-container');
      const score = row.querySelector(':scope > .chc-score-wrapper');
      const underHeader = row.previousElementSibling?.matches('.chc-scheduling');
      return [
        ...(participant && score ? radii(participant, ['border-top-right-radius', 'border-bottom-right-radius']) : []),
        ...(score ? radii(score, ['border-top-left-radius', 'border-bottom-left-radius']) : []),
        ...(underHeader
          ? [...row.children].flatMap((child) => radii(child, ['border-top-left-radius', 'border-top-right-radius']))
          : [])
      ];
    })
    .filter((radius) => radius !== '0px');
}

function pillRadius(host: HTMLElement, composition: Composition): string {
  const [matchUp] = structuredClone(matchUps().filter(({ roundNumber }) => roundNumber === 1));
  matchUp.matchUpStatus = RETIRED;
  host.innerHTML = '';
  host.appendChild(renderMatchUp({ matchUp, composition }));
  const pill = host.querySelector('.chc-pill') as HTMLElement;
  expect(pill).not.toBeNull(); // control: the retirement renders a pill
  return getComputedStyle(pill).borderTopLeftRadius;
}

export const RoundedToggle: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const square = withConfiguration(compositions.Australian, { rounded: false });
    const rounded = withConfiguration(compositions.Australian, { rounded: true });

    const off = measure(host, square);
    expect(off.cards).toBe(DRAW_SIZE - 1); // control: a real draw
    expect(off).toMatchObject({ card: '0px', topStart: '0px', m1Elbow: '2px', m2Elbow: '2px', notches: [] });
    expect(pillRadius(host, square)).toBe('4px');

    const on = measure(host, rounded);
    expect(on).toMatchObject({
      card: '8px',
      topStart: '8px',
      topStartBottom: '0px',
      notches: [],
      m1Elbow: '8px',
      m2Elbow: '8px',
      cardOverflow: 'visible'
    });
    expect(host.querySelectorAll('.tmx-m.chc-rounded').length).toBe(DRAW_SIZE - 1);
    expect(pillRadius(host, rounded)).toBe('999px');
  }
};

export const BasicCardStaysRounded: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const basicCard = measure(host, compositions.BasicCard);
    expect(basicCard).toMatchObject({ card: '8px', topStart: '8px', topStartBottom: '0px', notches: [] });
  }
};

export const SameRadiiInLightAndDark: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const rounded = withConfiguration(compositions.Australian, { rounded: true });
    const root = document.documentElement;
    const previous = root.dataset.theme;
    try {
      root.dataset.theme = 'light';
      const light = measure(host, rounded);
      root.dataset.theme = 'dark';
      const dark = measure(host, rounded);
      expect(light.card).toBe('8px');
      expect(dark).toEqual(light);
    } finally {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    }
  }
};
