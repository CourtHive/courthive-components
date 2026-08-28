import { describe, it, expect } from 'vitest';

import { resolveParticipantRating, ratingToElo } from '../ratingScale';

/**
 * Shapes here are copied from REAL records in production (ITA regional
 * championships, tournament 31181), not invented. The string-valued rating is
 * the whole point: mocksEngine emits `{ utrRating: 12.48 }` while every real
 * ingested record carries `{ utrRating: '12.48' }`, so a synthetic-only fixture
 * cannot catch the gate that rejected them.
 */

const REAL_ITA_RATINGS = {
  SINGLES: [{ scaleValue: { utrRating: '12.48' }, scaleName: 'UTR' }],
  // Real players with no doubles rating carry an EMPTY STRING, not a missing key.
  DOUBLES: [{ scaleValue: { utrRating: '' }, scaleName: 'UTR' }]
};

describe('resolveParticipantRating — production shapes', () => {
  it('reads a STRING rating, as every real ingested record stores it', () => {
    const rating = resolveParticipantRating({ participant: { ratings: REAL_ITA_RATINGS } });
    expect(rating).not.toBeNull();
    expect(rating?.scaleName).toBe('UTR');
    expect(rating?.sourceValue).toBe(12.48);
    expect(rating?.elo).toBeCloseTo(ratingToElo({ scaleName: 'UTR', value: 12.48 }) as number, 10);
  });

  it('still reads a NUMBER rating, as mocksEngine emits it', () => {
    const rating = resolveParticipantRating({
      participant: { ratings: { SINGLES: [{ scaleValue: { utrRating: 12.48 }, scaleName: 'UTR' }] } }
    });
    expect(rating?.sourceValue).toBe(12.48);
  });

  it('rejects an EMPTY-STRING rating rather than reading it as zero', () => {
    // The trap: Number('') is 0, which on UTR's [1,16] range would rate the
    // player below the floor — i.e. the weakest in any field, silently.
    const rating = resolveParticipantRating({
      participant: { ratings: REAL_ITA_RATINGS },
      matchUpType: 'DOUBLES'
    });
    expect(rating).toBeNull();
  });

  it('rejects a non-numeric string rather than coercing it', () => {
    const rating = resolveParticipantRating({
      participant: { ratings: { SINGLES: [{ scaleValue: { utrRating: 'unrated' }, scaleName: 'UTR' }] } }
    });
    expect(rating).toBeNull();
  });

  it('reads a bare scalar scaleValue in either representation', () => {
    for (const scaleValue of [1500, '1500']) {
      const rating = resolveParticipantRating({
        participant: { ratings: { SINGLES: [{ scaleValue, scaleName: 'ELO' }] } }
      });
      expect(rating?.sourceValue).toBe(1500);
      expect(rating?.elo).toBe(1500);
    }
  });

  it('returns null when the ratings block is present but empty — the stored shape', () => {
    // Records store `ratings: {}` and keep the value in timeItems until a query
    // hydrates it with `withScaleValues`. Refusing here is correct.
    expect(resolveParticipantRating({ participant: { ratings: {} } })).toBeNull();
  });

  it('prefers the requested scale when a participant carries several', () => {
    const participant = {
      ratings: {
        SINGLES: [
          { scaleValue: { utrRating: '12.48' }, scaleName: 'UTR' },
          { scaleValue: 1800, scaleName: 'ELO' }
        ]
      }
    };
    expect(resolveParticipantRating({ participant, preferredScaleName: 'ELO' })?.scaleName).toBe('ELO');
    expect(resolveParticipantRating({ participant })?.scaleName).toBe('UTR');
  });
});
