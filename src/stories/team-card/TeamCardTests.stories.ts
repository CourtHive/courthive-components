/**
 * Team Card — play-function tests.
 *
 * Mirrors the matchUpCard pattern (sister file at
 * `../schedule-page/MatchUpCardTests.stories.ts`) onto the
 * `buildTeamCard` primitive. The primitive currently also has a
 * vitest+happy-dom suite under
 * `src/components/team-card/__tests__/buildTeamCard.test.ts` — that
 * pre-dates the one-DOM-test-layer-per-ecosystem rule. These play
 * functions are the sanctioned forward path.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` (one terminal) +
 *                    `pnpm test-storybook -- --testPathPatterns TeamCardTests`
 */

import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn, userEvent } from 'storybook/test';
import type { TeamCardData } from '../../components/team-card/types';
import { buildTeamCard } from '../../components/team-card/buildTeamCard';

const meta: Meta = {
  title: 'Team Card/Tests/buildTeamCard'
};
export default meta;

// ── Constants ──

const CARD_SELECTOR = '.chc-team-card';
const NAME_SELECTOR = '.chc-team-card__name';
const NICKNAME_SELECTOR = '.chc-team-card__nickname';
const COUNTS_SELECTOR = '.chc-team-card__counts';
const CLICKABLE_CLASS = 'chc-team-card--clickable';
const TEAM_NAME_ALTITUDE = 'Altitude';

// ── Helpers ──

function renderCard(
  data: TeamCardData,
  callbacks?: Parameters<typeof buildTeamCard>[1]
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; background: var(--chc-bg, #1a1a1a); max-width: 360px;';
  wrap.appendChild(buildTeamCard(data, callbacks));
  return wrap;
}

// ── Rendering: name + nickname ──

export const RendersTeamName: StoryObj = {
  name: 'renders the teamName in the title row',
  render: () => renderCard({ teamName: TEAM_NAME_ALTITUDE }),
  play: async ({ canvasElement }) => {
    const name = canvasElement.querySelector(NAME_SELECTOR);
    expect(name?.textContent).toBe(TEAM_NAME_ALTITUDE);
  }
};

export const NicknameOmittedWhenAbsent: StoryObj = {
  name: 'no nickname provided → nickname span is NOT in the DOM',
  render: () => renderCard({ teamName: TEAM_NAME_ALTITUDE }),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(NICKNAME_SELECTOR)).toBeNull();
  }
};

export const NicknameWrappedInQuotes: StoryObj = {
  name: 'nickname renders wrapped in straight double quotes',
  render: () => renderCard({ teamName: TEAM_NAME_ALTITUDE, nickname: 'ALT' }),
  play: async ({ canvasElement }) => {
    const nick = canvasElement.querySelector(NICKNAME_SELECTOR);
    expect(nick?.textContent).toBe('"ALT"');
  }
};

// ── Rendering: count segments ──

export const CountSegmentsJoined: StoryObj = {
  name: 'countSegments joined with " · " separator',
  render: () =>
    renderCard({
      teamName: TEAM_NAME_ALTITUDE,
      countSegments: ['9 players', '1 coach', '1 physio']
    }),
  play: async ({ canvasElement }) => {
    const counts = canvasElement.querySelector(COUNTS_SELECTOR);
    expect(counts?.textContent).toBe('9 players · 1 coach · 1 physio');
  }
};

export const EmptySegmentsDropped: StoryObj = {
  name: 'empty / whitespace-only segments are dropped before joining',
  render: () =>
    renderCard({
      teamName: TEAM_NAME_ALTITUDE,
      countSegments: ['9 players', '', '   ', '1 coach']
    }),
  play: async ({ canvasElement }) => {
    const counts = canvasElement.querySelector(COUNTS_SELECTOR);
    expect(counts?.textContent).toBe('9 players · 1 coach');
  }
};

export const CountsRowOmittedWhenAllEmpty: StoryObj = {
  name: 'all segments empty → counts row is NOT rendered',
  render: () =>
    renderCard({
      teamName: TEAM_NAME_ALTITUDE,
      countSegments: ['', '  ']
    }),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(COUNTS_SELECTOR)).toBeNull();
  }
};

// ── teamId data attribute ──

export const TeamIdOnDataset: StoryObj = {
  name: 'teamId surfaces as data-team-id',
  render: () => renderCard({ teamId: 'team-altitude', teamName: TEAM_NAME_ALTITUDE }),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    expect(card?.dataset.teamId).toBe('team-altitude');
  }
};

// ── Click affordances ──

export const NoClickAffordancesWithoutCallback: StoryObj = {
  name: 'no onClick → no clickable class, no role, tabIndex = -1',
  render: () => renderCard({ teamName: TEAM_NAME_ALTITUDE }),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    expect(card?.classList.contains(CLICKABLE_CLASS)).toBe(false);
    expect(card?.getAttribute('role')).toBeNull();
    expect(card?.tabIndex).toBe(-1);
  }
};

export const ClickAffordancesWhenCallbackProvided: StoryObj = {
  name: 'onClick → clickable class + role=button + tabIndex=0',
  render: () => renderCard({ teamId: 't1', teamName: TEAM_NAME_ALTITUDE }, { onClick: () => undefined }),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    expect(card?.classList.contains(CLICKABLE_CLASS)).toBe(true);
    expect(card?.getAttribute('role')).toBe('button');
    expect(card?.tabIndex).toBe(0);
  }
};

// ── Click + keyboard activation ──
//
// Activation stories use a module-scoped spy so the play function can
// inspect call counts after dispatching the event. The spy is reset
// inside each play via `mockClear()` so neighbouring stories don't see
// leaked calls. Going through a closure (instead of `args` + `fn()`) is
// simpler than the HTML-renderer's typed-args generics demand.

const ACTIVATION_DATA: TeamCardData = { teamId: 't1', teamName: TEAM_NAME_ALTITUDE };
const activationSpy = fn();

function renderActivationCard(): HTMLElement {
  activationSpy.mockClear();
  return renderCard(ACTIVATION_DATA, { onClick: activationSpy });
}

export const ClickActivation: StoryObj = {
  name: 'click → onClick receives the TeamCardData',
  render: renderActivationCard,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    await userEvent.click(card!);
    expect(activationSpy).toHaveBeenCalledTimes(1);
    expect(activationSpy).toHaveBeenLastCalledWith(ACTIVATION_DATA);
  }
};

export const EnterKeyActivation: StoryObj = {
  name: 'Enter keydown on the card invokes onClick',
  render: renderActivationCard,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    card!.focus();
    await userEvent.keyboard('{Enter}');
    expect(activationSpy).toHaveBeenCalledTimes(1);
  }
};

export const SpaceKeyActivation: StoryObj = {
  name: 'Space keydown on the card invokes onClick',
  render: renderActivationCard,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    card!.focus();
    await userEvent.keyboard(' ');
    expect(activationSpy).toHaveBeenCalledTimes(1);
  }
};

export const NonActivatingKeysIgnored: StoryObj = {
  name: 'non-activating keys (e.g. "a") do NOT invoke onClick',
  render: renderActivationCard,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(CARD_SELECTOR);
    card!.focus();
    await userEvent.keyboard('a');
    expect(activationSpy).not.toHaveBeenCalled();
  }
};
