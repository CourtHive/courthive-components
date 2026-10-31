/**
 * Team scorecard — order-of-finish badge play-function tests.
 *
 * A completed line carrying `orderOfFinish` (the order it finished among its dual's lines of the same matchUpType,
 * set by the factory's `setOrderOfFinish`) shows that number on its card. Pinned here:
 *
 * - each completed line with a number shows it, and lines without one show nothing;
 * - a line that is no longer complete shows no badge, even if it still carries a number;
 * - `labels.orderOfFinish` names the badge (tooltip and aria-label), with an English default.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const { TEAM: TEAM_EVENT } = eventConstants;

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Order of Finish',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'order-of-finish-host';
const BADGE_SELECTOR = '.chc-scorecard-finish-badge';

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

/** A completed dual whose singles lines finished in reverse collection order. */
function dualWithSinglesOrder() {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    completeAllMatchUps: true,
    setState: true
  });
  const find = () =>
    tournamentEngine
      .allTournamentMatchUps({ inContext: true })
      .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);

  const dual = find();
  const singles = dual.tieMatchUps.filter((m: any) => m.matchUpType === 'SINGLES');
  const finishingOrder = singles.map((m: any, i: number) => ({
    orderOfFinish: singles.length - i,
    matchUpId: m.matchUpId
  }));
  const result: any = tournamentEngine.setOrderOfFinish({ drawId: dual.drawId, finishingOrder });
  if (!result.success) throw new Error(`setOrderOfFinish failed: ${JSON.stringify(result.error)}`);

  return { dual: find(), finishingOrder };
}

const badgesByMatchUpId = (host: HTMLElement) =>
  Object.fromEntries(
    [...host.querySelectorAll<HTMLElement>(BADGE_SELECTOR)].map((badge) => [
      (badge.closest('.tmx-m') as HTMLElement)?.id,
      Number(badge.dataset.orderOfFinish)
    ])
  );

export const NumbersOnCompletedLines: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, finishingOrder } = dualWithSinglesOrder();
    host.appendChild(renderScorecard({ matchUp: dual, composition: compositions.National }));

    // control: the cards rendered, and every line is complete
    expect(host.querySelectorAll('.chc-scorecard-card').length).toBe(dual.tieMatchUps.length);

    const expected = Object.fromEntries(
      finishingOrder.map(({ matchUpId, orderOfFinish }) => [matchUpId, orderOfFinish])
    );
    expect(badgesByMatchUpId(host)).toEqual(expected);
    // doubles lines carry no number, so show no badge
    const doublesIds = dual.tieMatchUps.filter((m: any) => m.matchUpType === 'DOUBLES').map((m: any) => m.matchUpId);
    expect(doublesIds.length).toBeGreaterThan(0);
    for (const matchUpId of doublesIds) expect(badgesByMatchUpId(host)[matchUpId]).toBeUndefined();

    const badge = host.querySelector(BADGE_SELECTOR) as HTMLElement;
    expect(badge.getAttribute('aria-label')).toBe(`Order of finish ${badge.dataset.orderOfFinish}`);
  }
};

export const NoBadgeOnALineNoLongerComplete: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, finishingOrder } = dualWithSinglesOrder();
    const [cleared] = finishingOrder;
    const matchUp = {
      ...dual,
      tieMatchUps: dual.tieMatchUps.map((m: any) =>
        m.matchUpId === cleared.matchUpId ? { ...m, matchUpStatus: 'TO_BE_PLAYED', winningSide: undefined } : m
      )
    };
    host.appendChild(
      renderScorecard({ matchUp, composition: compositions.National, labels: { orderOfFinish: 'Fin' } })
    );

    const badges = badgesByMatchUpId(host);
    expect(badges[cleared.matchUpId]).toBeUndefined();
    expect(Object.keys(badges).length).toBe(finishingOrder.length - 1);

    const badge = host.querySelector(BADGE_SELECTOR) as HTMLElement;
    expect(badge.getAttribute('aria-label')).toBe(`Fin ${badge.dataset.orderOfFinish}`);
    expect(badge.title).toBe(`Fin ${badge.dataset.orderOfFinish}`);
  }
};
