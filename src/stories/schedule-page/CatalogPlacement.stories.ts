import { MATCHUP_CATALOG, SCHEDULE_DATES, makeMockCourtGrid } from './data';
import { createSchedulePage } from '../../components/schedule-page';
import { expect, userEvent, within } from 'storybook/test';

const INSPECTOR_NAME = 'MatchUp inspector';

let dispose: (() => void) | undefined;
export default {
  title: 'Schedule Page/Catalog placement',
  parameters: { layout: 'fullscreen' },
  beforeEach: () => () => {
    dispose?.();
    dispose = undefined;
  }
};

export const BottomAndFloating = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = 'height:100vh;display:flex;flex-direction:column;background:var(--sp-bg)';
    const host = document.createElement('div');
    host.style.cssText = 'flex:1;min-height:0';
    root.appendChild(host);
    const control = createSchedulePage(
      {
        hideLeft: true,
        catalogPlacement: 'bottom',
        inspectorPlacement: 'docked',
        matchUpCatalog: MATCHUP_CATALOG,
        scheduleDates: SCHEDULE_DATES,
        courtGridElement: makeMockCourtGrid(12).element
      },
      host
    );
    const footer = document.createElement('footer');
    footer.style.cssText = 'height:36px;flex-shrink:0;display:flex;gap:8px';
    footer.dataset.testid = 'schedule-footer';
    for (const [label, action] of [
      ['Catalog left', () => control.setCatalogPlacement('left')],
      ['Catalog bottom', () => control.setCatalogPlacement('bottom')],
      ['Float inspector', () => control.setInspectorPlacement('floating')],
      ['Show inspector', () => control.setInspectorVisible(true)]
    ] as const) {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', action);
      footer.appendChild(button);
    }
    root.appendChild(footer);
    dispose = () => control.destroy();
    return root;
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const layout = canvasElement.querySelector<HTMLElement>('.spl-layout')!;
    const grid = layout.querySelector<HTMLElement>('.spl-center')!;
    const region = layout.querySelector<HTMLElement>('[data-panel="catalog-region"]')!;
    const footer = canvas.getByTestId('schedule-footer');
    expect(region.getBoundingClientRect().top).toBeGreaterThanOrEqual(grid.getBoundingClientRect().bottom);
    expect(region.getBoundingClientRect().bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top);
    const card = region.querySelector<HTMLElement>('.spl-matchup-card')!;
    expect(card.getBoundingClientRect().width).toBe(280);
    expect(card.getBoundingClientRect().height).toBeGreaterThan(70);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const fullWidth = grid.getBoundingClientRect().width;
    await userEvent.click(canvas.getByRole('button', { name: 'Catalog left' }));
    expect(grid.getBoundingClientRect().width).toBeLessThan(fullWidth);
    await userEvent.click(canvas.getByRole('button', { name: 'Float inspector' }));
    expect(canvas.getByRole('dialog', { name: INSPECTOR_NAME })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /^Close$/ }));
    expect(canvas.queryByRole('dialog', { name: INSPECTOR_NAME })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Show inspector' }));
    expect(canvas.getByRole('dialog', { name: INSPECTOR_NAME })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /^Dock$/ }));
    expect(canvas.queryByRole('dialog', { name: INSPECTOR_NAME })).toBeNull();
  }
};
