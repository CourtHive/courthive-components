/**
 * The inline scorer against the factory's scoring v1 fixes (tods-competition-factory 7.16.0: #5612, #5614
 * and #5618 in CourtHive/competition-factory):
 * - `addSet` refuses a total that is not a fact: the manager records nothing and returns undefined.
 * - a baseline that decides the match completes it; one whose status disagrees with its sets is refused,
 *   and the manager starts fresh with the persisted score still shown.
 * - a match can end level with no winner, so `onMatchComplete` and the matchUp carry no winningSide.
 * - `getInputMode()` counts only point, game and set entries.
 */
import { InlineScoringManager } from '../inlineScoringManager';
import { describe, expect, it } from 'vitest';

// constants and types
import type { MatchUp } from '../../../types';

const STANDARD_FORMAT = 'SET3-S:6/TB7';
const EXACTLY_TWO_HALVES = 'HAL2X-S:TB11';
const MATCH_UP_ID = 'mu-1';

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: MATCH_UP_ID,
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    matchUpStatus: 'IN_PROGRESS',
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
    ],
    ...overrides
  } as MatchUp;
}

function recordingManager() {
  const changes: any[] = [];
  const completions: any[] = [];
  const manager = new InlineScoringManager({
    onScoreChange: (params) => changes.push(params),
    onMatchComplete: (params) => completions.push(params)
  });
  return { manager, changes, completions };
}

const decidedSets = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
];

describe('addSet: a total the engine refuses', () => {
  it.each([
    ['a non-integer', 6.5, 2],
    ['a negative', -1, 6],
    ['a NaN', Number.NaN, 6]
  ])('%s total records nothing, returns undefined and does not throw', (_label, side1Score, side2Score) => {
    const { manager, changes } = recordingManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    expect(() => manager.addSet(MATCH_UP_ID, side1Score, side2Score, matchUp)).not.toThrow();
    expect(manager.addSet(MATCH_UP_ID, side1Score, side2Score, matchUp)).toBeUndefined();
    expect(changes).toHaveLength(0);
    expect(manager.get(MATCH_UP_ID)!.engine.getInputMode()).toBe('none');
    expect(manager.canUndo(MATCH_UP_ID)).toBe(false);
  });

  it('control: a valid total is recorded and announced', () => {
    const { manager, changes } = recordingManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    const result = manager.addSet(MATCH_UP_ID, 6, 4, matchUp);
    expect(result?.score?.sets?.[0]).toMatchObject({ side1Score: 6, side2Score: 4, winningSide: 1 });
    expect(changes).toHaveLength(1);
  });

  it('a refused total after a valid one leaves the valid one in place', () => {
    const { manager } = recordingManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);
    manager.addSet(MATCH_UP_ID, 6, 4, matchUp);

    expect(manager.addSet(MATCH_UP_ID, 6.5, 2, matchUp)).toBeUndefined();
    const sets = manager.getMatchUp(MATCH_UP_ID, matchUp).score?.sets ?? [];
    expect(sets[0]).toMatchObject({ side1Score: 6, side2Score: 4, winningSide: 1 });
    expect(sets.filter((set: any) => set.winningSide)).toHaveLength(1);
  });
});

describe('a match that ends level: no winningSide is assumed', () => {
  it('one half each of HAL2X-S:TB11 completes the match, and onMatchComplete has no winner', () => {
    const { manager, completions } = recordingManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate(MATCH_UP_ID, EXACTLY_TWO_HALVES, matchUp);

    manager.addSet(MATCH_UP_ID, 11, 5, matchUp);
    expect(completions).toHaveLength(0);
    const result = manager.addSet(MATCH_UP_ID, 5, 11, matchUp);

    expect(manager.isComplete(MATCH_UP_ID)).toBe(true);
    expect(completions).toHaveLength(1);
    expect(completions[0].winningSide).toBeUndefined();
    expect(result?.matchUpStatus).toBe('COMPLETED');
    expect(result?.winningSide).toBeUndefined();
  });

  it("the base matchUp's winningSide does not stand in for a level result", () => {
    const { manager } = recordingManager();
    const staleBase = makeMatchUp({ winningSide: 1 });
    manager.getOrCreate(MATCH_UP_ID, EXACTLY_TWO_HALVES);

    manager.addSet(MATCH_UP_ID, 11, 5, staleBase);
    const result = manager.addSet(MATCH_UP_ID, 5, 11, staleBase);
    expect(result?.matchUpStatus).toBe('COMPLETED');
    expect(result?.winningSide).toBeUndefined();
  });

  it('control: two halves won by one side complete with that winner', () => {
    const { manager, completions } = recordingManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate(MATCH_UP_ID, EXACTLY_TWO_HALVES, matchUp);

    manager.addSet(MATCH_UP_ID, 5, 11, matchUp);
    const result = manager.addSet(MATCH_UP_ID, 7, 11, matchUp);
    expect(completions).toHaveLength(1);
    expect(completions[0].winningSide).toBe(2);
    expect(result?.winningSide).toBe(2);
  });
});

describe('the baseline from a persisted score', () => {
  it('a COMPLETED matchUp loads complete: its winner stands and no further input is taken', () => {
    const { manager, changes } = recordingManager();
    const matchUp = makeMatchUp({
      matchUpStatus: 'COMPLETED',
      winningSide: 1,
      score: { sets: decidedSets }
    } as any);
    manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    expect(manager.isComplete(MATCH_UP_ID)).toBe(true);
    expect(manager.addPoint(MATCH_UP_ID, 0, matchUp)).toBeUndefined();
    expect(manager.addGame(MATCH_UP_ID, 0, matchUp)).toBeUndefined();
    expect(manager.addSet(MATCH_UP_ID, 6, 0, matchUp)).toBeUndefined();
    expect(changes).toHaveLength(0);

    const shown = manager.getMatchUp(MATCH_UP_ID, matchUp);
    expect(shown.matchUpStatus).toBe('COMPLETED');
    expect(shown.winningSide).toBe(1);
    expect(shown.score?.sets).toEqual(decidedSets);
  });

  it.each([
    ['IN_PROGRESS beside sets that decide the match', 'IN_PROGRESS', decidedSets],
    ['COMPLETED beside sets that do not', 'COMPLETED', [decidedSets[0]]]
  ])('a status that disagrees (%s) starts fresh without throwing', (_label, matchUpStatus, sets) => {
    const { manager } = recordingManager();
    const matchUp = makeMatchUp({ matchUpStatus, score: { sets } } as any);

    expect(() => manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp)).not.toThrow();
    const { engine } = manager.get(MATCH_UP_ID)!;
    expect(engine.isComplete()).toBe(false);
    expect(engine.getInputMode()).toBe('none');
    expect(manager.canUndo(MATCH_UP_ID)).toBe(false);

    // the persisted score is still what is shown, until the first input
    expect(manager.getMatchUp(MATCH_UP_ID, matchUp).score?.sets).toEqual(sets);

    // the first input scores from love: the refused baseline is not in the engine
    const after = manager.addPoint(MATCH_UP_ID, 0, matchUp);
    expect(after?.score?.sets?.[0]).toMatchObject({ side1Score: 0, side2Score: 0, side1PointScore: '15' });
  });
});

describe('getInputMode counts only point, game and set entries', () => {
  const inProgress = [
    { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
    { setNumber: 2, side1Score: 2, side2Score: 1, side1PointScore: '30', side2PointScore: '15' }
  ];

  it("a server correction alone is 'none': the persisted score, point scores included, is kept", () => {
    const { manager } = recordingManager();
    const matchUp = makeMatchUp({ score: { sets: inProgress } } as any);
    const { engine } = manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    engine.setServer(1);
    expect(engine.getInputMode()).toBe('none');
    expect(manager.getMatchUp(MATCH_UP_ID, matchUp).score?.sets).toEqual(inProgress);
  });

  it("games beside a correction are 'games': the active set shows no live point score", () => {
    const { manager } = recordingManager();
    const matchUp = makeMatchUp();
    const { engine } = manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    engine.setServer(1);
    manager.addGame(MATCH_UP_ID, 0, matchUp);
    expect(engine.getInputMode()).toBe('games');

    const active = manager.getMatchUp(MATCH_UP_ID, matchUp).score?.sets?.at(-1);
    expect(active).toMatchObject({ side1Score: 1, side2Score: 0, side1PointScore: '0', side2PointScore: '0' });
  });

  it("sets beside a correction are 'sets'", () => {
    const { manager } = recordingManager();
    const matchUp = makeMatchUp();
    const { engine } = manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    engine.setServer(1);
    manager.addSet(MATCH_UP_ID, 6, 4, matchUp);
    expect(engine.getInputMode()).toBe('sets');
  });

  it("control: points beside games are still 'mixed', and points inject the live point score", () => {
    const { manager } = recordingManager();
    const matchUp = makeMatchUp();
    const { engine } = manager.getOrCreate(MATCH_UP_ID, STANDARD_FORMAT, matchUp);

    manager.addPoint(MATCH_UP_ID, 0, matchUp);
    expect(engine.getInputMode()).toBe('points');
    expect(manager.getMatchUp(MATCH_UP_ID, matchUp).score?.sets?.[0]).toMatchObject({ side1PointScore: '15' });

    manager.addGame(MATCH_UP_ID, 1, matchUp);
    expect(engine.getInputMode()).toBe('mixed');
  });
});
