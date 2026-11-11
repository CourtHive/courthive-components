import { timeModifierLabels } from '../domain/timeModifierLabels';
import { describe, expect, it } from 'vitest';

/**
 * The words a grid cell's time field shows. How the cell renders them — the clock in an LTR `<bdi>`,
 * the court note as text, the reserved and blocked cells and their booking-type colours — is asserted
 * in Chromium by `src/stories/schedule-page/ScheduleGridCellTests.stories.ts`.
 */
const AFTER_REST = 'After rest';
const COURT_NOTE = 'Court 3 if free';

const compact = (labels: ReturnType<typeof timeModifierLabels>) => labels?.compact.join(' · ');

describe('schedule annotation labels', () => {
  it.each([
    ['NOT_BEFORE', 'NB', 'Not Before'],
    ['FOLLOWED_BY', 'Followed by', 'Followed by'],
    ['NEXT_AVAILABLE', 'Next available', 'Next available'],
    ['AFTER_REST', AFTER_REST, AFTER_REST],
    ['TO_BE_ANNOUNCED', 'TBA', 'To be announced'],
    ['RAIN_DELAY', 'Rain delay', 'Rain delay']
  ])('never shows the stored %s enum, including without a locale config', (modifier, short, full) => {
    const labels = timeModifierLabels({ timeModifiers: [modifier] });
    expect(labels?.compact).toEqual([short]);
    expect(labels?.title).toBe(full);
  });

  it('keeps a combination, clock and free-text court note, with full hover text', () => {
    const schedule = {
      timeModifiers: ['NOT_BEFORE', 'AFTER_REST'],
      scheduledTime: '11:00',
      courtAnnotation: 'Court <B>'
    };
    const before = JSON.stringify(schedule);
    expect(timeModifierLabels(schedule)).toEqual({
      compact: ['NB', AFTER_REST],
      time: '11:00',
      courtAnnotation: 'Court <B>',
      title: 'Not Before · After rest · 11:00 · Court <B>'
    });
    expect(JSON.stringify(schedule)).toBe(before);
  });

  it('uses each supplied label and falls back per modifier when the map is partial', () => {
    const labels = timeModifierLabels(
      { timeModifiers: ['NOT_BEFORE', 'TO_BE_ANNOUNCED', 'AFTER_REST'] },
      { NOT_BEFORE: { label: 'Pas avant' }, TO_BE_ANNOUNCED: { label: 'À annoncer', short: 'À ann.' } }
    );
    expect(compact(labels)).toBe('Pas avant · À ann. · After rest');
    expect(labels?.title).toBe('Pas avant · À annoncer · After rest');
  });

  it('uses the labels it is given on each call, without a module-level locale snapshot', () => {
    const schedule = { timeModifiers: ['NOT_BEFORE'], scheduledTime: '11:00' };
    expect(compact(timeModifierLabels(schedule))).toBe('NB');
    expect(compact(timeModifierLabels(schedule, { NOT_BEFORE: { label: 'Nicht vor' } }))).toBe('Nicht vor');
    expect(compact(timeModifierLabels(schedule))).toBe('NB');
  });

  it('uses startTime when scheduledTime is absent', () => {
    const labels = timeModifierLabels(
      { timeModifiers: ['NOT_BEFORE'], startTime: '11:00' },
      {
        NOT_BEFORE: { label: 'ليس قبل' }
      }
    );
    expect(labels?.compact).toEqual(['ليس قبل']);
    expect(labels?.time).toBe('11:00');
    expect(labels?.title).toBe('ليس قبل · 11:00');
  });

  it('humanizes future modifiers, preserving free-text annotations without interpreting them', () => {
    expect(
      timeModifierLabels({ timeModifiers: ['WEATHER_HOLD'], courtAnnotation: 'NOT_BEFORE court inspection' })
    ).toEqual({
      compact: ['Weather hold'],
      time: undefined,
      courtAnnotation: 'NOT_BEFORE court inspection',
      title: 'Weather hold · NOT_BEFORE court inspection'
    });
  });

  it('describes a court note alone, and nothing at all for an empty schedule', () => {
    expect(timeModifierLabels({ courtAnnotation: COURT_NOTE })).toEqual({
      compact: [],
      time: undefined,
      courtAnnotation: COURT_NOTE,
      title: COURT_NOTE
    });
    expect(timeModifierLabels({})).toBeUndefined();
    expect(timeModifierLabels(undefined)).toBeUndefined();
  });
});
