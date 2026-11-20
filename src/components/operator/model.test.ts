import { operatorDrawFixture, operatorMatchFixture } from './fixtures';
import { describe, expect, it } from 'vitest';
import {
  defaultOperatorLabels,
  moveOperatorRound,
  operatorMatchText,
  reconcileOperatorRound,
  operatorDateLabel
} from './model';

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
    expect(operatorMatchText(operatorMatchFixture).scheduleText).toContain('10:30 (America/New_York)');
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
