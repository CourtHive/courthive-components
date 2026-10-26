/**
 * MatchUp — a scoreboard card: one matchUp shown on its own, live or finished, with team colours.
 *
 * Built from three options, each off by default:
 *
 * - `configuration.sideColors` — a colour per side (a map, or a host function such as a team's colour). The
 *   winner's row is tinted, and its name, tick and won sets take the colour; while live, each side's point score is
 *   boxed in its colour and the server's name takes it.
 * - `configuration.scheduleInfo: { elapsed, eventRound }` — playing time (`h:mm`) in place of the date, and
 *   `Men's Singles - R32` on the right of the header, with the online-resource icons and location moved left.
 * - `configuration.serverIndicator` — a dot beside the side serving, from `matchUp.serverSideNumber` (the
 *   factory's name; ScoringEngine `getNextServer() + 1`).
 *
 * The two cards recreate a live and a finished card from a scoreboard CA pointed at (CA, 2026-10-26).
 */
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import { expect } from 'storybook/test';

// constants and types
import type { Composition, MatchUp } from '../types';

const BLUE = '#0047d4';
const ORANGE = '#dd5d13';
const MINUTE = 60_000;
const SERVER = '.chc-server';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const VIDEO = {
  resourceType: 'URL',
  resourceSubType: 'VIDEO',
  name: 'matchVideo',
  identifier: 'https://courthive.com/#video'
};
const STREAM = {
  resourceType: 'URL',
  resourceSubType: 'STREAM',
  name: 'liveStream',
  identifier: 'https://courthive.com/#live'
};

const player = (participantId: string, participantName: string, iso2NationalityCode: string) => ({
  participantId,
  participantName,
  person: { iso2NationalityCode }
});

const LIVE: MatchUp = {
  matchUpId: 'scoreboard-live',
  structureId: 'scoreboard',
  matchUpType: 'SINGLES',
  matchUpFormat: 'SET3-S:6/TB7',
  matchUpStatus: 'IN_PROGRESS',
  eventName: "Men's Singles",
  roundName: 'R32',
  serverSideNumber: 2,
  onlineResources: [VIDEO, STREAM] as any,
  schedule: { courtName: 'Court 2', venueAbbreviation: 'RMTA', milliseconds: 16 * MINUTE },
  sides: [
    { sideNumber: 1, participant: player('p-papadopoulos', 'Papadopoulos, Jordan', 'US') as any },
    { sideNumber: 2, participant: player('p-ekstrand', 'Ekstrand, Karl', 'US') as any }
  ],
  score: { sets: [{ setNumber: 1, side1Score: 0, side2Score: 1, side1PointScore: '0', side2PointScore: '0' }] }
};

const COMPLETED: MatchUp = {
  matchUpId: 'scoreboard-completed',
  structureId: 'scoreboard',
  matchUpType: 'SINGLES',
  matchUpFormat: 'SET3-S:6/TB7',
  matchUpStatus: 'COMPLETED',
  winningSide: 1,
  eventName: "Men's Singles",
  roundName: 'R32',
  onlineResources: [VIDEO] as any,
  schedule: { courtName: 'Court 11', venueAbbreviation: 'RMTA', milliseconds: 67 * MINUTE },
  sides: [
    { sideNumber: 1, participant: player('p-scheffer', 'Scheffer, Leo', 'DE') as any },
    { sideNumber: 2, participant: player('p-lauterbach', 'Lauterbach, Levi Nikolai', 'DE') as any }
  ],
  score: {
    scoreStringSide1: '6-2 6-1',
    scoreStringSide2: '2-6 1-6',
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 2, winningSide: 1 },
      { setNumber: 2, side1Score: 6, side2Score: 1, winningSide: 1 }
    ]
  }
};

type Args = { sideColors: boolean; serverIndicator: boolean; elapsed: boolean; eventRound: boolean; rounded: boolean };

function scoreboardComposition(args: Args): Composition {
  const base = compositions.BasicCard;
  return {
    ...base,
    configuration: {
      ...base.configuration,
      matchUpFooter: false,
      roundHeader: false,
      flags: true,
      onlineResources: true,
      rounded: args.rounded,
      gameScore: { position: 'trailing' },
      scheduleInfo: { elapsed: args.elapsed, eventRound: args.eventRound },
      serverIndicator: args.serverIndicator,
      liveStatusPill: !args.sideColors,
      ...(args.sideColors && { sideColors: { 1: BLUE, 2: ORANGE } })
    }
  };
}

function card(matchUp: MatchUp, composition: Composition, testId: string): HTMLElement {
  const content = renderMatchUp({ matchUp, composition, isLucky: true });
  const wrapper = renderContainer({ theme: composition.theme, content });
  wrapper.dataset.testid = testId;
  wrapper.style.width = '400px';
  return wrapper;
}

export default {
  title: 'Draws/MatchUps/Scoreboard',
  tags: ['autodocs'],
  args: { sideColors: true, serverIndicator: true, elapsed: true, eventRound: true, rounded: true },
  render: (args: Args) => {
    const composition = scoreboardComposition(args);
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 1rem; padding: 1rem; align-items: flex-start;';
    row.append(card(LIVE, composition, 'scoreboard-live'), card(COMPLETED, composition, 'scoreboard-completed'));
    return row;
  }
};

const sideOf = (root: HTMLElement, sideNumber: number) =>
  root.querySelector<HTMLElement>(`.tmx-sd[sidenumber="${sideNumber}"]`)!;
const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

export const Scoreboard = {
  play: async ({ canvasElement }) => {
    const live = canvasElement.querySelector('[data-testid="scoreboard-live"]') as HTMLElement;
    const done = canvasElement.querySelector('[data-testid="scoreboard-completed"]') as HTMLElement;

    // both cards fit the width they are given, border included, however long the header
    for (const wrapper of [live, done]) {
      const card = wrapper.querySelector('.chc-matchup') as HTMLElement;
      expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(wrapper.getBoundingClientRect().right + 0.5);
      const sides = [...card.querySelectorAll<HTMLElement>('.tmx-sd')];
      expect(
        sides.every((side) => side.getBoundingClientRect().right <= card.getBoundingClientRect().right + 0.5)
      ).toBe(true);
    }

    // header: icons, playing time | location on the left; event - round on the right
    const liveHeader = live.querySelector('.chc-scheduling') as HTMLElement;
    expect(liveHeader.querySelector('.chc-scheduling__left .chc-scheduling__elapsed')?.textContent).toBe('0:16');
    expect(liveHeader.querySelector('.chc-scheduling__left .chc-scheduling__location')?.textContent).toBe(
      'RMTA Court 2'
    );
    expect(liveHeader.querySelectorAll('.chc-scheduling__left .chc-online-resource').length).toBe(2);
    expect(liveHeader.querySelector('.chc-scheduling__event-round')?.textContent).toBe("Men's Singles - R32");
    expect(done.querySelector('.chc-scheduling__elapsed')?.textContent).toBe('1:07');

    // serve: a column on both sides, filled for the server, and the server's name in its colour
    expect(live.querySelectorAll(SERVER).length).toBe(2);
    expect(sideOf(live, 2).querySelector('.chc-server--active')).not.toBeNull();
    expect(sideOf(live, 1).querySelector('.chc-server--active')).toBeNull();
    const serverName = sideOf(live, 2).querySelector('.chc-participant-name') as HTMLElement;
    expect(getComputedStyle(serverName).color).toBe(rgb(ORANGE));
    expect(done.querySelectorAll(SERVER).length).toBe(0); // a finished matchUp has no server
    // configuration.liveStatusPill: false — the header and point score already say live
    expect(live.querySelector('.chc-pill')).toBeNull();

    // side colours: each live point score is boxed in its side's colour
    const point1 = sideOf(live, 1).querySelector('.chc-point-score') as HTMLElement;
    const point2 = sideOf(live, 2).querySelector('.chc-point-score') as HTMLElement;
    expect(getComputedStyle(point1).borderTopColor).toBe(rgb(BLUE));
    expect(getComputedStyle(point2).color).toBe(rgb(ORANGE));

    // the winner: tinted row, name, tick and won sets in the winner's colour; the loser's row untinted
    const winner = sideOf(done, 1);
    expect(winner.dataset.winner).toBe('true');
    const winnerRow = winner.querySelector(':scope > .chc-side-row') as HTMLElement;
    expect(getComputedStyle(winnerRow).backgroundColor).not.toBe(TRANSPARENT);
    // and nothing in the row paints over the tint (themes give the participant and score containers a background)
    const covering = [...winnerRow.children].filter((el) => getComputedStyle(el).backgroundColor !== TRANSPARENT);
    expect(covering.map((el) => el.className)).toEqual([]);

    const loserRow = sideOf(done, 2).querySelector(':scope > .chc-side-row') as HTMLElement;
    expect(getComputedStyle(loserRow).backgroundColor).toBe(TRANSPARENT);
    expect(getComputedStyle(winner.querySelector('.chc-participant-name') as HTMLElement).color).toBe(rgb(BLUE));
    expect(getComputedStyle(winner.querySelector('.chc-tick') as Element).backgroundColor).toBe(rgb(BLUE));
    const wonSets = [...winner.querySelectorAll<HTMLElement>('.chc-game-score--winner')];
    expect(wonSets.length).toBe(2);
    expect(wonSets.every((set) => getComputedStyle(set).color === rgb(BLUE))).toBe(true);
  }
};

/** Every option off: the same two matchUps render as any card does, so nothing changes for existing hosts. */
export const OptionsOff = {
  args: { sideColors: false, serverIndicator: false, elapsed: false, eventRound: false, rounded: false },
  play: async ({ canvasElement }) => {
    const live = canvasElement.querySelector('[data-testid="scoreboard-live"]') as HTMLElement;
    expect(live.querySelector(SERVER)).toBeNull();
    expect(live.querySelector('.chc-scheduling__elapsed')).toBeNull();
    expect(live.querySelector('.chc-scheduling__event-round')).toBeNull();
    expect(live.querySelector('.chc-scheduling__left')).toBeNull();
    expect(live.querySelector('[data-side-color]')).toBeNull();
    // the LIVE pill is on by default
    expect(live.querySelectorAll('.chc-pill').length).toBe(2);
    // the plain header: the date on the left (no scheduled date here), location on the right
    expect(live.querySelector('.chc-scheduling__date')?.textContent).toBe('Not scheduled');
    expect(live.querySelector('.chc-scheduling__location')?.textContent).toBe('RMTA Court 2');
  }
};
