// @vitest-environment happy-dom
import { AvailabilityGrid } from './availabilityGrid';
import { expect, it, vi } from 'vitest';

it('initializes newly arrived courts after an empty render, retaining explicit empty selections', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div id="venue-tree-content"></div>';
  let courts: any[] = [];
  const grid: any = Object.assign(Object.create(AvailabilityGrid.prototype), {
    venueTreeElement: root,
    config: {},
    visibleCourts: new Set(),
    courtVisibilityCustomized: false,
    engine: { listCourtMeta: () => courts, getConfig: () => ({ tournamentId: 't1' }) },
    handleCourtCheckboxChange: vi.fn(),
    handleVenueCheckboxChange: vi.fn()
  });
  grid.updateVenueTree();
  courts = [{ ref: { tournamentId: 't1', venueId: 'v1', courtId: 'c1' }, name: 'One' }];
  grid.updateVenueTree();
  expect(root.querySelector<HTMLInputElement>('.court-checkbox')!.checked).toBe(true);
  grid.courtVisibilityCustomized = true;
  grid.visibleCourts.clear();
  grid.updateVenueTree();
  expect(root.querySelector<HTMLInputElement>('.court-checkbox')!.checked).toBe(false);
});
