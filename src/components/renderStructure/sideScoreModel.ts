// constants and types
import type { Configuration, MatchUp, SetScore } from '../../types';

/** What one side's cell for one set shows. `renderSideScore`'s `setScore` draws exactly this. */
export interface SetScoreView {
  /** A decided set marks its winning side `winner` and the other side `loser`; an undecided set marks neither. */
  variant: 'winner' | 'loser' | undefined;
  /** The raw value displayed: the game count, or the tiebreak points of a tiebreak set. */
  scoreDisplay: number | undefined;
  /** The cell's text: `scoreDisplay`, or `''` when there is no numeric value. */
  text: string;
  /** The tiebreak superscript's text (`''` when none), or `undefined` under `gameScoreOnly`, which drops it. */
  tiebreak: string | undefined;
  /** `configuration.winnerChevron` stripes odd sets. */
  background: string;
}

export function setScoreView({
  gameScoreOnly,
  scoreStripes,
  sideNumber,
  set
}: {
  gameScoreOnly?: boolean;
  scoreStripes?: boolean;
  sideNumber: number;
  set: SetScore;
}): SetScoreView {
  const isWinningSide = sideNumber === set?.winningSide;
  const variant = (isWinningSide && 'winner') || (set?.winningSide ? 'loser' : undefined);
  const gameScore = sideNumber === 2 ? set.side2Score : set.side1Score;
  const hasTiebreakScore = set.side2TiebreakScore !== undefined || set.side1TiebreakScore !== undefined;
  const tieBreakScore = sideNumber === 2 ? set.side2TiebreakScore : set.side1TiebreakScore;
  // A "tiebreak set" is either a tiebreak-only set (no game score) or a final-set match
  // tiebreak normalised by the engine to side{1,2}Score 1/0 with `tiebreakSet: true` and
  // the actual points carried on side{1,2}TiebreakScore. In both cases the displayed value
  // should be the tiebreak points, not the collapsed 1-0 game count.
  const tieBreakSet = (gameScore === undefined || set.tiebreakSet === true) && tieBreakScore !== undefined;
  const scoreDisplay = tieBreakSet ? tieBreakScore : gameScore;
  const text = scoreDisplay != null && !Number.isNaN(Number(scoreDisplay)) ? String(scoreDisplay) : '';
  const background = scoreStripes && set.setNumber % 2 ? 'var(--chc-bg-secondary)' : 'transparent';
  // A side shows only its OWN recorded points. When just the other side's are on the set, this side has
  // none, and shows nothing rather than `String(undefined)`.
  const showsTiebreak = hasTiebreakScore && !tieBreakSet && tieBreakScore !== undefined;
  const tiebreak = gameScoreOnly ? undefined : (showsTiebreak && String(tieBreakScore)) || '';

  return { variant, scoreDisplay, text, tiebreak, background };
}

const BRACKET_TOKEN = /^\[(\d+)-(\d+)\]$/;

/**
 * Defensive enrichment: the factory persists tiebreakSet final sets with side1Score/side2Score
 * collapsed to 1/0 and the actual tiebreak points only in `scoreStringSide{1,2}` (e.g. "[10-7]"),
 * not on the set object. Without this fallback the per-set renderer has no TB points to display
 * and shows the collapsed 1/0 instead.
 */
export function enrichTiebreakSet(set: SetScore, index: number, score?: MatchUp['score']): SetScore {
  if (!set.tiebreakSet || set.side1TiebreakScore !== undefined || set.side2TiebreakScore !== undefined) return set;
  const match1 = score?.scoreStringSide1?.split(/\s+/)?.[index]?.match(BRACKET_TOKEN);
  const match2 = score?.scoreStringSide2?.split(/\s+/)?.[index]?.match(BRACKET_TOKEN);
  if (!match1 && !match2) return set;
  return {
    ...set,
    side1TiebreakScore: match1 ? Number(match1[1]) : match2 ? Number(match2[2]) : undefined,
    side2TiebreakScore: match2 ? Number(match2[1]) : match1 ? Number(match1[2]) : undefined
  };
}

export interface PointScoreView {
  /** The side's point score in the current game. */
  text: string;
  position: 'leading' | 'trailing';
  inverted: boolean;
  /** The game is still being played (its set is undecided), so inline scoring may increment it. */
  inPlay: boolean;
}

/**
 * The point score of the game in play, read from the LAST set. It renders whenever that set carries point
 * data, whether or not `configuration.gameScore` is set: the config only places it (`trailing` by default)
 * and inverts it (by default).
 */
export function pointScoreView(
  sets: SetScore[],
  sideNumber: number,
  gameScore?: Configuration['gameScore']
): PointScoreView | undefined {
  const lastSet = sets.at(-1);
  if (!lastSet) return undefined;
  if (lastSet.side1PointScore == null && lastSet.side2PointScore == null) return undefined;

  const pointValue = sideNumber === 2 ? lastSet.side2PointScore : lastSet.side1PointScore;
  return {
    text: pointValue == null ? '' : String(pointValue),
    position: gameScore?.position || 'trailing',
    inverted: gameScore?.inverted !== false,
    inPlay: !lastSet.winningSide
  };
}

export type SideScoreCell =
  { kind: 'point'; point: PointScoreView; label?: string } | { kind: 'set'; set: SetScore; label?: string };

/**
 * The cells of one side's score, left to right: the point score (leading or trailing) around the sets, each set
 * enriched by `enrichTiebreakSet`. `resultsInfo` labels each cell (`PTS`, the set number) on side 1 only.
 */
export function sideScoreCells({
  resultsInfo,
  sideNumber,
  gameScore,
  matchUp
}: {
  resultsInfo?: boolean;
  sideNumber: number;
  gameScore?: Configuration['gameScore'];
  matchUp: MatchUp;
}): SideScoreCell[] {
  const sets = matchUp?.score?.sets || [];
  const labelled = Boolean(resultsInfo) && sideNumber === 1;
  const point = pointScoreView(sets, sideNumber, gameScore);
  const pointCell: SideScoreCell[] = point ? [{ kind: 'point', point, ...(labelled && { label: 'PTS' }) }] : [];
  const setCells: SideScoreCell[] = sets.map((rawSet, index) => {
    const set = enrichTiebreakSet(rawSet, index, matchUp?.score);
    return { kind: 'set', set, ...(labelled && { label: String(set.setNumber) }) };
  });
  return point?.position === 'leading' ? [...pointCell, ...setCells] : [...setCells, ...pointCell];
}
