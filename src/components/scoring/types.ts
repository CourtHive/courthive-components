/**
 * Type definitions for scoring modal V2
 */

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
  retired?: string;
  walkover?: string;
  defaulted?: string;
  validScore?: string;
  scoreIncomplete?: string;
  invalidScore?: string;
  scoreTips?: string;
  setScores?: string;
  tiebreaks?: string;
  matchTiebreaks?: string;
  irregularEndings?: string;
};

export type ScoringModalParams = {
  matchUp: any;
  callback: (outcome: any) => void;
  onClose?: () => void;
  labels?: ScoringModalLabels;
};

export type ScoreChangeHandler = (outcome: ScoreOutcome) => void;

export type RenderScoreEntryParams = {
  matchUp: any;
  container: HTMLElement;
  onScoreChange: ScoreChangeHandler;
  labels?: ScoringModalLabels;
};
