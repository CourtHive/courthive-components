/**
 * Type definitions for scoring modal V2
 */
import type { StatusCodeGroups } from './logic/statusCodes';

export type SetScore = {
  setNumber?: number;
  side1Score?: number;
  side2Score?: number;
  side1TiebreakScore?: number;
  side2TiebreakScore?: number;
  side1PointScore?: string | number;
  side2PointScore?: string | number;
  winningSide?: number;
};

export type ScoreOutcome = {
  isValid: boolean;
  sets: SetScore[];
  scoreObject?: any; // Full score object from generateOutcomeFromScoreString
  winningSide?: number;
  matchUpStatus?: string;
  /** Policy reason codes chosen for this outcome, as code strings — e.g. `['RJ']`. */
  matchUpStatusCodes?: string[];
  error?: string;
  matchUpFormat?: string;
  score?: string;
};

export type ScoringModalLabels = {
  title?: string;
  cancel?: string;
  clear?: string;
  submit?: string;
  format?: string;
  formatEditTitle?: string;
  irregularEnding?: string;
  winner?: string;
  neitherSide?: string;
  retired?: string;
  abandoned?: string;
  cancelled?: string;
  incomplete?: string;
  walkover?: string;
  defaulted?: string;
  // The four endings added when SELECTABLE_ENDINGS went from six to ten (2026-09-27). Optional like
  // the rest; `endingLabels()` falls back to an English default and then to the raw status.
  suspended?: string;
  deadRubber?: string;
  inProgress?: string;
  awaitingResult?: string;
  validScore?: string;
  scoreIncomplete?: string;
  invalidScore?: string;
  scoreTips?: string;
  reasonCode?: string;
  noReasonCode?: string;
  setScores?: string;
  tiebreaks?: string;
  matchTiebreaks?: string;
  irregularEndings?: string;
  addSet?: boolean;
  dynamicSetsTips?: string;
  dialPadTips?: string;
};

export type ScoringModalParams = {
  matchUp: any;
  callback: (outcome: any) => void;
  onClose?: () => void;
  labels?: ScoringModalLabels;
  /**
   * The scoring policy's `matchUpStatusCodes` groups, resolved by the CALLER — components never
   * reaches into factory fixtures or the engine. Omit it (or pass groups with no entries for the
   * chosen status) and no reason control is drawn, which is the designed state for a tournament
   * with no governing-body policy attached.
   */
  matchUpStatusCodes?: StatusCodeGroups;
  /**
   * Whether a recorded outcome may be REMOVED. Only the draw knows whether a later match depends on the
   * result, so the host reads it from the engine (the factory's `CLEAR_SCORE` matchUp action) rather than
   * the dialog guessing. `false` withholds `[Clear]` on a reopened result, so the dialog never offers a
   * submission the engine will refuse. Omitted, `[Clear]` behaves as it always has.
   */
  clearable?: boolean;
};

export type ScoreChangeHandler = (outcome: ScoreOutcome) => void;

export type RenderScoreEntryParams = {
  matchUp: any;
  container: HTMLElement;
  onScoreChange: ScoreChangeHandler;
  labels?: ScoringModalLabels;
};
