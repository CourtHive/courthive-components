/**
 * From what the card reports to what the factory's `setMatchUpStatus` reads — now owned by the factory
 * (`tods-competition-factory/score-entry-state`), with the score state it converts. The dialog applies it on Submit
 * and a host hands the result to the engine (or CFS) as its `outcome`. A clear is `{ score: { sets: [] },
 * clearStatusCodes: true }`; a reason travels keyed: `sideStatusCodes` for the side (or sides) that exited,
 * `matchUpStatusCode` for an ending that resolves nobody.
 */
export { toEngineOutcome, keyedStatusCodes } from 'tods-competition-factory/score-entry-state';
export type { ReportedOutcome, EngineOutcome } from 'tods-competition-factory/score-entry-state';
