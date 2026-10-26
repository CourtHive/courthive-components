/**
 * Structure — `configuration.renderers` (slot renderers) play-function tests.
 *
 * Structure rendering vNext item 6. A host fills named slots with its own elements instead of mutating the
 * rendered tree afterwards: matchUpHeader, matchUpBadges, participantSuffix, matchUpFooter, roundHeader. Each
 * is wrapped in `.chc-slot.chc-slot--<name>`; the host's element is never modified. `.tmx-m` also carries
 * `data-matchup-status` and `data-live`.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Configuration, MatchUp } from '../types';
import { expect, fn } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Slot Renderers',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'slots-host';
const FOOTER = '.chc-matchup-footer';

let draw: any[] | undefined;
const matchUps = (): any[] => {
  if (!draw) {
    const { eventData } = generateEventData({ drawSize: 4, completeAllMatchUps: true }) || {};
    const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
    draw = roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
  }
  return draw;
};

const tag = (text: string) => {
  const el = document.createElement('b');
  el.textContent = text;
  return el;
};

const composition = (configuration: Configuration) => ({
  ...compositions.Australian,
  configuration: { ...compositions.Australian.configuration, ...configuration }
});

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

export const EachSlotInItsPlace: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUp: MatchUp = matchUps()[0];
    const participantSuffix = fn(({ individualParticipant }) => tag(`S:${individualParticipant?.participantId}`));
    const renderers = {
      matchUpHeader: fn(() => tag('HEADER')),
      matchUpBadges: fn(() => tag('BADGE')),
      matchUpFooter: fn(() => tag('FOOTER')),
      participantSuffix
    };

    const card = renderMatchUp({ matchUp, composition: composition({ scheduleInfo: true, renderers }) });
    host.appendChild(card);

    const side1 = card.querySelector('.tmx-sd[sidenumber="1"]') as HTMLElement;
    expect(side1.firstElementChild?.matches('.chc-slot--matchup-header')).toBe(true);
    expect(side1.firstElementChild?.textContent).toBe('HEADER');
    expect(renderers.matchUpHeader).toHaveBeenCalledWith({ matchUp });

    const rightGroup = card.querySelector('.chc-scheduling')?.lastElementChild as HTMLElement;
    expect(rightGroup.firstElementChild?.matches('.chc-slot--matchup-badges')).toBe(true);
    expect(rightGroup.firstElementChild?.textContent).toBe('BADGE');

    // one suffix per individual, after the name, with that individual in its context
    const suffixes = [...card.querySelectorAll('.chc-participant-name > .chc-slot--participant-suffix')];
    const ids = matchUp.sides?.map((side) => side.participant?.participantId).filter(Boolean);
    expect(suffixes.map((s) => s.textContent)).toEqual(ids?.map((id) => `S:${id}`));

    // footer alone (matchUpFooter off), last child of the card
    const footer = card.querySelector('.chc-matchup')?.lastElementChild as HTMLElement;
    expect(footer.matches(FOOTER)).toBe(true);
    expect(footer.textContent).toBe('FOOTER');

    // with matchUpFooter on, it replaces the round label
    const labelled = renderMatchUp({ matchUp, composition: composition({ matchUpFooter: true, renderers }) });
    expect(labelled.querySelector(FOOTER)?.textContent).toBe('FOOTER');
    const plainFooter = renderMatchUp({ matchUp, composition: composition({ matchUpFooter: true }) });
    expect(plainFooter.querySelector(FOOTER)?.textContent).toContain('Match');

    // no schedule header: badges take the end corner
    const corner = renderMatchUp({ matchUp, composition: composition({ scheduleInfo: false, renderers }) });
    const badge = corner.querySelector('.chc-slot--matchup-badges.chc-slot--corner') as HTMLElement;
    host.appendChild(corner);
    expect(badge.parentElement?.matches('.tmx-sd[sidenumber="1"]')).toBe(true);
    expect(getComputedStyle(badge).position).toBe('absolute');
  }
};

export const RoundHeaderSlot: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const roundHeader = fn(({ roundNumber }) => tag(`R${roundNumber}`));
    const structure = renderStructure({
      composition: composition({ roundHeader: true, renderers: { roundHeader } }),
      matchUps: matchUps()
    });
    host.appendChild(structure);
    const slots = [...structure.querySelectorAll('.tmx-rh .chc-slot--round-header')].map((el) => el.textContent);
    expect(slots).toEqual(['R1', 'R2']);
    expect(roundHeader.mock.calls[0][0].roundMatchUps.length).toBe(2);

    // without the round header on, the slot has nowhere to go
    const off = renderStructure({
      composition: composition({ roundHeader: false, renderers: { roundHeader } }),
      matchUps: matchUps()
    });
    expect(off.querySelectorAll('.chc-slot--round-header').length).toBe(0);
  }
};

export const EmptyAndUntouched: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUp: MatchUp = matchUps()[0];
    const hostElement = tag('MINE');
    const card = renderMatchUp({
      matchUp,
      composition: composition({
        scheduleInfo: true,
        renderers: { matchUpHeader: () => undefined, matchUpBadges: () => hostElement, matchUpFooter: () => null }
      })
    });
    host.appendChild(card);
    expect(card.querySelectorAll('.chc-slot').length).toBe(1);
    expect(card.querySelector(FOOTER)).toBeNull();
    // the host's element is wrapped, not modified
    expect(hostElement.className).toBe('');
    expect(hostElement.parentElement?.matches('.chc-slot--matchup-badges')).toBe(true);

    // the inline-scoring footer keeps its buttons
    const ready = { ...matchUp, winningSide: undefined, matchUpStatus: 'TO_BE_PLAYED', readyToScore: true };
    const inline = renderMatchUp({
      matchUp: ready,
      composition: composition({
        matchUpFooter: true,
        inlineScoring: { mode: 'games', canUndo: true },
        renderers: { matchUpFooter: () => tag('FOOTER') }
      })
    });
    expect(inline.querySelector('.chc-inline-scoring-footer-slot .chc-is-submit')).not.toBeNull();
    expect(inline.querySelector('.chc-slot--matchup-footer')).toBeNull();
  }
};

export const StateDataAttributes: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUp: MatchUp = matchUps()[0];
    const done = renderMatchUp({ matchUp, composition: composition({}) });
    host.appendChild(done);
    expect(done.dataset.matchupStatus).toBe(matchUp.matchUpStatus);
    expect(done.dataset.live).toBeUndefined();
    const live = renderMatchUp({
      matchUp: { ...matchUp, winningSide: undefined, matchUpStatus: 'IN_PROGRESS' },
      composition: composition({})
    });
    expect(live.dataset.matchupStatus).toBe('IN_PROGRESS');
    expect(live.dataset.live).toBe('true');
  }
};
