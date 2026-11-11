/**
 * MatchUp — `renderMatchUp` play-function tests: the rendered card.
 *
 * Moved from an emulated-DOM unit test. The pure rules behind the card are node tests: the footer label
 * (`matchUpFooterLabel`), the connector of a lucky / ad hoc matchUp (`connectorVariant`) and which side shows
 * which status pill (`sideStatusPill`). What is here needs the browser: the card's identity and classes, a real
 * click reaching `matchUpClick`, what is on screen and in which order.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Composition, MatchUp } from '../types';
import { expect, fn, within } from 'storybook/test';
import { user } from './helpers/trustedUser';

const meta: Meta = {
  title: 'Draws/MatchUps/MatchUp/Tests/Render MatchUp',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const TEST_THEME = 'test-theme';
const FOOTER_SELECTOR = '.chc-matchup-footer';
const SIDE_SELECTOR = '.chc-side-container';
const ALICE = 'Alice Smith';
const WITH_POSITION = 'with-position';

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 3,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: ALICE } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Bob Jones' } }
    ],
    score: {
      scoreStringSide1: '6-4 3-2',
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 2 }
      ]
    },
    ...overrides
  } as MatchUp;
}

/** Each case is rendered into its own labelled block, so a play reads one card by its test id. */
type Case = { id: string; render: () => HTMLElement };

function host(cases: Case[]): HTMLElement {
  const outer = document.createElement('div');
  outer.style.cssText = 'display:flex; flex-direction:column; gap:16px; padding:12px; width:360px;';
  for (const { id, render } of cases) {
    const block = document.createElement('div');
    block.dataset.testid = id;
    block.className = 'chc-container';
    block.style.cssText = 'height:auto; overflow:visible;';
    block.appendChild(render());
    outer.appendChild(block);
  }
  return outer;
}

const card = (canvasElement: HTMLElement, id: string) =>
  within(canvasElement).getByTestId(id).querySelector<HTMLElement>('.tmx-m')!;

const pillSides = (matchUpEl: HTMLElement) =>
  Array.from(matchUpEl.querySelectorAll(SIDE_SELECTOR))
    .filter((side) => side.querySelector('.chc-pill'))
    .map((side) => Number(side.getAttribute('sidenumber')));

const matchUpClick = fn();

export const CardIdentityAndClick: StoryObj = {
  render: () =>
    host([
      {
        id: 'themed',
        render: () =>
          renderMatchUp({
            matchUp: makeMatchUp(),
            composition: compositions.Australian,
            className: 'my-custom',
            eventHandlers: { matchUpClick }
          })
      }
    ]),
  play: async ({ canvasElement }) => {
    matchUpClick.mockClear();
    const el = card(canvasElement, 'themed');

    await expect(el.id).toBe('mu-1');
    for (const className of ['matchup', 'tmx-m', 'my-custom', compositions.Australian.theme as string]) {
      await expect(el.classList.contains(className)).toBe(true);
    }

    // two sides, both on screen, side 1 above side 2
    const sides = Array.from(el.querySelectorAll<HTMLElement>('.tmx-sd'));
    await expect(sides).toHaveLength(2);
    for (const side of sides) await expect(side).toBeVisible();
    await expect(sides[0].getBoundingClientRect().top).toBeLessThan(sides[1].getBoundingClientRect().top);
    await expect(el).toHaveTextContent(ALICE);
    await expect(el).toHaveTextContent('Bob Jones');

    // a real click on the card reaches matchUpClick with this matchUp
    await user.click(el);
    await expect(matchUpClick).toHaveBeenCalledTimes(1);
    await expect(matchUpClick.mock.calls[0][0].matchUp.matchUpId).toBe('mu-1');
    await expect(matchUpClick.mock.calls[0][0].pointerEvent.isTrusted).toBe(true);
  }
};

const footer = (matchUpFooter: boolean): Composition => ({ theme: TEST_THEME, configuration: { matchUpFooter } });

export const Footer: StoryObj = {
  render: () =>
    host([
      {
        id: WITH_POSITION,
        render: () =>
          renderMatchUp({
            matchUp: makeMatchUp({ roundName: 'Quarterfinals', roundPosition: 2 }),
            composition: footer(true)
          })
      },
      {
        id: 'no-position',
        render: () =>
          renderMatchUp({
            matchUp: makeMatchUp({ roundName: 'Final', roundPosition: undefined }),
            composition: footer(true)
          })
      },
      { id: 'off', render: () => renderMatchUp({ matchUp: makeMatchUp(), composition: footer(false) }) }
    ]),
  play: async ({ canvasElement }) => {
    const withPosition = card(canvasElement, WITH_POSITION).querySelector<HTMLElement>(FOOTER_SELECTOR)!;
    await expect(withPosition).toBeVisible();
    await expect(withPosition).toHaveTextContent('Quarterfinals • Match 2');
    // under the sides, not beside them
    const lastSide = Array.from(card(canvasElement, WITH_POSITION).querySelectorAll('.tmx-sd')).at(-1)!;
    await expect(withPosition.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      lastSide.getBoundingClientRect().bottom - 1
    );

    const noPosition = card(canvasElement, 'no-position').querySelector<HTMLElement>(FOOTER_SELECTOR)!;
    await expect(noPosition.textContent).toBe('Final');

    await expect(card(canvasElement, 'off').querySelector(FOOTER_SELECTOR)).toBeNull();
  }
};

export const SelectedState: StoryObj = {
  render: () =>
    host([
      {
        id: 'selected',
        render: () => renderMatchUp({ matchUp: makeMatchUp({ matchUpId: 'mu-sel' }), selectedMatchUpId: 'mu-sel' })
      },
      {
        id: 'not-selected',
        render: () => renderMatchUp({ matchUp: makeMatchUp({ matchUpId: 'mu-1' }), selectedMatchUpId: 'mu-other' })
      }
    ]),
  play: async ({ canvasElement }) => {
    const selected = card(canvasElement, 'selected');
    const indicator = selected.querySelectorAll(':scope > .chc-selected-matchup');
    await expect(indicator).toHaveLength(1);
    // the indicator is the card's last child, after the card body
    await expect(selected.lastElementChild).toBe(indicator[0]);

    await expect(card(canvasElement, 'not-selected').querySelector('.chc-selected-matchup')).toBeNull();
  }
};

export const CenterInfo: StoryObj = {
  render: () =>
    host([
      {
        id: 'center-info',
        render: () =>
          renderMatchUp({
            matchUp: makeMatchUp({
              sides: [
                {
                  sideNumber: 1,
                  participant: { participantId: 'p1', participantName: ALICE, entryStatus: 'WILDCARD' }
                },
                { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Bob Jones' } }
              ]
            } as Partial<MatchUp>),
            composition: { theme: TEST_THEME, configuration: { centerInfo: true } }
          })
      },
      { id: 'no-center-info', render: () => renderMatchUp({ matchUp: makeMatchUp() }) }
    ]),
  play: async ({ canvasElement }) => {
    const el = card(canvasElement, 'center-info');
    // side 1, its entry status, side 2's, then side 2: the info sits BETWEEN the sides
    const body = el.firstElementChild!;
    const order = Array.from(body.children)
      .filter((child) => child.matches('.tmx-sd, .tmx-ci'))
      .map((child) => `${child.classList.contains('tmx-ci') ? 'ci' : 'sd'}${child.getAttribute('sidenumber')}`);
    await expect(order).toEqual(['sd1', 'ci1', 'ci2', 'sd2']);

    const [info1, info2] = Array.from(el.querySelectorAll<HTMLElement>('.tmx-ci'));
    // `renderCenterInfo` joins the label and the status with a non-breaking space
    await expect(info1.textContent).toBe('Entry status:\u00a0WILDCARD');
    await expect(info1).toBeVisible();
    // side 2 has no entry status, so its info is empty
    await expect(info2.textContent).toBe('');

    await expect(card(canvasElement, 'no-center-info').querySelector('.tmx-ci')).toBeNull();
  }
};

export const SparseRecords: StoryObj = {
  render: () =>
    host([
      {
        id: 'no-score',
        render: () =>
          renderMatchUp({ matchUp: makeMatchUp({ score: undefined }), composition: compositions.Australian })
      },
      { id: 'no-sides', render: () => renderMatchUp({ matchUp: makeMatchUp({ sides: undefined }) }) }
    ]),
  play: async ({ canvasElement }) => {
    const noScore = card(canvasElement, 'no-score');
    await expect(noScore.id).toBe('mu-1');
    await expect(noScore).toHaveTextContent(ALICE);
    await expect(noScore.querySelector('.tmx-st')).toBeNull();

    // a matchUp nobody has reached yet: still a card, with both sides to be decided
    const noSides = card(canvasElement, 'no-sides');
    await expect(noSides.id).toBe('mu-1');
    const names = Array.from(noSides.querySelectorAll('.tmx-sd'), (side) =>
      side.querySelector('.chc-participant-name')?.textContent?.trim()
    );
    await expect(names).toEqual(['TBD', 'TBD']);
    await expect(noSides).toBeVisible();
  }
};

export const LuckyAndAdHocAreRecorded: StoryObj = {
  render: () =>
    host([
      {
        id: 'lucky',
        render: () => renderMatchUp({ matchUp: makeMatchUp(), isLucky: true, composition: compositions.Australian })
      },
      { id: 'ad-hoc', render: () => renderMatchUp({ matchUp: makeMatchUp(), isAdHoc: true }) },
      { id: 'plain', render: () => renderMatchUp({ matchUp: makeMatchUp() }) }
    ]),
  play: async ({ canvasElement }) => {
    // recorded on the card so renderMatchUpInPlace re-renders it as the structure did; the connector itself
    // (`mr`, none) belongs to the cell around the card and is `connectorVariant`'s node test
    await expect(card(canvasElement, 'lucky').dataset.lucky).toBe('true');
    await expect(card(canvasElement, 'ad-hoc').dataset.adHoc).toBe('true');
    await expect(card(canvasElement, 'plain').dataset.lucky).toBeUndefined();
    await expect(card(canvasElement, 'plain').dataset.adHoc).toBeUndefined();
  }
};

const exitBase = (overrides: Partial<MatchUp>) =>
  makeMatchUp({
    roundNumber: 3,
    finishingRound: 1,
    sides: [{ sideNumber: 1 }, { sideNumber: 2 }],
    score: { scoreStringSide1: '', scoreStringSide2: '' },
    ...overrides
  } as Partial<MatchUp>);

export const ExitPillOnTheExitingSide: StoryObj = {
  render: () =>
    host([
      {
        // the exact record TMX reported: side 1 exited, side 2 is a reserved slot
        id: 'tmx-record',
        render: () =>
          renderMatchUp({
            matchUp: exitBase({
              matchUpStatus: 'WALKOVER',
              matchUpStatusCodes: [
                { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 1 },
                { sideNumber: 2 }
              ]
            } as Partial<MatchUp>)
          })
      },
      {
        id: 'match-level',
        render: () =>
          renderMatchUp({
            matchUp: makeMatchUp({ matchUpStatus: 'DEAD_RUBBER', score: undefined })
          })
      }
    ]),
  play: async ({ canvasElement }) => {
    const exit = card(canvasElement, 'tmx-record');
    await expect(pillSides(exit)).toEqual([1]);
    const pill = exit.querySelector<HTMLElement>('.chc-pill')!;
    await expect(pill).toBeVisible();
    await expect(pill).toHaveTextContent('WO');

    // a match-level status belongs on both sides
    const matchLevel = card(canvasElement, 'match-level');
    await expect(pillSides(matchLevel)).toEqual([1, 2]);
    for (const shown of Array.from(matchLevel.querySelectorAll<HTMLElement>('.chc-pill'))) {
      await expect(shown).toBeVisible();
      await expect(shown).toHaveTextContent('DR');
    }
  }
};
