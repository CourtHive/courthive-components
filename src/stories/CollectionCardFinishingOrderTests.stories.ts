/**
 * Collection card — order-of-finish entry mode play-function tests.
 *
 * A collection's lines played to a result get a number field driven by the finishing-order state engine. Pinned here:
 *
 * - only played lines get a field, numbered 1..n from what they hold;
 * - entering 1 on the second line makes the first 2: values never duplicate or leave a gap;
 * - Save is enabled only after a change and hands back the whole order; Cancel restores it;
 * - the scorecard opens only the chosen collection in entry mode.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderCollectionCard } from '../components/scorecard/renderCollectionCard';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn } from 'storybook/test';

const { TEAM: TEAM_EVENT } = eventConstants;

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Collection Card Finishing Order',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'collection-card-host';
const INPUT_SELECTOR = '.chc-scorecard-finish-input';

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

/** a completed dual whose singles lines hold 1..n in collection order; its first singles line made a walkover */
function dualAndSingles() {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    completeAllMatchUps: true,
    setState: true
  });
  const dual = tournamentEngine
    .allTournamentMatchUps({ inContext: true })
    .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
  const singlesDefinition = dual.tieFormat.collectionDefinitions.find((c: any) => c.matchUpType === 'SINGLES');
  const singles = dual.tieMatchUps
    .filter((m: any) => m.collectionId === singlesDefinition.collectionId)
    .sort((a: any, b: any) => a.collectionPosition - b.collectionPosition)
    .map((m: any, index: number) => ({ ...m, orderOfFinish: index + 1 }));
  return { dual, singlesDefinition, singles };
}

const values = (host: HTMLElement) =>
  Object.fromEntries(
    [...host.querySelectorAll<HTMLInputElement>(INPUT_SELECTOR)].map((input) => [
      input.dataset.matchUpId,
      Number(input.value)
    ])
  );

const enter = (host: HTMLElement, matchUpId: string, value: number) => {
  const input = host.querySelector<HTMLInputElement>(
    `${INPUT_SELECTOR}[data-match-up-id="${matchUpId}"]`
  ) as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

export const EntryReshufflesAndSaves: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { singlesDefinition, singles } = dualAndSingles();
    const onSave = fn();
    host.appendChild(
      renderCollectionCard({
        collectionDefinition: singlesDefinition,
        collectionMatchUps: singles,
        composition: compositions.National,
        finishingOrder: { editing: true, onSave }
      })
    );

    // control: a card per line, and a field on each (every line here was played)
    expect(host.querySelectorAll('.chc-scorecard-card').length).toBe(singles.length);
    const [first, second] = singles.map(({ matchUpId }) => matchUpId);
    expect(values(host)).toEqual(Object.fromEntries(singles.map(({ matchUpId }, index) => [matchUpId, index + 1])));

    const save = host.querySelector('[data-action="save-finishing-order"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    enter(host, second, 1);
    expect(values(host)[second]).toBe(1);
    expect(values(host)[first]).toBe(2);
    const numbers = Object.values(values(host)).sort((a, b) => a - b);
    expect(numbers).toEqual(singles.map((_, index) => index + 1));
    expect(save.disabled).toBe(false);

    save.click();
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved[0]).toEqual({ matchUpId: second, orderOfFinish: 1 });
    expect(saved[1]).toEqual({ matchUpId: first, orderOfFinish: 2 });
    expect(saved).toHaveLength(singles.length);
  }
};

export const CancelRestoresAndUnplayedLinesHaveNoField: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { singlesDefinition, singles } = dualAndSingles();
    const [walkover, ...played] = singles;
    const lines = [{ ...walkover, matchUpStatus: 'WALKOVER', orderOfFinish: undefined }, ...played];
    const onCancel = fn();
    host.appendChild(
      renderCollectionCard({
        collectionDefinition: singlesDefinition,
        collectionMatchUps: lines,
        composition: compositions.National,
        finishingOrder: { editing: true, onCancel }
      })
    );

    // the walkover has no field; the played lines are numbered 1..n among themselves
    expect(values(host)[walkover.matchUpId]).toBeUndefined();
    expect(Object.values(values(host)).sort((a, b) => a - b)).toEqual(played.map((_, index) => index + 1));

    const before = values(host);
    enter(host, played[played.length - 1].matchUpId, 1);
    expect(values(host)).not.toEqual(before);

    (host.querySelector('[data-action="cancel-finishing-order"]') as HTMLButtonElement).click();
    expect(values(host)).toEqual(before);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect((host.querySelector('[data-action="save-finishing-order"]') as HTMLButtonElement).disabled).toBe(true);
  }
};

export const ScorecardOpensOneCollection: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, singlesDefinition } = dualAndSingles();
    host.appendChild(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        finishingOrder: { editingCollectionId: singlesDefinition.collectionId }
      })
    );

    const editedIds = [...host.querySelectorAll<HTMLInputElement>(INPUT_SELECTOR)].map(
      (input) => input.dataset.matchUpId
    );
    const singlesIds = dual.tieMatchUps
      .filter((m: any) => m.collectionId === singlesDefinition.collectionId)
      .map((m: any) => m.matchUpId);
    expect(editedIds.length).toBeGreaterThan(0);
    expect(editedIds.every((id) => singlesIds.includes(id))).toBe(true);
    expect(host.querySelectorAll('.chc-scorecard-finish-footer').length).toBe(1);
  }
};
