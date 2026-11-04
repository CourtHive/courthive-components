/**
 * Score entry for an OVERTIME format (`-O:{count}[X][SD]/{segment}`): regulation, extra periods while the
 * aggregate is level, then a decider (`-F:TB1`, or a shootout `-F:SO{n}` entered as its tally).
 *
 * ── The scoring engine decides, not this module ──
 *
 * How many periods a match plays depends on the score: an exact block (`O:2X`) is played to its end, an
 * ordinary period only while the total is level, a sudden-death period ends on its first goal, unlimited
 * overtime has no ceiling at all. The card used to cap the sets at `exactly` and open the next one
 * whenever the last was timed, so F2/F3/F5 could not enter overtime and F1/F4 opened it after a decided
 * regulation (overtime activation S6, CA 2026-11-04). Rather than keep a second copy of that rule, the
 * entered sets are replayed through the factory's public `ScoringEngine`, which owns it: it says whether
 * the match is decided, who won, what the next set is played to, and refuses a set that could not have
 * been played (with the reason, which the card shows).
 *
 * Which segment governs set k is grammar, not a decision: regulation for the first N, the overtime
 * segment within the ceiling, then `-F:`.
 */

import { matchUpFormatCode, scoreGovernor } from 'tods-competition-factory';

type ParsedFormat = Record<string, any>;

/** A closed set as score entry holds it, in the factory's shape. */
type EnteredSet = {
  side1Score?: number;
  side2Score?: number;
  side1TiebreakScore?: number;
  side2TiebreakScore?: number;
};

export type OvertimeProgress = {
  /** the engine calls the match decided (a level finish under a finite ceiling with no decider is decided too) */
  complete: boolean;
  winningSide?: 1 | 2;
  /** the format of the next set, while the match is undecided */
  next?: Record<string, any>;
  /** why the engine refused a set, which is then the first set it did not take */
  refused?: string;
  refusedAt?: number;
};

function parsedOf(format: string | ParsedFormat | undefined): ParsedFormat | undefined {
  if (!format) return undefined;
  return typeof format === 'string' ? matchUpFormatCode.parse(format) : format;
}

/** Whether the format plays overtime (`-O:`). */
export function isOvertimeFormat(format: string | ParsedFormat | undefined): boolean {
  return !!parsedOf(format)?.overtimeFormat;
}

/** The number of regulation sets. */
function regulationOf(parsed: ParsedFormat): number {
  return parsed.exactly ?? parsed.bestOf ?? 1;
}

/**
 * How many sets an overtime format can hold: regulation, the ceiling and the decider; `undefined` under
 * unlimited overtime, which has no ceiling.
 */
export function overtimeSetCeiling(format: string | ParsedFormat | undefined): number | undefined {
  const parsed = parsedOf(format);
  const overtime = parsed?.overtimeFormat;
  if (!overtime || overtime.count === 'unlimited') return undefined;
  return regulationOf(parsed) + overtime.count + (parsed.finalSetFormat ? 1 : 0);
}

/** The segment set `setNumber` is played to: regulation, an overtime period, or the decider. */
export function overtimeSetFormat(format: string | ParsedFormat | undefined, setNumber: number) {
  const parsed = parsedOf(format);
  if (!parsed?.overtimeFormat) return undefined;
  const regulation = regulationOf(parsed);
  const { count, setFormat } = parsed.overtimeFormat;
  if (setNumber <= regulation) return parsed.setFormat;
  if (count === 'unlimited' || setNumber <= regulation + count) return setFormat;
  return parsed.finalSetFormat;
}

/**
 * Where set `setNumber` falls: regulation, an overtime period (numbered from 1), or the decider; `undefined`
 * for a format without overtime.
 */
export function overtimePhaseOf(
  format: string | ParsedFormat | undefined,
  setNumber: number
):
  | { phase: 'REGULATION' }
  | { phase: 'OVERTIME'; period: number }
  | { phase: 'DECIDER'; shootout: boolean }
  | undefined {
  const parsed = parsedOf(format);
  if (!parsed?.overtimeFormat) return undefined;
  const regulation = regulationOf(parsed);
  const { count } = parsed.overtimeFormat;
  if (setNumber <= regulation) return { phase: 'REGULATION' };
  if (count === 'unlimited' || setNumber <= regulation + count)
    return { phase: 'OVERTIME', period: setNumber - regulation };
  return { phase: 'DECIDER', shootout: parsed.finalSetFormat?.shootout !== undefined };
}

/** The set number of the decider (`-F:`), or `undefined` when there is none. */
export function overtimeDeciderSetNumber(format: string | ParsedFormat | undefined): number | undefined {
  const parsed = parsedOf(format);
  const ceiling = overtimeSetCeiling(parsed);
  return ceiling !== undefined && parsed?.finalSetFormat ? ceiling : undefined;
}

/**
 * The engine's reading of these CLOSED sets, in order. A set is offered with its principal score and, for a
 * one-point decider, its points; the engine reads whichever its segment takes.
 */
export function overtimeProgress(matchUpFormat: string, sets: EnteredSet[]): OvertimeProgress {
  const engine = new scoreGovernor.ScoringEngine({ matchUpFormat });
  for (let index = 0; index < sets.length; index += 1) {
    const set = sets[index];
    try {
      const result: any = engine.addSet({
        side1Score: set.side1Score ?? 0,
        side2Score: set.side2Score ?? 0,
        ...(set.side1TiebreakScore !== undefined && { side1TiebreakScore: set.side1TiebreakScore }),
        ...(set.side2TiebreakScore !== undefined && { side2TiebreakScore: set.side2TiebreakScore })
      } as any);
      // a set after the match was decided is not recorded: the engine answers `ignored: 'MATCH_COMPLETED'`
      if (result?.recorded === false)
        return { complete: false, refused: 'played after the match was decided', refusedAt: index };
    } catch (error) {
      return { complete: false, refused: (error as Error).message, refusedAt: index };
    }
  }
  const complete = engine.isComplete();
  const winner = engine.getWinner();
  const winningSide = winner === 1 || winner === 2 ? winner : undefined;
  return complete ? { complete, winningSide } : { complete, next: engine.getSetInPlayFormat() };
}
