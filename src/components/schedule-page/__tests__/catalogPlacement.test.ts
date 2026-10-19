// @vitest-environment happy-dom
import { SchedulePageControl } from '../controller/schedulePageControl';
import { clampInspectorGeometry } from '../ui/floatingInspector';
import { describe, expect, it } from 'vitest';

function mount() {
  const control = new SchedulePageControl({
    hideLeft: true,
    catalogSide: 'left',
    matchUpCatalog: [],
    schedulingMode: 'bulk',
    scheduleDates: []
  });
  const host = document.createElement('div');
  document.body.appendChild(host);
  control.render(host);
  return { control, host };
}

describe('schedule presentation', () => {
  it('moves the same inspector and preserves the store when switching placement', () => {
    const { control, host } = mount();
    const store = control.getStore();
    store.setCatalogSearch('Alice');
    const item = {
      matchUpId: 'pending',
      eventId: 'event',
      eventName: 'Singles',
      drawId: 'draw',
      structureId: 'structure',
      roundNumber: 1,
      isScheduled: false,
      sides: []
    };
    store.setMatchUpCatalog([item]);
    store.selectMatchUp(item);
    store.handleMatchUpDrop({ type: 'CATALOG_MATCHUP', matchUp: item }, new Event('drop') as DragEvent);
    const snapshot = store.getState();
    expect(snapshot.pendingActions).toHaveLength(1);
    expect(snapshot.selectedMatchUp?.matchUpId).toBe('pending');
    const inspector = host.querySelector('[data-panel="inspector"]');
    const catalog = host.querySelector('[data-panel="catalog"]');
    control.setCatalogPlacement('bottom');
    control.setInspectorPlacement('floating');
    expect(host.querySelector<HTMLElement>('.spl-layout')?.dataset.catalogPlacement).toBe('bottom');
    expect(host.querySelector('.spl-floating-content')?.firstElementChild).toBe(inspector);
    expect(control.getStore().getState()).toBe(snapshot);
    control.setInspectorPlacement('docked');
    control.setCatalogPlacement('left');
    expect(host.querySelector('[data-panel="catalog"]')).toBe(catalog);
    expect(host.querySelectorAll('[data-panel="inspector"]')).toHaveLength(1);
    expect(control.getStore().getState()).toBe(snapshot);
    control.destroy();
    host.remove();
  });

  it('keeps floating visibility independent of catalog visibility and closes through the store', () => {
    const { control, host } = mount();
    control.setInspectorPlacement('floating');
    control.setCatalogVisible(false);
    const floating = host.querySelector<HTMLElement>('.spl-floating-inspector')!;
    expect(floating.hidden).toBe(false);
    const close = [...floating.querySelectorAll('button')].find((button) => button.textContent === 'Close')!;
    close.click();
    expect(control.inspectorVisible).toBe(false);
    expect(floating.hidden).toBe(true);
    control.setInspectorVisible(true);
    expect(floating.hidden).toBe(false);
    control.destroy();
    expect(host.querySelector('.spl-floating-inspector')).toBeNull();
    host.remove();
  });

  it('clamps stale and nonfinite geometry to the viewport', () => {
    expect(clampInspectorGeometry({ left: 9999, top: -10, width: Infinity, height: 9999 }, 800, 600)).toEqual({
      left: 452,
      top: 8,
      width: 340,
      height: 584
    });
    const small = clampInspectorGeometry({ width: 500, height: 500 }, 240, 160);
    expect(small.width + small.left).toBeLessThanOrEqual(240);
    expect(small.height + small.top).toBeLessThanOrEqual(160);
  });
});
