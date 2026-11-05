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
      reservation: { tournamentName: 'City Open', scheduledTime: '14:00' }
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
      sides: [{ participantName: 'Should Not Render' }] as any
    });

    expect(el.classList.contains('spl-cell--reserved')).toBe(true);
    expect(el.textContent).not.toContain('Should Not Render');
  });

  it('falls back to schedule.scheduledTime and omits the name when reservation label is absent', () => {
    const el = buildScheduleGridCell({
      matchUpId: '',
      isReserved: true,
      schedule: { scheduledTime: '09:30' }
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

describe('schedule annotation labels', () => {
  const time = (schedule: any, timeModifierLabels?: Record<string, { label: string; short?: string }>) => {
    const cell = buildScheduleGridCell(
      { matchUpId: 'M1', schedule },
      { header: ['time'], body: [], footer: [], timeModifierLabels }
    );
    return cell.querySelector<HTMLElement>('.spl-grid-cell__time');
  };

  it.each([
    ['NOT_BEFORE', 'NB', 'Not Before'],
    ['FOLLOWED_BY', 'Followed by', 'Followed by'],
    ['NEXT_AVAILABLE', 'Next available', 'Next available'],
    ['AFTER_REST', 'After rest', 'After rest'],
    ['TO_BE_ANNOUNCED', 'TBA', 'To be announced'],
    ['RAIN_DELAY', 'Rain delay', 'Rain delay']
  ])('never renders the stored %s enum, including without a locale config', (modifier, compact, full) => {
    const el = time({ timeModifiers: [modifier] })!;
    expect(el.textContent).toBe(compact);
    expect(el.title).toBe(full);
    expect(el.getAttribute('aria-label')).toBe(full);
  });

  it('keeps a combination, clock and free-text court note, with full hover text', () => {
    const schedule = {
      timeModifiers: ['NOT_BEFORE', 'AFTER_REST'],
      scheduledTime: '11:00',
      courtAnnotation: 'Court <B>'
    };
    const before = JSON.stringify(schedule);
    const el = time(schedule)!;
    expect(el.textContent).toBe('NB · After rest 11:00 Court <B>');
    expect(el.title).toBe('Not Before · After rest · 11:00 · Court <B>');
    expect(el.querySelector('b')).toBeNull();
    expect(JSON.stringify(schedule)).toBe(before);
  });

  it('uses each supplied label and falls back per modifier when the map is partial', () => {
    const el = time(
      { timeModifiers: ['NOT_BEFORE', 'TO_BE_ANNOUNCED', 'AFTER_REST'] },
      { NOT_BEFORE: { label: 'Pas avant' }, TO_BE_ANNOUNCED: { label: 'À annoncer', short: 'À ann.' } }
    )!;
    expect(el.textContent).toBe('Pas avant · À ann. · After rest');
    expect(el.title).toBe('Pas avant · À annoncer · After rest');
  });

  it('uses new labels on rerender, without a module-level locale snapshot', () => {
    const schedule = { timeModifiers: ['NOT_BEFORE'], scheduledTime: '11:00' };
    expect(time(schedule)?.textContent).toBe('NB 11:00');
    expect(time(schedule, { NOT_BEFORE: { label: 'Nicht vor' } })?.textContent).toBe('Nicht vor 11:00');
  });

  it('isolates the clock from RTL labels and uses startTime when scheduledTime is absent', () => {
    const el = time({ timeModifiers: ['NOT_BEFORE'], startTime: '11:00' }, { NOT_BEFORE: { label: 'ليس قبل' } })!;
    expect(el.textContent).toBe('ليس قبل 11:00');
    expect(el.querySelector('bdi')?.dir).toBe('ltr');
  });

  it('humanizes future modifiers, preserving free-text annotations without interpreting them', () => {
    const el = time({ timeModifiers: ['WEATHER_HOLD'], courtAnnotation: 'NOT_BEFORE court inspection' })!;
    expect(el.textContent).toBe('Weather hold NOT_BEFORE court inspection');
    expect(el.querySelector('.spl-grid-cell__court-annotation')?.textContent).toBe(' NOT_BEFORE court inspection');
  });

  it('renders a court note alone and omits an empty time field', () => {
    expect(time({ courtAnnotation: 'Court 3 if free' })?.textContent?.trim()).toBe('Court 3 if free');
    expect(time({})).toBeNull();
  });
});
