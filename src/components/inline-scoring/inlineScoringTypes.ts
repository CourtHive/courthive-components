import type { MatchUp } from '../../types';

export type InlineScoringMode = 'points' | 'games' | 'entry';

export interface InlineScoringConfig {
  mode: InlineScoringMode;
  showFooter?: boolean;
  showSituation?: boolean;
}

export interface InlineScoringCallbacks {
  onScoreChange?: (params: { matchUpId: string; matchUp: MatchUp; engine: any }) => void;
  onMatchComplete?: (params: { matchUpId: string; winningSide: number; engine: any }) => void;
  onEndMatch?: (params: { matchUpId: string; matchUpStatus: string; engine: any }) => void;
}

export interface InlineScoringEngineState {
  engine: any;
  matchUpFormat: string;
  pointCount: number;
}
