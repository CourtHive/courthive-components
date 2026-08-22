/**
 * Schedule Page — MatchUp Card play-function tests.
 *
 * Covers the two priority-hint signals on the catalog cards that landed
 * in commit `60ef41d` ("feat(catalog): round-emphasis tiers + non-MAIN
 * stage chip on cards"), the `prominentTime` option used by the
 * Scheduled-tab panel in the TMX schedule grid sidebar, and the
 * `renderExtra` hook consumers use to hang their own badge off a card.
 *
 * `renderExtra` has to be a render hook rather than something the consumer
 * appends from outside, for the same reason the Inspector's does: the catalog
 * rebuilds its cards from scratch on every state change, so an externally
 * appended node would be wiped rather than reused. It is also the only seam
 * available to a consumer, since `MatchUpCardOptions` is otherwise internal.
 *
 * The pure data path (`computeBaseRoundByEvent` → `roundOffset`
 * computation) is covered by 7 unit cases in
 * `matchUpCatalogProjections.test.ts`. These play functions are the
 * rendering-side counterpart: given a `roundOffset` (or a `stage`, or
 * the `prominentTime` flag), does `buildMatchUpCard` paint the right
 * classes / nodes onto the DOM tree?
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` (one terminal) +
 *                    `pnpm test-storybook` (other)
 */

import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import type { CatalogMatchUpItem } from '../../components/schedule-page';
import { buildMatchUpCard } from '../../components/schedule-page/ui/matchUpCard';

const meta: Meta = {
  title: 'Schedule Page/Tests/MatchUpCard'
};
export default meta;

// ── Selectors / class names referenced across the suite ──

const TITLE_SELECTOR = '[class^="spl-card-title"], [class*=" spl-card-title"]';
const STAGE_CHIP_SELECTOR = '.spl-card-chip.stage';
const TIME_HEADER_SELECTOR = '.spl-card-time-header';
const CLASS_ROUND_CURRENT = 'spl-card-title--round-current';
const CLASS_ROUND_NEXT = 'spl-card-title--round-next';
const CLASS_ROUND_LATER = 'spl-card-title--round-later';
const EXTRA_HOLDER_SELECTOR = '.spl-card-extra';
const EXTRA_MARKER_SELECTOR = '[data-test="card-extra"]';

// ── Test fixtures ──

function baseItem(overrides: Partial<CatalogMatchUpItem> = {}): CatalogMatchUpItem {
  return {
    matchUpId: 'mu-test',
    eventId: 'evt-1',
    eventName: 'Test Event',
    drawId: 'draw-1',
    structureId: 'struct-1',
    roundNumber: 1,
    roundName: 'Round 1',
    isScheduled: false,
    ...overrides
  };
}

function renderCard(overrides: Partial<CatalogMatchUpItem>, options: Parameters<typeof buildMatchUpCard>[2] = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 16px; background: var(--sp-bg, #1a1a1a); max-width: 320px;';
  const card = buildMatchUpCard(baseItem(overrides), {}, options);
  wrap.appendChild(card);
  return wrap;
}

// ── Round-emphasis class tier ──

export const RoundOffsetCurrent: StoryObj = {
  name: 'roundOffset 0 → round-current',
  render: () => renderCard({ roundNumber: 1 }, { roundOffset: 0 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(true);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(false);
  }
};

export const RoundOffsetNext: StoryObj = {
  name: 'roundOffset 1 → round-next',
  render: () => renderCard({ roundNumber: 2, roundName: 'Round 2' }, { roundOffset: 1 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(true);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(false);
  }
};

export const RoundOffsetLater: StoryObj = {
  name: 'roundOffset 2 → round-later',
  render: () => renderCard({ roundNumber: 3, roundName: 'Round 3' }, { roundOffset: 2 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(true);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(false);
  }
};

export const RoundOffsetFarLater: StoryObj = {
  name: 'roundOffset 5 → round-later (anything >= 2 collapses to the muted tier)',
  render: () => renderCard({ roundNumber: 6, roundName: 'Round 6' }, { roundOffset: 5 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(true);
  }
};

export const RoundOffsetOmitted: StoryObj = {
  name: 'roundOffset omitted → no round tier class',
  render: () => renderCard({}, {}),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(false);
  }
};

// ── Stage chip ──

export const StageNonMainRendersChip: StoryObj = {
  name: 'stage CONSOLATION → stage chip rendered with label',
  render: () => renderCard({ stage: 'CONSOLATION' }, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).not.toBeNull();
    expect(stageChip?.textContent).toBe('CONSOLATION');
  }
};

export const StageUnderscoresBecomeSpaces: StoryObj = {
  name: 'stage ROUND_ROBIN → chip text strips underscores',
  render: () => renderCard({ stage: 'ROUND_ROBIN' }, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).not.toBeNull();
    expect(stageChip?.textContent).toBe('ROUND ROBIN');
  }
};

export const StageMainOmitsChip: StoryObj = {
  name: 'stage MAIN → no stage chip (MAIN is the silent default)',
  render: () => renderCard({ stage: 'MAIN' }, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).toBeNull();
  }
};

export const StageUndefinedOmitsChip: StoryObj = {
  name: 'stage undefined → no stage chip',
  render: () => renderCard({}, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).toBeNull();
  }
};

// ── prominentTime ──

export const ProminentTimeRendersTimeHeader: StoryObj = {
  name: 'prominentTime + scheduledTime → with-time class + time-header span',
  render: () =>
    renderCard(
      { scheduledTime: '10:30', isScheduled: true },
      { prominentTime: true }
    ),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains('with-time')).toBe(true);
    const timeHeader = canvasElement.querySelector(TIME_HEADER_SELECTOR);
    expect(timeHeader).not.toBeNull();
    expect(timeHeader?.textContent).toBe('10:30');
  }
};

export const ProminentTimeSuppressesTimeChip: StoryObj = {
  name: 'prominentTime → standard time chip is NOT rendered',
  render: () =>
    renderCard(
      { scheduledTime: '10:30', isScheduled: true },
      { prominentTime: true }
    ),
  play: async ({ canvasElement }) => {
    // The non-prominent path puts the time in a `.spl-card-chip.time` chip.
    // With prominentTime: true the chip path is skipped — only the header
    // shows the time.
    const timeChip = canvasElement.querySelector('.spl-card-chip.time');
    expect(timeChip).toBeNull();
  }
};

export const ProminentTimeWithoutScheduledTimeNoHeader: StoryObj = {
  name: 'prominentTime true but no scheduledTime → no time-header (falls back to plain title)',
  render: () => renderCard({}, { prominentTime: true }),
  play: async ({ canvasElement }) => {
    const timeHeader = canvasElement.querySelector(TIME_HEADER_SELECTOR);
    expect(timeHeader).toBeNull();
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains('with-time')).toBe(false);
  }
};

// ── renderExtra ──

/** A consumer badge, freshly created per call as the hook contract requires. */
function badge(text: string): HTMLElement {
  const el = document.createElement('span');
  el.dataset.test = 'card-extra';
  el.textContent = text;
  el.style.cssText = 'font-size: 0.6875rem; padding: 1px 6px; border-radius: 10px; background: rgba(128,128,128,0.2);';
  return el;
}

export const RenderExtraAbsentRendersNoHolder: StoryObj = {
  name: 'no renderExtra → no .spl-card-extra holder',
  render: () => renderCard({}),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(EXTRA_HOLDER_SELECTOR)).toBeNull();
  }
};

export const RenderExtraAppendsConsumerElement: StoryObj = {
  name: 'renderExtra → consumer element inside a .spl-card-extra holder',
  render: () => renderCard({}, { renderExtra: () => badge('2h 14m') }),
  play: async ({ canvasElement }) => {
    const holder = canvasElement.querySelector(EXTRA_HOLDER_SELECTOR);
    expect(holder).not.toBeNull();
    expect(holder?.querySelector(EXTRA_MARKER_SELECTOR)?.textContent).toBe('2h 14m');
  }
};

export const RenderExtraReceivesTheMatchUp: StoryObj = {
  name: 'renderExtra is handed the matchUp it is rendering for',
  render: () => renderCard({ matchUpId: 'mu-handed-through' }, { renderExtra: (m) => badge(m.matchUpId) }),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(EXTRA_MARKER_SELECTOR)?.textContent).toBe('mu-handed-through');
  }
};

export const RenderExtraNullRendersNoHolder: StoryObj = {
  name: 'renderExtra returning null → no holder (not an empty one)',
  render: () => renderCard({}, { renderExtra: () => null }),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(EXTRA_HOLDER_SELECTOR)).toBeNull();
  }
};

export const RenderExtraThrowingLeavesTheCardIntact: StoryObj = {
  name: 'renderExtra throwing → card still complete and draggable',
  render: () =>
    renderCard(
      {},
      {
        renderExtra: () => {
          throw new Error('boom');
        }
      }
    ),
  play: async ({ canvasElement }) => {
    // A badge failure must not cost the operator the card's title, sides or
    // drag affordance — the whole point of the try/catch in appendCardExtra.
    expect(canvasElement.querySelector(TITLE_SELECTOR)).not.toBeNull();
    expect(canvasElement.querySelector(EXTRA_HOLDER_SELECTOR)).toBeNull();
    const card = canvasElement.querySelector('.spl-matchup-card') as HTMLElement;
    expect(card.draggable).toBe(true);
  }
};

export const RenderExtraSitsAfterChipsBeforeCheck: StoryObj = {
  name: 'extra is placed after the chips row and before the scheduled checkmark',
  render: () =>
    renderCard({ isScheduled: true, scheduledTime: '09:00' }, { renderExtra: () => badge('rested') }),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('.spl-matchup-card') as HTMLElement;
    const classes = [...card.children].map((c) => c.className);
    expect(classes.indexOf('spl-card-extra')).toBeGreaterThan(classes.indexOf('spl-card-chips'));
    expect(classes.indexOf('spl-card-extra')).toBeLessThan(classes.indexOf('spl-matchup-check'));
  }
};
