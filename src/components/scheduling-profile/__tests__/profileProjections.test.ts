import { describe, it, expect } from 'vitest';
import {
  getVenueRounds,
  getRoundAt,
  findIssuesForLocator,
  maxSeverity,
  findRoundInProfile
} from '../domain/profileProjections';
import type { SchedulingProfile, RoundLocator, ValidationResult } from '../types';

const DAY1 = '2026-06-15';

const profile: SchedulingProfile = [
  {
    scheduleDate: DAY1,
    venues: [
      {
        venueId: 'V1',
        rounds: [
          { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
          { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 6, roundName: 'R16' }
        ]
      },
      { venueId: 'V2', rounds: [] }
    ]
  }
];

describe('getVenueRounds', () => {
  it('returns rounds for matching venue and date', () => {
    const rounds = getVenueRounds(profile, DAY1, 'V1');
    expect(rounds).toHaveLength(2);
    expect(rounds[0].roundName).toBe('R32');
  });

  it('returns empty array for non-existent venue', () => {
    expect(getVenueRounds(profile, DAY1, 'V99')).toEqual([]);
  });

  it('returns empty array for non-existent date', () => {
    expect(getVenueRounds(profile, '2026-06-20', 'V1')).toEqual([]);
  });
});

describe('getRoundAt', () => {
  it('returns the round at the locator', () => {
    const loc: RoundLocator = {
      date: DAY1,
      venueId: 'V1',
      index: 1,
      roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 6 }
    };
    const round = getRoundAt(profile, loc);
    expect(round).not.toBeNull();
    expect(round!.roundName).toBe('R16');
  });

  it('returns null for out-of-bounds index', () => {
    const loc: RoundLocator = {
      date: DAY1,
      venueId: 'V1',
      index: 99,
      roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 }
    };
    expect(getRoundAt(profile, loc)).toBeNull();
  });
});

describe('findIssuesForLocator', () => {
  const locator: RoundLocator = {
    date: DAY1,
    venueId: 'V1',
    index: 0,
    roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 }
  };

  it('returns matching issues', () => {
    const results: ValidationResult[] = [
      {
        code: 'DUPLICATE_ROUND',
        severity: 'ERROR',
        message: 'Dup',
        context: { locator }
      },
      {
        code: 'ROUND_ORDER_VIOLATION',
        severity: 'ERROR',
        message: 'Order',
        context: { locator: { ...locator, index: 1 } }
      }
    ];
    expect(findIssuesForLocator(results, locator)).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    const results: ValidationResult[] = [
      {
        code: 'DATE_UNAVAILABLE',
        severity: 'ERROR',
        message: 'Unavailable',
        context: { date: DAY1 }
      }
    ];
    expect(findIssuesForLocator(results, locator)).toHaveLength(0);
  });
});

describe('maxSeverity', () => {
  it('returns null for empty list', () => {
    expect(maxSeverity([])).toBeNull();
  });

  it('returns ERROR when errors exist', () => {
    const results: ValidationResult[] = [
      { code: 'DUPLICATE_ROUND', severity: 'ERROR', message: 'E', context: {} },
      { code: 'DAY_OVERLOAD', severity: 'WARN', message: 'W', context: {} }
    ];
    expect(maxSeverity(results)).toBe('ERROR');
  });

  it('returns WARN when only warnings exist', () => {
    const results: ValidationResult[] = [{ code: 'DAY_OVERLOAD', severity: 'WARN', message: 'W', context: {} }];
    expect(maxSeverity(results)).toBe('WARN');
  });

  it('returns INFO when only info exists', () => {
    const results: ValidationResult[] = [{ code: 'DAY_OVERLOAD', severity: 'INFO', message: 'I', context: {} }];
    expect(maxSeverity(results)).toBe('INFO');
  });
});

describe('findRoundInProfile', () => {
  it('finds a round by key and returns its locator', () => {
    const locator = findRoundInProfile(profile, {
      tournamentId: 'T1',
      eventId: 'E1',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 6
    });
    expect(locator).not.toBeNull();
    expect(locator!.date).toBe(DAY1);
    expect(locator!.venueId).toBe('V1');
    expect(locator!.index).toBe(1);
  });

  it('returns null for a round not in the profile', () => {
    const locator = findRoundInProfile(profile, {
      tournamentId: 'T1',
      eventId: 'E1',
      drawId: 'D99',
      structureId: 'S1',
      roundNumber: 5
    });
    expect(locator).toBeNull();
  });
});
