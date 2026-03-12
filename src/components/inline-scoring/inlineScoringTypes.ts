import type { MatchUp } from '../../types';

export type InlineScoringMode = 'points' | 'games';

export interface InlineScoringConfig {
  mode: InlineScoringMode;
  showFooter?: boolean;
  showSituation?: boolean;
  /** Runtime state for footer buttons — set by renderInlineMatchUp before calling renderMatchUp */
  canUndo?: boolean;
  canRedo?: boolean;
  isComplete?: boolean;
  situationText?: string;
}

export interface InlineScoringCallbacks {
  onScoreChange?: (params: { matchUpId: string; matchUp: MatchUp; engine: any }) => void;
  onMatchComplete?: (params: { matchUpId: string; winningSide: number; engine: any }) => void;
  onEndMatch?: (params: { matchUpId: string; matchUpStatus: string; sideNumber?: number; engine: any }) => void;
  onSubmit?: (params: { matchUpId: string; matchUp: MatchUp; engine: any }) => void;
}

export interface InlineScoringEngineState {
  engine: any;
  matchUpFormat: string;
  pointCount: number;
}
