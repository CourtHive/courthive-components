import { firstCoordinate, toCoordinate } from '../coordinates';
import { describe, expect, it } from 'vitest';

describe('toCoordinate', () => {
  it('passes finite numbers through', () => {
    // The live Rick Macci Tennis Academy pin, stored as numbers.
    expect(toCoordinate(26.3816192)).toBe(26.3816192);
    expect(toCoordinate(-80.2219808)).toBe(-80.2219808);
    expect(toCoordinate(0)).toBe(0);
  });

  it('coerces numeric strings, which is the whole point', () => {
    // TODS/CODES declared these as string and some producers still emit strings;
    // gating on typeof === 'number' silently dropped them.
    expect(toCoordinate('26.3816192')).toBe(26.3816192);
    expect(toCoordinate('-80.2219808')).toBe(-80.2219808);
    expect(toCoordinate(' 49.955 ')).toBe(49.955);
    expect(toCoordinate('0.0')).toBe(0);
  });

  it('rejects strings that are not wholly numeric', () => {
    // Number() rather than parseFloat, so trailing junk is rejected outright
    // instead of silently yielding 12.
    expect(toCoordinate('12abc')).toBeUndefined();
    expect(toCoordinate('N 26.38')).toBeUndefined();
    expect(toCoordinate('')).toBeUndefined();
    expect(toCoordinate('   ')).toBeUndefined();
  });

  it('rejects non-finite and non-scalar values', () => {
    expect(toCoordinate(NaN)).toBeUndefined();
    expect(toCoordinate(Infinity)).toBeUndefined();
    expect(toCoordinate(undefined)).toBeUndefined();
    expect(toCoordinate(null)).toBeUndefined();
    expect(toCoordinate({})).toBeUndefined();
    expect(toCoordinate([])).toBeUndefined();
    expect(toCoordinate(true)).toBeUndefined();
  });
});

describe('firstCoordinate', () => {
  it('returns the first value that coerces', () => {
    expect(firstCoordinate(undefined, '49.955', 15.79)).toBe(49.955);
    expect(firstCoordinate(null, 26.38)).toBe(26.38);
  });

  it('skips values that cannot coerce', () => {
    expect(firstCoordinate('not a number', '', 15.79)).toBe(15.79);
  });

  it('returns undefined when nothing coerces', () => {
    expect(firstCoordinate(undefined, null, 'abc')).toBeUndefined();
    expect(firstCoordinate()).toBeUndefined();
  });

  it('treats 0 as a usable coordinate, not as absent', () => {
    // The equator/prime meridian are valid; a truthiness check would drop them.
    expect(firstCoordinate(0, 15.79)).toBe(0);
    expect(firstCoordinate('0', 15.79)).toBe(0);
  });
});
