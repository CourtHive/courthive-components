import { AvailabilityGridControl } from './availabilityGridControl';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Node, no DOM: the constructor defers timeline creation to a macro-task (`ensureTimeline`), so up to
 * that timer nothing reaches the container. The container below throws on ANY access, so these tests
 * would fail — not quietly pass — if the constructor, `setVisibleCourts` or `destroy` began touching it.
 */
afterEach(() => vi.useRealTimers());

const untouchableContainer = new Proxy({} as HTMLElement, {
  get: (_target, key) => {
    throw new Error(`container.${String(key)} read before the timeline mounts`);
  }
});

function controller() {
  return new AvailabilityGridControl(
    {
      getActiveDays: () => ['2026-10-16'],
      subscribe: () => () => {}
    } as any,
    { container: untouchableContainer }
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

  it('CONTROL: creates the timeline on the deferred tick when not destroyed', () => {
    vi.useFakeTimers();
    const control = controller();
    const create = vi.spyOn(control as any, 'createTimelineWithData').mockImplementation(() => {});
    expect(create).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(create).toHaveBeenCalledTimes(1);
    control.destroy();
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
