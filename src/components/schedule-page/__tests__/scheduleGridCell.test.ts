/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';

import { buildScheduleGridCell } from '../ui/scheduleGridCell';

/**
 * Reserved cell — a court slot taken by another facility-sharing tournament the viewer can't author.
 * Opaque + read-only: shows "Reserved" plus whatever slim label the consumer passes, never matchUp
 * detail. Takes precedence over a matchUpId (a reserved slot is not the viewer's own matchUp).
 */
describe('buildScheduleGridCell — reserved cell', () => {
  it('renders a read-only reserved cell with the slim projection label', () => {
    const el = buildScheduleGridCell({
      matchUpId: '',
      isReserved: true,
      reservation: { tournamentName: 'City Open', scheduledTime: '14:00' },
    });

    expect(el.classList.contains('spl-cell--reserved')).toBe(true);
    expect(el.dataset.reserved).toBe('true');
    expect(el.textContent).toContain('Reserved');
    expect(el.querySelector('.spl-grid-cell__reserved-name')?.textContent).toBe('City Open');
    expect(el.querySelector('.spl-grid-cell__reserved-time')?.textContent).toBe('14:00');
  });

  it('is opaque — renders no matchUp/participant content even if a matchUpId is present', () => {
    const el = buildScheduleGridCell({
      matchUpId: 'M1',
      isReserved: true,
      sides: [{ participantName: 'Should Not Render' }] as any,
    });

    expect(el.classList.contains('spl-cell--reserved')).toBe(true);
    expect(el.textContent).not.toContain('Should Not Render');
  });

  it('falls back to schedule.scheduledTime and omits the name when reservation label is absent', () => {
    const el = buildScheduleGridCell({
      matchUpId: '',
      isReserved: true,
      schedule: { scheduledTime: '09:30' },
    });

    expect(el.textContent).toContain('Reserved');
    expect(el.textContent).toContain('09:30');
    expect(el.querySelector('.spl-grid-cell__reserved-name')).toBeNull();
  });
});

/**
 * Blocked cells key their colour off `data-booking-type` in schedule-grid-cell.css.
 * A booking type with no matching selector silently falls through to the MAINTENANCE
 * default — so the attribute has to carry the raw type verbatim for the styling to
 * land. DRYING is the case that motivated this: it must read as weather loss, not as
 * planned maintenance.
 */
describe('buildScheduleGridCell — blocked cell booking type', () => {
  const blocked = (bookingType: string) =>
    buildScheduleGridCell({ matchUpId: '', isBlocked: true, booking: { bookingType } } as any);

  it('exposes DRYING as its own data-booking-type so the teal styling applies', () => {
    const el = blocked('DRYING');

    expect(el.classList.contains('spl-cell--blocked')).toBe(true);
    expect(el.dataset.bookingType).toBe('DRYING');
    expect(el.querySelector('.spl-grid-cell__block-type')?.textContent).toBe('DRYING');
  });

  it('keeps DRYING distinct from MAINTENANCE rather than collapsing them', () => {
    expect(blocked('DRYING').dataset.bookingType).not.toBe(blocked('MAINTENANCE').dataset.bookingType);
  });

  it('still defaults a booking with no type to BLOCKED', () => {
    const el = buildScheduleGridCell({ matchUpId: '', isBlocked: true, booking: {} } as any);
    expect(el.dataset.bookingType).toBe('BLOCKED');
  });
});
