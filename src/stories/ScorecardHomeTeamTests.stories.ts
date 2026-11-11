/**
 * Team scorecard — the dual's home team, play-function tests.
 *
 * Pinned here:
 *
 * - the home team's name carries a Home tag where it falls, also through a swap: no side moves;
 * - an inferred home (VENUE / HOST_ORGANISATION) is marked inferred, its basis in the tooltip and aria label;
 * - with `onSetHome`, a corner gear opens an edit: the teams become toggles, a bar says what to do, the gear becomes
 *   the check that saves. Save sends one change, recorded here with the factory's `setMatchUpHomeParticipantId`;
 * - with `onClearHome`, selecting the set home again leaves no home team; the factory clears with `homeParticipantId: ''`;
 * - Cancel and Escape send nothing, a Save with no change sends nothing, a refused save keeps the edit open;
 * - the home edit and the team-score editor never show together;
 * - no `home`, or basis NONE, renders no tag; no `onSetHome`, no gear.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { user } from './helpers/trustedUser';
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
const GEAR = '[data-action="edit-home"]';
const SAVE = '[data-action="save-home"]';
const CANCEL = '[data-action="cancel-home"]';
const TARGET = '[data-action="choose-home"]';
const BAR = '.chc-scorecard-home-bar';
const ARIA_LABEL = 'aria-label';
const ARIA_PRESSED = 'aria-pressed';
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
    // nothing to record it with, so no gear
    expect(host.querySelector(GEAR)).toBeNull();

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
        home: { homeParticipantId: side1.participantId, basis: 'VENUE', onClearHome: fn() }
      })
    );
    const venueTag = sideOf(host, 0).querySelector<HTMLElement>(HOME_TAG) as HTMLElement;
    expect(venueTag.classList.contains('chc-scorecard-home-tag--inferred')).toBe(true);
    expect(venueTag.dataset.basis).toBe('VENUE');
    expect(venueTag.title).toBe('Home (venue)');
    expect(venueTag.getAttribute(ARIA_LABEL)).toBe('Home (venue)');
    // clearing alone is no way to choose a home team: no gear without `onSetHome`
    expect(host.querySelector(GEAR)).toBeNull();

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

const click = (host: HTMLElement, selector: string) => user.click(host.querySelector(selector) as HTMLButtonElement);
const target = (host: HTMLElement, index: number) => host.querySelectorAll<HTMLButtonElement>(TARGET)[index];
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** a card wired to the factory, re-rendered after each save as a host would */
function factoryCard(host: HTMLElement, extra: Record<string, any> = {}) {
  const { drawId, dual, getDual, side1, side2 } = generateDual();
  const record = (homeParticipantId: string) => {
    const result = tournamentEngine.setMatchUpHomeParticipantId({
      matchUpId: dual.matchUpId,
      homeParticipantId,
      drawId
    });
    expect(result.success).toBe(true);
    draw();
  };
  const onSetHome = fn((participantId: string) => record(participantId));
  const onClearHome = fn(() => record(''));
  const draw = () => {
    const matchUp = getDual();
    const homeParticipantId = matchUp.schedule?.homeParticipantId;
    host.replaceChildren(
      renderScorecard({
        matchUp,
        composition: compositions.National,
        home: { homeParticipantId, basis: homeParticipantId ? 'EXPLICIT' : 'NONE', onSetHome, onClearHome },
        ...extra
      })
    );
  };
  draw();
  return { getDual, side1, side2, onSetHome, onClearHome };
}

export const EditThroughTheFactory: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { getDual, side1, side2, onSetHome, onClearHome } = factoryCard(host);

    // no home team yet: no tag, a gear, and nothing to edit until it is opened
    expect(host.querySelector(HOME_TAG)).toBeNull();
    expect(host.querySelector(TARGET)).toBeNull();
    expect(host.querySelector(GEAR)?.getAttribute(ARIA_LABEL)).toBe('Edit home team');

    await click(host, GEAR);
    expect(host.querySelectorAll(TARGET)).toHaveLength(2);
    expect(host.querySelector(GEAR)).toBeNull();
    expect(host.querySelector(SAVE)?.getAttribute(ARIA_LABEL)).toBe('Save home team');
    expect(host.querySelector(BAR)?.getAttribute('role')).toBe('status');
    expect(host.querySelector(BAR)?.textContent).toContain('select it again for no home team');
    expect(document.activeElement).toBe(target(host, 0));

    // choosing moves the label in the draft and records nothing yet
    await user.click(target(host, 1));
    expect(sideOf(host, 1).querySelector(HOME_TAG)).not.toBeNull();
    expect(target(host, 1).getAttribute(ARIA_PRESSED)).toBe('true');
    expect(host.querySelector(BAR)?.textContent).toContain(`Home: ${side2.participant.participantName} (unsaved)`);
    expect(onSetHome).not.toHaveBeenCalled();

    await click(host, SAVE);
    await settle();
    expect(onSetHome).toHaveBeenCalledTimes(1);
    expect(onSetHome).toHaveBeenCalledWith(side2.participantId);
    expect(getDual().schedule?.homeParticipantId).toBe(side2.participantId);
    expect(sideOf(host, 1).querySelector(HOME_TAG)).not.toBeNull();
    expect(host.querySelector(GEAR)).not.toBeNull();

    // selecting the home team again leaves none: Save clears it
    await click(host, GEAR);
    expect(document.activeElement).toBe(target(host, 1));
    await user.click(target(host, 1));
    expect(host.querySelector(HOME_TAG)).toBeNull();
    expect(host.querySelector(BAR)?.textContent).toContain('No home team set (unsaved)');
    await click(host, SAVE);
    await settle();
    expect(onClearHome).toHaveBeenCalledTimes(1);
    expect(getDual().schedule?.homeParticipantId).toBeUndefined();
    expect(host.querySelector(HOME_TAG)).toBeNull();
    expect(side1.participantId).toBeTruthy();
  }
};

export const CancelEscapeAndNoChangeSendNothing: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { onSetHome, onClearHome } = factoryCard(host);

    await click(host, GEAR);
    await user.click(target(host, 0));
    await click(host, CANCEL);
    expect(host.querySelector(HOME_TAG), 'the draft is discarded').toBeNull();
    expect(host.querySelector(BAR)).toBeNull();
    expect(document.activeElement).toBe(host.querySelector(GEAR));

    await click(host, GEAR);
    await user.click(target(host, 1));
    // the clicked target has focus, so Escape goes where a user's would
    await user.keyboard('{Escape}');
    expect(host.querySelector(HOME_TAG)).toBeNull();
    expect(host.querySelector(TARGET)).toBeNull();

    // chosen and unchosen again: Save just closes
    await click(host, GEAR);
    await user.click(target(host, 0));
    await user.click(target(host, 0));
    await click(host, SAVE);
    await settle();
    expect(host.querySelector(TARGET)).toBeNull();
    expect(onSetHome).not.toHaveBeenCalled();
    expect(onClearHome).not.toHaveBeenCalled();
  }
};

export const InferredHomeIsConfirmedNotCleared: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, side1 } = generateDual();
    const onSetHome = fn();
    host.appendChild(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        home: { homeParticipantId: side1.participantId, basis: 'VENUE', onSetHome, onClearHome: fn() }
      })
    );

    await click(host, GEAR);
    expect(host.querySelector(BAR)?.textContent).toContain('Home comes from the venue');
    expect(target(host, 0).getAttribute(ARIA_PRESSED), 'inferred is not chosen').toBe('false');

    // selecting it confirms it; selecting it again goes back to the inferred home, not to none
    await user.click(target(host, 0));
    expect(sideOf(host, 0).querySelector(`${HOME_TAG}--inferred`)).toBeNull();
    await user.click(target(host, 0));
    expect(sideOf(host, 0).querySelector(`${HOME_TAG}--inferred`)).not.toBeNull();

    await user.click(target(host, 0));
    await click(host, SAVE);
    await settle();
    expect(onSetHome).toHaveBeenCalledWith(side1.participantId);
    // the caller did not re-render: the card shows what was saved
    expect(sideOf(host, 0).querySelector(HOME_TAG)).not.toBeNull();
    expect(sideOf(host, 0).querySelector(`${HOME_TAG}--inferred`)).toBeNull();
  }
};

export const RefusedSaveKeepsTheEdit: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual } = generateDual();
    const onSetHome = fn(async () => false);
    host.appendChild(renderScorecard({ matchUp: dual, composition: compositions.National, home: { onSetHome } }));

    await click(host, GEAR);
    await user.click(target(host, 1));
    await click(host, SAVE);
    await settle();
    expect(onSetHome).toHaveBeenCalledTimes(1);
    expect(host.querySelector(TARGET), 'still editing').not.toBeNull();
    expect(target(host, 1).getAttribute(ARIA_PRESSED), 'the choice is kept').toBe('true');
    expect(host.querySelector(BAR)?.textContent).toContain('Not saved');
    expect((host.querySelector(SAVE) as HTMLButtonElement).disabled).toBe(false);
  }
};

export const HomeEditAndTeamScoreTakeTurns: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    factoryCard(host, { teamScore: { onOverride: fn() } });
    const controls = () => host.querySelector<HTMLElement>('.chc-scorecard-score-controls')!;

    await click(host, GEAR);
    expect(getComputedStyle(controls()).display).toBe('none');
    await click(host, CANCEL);
    expect(getComputedStyle(controls()).display).not.toBe('none');

    await click(host, '[data-action="override-team-score"]');
    expect(getComputedStyle(host.querySelector(GEAR) as HTMLElement).display).toBe('none');
  }
};

export const NoHomeNoTag: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, side1 } = generateDual();

    host.appendChild(renderScorecard({ matchUp: dual, composition: compositions.National }));
    expect(host.querySelector('.chc-scorecard-home')).toBeNull();
    expect(host.querySelector(GEAR)).toBeNull();

    host.replaceChildren(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        home: { homeParticipantId: side1.participantId, basis: 'NONE' }
      })
    );
    expect(host.querySelector(HOME_TAG)).toBeNull();
    expect(host.querySelector(GEAR)).toBeNull();
  }
};
