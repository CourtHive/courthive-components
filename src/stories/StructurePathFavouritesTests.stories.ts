/**
 * Structure — `configuration.pathHighlight` and `favourites` play-function tests.
 *
 * Structure rendering vNext item 8. Hovering a participant already highlighted every side they appear on;
 * with `pathHighlight` it also marks their matchUps (`.chc-path`), the connectors out of the matchUps they
 * won (`.chc-path--won`) and, while they are alive, the matchUps ahead (`.chc-path--projected`). The host's
 * `favourites` pin sides.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { drawDefinitionConstants } from 'tods-competition-factory';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const { ROUND_ROBIN } = drawDefinitionConstants;

const meta: Meta = {
  title: 'Draws/Structure/Tests/Path And Favourites',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'path-host';
const DRAW_SIZE = 16;
const PATH = 'chc-path';
const PATH_WON = 'chc-path--won';
const PATH_PROJECTED = 'chc-path--projected';

function structureMatchUps(args: Record<string, any>): any[] {
  const { eventData } = generateEventData({ drawSize: DRAW_SIZE, ...args }) || {};
  const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
  return roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
}

const withPath = { ...compositions.Australian, configuration: { pathHighlight: true } };

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

const hover = (structure: HTMLElement, participantId: string) => {
  const individual = structure.querySelector(`.tmx-i[id="${CSS.escape(participantId)}"]`) as HTMLElement;
  individual.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
};

const marked = (structure: HTMLElement, className: string) =>
  [...structure.querySelectorAll<HTMLElement>(`.tmx-m.${className}`)]
    .map((el) => el.id)
    .sort((a, b) => a.localeCompare(b));

const idsOf = (matchUps: any[]) => matchUps.map((m) => m.matchUpId).sort((a: string, b: string) => a.localeCompare(b));

const winnerId = (matchUp: any) =>
  matchUp.sides.find((side: any) => side.sideNumber === matchUp.winningSide)?.participant?.participantId;

export const ChampionAndLoserPaths: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUps = structureMatchUps({ completeAllMatchUps: true });
    const structure = renderStructure({ composition: withPath, matchUps });
    host.appendChild(structure);

    const final = matchUps.find((m) => m.roundNumber === 4);
    const champion = winnerId(final);
    expect(champion).toBeTruthy(); // control: a completed draw

    hover(structure, champion);
    const championMatchUps = matchUps.filter((m) =>
      m.sides?.some((s: any) => s.participant?.participantId === champion)
    );
    expect(marked(structure, PATH)).toEqual(idsOf(championMatchUps));
    expect(marked(structure, PATH_WON)).toEqual(idsOf(championMatchUps));
    expect(marked(structure, PATH_PROJECTED)).toEqual([]);

    // a first-round loser: one matchUp, nothing won, nothing ahead
    const firstRound = matchUps.find((m) => m.roundNumber === 1 && m.sides.every((s: any) => s.participant));
    const loser = firstRound.sides.find((s: any) => s.sideNumber !== firstRound.winningSide).participant.participantId;
    hover(structure, loser);
    expect(marked(structure, PATH)).toEqual([firstRound.matchUpId]);
    expect(marked(structure, PATH_WON)).toEqual([]);

    // leaving the structure clears it
    structure.dispatchEvent(new MouseEvent('mouseleave'));
    expect(marked(structure, PATH)).toEqual([]);
  }
};

export const ProjectedPathWhileAlive: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUps = structureMatchUps({ completeAllMatchUps: false });
    const structure = renderStructure({ composition: withPath, matchUps });
    host.appendChild(structure);

    // a first-round matchUp between two players, at position 3: ahead lie R2#2, SF#1, F#1
    const firstRound = matchUps.find((m) => m.roundNumber === 1 && m.roundPosition === 3);
    const player = firstRound.sides.find((s: any) => s.participant)?.participant?.participantId;
    expect(player).toBeTruthy(); // control
    const ahead = [
      [2, 2],
      [3, 1],
      [4, 1]
    ].map(([roundNumber, roundPosition]) =>
      matchUps.find((m) => m.roundNumber === roundNumber && m.roundPosition === roundPosition)
    );
    // control: nobody has advanced, so the player appears only in the first round
    expect(ahead.some((m) => m.sides?.some((side: any) => side.participant?.participantId === player))).toBe(false);

    hover(structure, player);
    expect(marked(structure, PATH)).toEqual([firstRound.matchUpId]);
    expect(marked(structure, PATH_PROJECTED)).toEqual(idsOf(ahead));
    const projected = structure.querySelector('.tmx-m.chc-path--projected .chc-matchup') as HTMLElement;
    expect(getComputedStyle(projected).borderTopStyle).toBe('dashed');
  }
};

export const OffByDefaultAndRoundRobin: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUps = structureMatchUps({ completeAllMatchUps: true });
    const plain = renderStructure({ composition: { ...compositions.Australian, configuration: {} }, matchUps });
    host.appendChild(plain);
    const someone = matchUps[0].sides.find((s: any) => s.participant).participant.participantId;
    hover(plain, someone);
    expect(plain.querySelectorAll('.chc-participant-hover').length).toBeGreaterThan(0); // the old hover holds
    expect(marked(plain, PATH)).toEqual([]);

    const roundRobin = structureMatchUps({ drawType: ROUND_ROBIN, drawSize: 8, completeAllMatchUps: false });
    const rr = renderStructure({ composition: withPath, matchUps: roundRobin });
    host.appendChild(rr);
    const rrPlayer = roundRobin[0].sides.find((s: any) => s.participant).participant.participantId;
    hover(rr, rrPlayer);
    expect(marked(rr, PATH).length).toBeGreaterThan(1);
    expect(marked(rr, PATH_PROJECTED)).toEqual([]);
  }
};

export const FavouritesPinSides: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUps = structureMatchUps({ completeAllMatchUps: true, eventType: 'DOUBLES' });
    const pair = matchUps.find((m) => m.roundNumber === 4).sides[0].participant;
    const individual = pair.individualParticipants[1].participantId;
    const appearances = matchUps.filter((m) =>
      m.sides?.some((s: any) => s.participant?.participantId === pair.participantId)
    );
    expect(appearances.length).toBeGreaterThan(1); // control

    // pinning one player of a pair pins the pair's side
    const structure = renderStructure({ composition: compositions.Australian, matchUps, favourites: [individual] });
    host.appendChild(structure);
    expect(structure.querySelectorAll('.chc-participant--favourite').length).toBe(appearances.length);
    expect(marked(structure, 'chc-participant--favourite')).toEqual([]);
    expect(
      [...structure.querySelectorAll<HTMLElement>('.tmx-m')]
        .filter((el) => el.dataset.favourite === 'true')
        .map((el) => el.id)
        .sort((a, b) => a.localeCompare(b))
    ).toEqual(idsOf(appearances));

    expect(
      renderStructure({ composition: compositions.Australian, matchUps }).querySelectorAll(
        '.chc-participant--favourite'
      ).length
    ).toBe(0);
  }
};
