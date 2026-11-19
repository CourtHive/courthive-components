/**
 * The score line, formatted by the factory's `generateScoreString` (CA, 2026-09-28: *"you should use
 * generateScoreString and not invent something new for the modal."*). A match tiebreak reads `[10-8]`.
 *
 * The wrapper moved to `tods-competition-factory/score-entry-state` with the model whose selectors use it; it is
 * re-exported here for the regions.
 */
export { scoreLine } from 'tods-competition-factory/score-entry-state';
