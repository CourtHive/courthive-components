/**
 * A REAL tournament behind the score-entry dialog, so that Submit reaches the factory engine.
 *
 * CA, 2026-09-30, in note 10 of `scoreEntryNotes.txt`: *"why don't we actually have a draw behind the
 * modal in stories so that we can see what happens on [Submit]?"* `scoreEntryStoryHost` reopens on a
 * record the STORY built (`asRecord`); nothing in it touches the engine. This host holds no record at
 * all. What the dialog submits goes to `tournamentEngine.setMatchUpStatus`, and what the dialog reopens
 * on is whatever `tournamentEngine.findMatchUp` returns afterwards — the round trip CA asked to see.
 *
 * ── What the engine READS, measured rather than assumed ──
 *
 * Measured 2026-10-01 against published factory 7.4.0 and again against `dev` (`cff5c3d7c0`), by calling
 * `setMatchUpStatus` with each shape and reading the matchUp back:
 *
 *   - `outcome.score.sets`, `outcome.winningSide`, `outcome.matchUpStatus`, `outcome.matchUpStatusCodes`
 *     and `outcome.matchUpFormat`. Nothing else.
 *   - It DERIVES `scoreStringSide1` / `scoreStringSide2` from the sets, every time, and writes them INTO
 *     the object it was handed — `setMatchUpStatus` mutates its `outcome`. This host passes a copy.
 *   - `score` as a STRING — what the card reports — is refused outright: `ERR_INVALID_VALUES`. A host that
 *     spreads the dialog's outcome into the engine's is refused on every Submit.
 *   - `reasonCode` and `cleared` are unknown to it and ignored. A `{ cleared: true }` sent as-is, or an
 *     empty `{}`, is NOT a clear: the engine drops the winner and leaves the stale score standing as
 *     IN_PROGRESS. The clear is `{ score: { sets: [] } }`, which resets to TO_BE_PLAYED, plus
 *     `matchUpStatusCodes: []`, without which the reason code of the outcome being removed survives it.
 *   - A reason travels as `matchUpStatusCodes`, a positional string array (`['', 'W1']` is side 2). The
 *     engine trusts the VALUES and reads the side off `winningSide` for a single exit; for a double exit
 *     the index is the side. It stores the split as `sideStatusCodes` / `matchUpStatusCode`, which is
 *     what the dialog reads back.
 *   - A set with only the LOSER's tiebreak points is refused (`non-numeric values`); both sides' points
 *     are required. The model reports both, so this only bites a host building sets by hand.
 *
 * The differences between that and what the dialog reports are recorded in
 * `src/components/scoring/TMX_INTEGRATION.md`, which is the gate this story serves.
 */
import { tournamentEngine, mocksEngine, matchUpStatusConstants } from 'tods-competition-factory';
import { isDoubleExitStatus } from '../../components/scoring/logic/irregularEnding';

import type { SetScore } from '../../components/scoring/types';

const { TO_BE_PLAYED } = matchUpStatusConstants;

export const DRAW_BEHIND_FORMAT = 'SET3-S:6/TB7';

/** Where the dialog's matchUp lives in the engine. */
export type EngineMatchUpRef = { drawId: string; matchUpId: string };

/** What the dialog reports on Submit. Mirrors `openScoreEntryDialog`'s `onSubmit` argument. */
export type DialogOutcome = {
  matchUpStatus?: string;
  winningSide?: number;
  reasonCode?: string;
  score?: string;
  cleared?: boolean;
  sets?: SetScore[];
};

/** The outcome in the shape the engine reads — see the header for which fields those are. */
export type EngineOutcome = {
  matchUpStatus?: string;
  winningSide?: number;
  matchUpFormat?: string;
  matchUpStatusCodes?: string[];
  score: { sets: SetScore[] };
};

/**
 * A small single-elimination draw with nobody scored, loaded into the engine.
 *
 * Deterministic (`nonRandom: 1`), so the two participants are the same on every run — the test can
 * name them, and so can a director comparing two sessions of the story. Returns the first-round matchUp
 * that has both participants, which in a 4-draw with no byes is the first one.
 */
export function buildDrawBehind(matchUpFormat = DRAW_BEHIND_FORMAT): EngineMatchUpRef {
  const {
    tournamentRecord,
    drawIds: [drawId]
  } = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, matchUpFormat }],
    completeAllMatchUps: false,
    nonRandom: 1
  });
  tournamentEngine.setState(tournamentRecord);

  const { matchUps = [] } = tournamentEngine.allTournamentMatchUps({ inContext: true });
  const first = matchUps.find(
    (matchUp: any) => matchUp.roundNumber === 1 && matchUp.sides?.every((side: any) => side.participant)
  );
  if (!first) throw new Error('the generated draw has no first-round matchUp with two participants');

  return { drawId, matchUpId: first.matchUpId };
}

/** The matchUp as the engine holds it NOW, in context — participants, format, score, status codes. */
export function engineMatchUp({ drawId, matchUpId }: EngineMatchUpRef): any {
  const { matchUp, error } = tournamentEngine.findMatchUp({ drawId, matchUpId, inContext: true });
  if (error) throw new Error(`findMatchUp refused: ${JSON.stringify(error)}`);
  return matchUp;
}

/** The display names the card wants, read off the engine's sides. The host owns this mapping. */
export function sidesOf(matchUp: any): [{ participantName: string }, { participantName: string }] {
  const name = (sideNumber: number) =>
    matchUp.sides?.find((side: any) => side.sideNumber === sideNumber)?.participant?.participantName ?? '';
  return [{ participantName: name(1) }, { participantName: name(2) }];
}

/**
 * From what the dialog reports to what the engine reads.
 *
 * Every line here is a measured difference between the two shapes; none of it is a preference. The
 * `score` string is dropped (refused by the engine), `reasonCode` becomes a positional array, `cleared`
 * becomes the empty-sets outcome that actually clears, and the format rides along so a change made
 * through the chip is persisted with the result rather than lost.
 */
export function toEngineOutcome(outcome: DialogOutcome, matchUpFormat?: string): EngineOutcome {
  if (outcome.cleared) {
    // Measured: `{}` leaves the stale score as IN_PROGRESS, and codes survive a clear unless blanked.
    return { score: { sets: [] }, matchUpStatusCodes: [] };
  }

  const codes = positionalCodes(outcome);
  return {
    matchUpStatus: outcome.matchUpStatus,
    winningSide: outcome.winningSide,
    score: { sets: outcome.sets ?? [] },
    ...(matchUpFormat ? { matchUpFormat } : {}),
    // Only when a reason was chosen: the engine reads an empty array as "blank the codes", and a
    // played result with no reason must not erase one a previous edit recorded (TMX's rule).
    ...(codes ? { matchUpStatusCodes: codes } : {})
  };
}

/**
 * The positional array the engine reads a reason from.
 *
 * A single exit: the side that did NOT win, at its index. A double exit: both. An ending that resolves
 * nobody: index 0, since there is no side — the engine files that one as `matchUpStatusCode`.
 */
function positionalCodes({ reasonCode, matchUpStatus, winningSide }: DialogOutcome): string[] | undefined {
  if (!reasonCode) return undefined;
  if (isDoubleExitStatus(matchUpStatus)) return [reasonCode, reasonCode];
  if (winningSide === 1) return ['', reasonCode];
  if (winningSide === 2) return [reasonCode];
  return [reasonCode];
}

export type EngineAnswer = {
  /** Exactly what went to `setMatchUpStatus`, before the engine wrote its strings into it. */
  sent: EngineOutcome;
  /** The engine's result: `{ success }` or `{ error }`, as returned. */
  result: any;
  /** The matchUp as the engine holds it after the call — unchanged when it refused. */
  matchUp: any;
};

/**
 * Submit an outcome to the engine and read back what it holds.
 *
 * `structuredClone`, because `setMatchUpStatus` writes the derived score strings into the outcome it
 * is given, and the story log should show what was SENT rather than what the engine made of it.
 */
export function recordOutcome(ref: EngineMatchUpRef, outcome: DialogOutcome, matchUpFormat?: string): EngineAnswer {
  const sent = toEngineOutcome(outcome, matchUpFormat);
  const result = tournamentEngine.setMatchUpStatus({ ...ref, outcome: structuredClone(sent) });
  return { sent, result, matchUp: engineMatchUp(ref) };
}

/** One line for the log: the matchUp as the engine holds it, in the engine's own score string. */
export function describeHeld(matchUp: any): string {
  const status = matchUp.matchUpStatus ?? TO_BE_PLAYED;
  const score = matchUp.score?.scoreStringSide1 || '(no score)';
  const winner = matchUp.winningSide ? ` winningSide ${matchUp.winningSide}` : '';
  return `${status}${winner} · ${score} · ${matchUp.matchUpFormat}${describeCodes(matchUp)}`;
}

/** The reason as the engine filed it: by side, or at match level, or not at all. */
function describeCodes(matchUp: any): string {
  if (matchUp.sideStatusCodes) return ` sideStatusCodes ${JSON.stringify(matchUp.sideStatusCodes)}`;
  if (matchUp.matchUpStatusCode) return ` matchUpStatusCode ${matchUp.matchUpStatusCode}`;
  return '';
}

/** The engine's answer as one log line: the refusal, or the matchUp it now holds. */
export function describeAnswer({ result, matchUp }: EngineAnswer): string {
  if (result?.error) {
    const info = result.info ? ` (${result.info})` : '';
    return `engine REFUSED → ${JSON.stringify(result.error)}${info}`;
  }
  return `engine accepted → ${describeHeld(matchUp)}`;
}
