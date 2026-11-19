/**
 * From what the card reports to what the factory's `setMatchUpStatus` reads — now owned by the factory
 * (`tods-competition-factory/score-entry-state`), with the draft it converts. The dialog applies it on Submit and a
 * host hands the result to the engine (or CFS) as its `outcome`. A clear is `{ score: { sets: [] },
 * matchUpStatusCodes: [] }`; a reason travels as a positional `matchUpStatusCodes` array.
 */
export { toEngineOutcome, positionalCodes } from 'tods-competition-factory/score-entry-state';
export type { ReportedOutcome, EngineOutcome } from 'tods-competition-factory/score-entry-state';
