/**
 * Score entry for an OVERTIME format (`-O:{count}[X][SD]/{segment}`): regulation, extra periods while the aggregate
 * is level, then a decider (`-F:TB1`, or a shootout `-F:SO{n}` entered as its tally).
 *
 * Owned by `tods-competition-factory/score-entry-state`, where the entered sets are replayed through the factory's
 * scoring kernel (the path `ScoringEngine.addSet` takes) without constructing an engine. Re-exported here for Free
 * Score, Dynamic Sets and the card.
 */
export {
  isOvertimeFormat,
  overtimeSetCeiling,
  overtimeSetFormat,
  overtimePhaseOf,
  overtimeDeciderSetNumber,
  overtimeProgress
} from 'tods-competition-factory/score-entry-state';
export type { OvertimeProgress } from 'tods-competition-factory/score-entry-state';
