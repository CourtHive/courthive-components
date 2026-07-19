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
