import { fromFactoryDrawData, pickProgressionStructure } from '../matchUpTransform';
import { describe, expect, it } from 'vitest';

// Enriched-structure shapes mirroring getEventData().drawsData[i].structures[j]:
// round-robin → finishingPosition WIN_RATIO + structureType CONTAINER;
// elimination → finishingPosition ROUND_OUTCOME.
const rrMain = { stage: 'MAIN', finishingPosition: 'WIN_RATIO', structureType: 'CONTAINER' };
const rrQualifying = { stage: 'QUALIFYING', finishingPosition: 'WIN_RATIO', structureType: 'CONTAINER' };
const seMain = { stage: 'MAIN', finishingPosition: 'ROUND_OUTCOME', roundMatchUps: { 1: [], 2: [] } };
const playOff = { stage: 'PLAY_OFF', finishingPosition: 'ROUND_OUTCOME', roundMatchUps: { 1: [] } };
const consolation = { stage: 'CONSOLATION', finishingPosition: 'ROUND_OUTCOME' };

describe('pickProgressionStructure', () => {
  it('returns the MAIN single-elimination structure for a plain SE draw', () => {
    expect(pickProgressionStructure([seMain])).toBe(seMain);
  });

  it('picks the MAIN elimination structure over an RR qualifying structure', () => {
    expect(pickProgressionStructure([rrQualifying, seMain])).toBe(seMain);
  });

  it('picks the playoff bracket when MAIN is round-robin (RR + playoff)', () => {
    expect(pickProgressionStructure([rrMain, playOff])).toBe(playOff);
  });

  it('returns undefined for a pure round-robin draw (no elimination bracket)', () => {
    expect(pickProgressionStructure([rrMain])).toBeUndefined();
  });

  it('prefers MAIN over other elimination structures (e.g. consolation)', () => {
    expect(pickProgressionStructure([seMain, consolation])).toBe(seMain);
  });

  it('returns undefined for empty / missing input', () => {
    expect(pickProgressionStructure([])).toBeUndefined();
    expect(pickProgressionStructure(undefined)).toBeUndefined();
  });
});

describe('fromFactoryDrawData round-robin guard', () => {
  it('returns empty data for a round-robin structure (never a force-fit bracket)', () => {
    const rrWithRounds = {
      finishingPosition: 'WIN_RATIO',
      structureType: 'CONTAINER',
      roundMatchUps: { 1: [], 2: [], 3: [] }
    };
    expect(fromFactoryDrawData(rrWithRounds)).toEqual({ drawSize: 0, roundMatchUps: {} });
  });

  it('still transforms a structure without finishingPosition (legacy / hand-built)', () => {
    // Backward-compat: the guard rejects only DEFINITE round-robin, so an
    // ambiguous structure (no finishingPosition) transforms as before.
    const legacyLike = { roundMatchUps: { 1: [{ winningSide: 1, sides: [] }] } };
    const result = fromFactoryDrawData(legacyLike);
    expect(result.drawSize).toBe(2);
    expect(Object.keys(result.roundMatchUps)).toEqual(['1']);
  });
});
