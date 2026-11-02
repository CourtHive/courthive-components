/**
 * Team scorecard — the dual's home team, play-function tests.
 *
 * Pinned here:
 *
 * - the home team's name carries a Home tag where it falls, also through a swap: no side moves;
 * - an inferred home (VENUE / HOST_ORGANISATION) is marked inferred, its basis in the tooltip and aria label;
 * - with `onSetHome`, each team not already set as home offers "Set as home", which hands back its participantId;
 *   setting it with the factory's `setMatchUpHomeParticipantId` and re-rendering moves the tag;
 * - no `home`, or basis NONE, renders no tag and no action.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn } from 'storybook/test';

const { TEAM: TEAM_EVENT } = eventConstants;

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Home Team',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'home-team-host';
const HOME_TAG = '.chc-scorecard-home-tag';
const SET_HOME = '[data-action="set-home"]';
const SIDE = '.chc-scorecard-side';

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

function generateDual() {
  const {
    drawIds: [drawId]
  } = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    setState: true
  });
  const getDual = () =>
    tournamentEngine
      .allTournamentMatchUps({ inContext: true })
      .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
  const dual = getDual();
  const side = (sideNumber: number) => dual.sides.find((s: any) => s.sideNumber === sideNumber);
  return { drawId, dual, getDual, side1: side(1), side2: side(2) };
}

const sideOf = (host: HTMLElement, index: number) => host.querySelectorAll<HTMLElement>(SIDE)[index];

export const TaggedWhereItFalls: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, side2 } = generateDual();
    const home = { homeParticipantId: side2.participantId, basis: 'EXPLICIT' };

    host.appendChild(renderScorecard({ matchUp: dual, composition: compositions.National, home }));
    expect(host.querySelectorAll(HOME_TAG)).toHaveLength(1);
    // side 2 stays on the right: the tag goes to it, it is not moved to a fixed side
    expect(sideOf(host, 1).querySelector(HOME_TAG)?.textContent).toBe('Home');
    expect(sideOf(host, 1).querySelector('.chc-scorecard-side-name')?.textContent).toBe(
      side2.participant.participantName
    );
    expect(sideOf(host, 0).querySelector(HOME_TAG)).toBeNull();
    expect(host.querySelector(`${HOME_TAG}--inferred`)).toBeNull();
    expect(host.querySelector(SET_HOME)).toBeNull();

    host.replaceChildren(renderScorecard({ matchUp: dual, composition: compositions.National, swapSides: true, home }));
    expect(sideOf(host, 0).querySelector(HOME_TAG)).not.toBeNull();
    expect(sideOf(host, 0).querySelector('.chc-scorecard-side-name')?.textContent).toBe(
      side2.participant.participantName
    );
    expect(sideOf(host, 1).querySelector(HOME_TAG)).toBeNull();
  }
};

export const InferredHomeShowsItsBasis: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, side1 } = generateDual();

    host.appendChild(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        home: { homeParticipantId: side1.participantId, basis: 'VENUE' }
      })
    );
    const venueTag = sideOf(host, 0).querySelector<HTMLElement>(HOME_TAG) as HTMLElement;
    expect(venueTag.classList.contains('chc-scorecard-home-tag--inferred')).toBe(true);
    expect(venueTag.dataset.basis).toBe('VENUE');
    expect(venueTag.title).toBe('Home (venue)');
    expect(venueTag.getAttribute('aria-label')).toBe('Home (venue)');

    host.replaceChildren(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        home: { homeParticipantId: side1.participantId, basis: 'HOST_ORGANISATION' },
        labels: { home: 'Domicile', homeHostOrganisation: 'Domicile (organisateur)' }
      })
    );
    const hostTag = sideOf(host, 0).querySelector<HTMLElement>(HOME_TAG) as HTMLElement;
    expect(hostTag.textContent).toBe('Domicile');
    expect(hostTag.title).toBe('Domicile (organisateur)');
  }
};

export const SetAsHomeThroughTheFactory: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { drawId, dual, getDual, side1, side2 } = generateDual();
    const onSetHome = fn((participantId: string) => {
      const result = tournamentEngine.setMatchUpHomeParticipantId({
        homeParticipantId: participantId,
        matchUpId: dual.matchUpId,
        drawId
      });
      expect(result.success).toBe(true);
      draw();
    });
    const draw = () => {
      const matchUp = getDual();
      const homeParticipantId = matchUp.schedule?.homeParticipantId;
      host.replaceChildren(
        renderScorecard({
          matchUp,
          composition: compositions.National,
          home: { homeParticipantId, basis: homeParticipantId ? 'EXPLICIT' : 'NONE', onSetHome }
        })
      );
    };

    draw();
    // no home team yet: no tag, and both teams offer "Set as home"
    expect(host.querySelector(HOME_TAG)).toBeNull();
    const offers = [...host.querySelectorAll<HTMLButtonElement>(SET_HOME)];
    expect(offers.map((offer) => offer.dataset.participantId)).toEqual([side1.participantId, side2.participantId]);
    expect(offers[0].classList.contains('button')).toBe(true);
    expect(offers[0].textContent).toBe('Set as home');

    offers[1].click();
    expect(onSetHome).toHaveBeenCalledWith(side2.participantId);
    expect(sideOf(host, 1).querySelector(HOME_TAG)).not.toBeNull();
    // a set home is not offered again; the other team still is
    expect(sideOf(host, 1).querySelector(SET_HOME)).toBeNull();
    (sideOf(host, 0).querySelector(SET_HOME) as HTMLButtonElement).click();
    expect(onSetHome).toHaveBeenLastCalledWith(side1.participantId);
    expect(sideOf(host, 0).querySelector(HOME_TAG)).not.toBeNull();
    expect(sideOf(host, 1).querySelector(HOME_TAG)).toBeNull();
  }
};

export const NoHomeNoTag: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, side1 } = generateDual();

    host.appendChild(renderScorecard({ matchUp: dual, composition: compositions.National }));
    expect(host.querySelector('.chc-scorecard-home')).toBeNull();

    host.replaceChildren(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        home: { homeParticipantId: side1.participantId, basis: 'NONE' }
      })
    );
    expect(host.querySelector(HOME_TAG)).toBeNull();
    expect(host.querySelector(SET_HOME)).toBeNull();
  }
};
