import { describe, expect, it } from 'vitest';
import {
  defaultOperatorLabels,
  moveOperatorRound,
  operatorMatchText,
  reconcileOperatorRound,
  operatorDateLabel,
  operatorDayGroups,
  operatorNowMatch,
  operatorFreshness,
  selectOperatorRound
} from './model';
import {
  operatorDrawFixture,
  operatorMatchFixture,
  operatorDayFrame,
  operatorBusyDayFixture,
  operatorBusyDetails
} from './fixtures';

describe('operator presentation logic without a DOM', () => {
  it('moves through supplied round identities, including non-consecutive round numbers, without wrapping', () => {
    expect(moveOperatorRound({ roundNumber: 1 }, 1, operatorDrawFixture)).toEqual({ roundNumber: 3 });
    expect(moveOperatorRound({ roundNumber: 3 }, 1, operatorDrawFixture)).toEqual({ roundNumber: 3 });
    expect(moveOperatorRound({ roundNumber: 3 }, -1, operatorDrawFixture)).toEqual({ roundNumber: 1 });
    expect(moveOperatorRound({ roundNumber: 1 }, -1, operatorDrawFixture)).toEqual({ roundNumber: 1 });
  });
  it('preserves selection by identity across a replacement and recovers if that round disappears', () => {
    expect(reconcileOperatorRound({ roundNumber: 3 }, operatorDrawFixture)).toEqual({ roundNumber: 3 });
    expect(reconcileOperatorRound({ roundNumber: 99 }, operatorDrawFixture)).toEqual({ roundNumber: 1 });
    expect(reconcileOperatorRound({ roundNumber: 3 }, { ...operatorDrawFixture, rounds: [] })).toEqual({
      roundNumber: undefined
    });
  });
  it('uses supplied facts and labels without inferring winners or scoring', () => {
    const view = operatorMatchText({
      ...operatorMatchFixture,
      isUpset: false,
      sides: [
        { sideNumber: 1, bye: true, qualifier: false, isWinner: false },
        { sideNumber: 2, bye: false, qualifier: true, isWinner: false }
      ]
    });
    expect(view.sides.map((side) => side.displayName)).toEqual(['BYE', 'Qualifier']);
    expect(view.sides.every((side) => !side.isWinner)).toBe(true);
    expect(view.accessibleName).toBe('Open match: BYE versus Qualifier');
  });
  it('keeps the qualifier badge after a supplied participant occupies the reserved place', () => {
    const view = operatorMatchText({
      ...operatorMatchFixture,
      sides: [
        {
          ...operatorMatchFixture.sides[0],
          qualifier: true
        }
      ]
    });
    expect(view.sides[0].displayName).toBe('Alex Morgan');
    expect(view.sides[0].qualifierLabel).toBe('Qualifier');
  });

  it('formats calendar dates without a browser-zone shift and never leaves a clock unlabeled', () => {
    expect(operatorDateLabel('2026-11-20', 'en-GB')).toBe('20 November 2026');
    expect(operatorDateLabel('2026-11-20', 'en-US')).toBe('November 20, 2026');
    expect(operatorDateLabel('2026-02-30')).toBe('Date unavailable');
    expect(operatorMatchText(operatorMatchFixture, defaultOperatorLabels, 'en-GB', operatorDayFrame).scheduleText).toBe(
      'Court 2 · 10:30'
    );
    expect(operatorMatchText({ ...operatorMatchFixture, schedule: { time: '10:30' } }).scheduleText).toContain(
      'Time zone unavailable'
    );
  });
  it('labels only the producer-supplied winner for assistive technology', () => {
    const sides = operatorMatchText(operatorMatchFixture).sides;
    expect(sides[0].winnerLabel).toBe('Winner');
    expect(sides[1].winnerLabel).toBeUndefined();
  });

  it('accepts localized UI wording without changing producer facts', () => {
    const text = operatorMatchText(operatorMatchFixture, {
      ...defaultOperatorLabels,
      openMatch: 'Ouvrir',
      versus: 'contre'
    });
    expect(text.accessibleName).toBe('Ouvrir: Alex Morgan contre Sam Rivera');
    expect(text.sides[0].isWinner).toBe(operatorMatchFixture.sides[0].isWinner);
    expect(operatorMatchFixture.sides[0].name).toBe('Alex Morgan');
  });
});

describe('operator day facets and independent view state', () => {
  it('never infers Ready from an unplayed status', () => {
    const unplayed = [{ ...operatorMatchFixture, status: 'TO_BE_PLAYED' }];
    expect(operatorDayGroups(unplayed, {}, 'ready', 'court')).toEqual([]);
    expect(operatorDayGroups(unplayed, {}, 'other', 'court')[0].matches).toHaveLength(1);
  });
  it('selects the supplied Ready bucket and groups naturally without mutating delivered rows', () => {
    const before = JSON.stringify(operatorBusyDayFixture);
    const groups = operatorDayGroups(operatorBusyDayFixture, operatorBusyDetails, 'ready', 'court');
    expect(groups).toHaveLength(8);
    expect(groups.flatMap((group) => group.matches)).toHaveLength(32);
    expect(groups.map((group) => group.label)).toEqual(Array.from({ length: 8 }, (_, i) => `Court ${i + 1}`));
    expect(JSON.stringify(operatorBusyDayFixture)).toBe(before);
  });
  it('keeps equally named courts at separate venues apart', () => {
    const matches = [
      operatorMatchFixture,
      {
        ...operatorMatchFixture,
        matchUpId: 'elsewhere',
        schedule: { ...operatorMatchFixture.schedule, venue: 'Other venue' }
      }
    ];
    expect(operatorDayGroups(matches, {}, 'all', 'court')).toHaveLength(2);
  });
  it('now uses the supplied venue clock and refuses a different day or missing zone', () => {
    expect(operatorNowMatch(operatorBusyDayFixture, operatorDayFrame)).toBe('density-match-33');
    expect(
      operatorNowMatch(operatorBusyDayFixture, { ...operatorDayFrame, now: { date: '2026-11-21', time: '11:00' } })
    ).toBeUndefined();
    expect(operatorNowMatch(operatorBusyDayFixture, { ...operatorDayFrame, timeZone: undefined })).toBeUndefined();
  });
  it('grades freshness independently of read-only access', () => {
    expect(operatorFreshness({ access: 'read-only', freshness: 'current' }, defaultOperatorLabels).severity).toBe(
      'quiet'
    );
    expect(operatorFreshness({ freshness: 'projection-pending' }, defaultOperatorLabels).severity).toBe('quiet');
    expect(operatorFreshness({ freshness: 'outcome-unknown' }, defaultOperatorLabels).severity).toBe('warning');
    expect(operatorFreshness({ freshness: 'unavailable' }, defaultOperatorLabels).severity).toBe('error');
    expect(
      operatorFreshness({ updatedAt: '2026-11-20T16:02:00Z' }, defaultOperatorLabels, operatorDayFrame).updated
    ).toBe('Last updated 11:02');
  });
  it('jumps directly by round identity, not ordinal array index', () => {
    expect(selectOperatorRound(3, operatorDrawFixture)).toEqual({ roundNumber: 3 });
    expect(selectOperatorRound(99, operatorDrawFixture)).toEqual({ roundNumber: 1 });
  });
  it('unknown status codes do not leak raw implementation values', () => {
    expect(operatorMatchText({ ...operatorMatchFixture, status: 'SOME_FUTURE_CODE' }).statusText).toBe(
      'Status unavailable'
    );
    expect(
      operatorMatchText(operatorMatchFixture, { ...defaultOperatorLabels, statuses: { COMPLETED: 'Terminé' } })
        .statusText
    ).toBe('Terminé');
  });
});
