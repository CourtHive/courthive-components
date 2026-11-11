/**
 * Schedule Page — Court Grid Slot play-function tests.
 *
 * The centre panel: a header ("Court Grid", consumer-owned leading and trailing actions) over a slot
 * that holds the consumer's grid and is the drop target for matchUps. These replaced happy-dom tests
 * whose drops were a synthetic `new Event('drop')` carrying a fake `dataTransfer`. A browser fires
 * `drop` only on a target whose `dragover` called `preventDefault()`, so those tests could not see a
 * slot that refused every real drop. Here a real catalog card is dragged onto the slot.
 *
 * What a drop's payload must look like is unit-tested in `__tests__/courtGridSlot.test.ts`
 * (`parseDragPayload`).
 *
 * Run as tests: `pnpm test:stories src/stories/schedule-page/CourtGridSlotTests.stories.ts`
 */
import { buildCourtGridSlot } from '../../components/schedule-page/ui/courtGridSlot';
import { buildMatchUpCard } from '../../components/schedule-page/ui/matchUpCard';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { user } from '../helpers/trustedUser';

import type { CatalogMatchUpItem, SchedulePageState } from '../../components/schedule-page';

const meta: Meta = {
  title: 'Scheduling/Schedule Page/Tests/Court Grid Slot',
  tags: ['!dev']
};
export default meta;

const HEADER = '.spl-center-header';
const TITLE = '.spl-center-title';
const ACTIONS = '.spl-center-actions';
const LEADING = '.spl-center-leading';
const GRID_SLOT = '.spl-grid-slot';
const TITLE_TEXT = 'Court Grid';
const WRAP_STYLE = 'background: var(--sp-bg); padding: 16px; display: flex; flex-direction: column; gap: 16px;';

const ITEM: CatalogMatchUpItem = {
  matchUpId: 'mu-drag',
  eventId: 'evt-1',
  eventName: 'Boys U16',
  drawId: 'draw-1',
  structureId: 'struct-1',
  roundNumber: 1,
  roundName: 'R32',
  isScheduled: false,
  sides: [{ participantName: 'Alice' }, { participantName: 'Bob' }]
};

const button = (label: string): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  return b;
};

function variant(name: string, panel: { element: HTMLElement }): HTMLElement {
  const box = document.createElement('section');
  box.dataset.variant = name;
  box.style.cssText = 'height: 160px; display: flex; flex-direction: column; border: 1px solid var(--sp-line);';
  panel.element.style.flex = '1';
  panel.element.style.minHeight = '0';
  box.appendChild(panel.element);
  return box;
}

const leadingToggle = button('Catalog');
const trailingActions = [button('A'), button('B'), button('C')];
const single = button('Print');
const bothToggle = button('Toggle');
const bothPrint = button('Save');
const grid = document.createElement('div');
grid.dataset.testid = 'consumer-grid';
grid.textContent = 'consumer grid';

let updated: { element: HTMLElement; update: (state: SchedulePageState) => void } | undefined;

export const HeaderStructure: StoryObj = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = WRAP_STYLE;
    updated = buildCourtGridSlot(undefined, {}, { headerActions: single });
    wrap.append(
      variant('bare', buildCourtGridSlot(undefined, {})),
      variant('single', updated),
      variant('array', buildCourtGridSlot(undefined, {}, { headerActions: trailingActions })),
      variant('leading', buildCourtGridSlot(undefined, {}, { titleLeadingActions: leadingToggle })),
      variant('both', buildCourtGridSlot(undefined, {}, { titleLeadingActions: bothToggle, headerActions: bothPrint })),
      variant('grid', buildCourtGridSlot(grid, {}))
    );
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const section = (name: string) => canvasElement.querySelector<HTMLElement>(`[data-variant="${name}"]`)!;
    const header = (name: string) => section(name).querySelector<HTMLElement>(HEADER)!;

    // Bare: the title, and neither action container.
    await expect(header('bare').querySelector(TITLE)?.textContent).toBe(TITLE_TEXT);
    await expect(within(header('bare')).getByText(TITLE_TEXT)).toBeVisible();
    await expect(header('bare').querySelector(ACTIONS)).toBeNull();
    await expect(header('bare').querySelector(LEADING)).toBeNull();

    // One action: the consumer's own element, kept by identity, right of the title.
    const singleActions = header('single').querySelector<HTMLElement>(ACTIONS)!;
    await expect([...singleActions.children]).toEqual([single]);
    await expect(single).toBeVisible();
    const singleTitle = header('single').querySelector<HTMLElement>(TITLE)!;
    await expect(single.getBoundingClientRect().left).toBeGreaterThan(singleTitle.getBoundingClientRect().right);

    // An array: in the order given, laid out left to right.
    const arrayActions = header('array').querySelector<HTMLElement>(ACTIONS)!;
    await expect([...arrayActions.children]).toEqual(trailingActions);
    const lefts = trailingActions.map((b) => b.getBoundingClientRect().left);
    await expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);

    // Leading: [toggle, title] inside the leading container, the toggle painted first.
    const leading = header('leading').querySelector<HTMLElement>(LEADING)!;
    await expect(leading.children).toHaveLength(2);
    await expect(leading.firstElementChild).toBe(leadingToggle);
    await expect(leading.lastElementChild?.textContent).toBe(TITLE_TEXT);
    await expect(leadingToggle.getBoundingClientRect().right).toBeLessThanOrEqual(
      (leading.lastElementChild as HTMLElement).getBoundingClientRect().left
    );

    // Both slots together.
    await expect(header('both').querySelector(LEADING)?.firstElementChild).toBe(bothToggle);
    await expect(header('both').querySelector(ACTIONS)?.firstElementChild).toBe(bothPrint);
    await expect(bothToggle).toBeVisible();
    await expect(bothPrint).toBeVisible();

    // The consumer's grid element is placed in the slot as is.
    await expect(section('grid').querySelector(GRID_SLOT)?.firstElementChild).toBe(grid);
    await expect(grid).toBeVisible();

    // update(state) has no state-driven header content: it leaves the header untouched.
    const before = header('single').innerHTML;
    updated!.update({ selectedDate: '2026-05-11' } as SchedulePageState);
    await expect(header('single').innerHTML).toBe(before);
    await expect(header('single').querySelector(ACTIONS)?.firstElementChild).toBe(single);
  }
};

const onMatchUpDrop = fn();

export const DropFromCatalogCard: StoryObj = {
  render: () => {
    onMatchUpDrop.mockClear();
    const wrap = document.createElement('div');
    wrap.style.cssText = WRAP_STYLE + ' height: 520px;';
    const card = buildMatchUpCard(ITEM, {});
    card.dataset.testid = 'drag-card';
    card.style.width = '280px';
    const box = document.createElement('div');
    box.style.cssText = 'flex: 1; min-height: 0; display: flex; flex-direction: column;';
    const panel = buildCourtGridSlot(undefined, { onMatchUpDrop });
    panel.element.style.flex = '1';
    panel.element.style.minHeight = '240px';
    box.appendChild(panel.element);
    wrap.append(card, box);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>('[data-testid="drag-card"]')!;
    const slot = canvasElement.querySelector<HTMLElement>(GRID_SLOT)!;
    await expect(slot.getBoundingClientRect().height).toBeGreaterThan(100);

    await user.dragAndDrop(card, slot);

    await waitFor(() => expect(onMatchUpDrop).toHaveBeenCalledTimes(1));
    const [payload, event] = onMatchUpDrop.mock.calls[0];
    await expect(payload).toEqual({ type: 'CATALOG_MATCHUP', matchUp: ITEM });
    // The browser's own drop, delivered because the slot's dragover accepted it.
    await expect(event.type).toBe('drop');
    await expect(event.isTrusted).toBe(true);
  }
};
