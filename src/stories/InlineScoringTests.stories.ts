/**
 * `renderInlineMatchUp` in Chromium: what it renders, what a click on it scores, and the end-match popover
 * its status pills open.
 *
 * Moved from the retired happy-dom `renderInlineMatchUp.test.ts` and `endMatchPopoverListener.test.ts`.
 * Which matchUps are offered at all is a node test of `inlineScoringRefusal`
 * (`inline-scoring/__tests__/inlineScoringOffer.test.ts`); the popover's listener timing is a node test of
 * `helpers/outsideClick.ts`. What stays here is what needs a page: clicks routed to the score, the footer's
 * state, the popover's lifecycle, and which outside clicks close it.
 */
import { InlineScoringManager } from '../components/inline-scoring/inlineScoringManager';
import { renderInlineMatchUp } from '../components/inline-scoring/renderInlineMatchUp';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { compositions } from '../compositions/compositions';
import { user } from './helpers/trustedUser';

import type { Composition, MatchUp } from '../types';
import type { StoryObj } from '@storybook/html-vite';

export default {
  title: 'Scoring/Inline Scoring/Tests/Render and End Match',
  tags: ['!dev']
};

const STANDARD_FORMAT = 'SET3-S:6/TB7';
const WRAPPER = '.chc-inline-scoring-wrapper';
const FOOTER = '.chc-inline-scoring-footer-slot';
const CLICKABLE = '.chc-inline-scoring-clickable';
const LIVE_CHIP = '.chc-live-chip';
const POPOVER = '.chc-live-chip-popover';
const POPOVER_ITEM = '.chc-live-chip-popover-item';
const OUTSIDE = '[data-testid="outside"]';
const SITUATION = '.chc-inline-scoring-situation';

function makeComposition(
  mode: 'points' | 'games' = 'points',
  showFooter = true,
  /** `'absent'` leaves the setting out (an `undefined` argument would take the default instead). */
  showSituation: boolean | 'absent' = true
): Composition {
  const base = compositions.Australian;
  const inlineScoring = showSituation === 'absent' ? { mode, showFooter } : { mode, showFooter, showSituation };
  return {
    ...base,
    configuration: {
      ...base.configuration,
      matchUpFooter: true,
      gameScore: { position: 'trailing', inverted: true },
      inlineScoring
    }
  };
}

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    matchUpStatus: 'IN_PROGRESS',
    matchUpFormat: STANDARD_FORMAT,
    readyToScore: true,
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 3,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
    ],
    ...overrides
  } as MatchUp;
}

type Mounted = { canvas: HTMLElement; manager: InlineScoringManager; callbacks: Record<string, any> };

/** Renders one inline-scored matchUp plus a plain button outside it, for outside clicks. */
function mount(
  canvasElement: HTMLElement,
  { matchUp = makeMatchUp(), composition = makeComposition() }: { matchUp?: MatchUp; composition?: Composition } = {}
): Mounted {
  closePopovers();
  canvasElement.replaceChildren();
  const callbacks = { onScoreChange: fn(), onEndMatch: fn(), onSubmit: fn() };
  const manager = new InlineScoringManager(callbacks as any);
  const holder = document.createElement('div');
  holder.style.cssText = 'max-width: 500px; padding: 120px 16px;';
  const rendered = renderInlineMatchUp({
    matchUp,
    composition,
    manager,
    matchUpFormat: STANDARD_FORMAT,
    isLucky: true
  });
  if (!rendered) throw new Error('the fixture was refused');
  holder.append(rendered);
  const outside = document.createElement('button');
  outside.dataset.testid = 'outside';
  outside.textContent = 'elsewhere on the page';
  canvasElement.append(holder, outside);
  return { canvas: canvasElement, manager, callbacks };
}

function closePopovers(): void {
  document.querySelectorAll(POPOVER).forEach((popover) => popover.remove());
}

const wrapper = (canvas: HTMLElement) => canvas.querySelector<HTMLElement>(WRAPPER)!;
const footerButton = (canvas: HTMLElement, name: string) =>
  within(wrapper(canvas)).getByRole('button', { name }) as HTMLButtonElement;
const popovers = () => [...document.querySelectorAll<HTMLElement>(POPOVER)];
const popoverItem = (text: string) =>
  [...document.querySelectorAll<HTMLElement>(POPOVER_ITEM)].find((item) => item.textContent === text);
const sideChips = (canvas: HTMLElement) => [...wrapper(canvas).querySelectorAll<HTMLElement>(LIVE_CHIP)];
const side = (canvas: HTMLElement, sideNumber: number) =>
  wrapper(canvas).querySelector<HTMLElement>(`.chc-side-container[sidenumber="${sideNumber}"]`)!;
/** The side's set-score cell (`games` mode scores a game on it) and its point cell (always a point). */
const gameCell = (canvas: HTMLElement, sideNumber: number) =>
  side(canvas, sideNumber).querySelector<HTMLElement>(`.chc-game-score${CLICKABLE}`)!;
const pointCell = (canvas: HTMLElement, sideNumber: number) =>
  side(canvas, sideNumber).querySelector<HTMLElement>(`.chc-point-score${CLICKABLE}`)!;

const empty = () => document.createElement('div');

export const RendersTheScoringWrapper: StoryObj = {
  name: 'Renders a wrapper carrying the matchUp id, active, with an engine for it',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas, manager } = mount(canvasElement, { matchUp: makeMatchUp({ matchUpId: 'test-id' }) });
    const el = wrapper(canvas);
    await expect(el).toBeVisible();
    await expect(el.checkVisibility()).toBe(true);
    await expect(el.dataset.matchupId).toBe('test-id');
    await expect(el.classList.contains('chc-inline-scoring-active')).toBe(true);
    await expect(manager.has('test-id'), 'the engine is created on render').toBe(true);
  }
};

export const FooterButtons: StoryObj = {
  name: 'The footer shows Undo, Redo, Clear and Submit, all disabled until something is scored',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement);
    const footer = wrapper(canvas).querySelector<HTMLElement>(FOOTER)!;
    await expect(footer).toBeVisible();
    await expect(footer.checkVisibility()).toBe(true);
    const labels = [...footer.querySelectorAll('.chc-inline-scoring-btn')].map((button) => button.textContent);
    await expect(labels).toEqual(['Undo', 'Redo', 'Clear', 'Submit']);
    for (const name of labels) await expect(footerButton(canvas, name!)).toBeDisabled();
  }
};

export const NoFooterWhenHidden: StoryObj = {
  name: 'No inline footer when showFooter is false',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement, { composition: makeComposition('points', false) });
    await expect(wrapper(canvas)).toBeVisible();
    await expect(wrapper(canvas).querySelector(FOOTER)).toBeNull();
    await expect(within(wrapper(canvas)).queryByRole('button', { name: 'Submit' })).toBeNull();
  }
};

export const PointsModeClickScoresAPoint: StoryObj = {
  name: 'Points mode: a click on side 1’s score awards it a point, and the footer wakes',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas, manager, callbacks } = mount(canvasElement, { composition: makeComposition('points') });
    // Before any point there is no point cell: in points mode the set score itself takes the point.
    for (const sideNumber of [1, 2]) {
      await expect(gameCell(canvas, sideNumber), `side ${sideNumber}'s score is clickable`).toBeVisible();
    }

    await user.click(gameCell(canvas, 1));

    await expect(callbacks.onScoreChange).toHaveBeenCalledTimes(1);
    const set = manager.getMatchUp('mu-1', makeMatchUp()).score?.sets?.at(-1) as any;
    await expect(set.side1PointScore, 'side 1 won the point').toBe('15');
    await expect(footerButton(canvas, 'Undo')).toBeEnabled();
    await expect(footerButton(canvas, 'Clear')).toBeEnabled();
    await expect(footerButton(canvas, 'Submit')).toBeEnabled();
    await expect(footerButton(canvas, 'Redo')).toBeDisabled();
    await expect(pointCell(canvas, 1).textContent, 'and the page shows it').toBe('15');

    await user.click(footerButton(canvas, 'Undo'));
    await expect(footerButton(canvas, 'Undo'), 'undone back to nothing scored').toBeDisabled();
    await expect(pointCell(canvas, 1).textContent).toBe('0');
    await expect(footerButton(canvas, 'Redo')).toBeEnabled();
  }
};

export const GamesModeClickScoresAGame: StoryObj = {
  name: 'Games mode: a click on side 2’s score awards it a game',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas, manager } = mount(canvasElement, { composition: makeComposition('games') });
    await expect(gameCell(canvas, 2)).toBeVisible();

    await user.click(gameCell(canvas, 2));

    const set = manager.getMatchUp('mu-1', makeMatchUp()).score?.sets?.at(-1) as any;
    await expect([set.side1Score, set.side2Score]).toEqual([0, 1]);
    await expect(footerButton(canvas, 'Submit')).toBeEnabled();
  }
};

export const SubmitReportsTheMatchUp: StoryObj = {
  name: 'Submit hands the scored matchUp to onSubmit and goes quiet again',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas, callbacks } = mount(canvasElement, { composition: makeComposition('games') });
    await user.click(gameCell(canvas, 1));
    await user.click(footerButton(canvas, 'Submit'));

    await expect(callbacks.onSubmit).toHaveBeenCalledTimes(1);
    const { matchUpId, matchUp } = callbacks.onSubmit.mock.calls[0][0];
    await expect(matchUpId).toBe('mu-1');
    await expect(matchUp.score.sets[0].side1Score).toBe(1);
    await expect(footerButton(canvas, 'Submit'), 'nothing new to submit').toBeDisabled();
  }
};

export const ResumedMatchUpUndoStopsAtTheStoredScore: StoryObj = {
  name: 'A resumed matchUp: Undo starts disabled, and undoes a new game back to the stored score',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement, {
      matchUp: makeMatchUp({
        score: {
          sets: [
            { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
            { setNumber: 2, side1Score: 3, side2Score: 2 }
          ]
        }
      } as any),
      composition: makeComposition('games')
    });
    const setTwo = (sideNumber: number) =>
      side(canvas, sideNumber).querySelector<HTMLElement>('.chc-game-score[setnumber="2"]')!;
    const shown = () => [setTwo(1).textContent, setTwo(2).textContent];

    await expect(shown(), 'control: the stored score is on the page').toEqual(['3', '2']);
    await expect(footerButton(canvas, 'Undo'), 'nothing this session did to undo').toBeDisabled();

    await user.click(setTwo(2));
    await expect(shown()).toEqual(['3', '3']);
    await expect(footerButton(canvas, 'Undo')).toBeEnabled();

    await user.click(footerButton(canvas, 'Undo'));
    await expect(shown(), 'back to the stored score, not 0-0').toEqual(['3', '2']);
    await expect(footerButton(canvas, 'Undo')).toBeDisabled();
    await expect(footerButton(canvas, 'Redo')).toBeEnabled();
  }
};

// ── Situation flags (`inlineScoring.showSituation`) ──

/** Plays `count` points to `sideNumber` with real clicks on its score, waiting for each re-render. */
async function playPoints(canvas: HTMLElement, sideNumber: number, count: number): Promise<void> {
  for (let point = 0; point < count; point += 1) {
    // before the first point the set score takes it; after, the point cell does
    const target = pointCell(canvas, sideNumber) ?? gameCell(canvas, sideNumber);
    await user.click(target);
  }
}

export const SituationFlagsFollowThePlay: StoryObj = {
  name: 'showSituation: 0-40 on side 1’s serve shows BREAK in the footer; the next point clears it',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement, { composition: makeComposition('points') });
    const flags = () => wrapper(canvas).querySelector<HTMLElement>(SITUATION);

    // Nothing to flag before a point is played, nor at 0-15 / 0-30.
    await expect(flags()).toBeNull();
    await playPoints(canvas, 2, 2);
    await expect(flags()).toBeNull();

    // SET3-S:6/TB7, side 1 serving the first game: 0-40 is a break point for side 2.
    await playPoints(canvas, 2, 1);
    await expect(flags(), 'the footer carries the flags').not.toBeNull();
    const shown = flags()!;
    await expect(shown.textContent).toBe('Break');
    await expect(shown).toBeVisible();
    await expect(shown.checkVisibility()).toBe(true);
    await expect(getComputedStyle(shown).textTransform).toBe('uppercase');
    await expect(wrapper(canvas).querySelector(FOOTER)!.contains(shown), 'in the inline footer').toBe(true);
    // it sits beside the buttons, not over them
    const undo = footerButton(canvas, 'Undo').getBoundingClientRect();
    await expect(shown.getBoundingClientRect().right).toBeLessThanOrEqual(undo.left + 1);

    // Side 2 converts: 0-1, 0-0 in the next game, nothing to flag.
    await playPoints(canvas, 2, 1);
    await expect(flags()).toBeNull();

    // Undo brings the break point back: the flags follow every score change.
    await user.click(footerButton(canvas, 'Undo'));
    await waitFor(() => expect(flags()?.textContent).toBe('Break'));
  }
};

export const SituationFlagsOffShowNothing: StoryObj = {
  name: 'showSituation false, or absent: the same break point shows no flags',
  render: empty,
  play: async ({ canvasElement }) => {
    for (const showSituation of [false, 'absent'] as const) {
      const { canvas, manager } = mount(canvasElement, { composition: makeComposition('points', true, showSituation) });
      await playPoints(canvas, 2, 3);
      // CONTROL: the engine does see a break point, so the absence below is earned
      await expect(manager.getSituation('mu-1')?.isBreakPoint, `showSituation ${showSituation}`).toBe(true);
      await expect(wrapper(canvas).querySelector(FOOTER)).toBeVisible();
      await expect(wrapper(canvas).querySelector(SITUATION), `showSituation ${showSituation}`).toBeNull();
    }
  }
};

export const RetiredShowsAPillOnTheLosingSide: StoryObj = {
  name: 'A retirement shows a clickable RET pill on the side that retired only',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement, {
      matchUp: makeMatchUp({
        matchUpStatus: 'RETIRED',
        winningSide: 2,
        readyToScore: false,
        score: { sets: [{ setNumber: 1, side1Score: 2, side2Score: 1 }] }
      } as any),
      composition: makeComposition('games')
    });
    const chips = sideChips(canvas);
    await expect(chips.map((chip) => chip.textContent)).toEqual(['RET']);
    await expect(chips[0]).toBeVisible();
    await expect(side(canvas, 1).contains(chips[0]), 'on side 1, which retired').toBe(true);

    await user.click(chips[0]);
    await expect(popovers(), 'the RET pill opens the popover').toHaveLength(1);
    await expect(popoverItem('LIVE'), 'which offers to resume scoring').toBeDefined();
    await user.click(canvas.querySelector<HTMLElement>(OUTSIDE)!);
    await expect(popovers()).toHaveLength(0);
  }
};

export const RefusesAMatchUpWithoutAFormat: StoryObj = {
  name: 'Renders nothing, and says why, for a matchUp with no format',
  render: empty,
  play: async () => {
    const error = spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const rendered = renderInlineMatchUp({
        matchUp: makeMatchUp({ matchUpFormat: undefined }),
        composition: makeComposition(),
        manager: new InlineScoringManager()
      });
      await expect(rendered).toBeNull();
      await expect(error).toHaveBeenCalledTimes(1);
      await expect(String(error.mock.calls[0][0])).toContain('mu-1');
    } finally {
      error.mockRestore();
    }
  }
};

// ── The end-match popover ──

/** The bubbling click listeners added to the document while `run` goes, and not yet removed. */
async function stillListening(run: () => Promise<void>): Promise<number> {
  const add = spyOn(document, 'addEventListener');
  const remove = spyOn(document, 'removeEventListener');
  try {
    await run();
    // past the popover's deferred attach, so a listener still pending would be counted
    await new Promise((resolve) => setTimeout(resolve, 50));
    const bubblingClicks = (calls: unknown[][]) =>
      calls.filter(([type, , options]) => type === 'click' && !options).map(([, listener]) => listener);
    const removed = new Set(bubblingClicks(remove.mock.calls));
    return bubblingClicks(add.mock.calls).filter((listener) => !removed.has(listener)).length;
  } finally {
    add.mockRestore();
    remove.mockRestore();
  }
}

export const OutsideClickClosesThePopover: StoryObj = {
  name: 'The LIVE pill opens the end-match popover; a click elsewhere closes it and stops listening',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement, { composition: makeComposition('games') });
    const live = sideChips(canvas);
    await expect(
      live.map((chip) => chip.textContent),
      'a LIVE pill on each side'
    ).toEqual(['LIVE', 'LIVE']);

    let attached = await stillListening(async () => {
      await user.click(live[0]);
      await expect(popovers()[0], 'the opening click does not close it').toBeVisible();
      await expect(popovers()[0].checkVisibility()).toBe(true);
    });
    await expect(attached, 'control: an open popover listens').toBe(1);

    // A click inside the popover's own frame is not an outside click.
    await user.clickAt(popovers()[0], { x: 2, y: 2 });
    await expect(popovers()).toHaveLength(1);
    await user.click(canvas.querySelector<HTMLElement>(OUTSIDE)!);
    await waitFor(() => expect(popovers()).toHaveLength(0));

    // Open and close again inside one window: the listener it added is removed.
    attached = await stillListening(async () => {
      await user.click(sideChips(canvas)[0]);
      await expect(popovers()).toHaveLength(1);
      await user.click(canvas.querySelector<HTMLElement>(OUTSIDE)!);
      await waitFor(() => expect(popovers()).toHaveLength(0));
    });
    await expect(attached, 'closed by the outside click, and no longer listening').toBe(0);
  }
};

export const ChoosingAStatusClosesAndRecords: StoryObj = {
  name: 'Choosing RET for side 1 closes the popover, records side 2 as winner, and leaves no listener',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas, callbacks } = mount(canvasElement, { composition: makeComposition('games') });

    const attached = await stillListening(async () => {
      await user.click(sideChips(canvas)[0]);
      await user.click(popoverItem('RET')!);
    });
    await expect(popovers()).toHaveLength(0);
    await expect(attached, 'the chosen popover stopped listening').toBe(0);

    await expect(callbacks.onEndMatch).toHaveBeenCalledTimes(1);
    await expect(callbacks.onEndMatch.mock.calls[0][0]).toMatchObject({
      matchUpId: 'mu-1',
      matchUpStatus: 'RETIRED',
      winningSide: 2,
      sideNumber: 1
    });
    await expect(
      sideChips(canvas).map((chip) => chip.textContent),
      'side 1 now shows RET'
    ).toEqual(['RET']);

    // A later click elsewhere changes nothing: no stale listener from the closed popover acts on it.
    await user.click(canvas.querySelector<HTMLElement>(OUTSIDE)!);
    await expect(sideChips(canvas).map((chip) => chip.textContent)).toEqual(['RET']);

    // Reopened from the RET pill and resumed: scoring is live again on both sides.
    await user.click(sideChips(canvas)[0]);
    await user.click(popoverItem('LIVE')!);
    await expect(popovers()).toHaveLength(0);
    await expect(sideChips(canvas).map((chip) => chip.textContent)).toEqual(['LIVE', 'LIVE']);
  }
};

export const OpeningAgainReplacesTheFirst: StoryObj = {
  name: 'Opening the popover again replaces it; one outside click then closes it and its listener',
  render: empty,
  play: async ({ canvasElement }) => {
    const { canvas } = mount(canvasElement, { composition: makeComposition('games') });

    // Side 1's popover opens below its pill and covers side 2's, so the pill a user can press again is
    // side 1's own. Its click stops propagation, so the open popover never hears it as an outside click.
    await user.click(sideChips(canvas)[0]);
    const first = popovers()[0];
    let attached = await stillListening(async () => {
      await user.click(sideChips(canvas)[0]);
    });
    await expect(popovers(), 'one popover, not two').toHaveLength(1);
    await expect(popovers()[0], 'a new one').not.toBe(first);
    await expect(first.isConnected).toBe(false);
    await expect(attached, 'the new popover listens').toBe(1);
    await user.click(canvas.querySelector<HTMLElement>(OUTSIDE)!);
    await expect(popovers()).toHaveLength(0);

    attached = await stillListening(async () => {
      await user.click(sideChips(canvas)[0]);
      await user.click(sideChips(canvas)[0]);
      await user.click(canvas.querySelector<HTMLElement>(OUTSIDE)!);
    });
    await expect(popovers()).toHaveLength(0);
    await expect(attached, 'both listeners went with their popovers').toBe(0);
  }
};
