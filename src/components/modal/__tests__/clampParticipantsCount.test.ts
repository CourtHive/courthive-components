import { clampParticipantsCount, PARTICIPANTS_COUNT_MAX, PARTICIPANTS_COUNT_PRESETS } from '../mockParticipants';
import { describe, expect, it } from 'vitest';

describe('clampParticipantsCount', () => {
  it('passes a typed count between the presets through unchanged', () => {
    expect(clampParticipantsCount('40')).toBe(40);
    expect(clampParticipantsCount(40)).toBe(40);
    expect(clampParticipantsCount(' 12 ')).toBe(12);
  });

  it('caps at the maximum and floors at one', () => {
    expect(clampParticipantsCount('500')).toBe(PARTICIPANTS_COUNT_MAX);
    expect(clampParticipantsCount('0')).toBe(1);
    expect(clampParticipantsCount('-8')).toBe(1);
  });

  it('rounds a fractional entry to a whole participant', () => {
    expect(clampParticipantsCount('40.4')).toBe(40);
    expect(clampParticipantsCount('40.6')).toBe(41);
  });

  it('falls back to the default for an empty or non-numeric field, clamped too', () => {
    expect(clampParticipantsCount('')).toBe(32);
    expect(clampParticipantsCount('abc', 64)).toBe(64);
    expect(clampParticipantsCount(undefined, 1000)).toBe(PARTICIPANTS_COUNT_MAX);
  });

  it('keeps every preset inside the clamp range', () => {
    for (const preset of PARTICIPANTS_COUNT_PRESETS) expect(clampParticipantsCount(preset)).toBe(preset);
  });
});
