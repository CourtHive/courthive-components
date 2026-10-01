/**
 * Pure answers computed FROM a `ScoreEntryModel`.
 *
 * Today `scoreString`, `isComplete`, `winningSide`, `matchUpStatus` and `error` are five members of the
 * `ScoreRegion` contract, answered by three regions separately. Here each is ONE function of the model,
 * so the Dial Pad and Dynamic Sets cannot disagree about whether `7-6` without its points is finished,
 * and nothing is computed on the spot from a DOM input.
 *
 * ── Which sets count ──
 *
 * The model keeps a half-entered set; these selectors decide what it means. `enteredSets` reports only
 * sets with both principal cells in — the regions' `getSets()` rule, kept because a lone `6` read as
 * `6-0` once made the band claim a set nobody typed. `completedSets` narrows further to sets the factory
 * gives a winner. Neither touches the model.
 *
 * ── Invariant 10A lives here ──
 *
 * "Every set before the last must be complete." It cannot be enforced by refusing keystrokes, because
 * clearing set 1 to retype it is an ordinary thing to do, so it is a property: a model with an
 * unfinished or empty set before its last entered set is never `isComplete` and always reports an
 * `error`. That is what makes `4-2 2-6 2-6` unsubmittable, and it is also what keeps note 9's ghost set
 * visible — `columns` shows every set that holds anything, so a cleared set 1 beside a full set 2 reads
 * as exactly the incomplete score it is.
 *
 * ── A score-clearing ending suppresses the score; it does not delete it ──
 *
 * While a walkover, cancellation or dead rubber is chosen, `scoreString` answers nothing, `isComplete`
 * is false and `error` is silent, because nothing typed will be submitted. `discardedScore` names what
 * the ending set aside so the band can still say so. The keystrokes stay in the model — see
 * `chooseEnding` — and every answer here comes back the moment the ending is un-chosen.
 */

import { matchUpStatusConstants, scoreGovernor } from 'tods-competition-factory';
import { ordinalSetLabel } from '../regions/setColumns';
import { resolveScoreEntry } from './scoreEntryState';
import { scoreLine } from '../regions/scoreLine';
import {
  decidingIndex,
  enteredFactorySets,
  gamesLoser,
  isEmptyEntry,
  isEntered,
  readCell,
  setCountOf
} from './scoreEntryModel';
import {
  getSetFormatForIndex,
  shouldShowTiebreak,
  isSetTiebreakOnly,
  matchUpConfigFor,
  getMatchWinner,
  isSetTimed
} from './dynamicSetsLogic';

// constants and types
import type { ScoreEntryResolution, SideNumber } from './scoreEntryState';
import type { ScoreEntryModel, SetEntry } from './scoreEntryModel';
import type { MatchUpConfig } from './dynamicSetsLogic';
import type { SetScore } from '../types';

const { COMPLETED } = matchUpStatusConstants;

/** One visible column: a set's principal cells, or the tiebreak cells beside a set that went to one. */
export type ScoreSlot = { kind: 'games' | 'tiebreak'; setIndex: number };

export type ColumnOptions = {
  /**
   * A set the operator has clicked back into, whose tiebreak column stays open though its points are
   * known. Presentation, held by the region — passed in rather than kept in the model.
   */
  editingSet?: number;
};

// ── The sets ─────────────────────────────────────────────────────────

/** The ending, resolved. The one place `resolveScoreEntry` is asked about a model. */
export function resolveEnding(model: ScoreEntryModel): ScoreEntryResolution {
  return resolveScoreEntry(model.ending);
}

/** Sets with BOTH principal cells in, in factory shape, positioned by `setNumber`. A partial set is not here. */
export function enteredSets(model: ScoreEntryModel): SetScore[] {
  return enteredFactorySets(model.sets, configOf(model));
}

/** The entered sets that are SETTLED — see `isSettled`. A `4-2` is entered; it is not completed. */
export function completedSets(model: ScoreEntryModel): SetScore[] {
  return enteredSets(model).filter((set) => isSettled(model, (set.setNumber ?? 0) - 1));
}

/** Whether ANYTHING has been typed, complete or not — a single digit counts. */
export function hasEntry(model: ScoreEntryModel): boolean {
  return model.sets.some((entry) => !isEmptyEntry(entry));
}

// ── The answers the card asks for ────────────────────────────────────

/** The score as it stands, in the factory's own line — or nothing while an ending has set it aside. */
export function scoreString(model: ScoreEntryModel): string | undefined {
  if (resolveEnding(model).clearsScore) return undefined;
  return scoreLine(enteredSets(model), model.matchUpFormat);
}

/** What a score-clearing ending set aside, so the band can name it. Nothing unless one is chosen. */
export function discardedScore(model: ScoreEntryModel): string | undefined {
  if (!resolveEnding(model).clearsScore) return undefined;
  return scoreLine(enteredSets(model), model.matchUpFormat);
}

/**
 * Whether the score is a FINISHED result: the factory names a winner, the last set is settled, and
 * nothing is wrong with what came before it. An ending that discards the score makes this false,
 * because there is no result to be finished.
 */
export function isComplete(model: ScoreEntryModel): boolean {
  if (resolveEnding(model).clearsScore) return false;

  const config = configOf(model);
  const last = lastHoldingIndex(model);
  if (last === undefined || !isSettled(model, last)) return false;

  return getMatchWinner(enteredSets(model), config) !== undefined && error(model) === undefined;
}

/** The winner: the ending's when it names one, otherwise the finished score's. */
export function winningSide(model: ScoreEntryModel): SideNumber | undefined {
  const resolution = resolveEnding(model);
  if (resolution.hasEnding) {
    if (resolution.winningSide === 1 || resolution.winningSide === 2) return resolution.winningSide;
    if (resolution.isDoubleExit) return undefined;
  }
  if (!isComplete(model)) return undefined;
  return getMatchWinner(enteredSets(model), configOf(model));
}

/** The ending's status when one is chosen; `COMPLETED` for a finished score; nothing otherwise. */
export function matchUpStatus(model: ScoreEntryModel): string | undefined {
  const resolution = resolveEnding(model);
  if (resolution.hasEnding) return resolution.matchUpStatus;
  return isComplete(model) ? COMPLETED : undefined;
}

/**
 * The first thing wrong with the score, in words, or `undefined`.
 *
 * Three checks, in order:
 *
 *   1. a tiebreak that contradicts who won the set, with the participant NAMED — the factory refuses it
 *      too, but "side 1" is not a message an operator can act on;
 *   2. the FACTORY's judgement of each entered set (`validateSetScore` with `allowIncomplete`), which
 *      forgives unfinished games but knows `3-7` cannot be. A set whose tiebreak points are still owed
 *      is skipped, because the card is asking for them and an error at that moment would answer its
 *      own question;
 *   3. invariant 10A: a set before the last entered one that is empty or unfinished.
 *
 * Silent while a score-clearing ending is chosen: nothing typed will be submitted.
 */
export type ErrorOptions = {
  /** Names for the two sides, so a message can say who rather than "side 1". */
  sideNames?: [string, string];
};

export function error(model: ScoreEntryModel, options: ErrorOptions = {}): string | undefined {
  if (resolveEnding(model).clearsScore) return undefined;

  const config = configOf(model);
  for (const [index, entry] of model.sets.entries()) {
    if (!isEntered(entry)) continue;
    const problem = tiebreakContradiction(index, entry, options) ?? setError(model, index, entry, config);
    if (problem) return problem;
  }

  return unfinishedBeforeLast(model);
}

/**
 * A tiebreak whose points contradict the games, NAMED.
 *
 * The factory refuses this too since `#5049(factory)`, with "Set winner must win the tiebreak: side 1 won
 * the set". This says the same thing with the participant's name, which is the message an operator can
 * act on, so it is asked first rather than being pre-empted by the factory's. A tied pair is left to the
 * factory, whose margin message says what is actually wrong.
 */
function tiebreakContradiction(index: number, entry: SetEntry, options: ErrorOptions): string | undefined {
  if (entry.tiebreak1 === undefined || entry.tiebreak2 === undefined) return undefined;
  if (entry.tiebreak1 === entry.tiebreak2) return undefined;

  const loser = gamesLoser(entry);
  if (loser === undefined) return undefined;

  const gamesWinner: SideNumber = loser === 1 ? 2 : 1;
  const pointsWinner: SideNumber = entry.tiebreak1 > entry.tiebreak2 ? 1 : 2;
  if (pointsWinner === gamesWinner) return undefined;

  const name = options.sideNames?.[gamesWinner - 1] ?? `side ${gamesWinner}`;
  return `${setLabel(index)} ${name} won it, so they must win the tiebreak`;
}

function setError(model: ScoreEntryModel, index: number, entry: SetEntry, config: MatchUpConfig): string | undefined {
  if (tiebreakOutstanding(model, index)) return undefined;

  const { isValid, error: message } = scoreGovernor.validateSetScore(
    strictSetShape(entry, isSetTiebreakOnly(getSetFormatForIndex(index, config))),
    model.matchUpFormat,
    index === setCountOf(config) - 1,
    true
  );

  if (isValid || !message) return undefined;
  return `${setLabel(index)} ${message}`;
}

/** Invariant 10A, as a message: the first set before the last entered one that is not settled. */
function unfinishedBeforeLast(model: ScoreEntryModel): string | undefined {
  const last = lastHoldingIndex(model);
  if (last === undefined) return undefined;

  for (let index = 0; index < last; index += 1) {
    if (isSettled(model, index)) continue;
    const entry = model.sets[index];
    return isEmptyEntry(entry) ? `${setLabel(index)} has no score` : `${setLabel(index)} is not finished`;
  }
  return undefined;
}

// ── Layout ───────────────────────────────────────────────────────────

/**
 * The visible columns, left to right.
 *
 * Every set that holds anything is shown, whatever came before it — this is the rule that ends the
 * ghost set: a cleared set 1 beside a typed set 2 shows BOTH, one empty and one full, so the operator
 * sees the score the model has. Then one empty set opens after the last holding one, and only when
 * everything before it is settled and the match is not decided; a timed format plays every bolt, so
 * for it the only question is whether one is left. A tiebreak column sits beside a set whose games call
 * for points it does not yet have, or that the operator has reopened.
 */
export function columns(model: ScoreEntryModel, options: ColumnOptions = {}): ScoreSlot[] {
  const config = configOf(model);
  const last = lastHoldingIndex(model);
  const slots: ScoreSlot[] = [];

  if (last !== undefined) {
    for (let index = 0; index <= last; index += 1) {
      slots.push({ kind: 'games', setIndex: index });
      if (tiebreakVisible(model, index, options.editingSet)) slots.push({ kind: 'tiebreak', setIndex: index });
    }
  }

  const next = last === undefined ? 0 : last + 1;
  if (next < setCountOf(config) && opensSet(model, next, config)) slots.push({ kind: 'games', setIndex: next });

  return slots;
}

/** Whether the empty set at `index` may be offered for entry. The first always is. */
function opensSet(model: ScoreEntryModel, index: number, config: MatchUpConfig): boolean {
  if (index === 0) return true;
  for (let before = 0; before < index; before += 1) if (!isSettled(model, before)) return false;
  if (isSetTimed(getSetFormatForIndex(index - 1, config))) return true;
  return decidingIndex(model.sets, config) === undefined && getMatchWinner(enteredSets(model), config) === undefined;
}

// ── Per-set questions, shared by the answers above ───────────────────

/**
 * Whether a set is finished: both principal cells in, no tiebreak points owed, and the factory accepts
 * it as a COMPLETE legal set. A `7-6` whose points are unknown is not settled, so the next set does not
 * open under it.
 *
 * ── Strict `validateSetScore`, and not `analyzeSet`'s winning side ──
 *
 * Measured 2026-09-30: `analyzeSet` names a winner for a `3-1` in a match tiebreak to ten, and for a
 * `10-9` — any lead reads as a win, because `checkSetIsComplete` with `isTiebreakSet` checks only that
 * the leader holds more points. `dynamicSetsLogic.isSetComplete` has the mirror-image gap: it refuses
 * a `10-0`, requiring both sides above zero. Strict validation gets all three right (`10-0` valid,
 * `3-1` and `10-9` not) and is the same answer `error` reports, so "settled" and "no error" cannot
 * come apart. Reported to the factory rather than patched here.
 *
 * A timed set is the exception: any pair of scores ends it, a tie included, so both cells in is the
 * whole test — strict validation refuses a `0-0` bolt, which is unusual but not impossible.
 */
export function isSettled(model: ScoreEntryModel, index: number): boolean {
  const entry = model.sets[index];
  if (!entry || !isEntered(entry) || tiebreakOutstanding(model, index)) return false;

  const config = configOf(model);
  const setFormat = getSetFormatForIndex(index, config);
  if (isSetTimed(setFormat)) return true;

  return scoreGovernor.validateSetScore(
    strictSetShape(entry, isSetTiebreakOnly(setFormat)),
    model.matchUpFormat,
    index === setCountOf(config) - 1,
    false
  ).isValid;
}

/** An entry as `validateSetScore` reads it: a tiebreak-only set's points go in the tiebreak fields. */
function strictSetShape(entry: SetEntry, tiebreakOnly: boolean): Record<string, number | undefined> {
  if (tiebreakOnly) return { side1TiebreakScore: entry.side1, side2TiebreakScore: entry.side2 };
  return {
    side1Score: entry.side1,
    side2Score: entry.side2,
    side1TiebreakScore: entry.tiebreak1,
    side2TiebreakScore: entry.tiebreak2
  };
}

/** Whether the set's games call for a tiebreak whose points the operator has not supplied yet. */
export function tiebreakOutstanding(model: ScoreEntryModel, index: number): boolean {
  const entry = model.sets[index];
  return tiebreakApplies(model, index) && (entry.tiebreak1 === undefined || entry.tiebreak2 === undefined);
}

/** Whether the PAIR of games implies a tiebreak was played — `7-6` yes, `7-5` no, a lone `7` nothing. */
function tiebreakApplies(model: ScoreEntryModel, index: number): boolean {
  const entry = model.sets[index];
  if (!isEntered(entry)) return false;
  const config = configOf(model);
  if (isSetTiebreakOnly(getSetFormatForIndex(index, config))) return false;
  return shouldShowTiebreak(index, { side1: entry.side1 as number, side2: entry.side2 as number }, config);
}

function tiebreakVisible(model: ScoreEntryModel, index: number, editingSet: number | undefined): boolean {
  return tiebreakApplies(model, index) && (tiebreakOutstanding(model, index) || editingSet === index);
}

/** The index of the last set holding anything, or `undefined` when nothing has been typed. */
function lastHoldingIndex(model: ScoreEntryModel): number | undefined {
  for (let index = model.sets.length - 1; index >= 0; index -= 1) {
    if (!isEmptyEntry(model.sets[index])) return index;
  }
  return undefined;
}

/** `1st set`, `2nd set`: the prefix every message here carries, so the operator knows which column. */
function setLabel(index: number): string {
  return `${ordinalSetLabel(index + 1)} set:`;
}

function configOf(model: ScoreEntryModel): MatchUpConfig {
  return matchUpConfigFor(model.matchUpFormat);
}

/** The value in one cell. Exported for regions, which render cells from the model and never read them back. */
export function cellValue(
  model: ScoreEntryModel,
  setIndex: number,
  side: SideNumber,
  kind: ScoreSlot['kind']
): number | undefined {
  const entry = model.sets[setIndex];
  return entry ? readCell(entry, { setIndex, side, kind }) : undefined;
}
