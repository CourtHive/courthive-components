import { drawDefinitionConstants, mocksEngine } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';
import {
  defaultProfile,
  isRoundProfileEditable,
  losersLeavingRound,
  luckyLosersNeeded,
  roundRange,
  sanitizeProfile,
  setRound,
  validateRoundProfile
} from '../roundProfileLogic';

const { LUCKY_DRAW } = drawDefinitionConstants;

// The scenarios TMX's round-profile stories showed (moved here 2026-11-08), as assertions, and the factory's own
// example: drawSize 40 as [20, 12, 8, 4, 2, 1] — R1 → R2 takes 4 lucky losers, R2 → R3 takes 4.

describe('defaultProfile — the ceil-halving cascade a LUCKY_DRAW plays without a profile', () => {
  it.each([
    [32, [16, 8, 4, 2, 1]],
    [40, [20, 10, 5, 3, 2, 1]],
    [64, [32, 16, 8, 4, 2, 1]],
    [2, [1]],
    [6, [3, 2, 1]]
  ])('drawSize %i → %j', (drawSize, expected) => {
    expect(defaultProfile(drawSize)).toEqual(expected);
  });

  it.each([11, 1, 0, -4, 7.5])('an odd, sub-2 or fractional drawSize (%s) has no profile', (drawSize) => {
    expect(defaultProfile(drawSize)).toEqual([]);
    expect(isRoundProfileEditable(drawSize)).toBe(false);
  });

  it('a power of 2 needs no lucky losers anywhere', () => {
    const profile = defaultProfile(32);
    for (let i = 0; i < profile.length - 1; i++) expect(luckyLosersNeeded(profile[i], profile[i + 1])).toBe(0);
  });
});

describe('luckyLosersNeeded — the next round slots less this round winners', () => {
  it('reads the factory example: [20, 12, 8, 4, 2, 1] takes 4, then 4, then none', () => {
    const profile = [20, 12, 8, 4, 2, 1];
    const needed = profile.slice(0, -1).map((n, i) => luckyLosersNeeded(n, profile[i + 1]));
    expect(needed).toEqual([4, 4, 0, 0, 0]);
  });

  it('a ceil-halving step from an odd round takes one', () => {
    expect(luckyLosersNeeded(5, 3)).toBe(1);
  });
});

describe('sanitizeProfile — a supplied profile clamped to what the factory accepts', () => {
  it.each([
    [40, [20, 12, 8, 4, 2, 1]],
    [64, [32, 20, 10, 5, 3, 2, 1]]
  ])('keeps a valid custom profile as given (drawSize %i)', (drawSize, profile) => {
    expect(sanitizeProfile(profile, drawSize)).toEqual(profile);
    expect(validateRoundProfile(profile, drawSize)).toBeUndefined();
  });

  it('falls back to the default when the first round is not drawSize / 2', () => {
    expect(sanitizeProfile([10, 5, 3, 2, 1], 40)).toEqual(defaultProfile(40));
  });

  it('clamps a round below half the one before up, and one above it down', () => {
    expect(sanitizeProfile([20, 4, 2, 1], 40)).toEqual([20, 10, 5, 3, 2, 1]);
    expect(sanitizeProfile([20, 30, 2, 1], 40)).toEqual([20, 20, 10, 5, 3, 2, 1]);
  });

  it('drops values past the first 1 and extends a profile that stops short', () => {
    expect(sanitizeProfile([20, 12, 6, 3, 2, 1, 1, 1], 40)).toEqual([20, 12, 6, 3, 2, 1]);
    expect(sanitizeProfile([20, 12], 40)).toEqual([20, 12, 6, 3, 2, 1]);
  });

  it('has nothing to offer an odd drawSize', () => {
    expect(sanitizeProfile([5, 3, 2, 1], 11)).toEqual([]);
  });
});

describe('setRound — editing a round re-defaults the rounds after it', () => {
  it('sets R2 of drawSize 40 to 12 and cascades down by ceil-halving', () => {
    expect(setRound(defaultProfile(40), 1, 12)).toEqual([20, 12, 6, 3, 2, 1]);
  });

  it('clamps the value into the round range before cascading', () => {
    expect(roundRange(20)).toEqual({ min: 10, max: 20 });
    expect(setRound(defaultProfile(40), 1, 99)).toEqual([20, 20, 10, 5, 3, 2, 1]);
    expect(setRound(defaultProfile(40), 1, 2)).toEqual([20, 10, 5, 3, 2, 1]);
  });

  it('leaves the first round and the final alone', () => {
    const profile = defaultProfile(40);
    expect(setRound(profile, 0, 7)).toEqual(profile);
    expect(setRound(profile, profile.length - 1, 7)).toEqual(profile);
  });
});

describe('validateRoundProfile — the factory rules, as reasons a host can translate', () => {
  it.each([
    [[5, 3, 2, 1], 11, { code: 'EVEN_DRAW_SIZE_REQUIRED', drawSize: 11 }],
    [[20, 10, 5, 3, 2], 40, { code: 'MUST_END_AT_ONE' }],
    [[10, 5, 3, 2, 1], 40, { code: 'FIRST_ROUND_MISMATCH', firstRoundSlots: 20, drawSize: 40 }],
    [[20, 9, 5, 3, 2, 1], 40, { code: 'DROPS_WINNERS', round: 2, slots: 18, winners: 20 }],
    [[20, 24, 12, 6, 3, 2, 1], 40, { code: 'EXCEEDS_PREVIOUS_ROUND', round: 2, matchUps: 24, previous: 20 }]
  ])('%j for drawSize %i → %o', (profile, drawSize, problem) => {
    expect(validateRoundProfile(profile, drawSize)).toEqual(problem);
  });
});

describe('losersLeavingRound — losers who leave, less those taken back as lucky losers', () => {
  it('counts each round of [20, 12, 8, 4, 2, 1]: 20 − 4 LL, 12 − 4 LL, then every loser leaves', () => {
    const profile = [20, 12, 8, 4, 2, 1];
    expect(profile.map((_, i) => losersLeavingRound(profile, i + 1))).toEqual([16, 8, 8, 4, 2, 1]);
  });

  it('is zero outside the profile', () => {
    expect(losersLeavingRound([20, 10, 5, 3, 2, 1], 0)).toBe(0);
    expect(losersLeavingRound([20, 10, 5, 3, 2, 1], 7)).toBe(0);
  });
});

/**
 * Parity with the factory itself, not with a description of it: every profile this module calls valid, the factory
 * generates — with the matchUps per round the profile names — and every profile the factory refuses, this module
 * refuses. (This module is stricter in one place, a round larger than the one before, which the factory leaves to the
 * lucky-loser supply; those are the only profiles allowed to be refused here and generated there.)
 */
describe('validateRoundProfile agrees with the factory', () => {
  const generate = (drawSize: number, roundProfile: number[]) => {
    const result: any = mocksEngine.generateTournamentRecord({
      drawProfiles: [{ drawSize, drawType: LUCKY_DRAW, roundProfile }],
      setState: false
    });
    const drawDefinition = result.tournamentRecord?.events?.[0]?.drawDefinitions?.[0];
    const matchUps: any[] = drawDefinition?.structures?.[0]?.matchUps ?? [];
    const perRound: number[] = [];
    for (const matchUp of matchUps) perRound[matchUp.roundNumber - 1] = (perRound[matchUp.roundNumber - 1] ?? 0) + 1;
    return { generated: !result.error && matchUps.length > 0, perRound };
  };

  const candidates: Array<[number, number[]]> = [
    [40, [20, 12, 8, 4, 2, 1]],
    [40, [20, 10, 5, 3, 2, 1]],
    [64, [32, 20, 10, 5, 3, 2, 1]],
    [24, [12, 6, 3, 2, 1]],
    [40, [20, 9, 5, 3, 2, 1]], // drops winners
    [40, [10, 5, 3, 2, 1]], // first round mismatch
    [40, [20, 10, 5, 3, 2]], // does not end at 1
    [40, [20, 24, 12, 6, 3, 2, 1]] // larger than the round before
  ];

  it.each(candidates)('drawSize %i, %j', (drawSize, profile) => {
    const problem = validateRoundProfile(profile, drawSize);
    const { generated, perRound } = generate(drawSize, profile);
    if (!problem) {
      expect(generated).toBe(true);
      expect(perRound).toEqual(profile);
    } else if (problem.code !== 'EXCEEDS_PREVIOUS_ROUND') {
      expect(generated).toBe(false);
    }
  });
});
