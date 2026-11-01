/**
 * Team scorecard — dual issues and the team score set by hand, play-function tests.
 *
 * Pinned here:
 *
 * - a line issue marks its line (tooltip and aria label carry the message) and the collection header counts it;
 *   a duplicate marks each line it names;
 * - the dual's own issues fill a banner under the header, with the caller's action where one is given;
 * - Override makes the header scores editable: level scores wait for a winner, Save hands back the score by side
 *   number (through a swap), Cancel restores the header;
 * - while the score is set by hand the header says so, and Restore is offered.
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
  title: 'Scoring/Team Scorecard/Tests/Dual Issues',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'dual-issues-host';
const SCORE_INPUT = '.chc-scorecard-score-input';
const ARIA_LABEL = 'aria-label';
const OVERRIDE = 'override-team-score';
const RESTORE = 'restore-team-score';
const MANUAL_TAG = '.chc-scorecard-manual-tag';

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

function generateDual({ completeAllMatchUps = false } = {}) {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    completeAllMatchUps,
    setState: true
  });
  const dual = tournamentEngine
    .allTournamentMatchUps({ inContext: true })
    .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
  const singlesId = dual.tieFormat.collectionDefinitions.find((c: any) => c.matchUpType === 'SINGLES').collectionId;
  const singles = dual.tieMatchUps
    .filter((m: any) => m.collectionId === singlesId)
    .sort((a: any, b: any) => a.collectionPosition - b.collectionPosition);
  return { dual, singlesId, singles };
}

const button = (host: HTMLElement, action: string) =>
  host.querySelector(`[data-action="${action}"]`) as HTMLButtonElement;

const enter = (host: HTMLElement, position: string, value: number) => {
  const input = host.querySelector<HTMLInputElement>(`${SCORE_INPUT}[data-position="${position}"]`) as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

export const LineMarkersAndBanner: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual, singlesId, singles } = generateDual();
    const [first, second, third] = singles.map(({ matchUpId }) => matchUpId);
    const onDecided = fn();
    host.appendChild(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        issues: [
          { code: 'LINEUP_INCOMPLETE', matchUpId: first, collectionId: singlesId, sideNumber: 2 },
          { code: 'DUPLICATE_IN_COLLECTION', matchUpIds: [first, second], collectionId: singlesId },
          { code: 'DUAL_DECIDED', matchUpIds: [third] },
          { code: 'MANUAL_SCORE_DIVERGES', info: '1-0' }
        ],
        issueActions: { DUAL_DECIDED: { label: 'Record unplayed lines', onClick: onDecided } },
        labels: { issues: { LINEUP_INCOMPLETE: 'Composition incomplète' } }
      })
    );

    const marked = [...host.querySelectorAll<HTMLElement>('.chc-scorecard-card--issue')];
    expect(marked).toHaveLength(2);
    const firstCard = marked.find((card) =>
      card.querySelector('.chc-scorecard-issue-marker')?.getAttribute(ARIA_LABEL)?.includes('Composition incomplète')
    ) as HTMLElement;
    expect(firstCard.dataset.issueCodes).toBe('LINEUP_INCOMPLETE DUPLICATE_IN_COLLECTION');
    expect(firstCard.querySelector('.chc-scorecard-issue-marker')?.getAttribute(ARIA_LABEL)).toBe(
      'Composition incomplète; Player on more than one line'
    );

    // only the singles header counts: two lines with an issue
    const counts = [...host.querySelectorAll<HTMLElement>('.chc-scorecard-issue-count')];
    expect(counts).toHaveLength(1);
    expect(counts[0].getAttribute(ARIA_LABEL)).toBe('Lines with issues: 2');

    const items = [...host.querySelectorAll<HTMLElement>('.chc-scorecard-banner-item')];
    expect(items.map((item) => item.dataset.issueCode)).toEqual(['DUAL_DECIDED', 'MANUAL_SCORE_DIVERGES']);
    expect(items[1].textContent).toBe('The lines produce 1-0');
    button(host, 'issue-action').click();
    expect(onDecided).toHaveBeenCalledWith({ code: 'DUAL_DECIDED', matchUpIds: [third] });
  }
};

export const NoIssuesNoMarkers: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual } = generateDual();
    host.appendChild(renderScorecard({ matchUp: dual, composition: compositions.National, issues: [] }));
    expect(host.querySelectorAll('.chc-scorecard-card').length).toBeGreaterThan(0);
    expect(host.querySelector('.chc-scorecard-card--issue')).toBeNull();
    expect(host.querySelector('.chc-scorecard-issue-count')).toBeNull();
    expect(host.querySelector('.chc-scorecard-banner')).toBeNull();
    expect(button(host, OVERRIDE)).toBeNull();
  }
};

export const OverrideInlineThroughASwap: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual } = generateDual();
    const matchUp = { ...dual, score: { sets: [{ side1Score: 2, side2Score: 1 }] }, winningSide: 1 };
    const onOverride = fn();
    host.appendChild(
      renderScorecard({ matchUp, composition: compositions.National, swapSides: true, teamScore: { onOverride } })
    );

    expect(host.querySelector(SCORE_INPUT)).toBeNull();
    button(host, OVERRIDE).click();
    // swapped: side 2 is on the left
    const values = [...host.querySelectorAll<HTMLInputElement>(SCORE_INPUT)].map((input) => input.value);
    expect(values).toEqual(['1', '2']);
    const save = button(host, 'save-team-score');
    expect(save.disabled).toBe(true);

    // level: no winner yet, so nothing to save
    enter(host, 'left', 2);
    const choice = host.querySelector('.chc-scorecard-winner-choice') as HTMLElement;
    expect(choice.hidden).toBe(false);
    expect(save.disabled).toBe(true);

    (host.querySelector('[data-action="choose-winner"][data-position="left"]') as HTMLButtonElement).click();
    expect(save.disabled).toBe(false);
    save.click();
    expect(onOverride).toHaveBeenCalledWith({ side1Score: 2, side2Score: 2, winningSide: 2 });
    expect(host.querySelector(SCORE_INPUT)).toBeNull();
    const shown = [...host.querySelectorAll<HTMLElement>('.chc-scorecard-side-score')].map((span) => span.textContent);
    expect(shown).toEqual(['2', '2']);
  }
};

export const CancelRestoresTheHeader: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual } = generateDual();
    const matchUp = { ...dual, score: { sets: [{ side1Score: 3, side2Score: 0 }] }, winningSide: 1 };
    const onOverride = fn();
    host.appendChild(renderScorecard({ matchUp, composition: compositions.National, teamScore: { onOverride } }));

    button(host, OVERRIDE).click();
    enter(host, 'right', 7);
    // a score that is not a whole number of 0 or more is put back
    enter(host, 'left', -1);
    expect((host.querySelector(`${SCORE_INPUT}[data-position="left"]`) as HTMLInputElement).value).toBe('3');
    button(host, 'cancel-team-score').click();

    expect(host.querySelector(SCORE_INPUT)).toBeNull();
    const shown = [...host.querySelectorAll<HTMLElement>('.chc-scorecard-side-score')];
    expect(shown.map((span) => span.textContent)).toEqual(['3', '0']);
    expect(shown.every((span) => !span.hidden)).toBe(true);
    expect(onOverride).not.toHaveBeenCalled();

    // reopened, it starts from the recorded score
    button(host, OVERRIDE).click();
    expect([...host.querySelectorAll<HTMLInputElement>(SCORE_INPUT)].map((input) => input.value)).toEqual(['3', '0']);
  }
};

export const SetByHandOffersRestore: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual } = generateDual();
    const onRestore = fn();
    // manual follows the MANUAL_SCORE issue when the caller does not say
    host.appendChild(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        issues: [{ code: 'MANUAL_SCORE' }],
        teamScore: { onRestore, onOverride: fn() }
      })
    );
    expect(host.querySelector('.chc-scorecard-header--manual')).not.toBeNull();
    expect(host.querySelector(MANUAL_TAG)?.textContent).toBe('Set by hand');
    // the header says so; the banner does not repeat it
    expect(host.querySelector('[data-issue-code="MANUAL_SCORE"]')).toBeNull();
    button(host, RESTORE).click();
    expect(onRestore).toHaveBeenCalledTimes(1);

    host.replaceChildren(
      renderScorecard({ matchUp: dual, composition: compositions.National, teamScore: { onRestore } })
    );
    expect(host.querySelector(MANUAL_TAG)).toBeNull();
    expect(button(host, RESTORE)).toBeNull();
  }
};

export const TheEditorReplacesTheControlsAndLeavesTheNamesInPlace: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const { dual } = generateDual();
    host.appendChild(
      renderScorecard({
        matchUp: dual,
        composition: compositions.National,
        teamScore: { manual: true, onOverride: fn(), onRestore: fn() }
      })
    );
    const names = () =>
      [...host.querySelectorAll<HTMLElement>('.chc-scorecard-side-name')].map(
        (name) => name.getBoundingClientRect().top
      );
    const shown = (element: HTMLElement | null) => !!element && element.getClientRects().length > 0;
    const before = names();

    button(host, OVERRIDE).click();
    // the override, restore and tag are off screen while the editor is open, not merely flagged hidden
    expect(shown(button(host, OVERRIDE))).toBe(false);
    expect(shown(button(host, RESTORE))).toBe(false);
    expect(shown(host.querySelector(MANUAL_TAG))).toBe(false);
    expect(shown(button(host, 'save-team-score'))).toBe(true);
    expect(names()).toEqual(before);

    button(host, 'cancel-team-score').click();
    expect(shown(button(host, OVERRIDE))).toBe(true);
    expect(host.querySelectorAll('.chc-scorecard-score-editor')).toHaveLength(0);
  }
};
