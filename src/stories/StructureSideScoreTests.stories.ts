/**
 * MatchUp — `renderSideScore` / `setScore` play-function tests: one side's score as drawn.
 *
 * Moved from an emulated-DOM unit test. What each cell SHOWS — winner / loser, game count or tiebreak points, the
 * stripe token, the point score's place, the `[10-7]` recovery — is `sideScoreModel`, node-tested. What is here
 * needs the browser: the elements, the stripe's paint, a real click, the point score's place on screen, the
 * wrapper's laid-out height and the `resultsInfo` labels.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderSideScore, setScore } from '../components/renderStructure/renderSideScore';
import type { Composition, MatchUp, SetScore } from '../types';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { user } from './helpers/trustedUser';
import { expect, fn } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/MatchUps/MatchUp/Tests/Side Score',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

function makeSet(overrides: Partial<SetScore> = {}): SetScore {
  return { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1, ...overrides };
}

function makeMatchUp(sets: SetScore[]): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    score: { sets, scoreStringSide1: '6-4' },
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
    ]
  } as MatchUp;
}

function frames(entries: [string, HTMLElement][]): HTMLElement {
  const outer = document.createElement('div');
  outer.className = 'chc-container';
  outer.style.cssText = 'display:flex; flex-direction:column; gap:12px; padding:12px; height:auto;';
  for (const [testid, el] of entries) {
    const frame = document.createElement('div');
    frame.dataset.testid = testid;
    frame.style.cssText = 'display:flex;';
    frame.appendChild(el);
    outer.appendChild(frame);
  }
  return outer;
}

const inFrame = (canvasElement: HTMLElement, testid: string) =>
  canvasElement.querySelector<HTMLElement>(`[data-testid="${testid}"]`)!.firstElementChild as HTMLElement;

export const SetCells: StoryObj = {
  render: () =>
    frames([
      [
        'tiebreak',
        setScore({ set: makeSet({ setNumber: 2, side1TiebreakScore: 7, side2TiebreakScore: 5 }), sideNumber: 2 })
      ],
      [
        'game-only',
        setScore({ set: makeSet({ side1TiebreakScore: 7, side2TiebreakScore: 5 }), sideNumber: 1, gameScoreOnly: true })
      ],
      [
        'two-sets',
        renderSideScore({
          matchUp: makeMatchUp([makeSet(), makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })]),
          sideNumber: 1
        })
      ]
    ]),
  play: async ({ canvasElement }) => {
    const tiebreak = inFrame(canvasElement, 'tiebreak');
    await expect(tiebreak.tagName).toBe('P');
    await expect(tiebreak.classList.contains('tmx-st')).toBe(true);
    await expect(tiebreak.getAttribute('setNumber')).toBe('2');
    await expect(tiebreak).toBeVisible();
    // the game count, with the side's tiebreak points as a smaller superscript beside it
    const superscript = tiebreak.querySelector<HTMLElement>('span.chc-tiebreak')!;
    await expect(superscript.textContent).toBe('5');
    await expect(superscript).toBeVisible();
    await expect(tiebreak.firstChild?.textContent).toBe('4');
    await expect(Number.parseFloat(getComputedStyle(superscript).fontSize)).toBeLessThan(
      Number.parseFloat(getComputedStyle(tiebreak).fontSize)
    );

    await expect(inFrame(canvasElement, 'game-only').querySelector('span')).toBeNull();

    const wrapper = inFrame(canvasElement, 'two-sets');
    await expect(wrapper.classList.contains('sideScore')).toBe(true);
    await expect(wrapper.classList.contains('tmx-scr')).toBe(true);
    const sets = Array.from(wrapper.querySelectorAll<HTMLElement>('.tmx-st'));
    await expect(sets.map((set) => set.firstChild?.textContent)).toEqual(['6', '3']);
    await expect(sets[0].getBoundingClientRect().right).toBeLessThanOrEqual(sets[1].getBoundingClientRect().left + 1);
  }
};

export const StripesPaint: StoryObj = {
  render: () => {
    const chevron: Composition = { theme: 'test', configuration: { winnerChevron: true } };
    const sets = [makeSet(), makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })];
    const probe = document.createElement('div');
    probe.style.background = 'var(--chc-bg-secondary)';
    probe.textContent = 'probe';
    return frames([
      ['striped', renderSideScore({ matchUp: makeMatchUp(sets), sideNumber: 1, composition: chevron })],
      ['plain', renderSideScore({ matchUp: makeMatchUp(sets), sideNumber: 1 })],
      ['probe', probe]
    ]);
  },
  play: async ({ canvasElement }) => {
    const token = getComputedStyle(inFrame(canvasElement, 'probe')).backgroundColor;
    // CONTROL — the token resolves to a paint here, so the comparison below is not transparent == transparent
    await expect(token).not.toBe(TRANSPARENT);

    const [odd, even] = Array.from(inFrame(canvasElement, 'striped').querySelectorAll<HTMLElement>('.tmx-st'));
    await expect(getComputedStyle(odd).backgroundColor).toBe(token);
    await expect(getComputedStyle(even).backgroundColor).toBe(TRANSPARENT);

    for (const set of Array.from(inFrame(canvasElement, 'plain').querySelectorAll<HTMLElement>('.tmx-st'))) {
      await expect(getComputedStyle(set).backgroundColor).toBe(TRANSPARENT);
    }
  }
};

const scoreClick = fn();
const parentClick = fn();

export const ScoreClick: StoryObj = {
  render: () => {
    const el = renderSideScore({ matchUp: makeMatchUp([makeSet()]), sideNumber: 1, eventHandlers: { scoreClick } });
    const outer = frames([['score', el]]);
    outer.onclick = parentClick;
    return outer;
  },
  play: async ({ canvasElement }) => {
    scoreClick.mockClear();
    parentClick.mockClear();
    const el = inFrame(canvasElement, 'score');
    await user.click(el);
    await expect(scoreClick).toHaveBeenCalledTimes(1);
    await expect(scoreClick.mock.calls[0][0].matchUp.matchUpId).toBe('mu-1');
    // the score keeps its click: the card around it does not also open
    await expect(parentClick).not.toHaveBeenCalled();
  }
};

export const PointScorePlacement: StoryObj = {
  render: () => {
    const points = (position: 'leading' | 'trailing', p1: string) =>
      renderSideScore({
        matchUp: makeMatchUp([
          { setNumber: 1, side1Score: 4, side2Score: 5, side1PointScore: p1, side2PointScore: '0' }
        ]),
        sideNumber: 1,
        composition: { theme: 'test', configuration: { gameScore: { position } } }
      });
    return frames([
      ['leading', points('leading', '15')],
      ['trailing', points('trailing', '30')]
    ]);
  },
  play: async ({ canvasElement }) => {
    for (const [testid, text, pointFirst] of [
      ['leading', '15', true],
      ['trailing', '30', false]
    ] as const) {
      const wrapper = inFrame(canvasElement, testid);
      const point = wrapper.querySelector<HTMLElement>('.chc-point-score')!;
      const set = wrapper.querySelector<HTMLElement>('.tmx-st')!;
      await expect(point).toBeVisible();
      await expect(point.textContent).toBe(text);
      const pointLeft = point.getBoundingClientRect().left;
      const setLeft = set.getBoundingClientRect().left;
      await expect(pointLeft < setLeft, testid).toBe(pointFirst);
    }
  }
};

export const HeightAndResultsInfo: StoryObj = {
  render: () => {
    const sets = [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 })];
    const resultsInfo: Composition = { theme: 'test', configuration: { resultsInfo: true } };
    return frames([
      ['height-2', renderSideScore({ matchUp: makeMatchUp([makeSet()]), sideNumber: 2, participantHeight: 40 })],
      ['height-1', renderSideScore({ matchUp: makeMatchUp([makeSet()]), sideNumber: 1, participantHeight: 40 })],
      ['results-1', renderSideScore({ matchUp: makeMatchUp(sets), sideNumber: 1, composition: resultsInfo })],
      ['results-2', renderSideScore({ matchUp: makeMatchUp(sets), sideNumber: 2, composition: resultsInfo })]
    ]);
  },
  play: async ({ canvasElement }) => {
    // side 1 is one pixel shorter, for the border between the sides
    await expect(getComputedStyle(inFrame(canvasElement, 'height-2')).height).toBe('40px');
    await expect(getComputedStyle(inFrame(canvasElement, 'height-1')).height).toBe('39px');

    // side 1 labels each set column with its number, under the score; side 2 carries no labels
    const results = inFrame(canvasElement, 'results-1');
    const sets = Array.from(results.querySelectorAll<HTMLElement>('.tmx-st'));
    const labels = sets.map((set) => set.nextElementSibling as HTMLElement);
    await expect(labels.map((label) => label?.textContent)).toEqual(['1', '2']);
    for (const label of labels) await expect(label).toBeVisible();
    await expect(inFrame(canvasElement, 'results-2').querySelectorAll('.tmx-st + div')).toHaveLength(0);
  }
};
