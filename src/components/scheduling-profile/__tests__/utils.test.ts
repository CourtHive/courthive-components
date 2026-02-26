import { describe, it, expect } from 'vitest';
import { deepClone, clamp, roundKeyString, roundLabel, sameLocator, pickRoundKey } from '../domain/utils';
import type { RoundProfile, RoundLocator } from '../types';

describe('deepClone', () => {
  it('returns a structurally equal but referentially distinct copy', () => {
    const obj = { a: 1, nested: { b: [2, 3] } };
    const copy = deepClone(obj);
    expect(copy).toEqual(obj);
    expect(copy).not.toBe(obj);
    expect(copy.nested).not.toBe(obj.nested);
  });
});

describe('clamp', () => {
  it('clamps below range', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps above range', () => expect(clamp(15, 0, 10)).toBe(10));
  it('passes through in-range', () => expect(clamp(5, 0, 10)).toBe(5));
  it('handles equal bounds', () => expect(clamp(5, 3, 3)).toBe(3));
});

describe('roundKeyString', () => {
  it('produces a pipe-separated key', () => {
    const r: RoundProfile = {
      tournamentId: 'T1',
      eventId: 'E1',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 5,
    };
    expect(roundKeyString(r)).toBe('T1|E1|D1|S1|5');
  });
});

describe('roundLabel', () => {
  it('uses eventName and roundName', () => {
    const r: RoundProfile = {
      tournamentId: 'T1',
      eventId: 'E1',
      eventName: 'Boys U16',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 5,
      roundName: 'QF',
    };
    expect(roundLabel(r)).toBe('Boys U16 \u2013 QF');
  });

  it('falls back to "Round N" when roundName is missing', () => {
    const r: RoundProfile = {
      tournamentId: 'T1',
      eventId: 'E1',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 3,
    };
    expect(roundLabel(r)).toBe('Round 3');
  });

  it('includes segment info', () => {
    const r: RoundProfile = {
      tournamentId: 'T1',
      eventId: 'E1',
      eventName: 'Boys U16',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 5,
      roundName: 'R32',
      roundSegment: { segmentNumber: 1, segmentsCount: 2 },
    };
    expect(roundLabel(r)).toBe('Boys U16 \u2013 R32 (seg 1/2)');
  });
});

describe('sameLocator', () => {
  const loc: RoundLocator = {
    date: '2026-06-15',
    venueId: 'V1',
    index: 0,
    roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
  };

  it('returns true for matching locators', () => {
    const other: RoundLocator = { ...loc };
    expect(sameLocator(loc, other)).toBe(true);
  });

  it('returns false for different index', () => {
    expect(sameLocator(loc, { ...loc, index: 1 })).toBe(false);
  });

  it('returns false for null', () => {
    expect(sameLocator(null, loc)).toBe(false);
    expect(sameLocator(loc, null)).toBe(false);
  });
});

describe('pickRoundKey', () => {
  it('extracts the key fields', () => {
    const r: RoundProfile = {
      tournamentId: 'T1',
      eventId: 'E1',
      eventName: 'Test',
      drawId: 'D1',
      drawName: 'Main',
      structureId: 'S1',
      roundNumber: 7,
      roundName: 'QF',
    };
    expect(pickRoundKey(r)).toEqual({
      tournamentId: 'T1',
      eventId: 'E1',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 7,
    });
  });
});
