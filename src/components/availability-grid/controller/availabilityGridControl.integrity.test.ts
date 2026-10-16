// @vitest-environment happy-dom
import { AvailabilityGridControl } from './availabilityGridControl';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.useRealTimers());

function controller() {
  return new AvailabilityGridControl(
    {
      getActiveDays: () => ['2026-10-16'],
      subscribe: () => () => {}
    } as any,
    { container: document.createElement('div') }
  );
}

describe('availability controller ownership', () => {
  it('does not create a timeline after immediate destruction', () => {
    vi.useFakeTimers();
    const control = controller();
    const create = vi.spyOn(control as any, 'createTimelineWithData').mockImplementation(() => {});
    control.destroy();
    vi.runAllTimers();
    expect(create).not.toHaveBeenCalled();
  });

  it('distinguishes an empty visible-court selection from all courts', () => {
    vi.useFakeTimers();
    const control = controller();
    vi.spyOn(control as any, 'render').mockImplementation(() => {});
    control.setVisibleCourts(new Set());
    expect((control as any).visibleCourts).toEqual(new Set());
    control.setVisibleCourts(null);
    expect((control as any).visibleCourts).toBeNull();
    control.destroy();
    vi.clearAllTimers();
  });
});
