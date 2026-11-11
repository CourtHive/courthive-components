/**
 * Schedule Page — catalog and inspector placement, play-function tests.
 *
 * Moving the catalog (left / bottom) or floating the inspector re-parents the SAME panel nodes: the
 * consumer may hold refs into them, and the store — selection, search, pending bulk actions — must come
 * through untouched. Moved from happy-dom, where the floating inspector's visibility was read off the
 * `hidden` attribute, which CSS can override. `toBeVisible()` cannot see that either — jest-dom treats
 * the attribute itself as "not visible" — so a close is also checked with `checkVisibility()`, which
 * asks the renderer. Verified by falsification: with the `.spl-floating-inspector[hidden]` rule
 * removed, `toBeVisible()` still passed and `painted()` failed.
 *
 * `clampInspectorGeometry` is pure and unit-tested in `__tests__/catalogPlacement.test.ts`. The
 * layout rectangles are asserted by `CatalogPlacement.stories.ts` (`BottomAndFloating`).
 *
 * Run as tests: `pnpm test:stories src/stories/schedule-page/CatalogPlacementTests.stories.ts`
 */
import { createSchedulePage, type SchedulePageControl } from '../../components/schedule-page';
import type { CatalogMatchUpItem } from '../../components/schedule-page';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, waitFor, within } from 'storybook/test';
import { user } from '../helpers/trustedUser';

let control: SchedulePageControl | undefined;

const meta: Meta = {
  title: 'Scheduling/Schedule Page/Tests/Catalog Placement',
  tags: ['!dev'],
  parameters: { layout: 'fullscreen' },
  beforeEach: () => () => {
    control?.destroy();
    control = undefined;
  }
};
export default meta;

const INSPECTOR_NAME = 'MatchUp inspector';
const INSPECTOR_PANEL = '[data-panel="inspector"]';
/** Whether the element is actually rendered: the renderer's answer, not the `hidden` attribute's. */
const painted = (el: Element) => el.checkVisibility();
const ITEM: CatalogMatchUpItem = {
  matchUpId: 'pending',
  eventId: 'event',
  eventName: 'Singles',
  drawId: 'draw',
  structureId: 'structure',
  roundNumber: 1,
  isScheduled: false,
  sides: []
};

function mount(actions: [string, () => void][]): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'height: 100vh; display: flex; flex-direction: column; background: var(--sp-bg);';
  const host = document.createElement('div');
  host.style.cssText = 'flex: 1; min-height: 0;';
  root.appendChild(host);
  control = createSchedulePage(
    { hideLeft: true, catalogSide: 'left', matchUpCatalog: [], schedulingMode: 'bulk', scheduleDates: [] },
    host
  );
  const footer = document.createElement('footer');
  footer.style.cssText = 'height: 36px; flex-shrink: 0; display: flex; gap: 8px;';
  for (const [label, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    footer.appendChild(button);
  }
  root.appendChild(footer);
  return root;
}

export const PlacementMovesTheSamePanels: StoryObj = {
  render: () =>
    mount([
      ['Catalog bottom', () => control!.setCatalogPlacement('bottom')],
      ['Catalog left', () => control!.setCatalogPlacement('left')],
      ['Float inspector', () => control!.setInspectorPlacement('floating')],
      ['Dock inspector', () => control!.setInspectorPlacement('docked')]
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const store = control!.getStore();
    store.setCatalogSearch('Alice');
    store.setMatchUpCatalog([ITEM]);
    store.selectMatchUp(ITEM);
    store.handleMatchUpDrop({ type: 'CATALOG_MATCHUP', matchUp: ITEM }, new DragEvent('drop'));
    const snapshot = store.getState();
    await expect(snapshot.pendingActions).toHaveLength(1);
    await expect(snapshot.selectedMatchUp?.matchUpId).toBe('pending');
    await expect(snapshot.catalogSearchQuery).toBe('Alice');

    const inspector = canvasElement.querySelector<HTMLElement>(INSPECTOR_PANEL)!;
    const catalog = canvasElement.querySelector<HTMLElement>('[data-panel="catalog"]')!;
    await expect(inspector).toBeVisible();
    await expect(catalog).toBeVisible();

    await user.click(canvas.getByRole('button', { name: 'Catalog bottom' }));
    await user.click(canvas.getByRole('button', { name: 'Float inspector' }));
    await expect(canvasElement.querySelector<HTMLElement>('.spl-layout')?.dataset.catalogPlacement).toBe('bottom');
    const dialog = canvas.getByRole('dialog', { name: INSPECTOR_NAME });
    await expect(dialog).toBeVisible();
    // The docked inspector node itself now sits in the floating window, still showing the selection.
    await expect(dialog.querySelector('.spl-floating-content')?.firstElementChild).toBe(inspector);
    await expect(inspector).toBeVisible();
    await expect(control!.getStore().getState()).toBe(snapshot);

    await user.click(canvas.getByRole('button', { name: 'Dock inspector' }));
    await user.click(canvas.getByRole('button', { name: 'Catalog left' }));
    await expect(canvas.queryByRole('dialog', { name: INSPECTOR_NAME })).toBeNull();
    await expect(painted(dialog)).toBe(false);
    await expect(canvasElement.querySelector('[data-panel="catalog"]')).toBe(catalog);
    await expect(canvasElement.querySelectorAll(INSPECTOR_PANEL)).toHaveLength(1);
    await expect(canvasElement.querySelector(INSPECTOR_PANEL)).toBe(inspector);
    await expect(inspector).toBeVisible();
    await expect(catalog).toBeVisible();
    await expect(control!.getStore().getState()).toBe(snapshot);
  }
};

export const FloatingInspectorClosesThroughTheStore: StoryObj = {
  render: () => mount([['Show inspector', () => control!.setInspectorVisible(true)]]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    control!.setInspectorPlacement('floating');
    control!.setCatalogVisible(false);

    // Hiding the catalog does not hide the floating inspector.
    const dialog = canvas.getByRole('dialog', { name: INSPECTOR_NAME });
    await expect(dialog).toBeVisible();
    await expect(painted(dialog)).toBe(true);

    // Header actions are icons: no text, the label is the accessible name and the hover text.
    const actions = [...dialog.querySelectorAll<HTMLButtonElement>('.spl-floating-header button')];
    await expect(
      actions.map((button) => [button.getAttribute('aria-label'), button.title, button.textContent])
    ).toEqual([
      ['Reset position', 'Reset position', ''],
      ['Dock', 'Dock', ''],
      ['Close', 'Close', '']
    ]);
    for (const button of actions) {
      await expect(button).toBeVisible();
      await expect(button.querySelector('svg')).not.toBeNull();
    }

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(control!.inspectorVisible).toBe(false));
    await expect(control!.getStore().getState().inspectorVisible).toBe(false);
    await expect(dialog).not.toBeVisible();
    await expect(painted(dialog)).toBe(false);

    await user.click(canvas.getByRole('button', { name: 'Show inspector' }));
    await expect(control!.inspectorVisible).toBe(true);
    await expect(dialog).toBeVisible();
    await expect(painted(dialog)).toBe(true);

    control!.destroy();
    control = undefined;
    await expect(canvasElement.querySelector('.spl-floating-inspector')).toBeNull();
  }
};
