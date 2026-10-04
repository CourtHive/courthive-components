/**
 * The score-entry MODEL: one immutable value holding everything the card knows about a result, and
 * the transitions that produce the next one.
 *
 * ── Why the score moves out of the regions ──
 *
 * The card already had a pure engine for the ENDING — `scoreEntryState.ts`, folded in here unchanged
 * as `model.ending`. The SCORE did not have one: it lived in each region's private array and in the
 * DOM inputs, reachable only through the `ScoreRegion` contract, and three of CA's open notes
 * (2026-09-30) were all on that half with nowhere to live:
 *
 *   - 9    clearing set 1 of `6-2 6-2` removed the set-2 column while its score survived — two
 *          representations of one score disagreed;
 *   - 10A  `4-2 2-6 2-6` submitted as `winningSide: 2` — nothing owned "is every set complete";
 *   - 10B  editing set 2 so the match ended at two sets left the third in place — nothing owned "how
 *          many sets are there".
 *
 * So the score becomes a value with rules, in the same shape as the ending: every transition is
 * `(model, arg) => model`, no DOM, no callbacks, no mutation. A transition that REFUSES returns the very
 * same object it was given, so a caller can tell a refusal from a no-op change by identity.
 *
 * ── A half-entered set is KEPT ──
 *
 * `SetEntry` holds each cell separately and each may be empty. The regions' `getSets()` report only
 * sets with both sides in, deliberately, because including a partial once made the band claim a `6-0`
 * nobody typed — but that is a question for a SELECTOR (`enteredSets` in `scoreEntrySelectors.ts`), not
 * a reason for the model to drop what the operator typed. An engine that discards keystrokes is worse
 * than the arrays it replaces.
 *
 * ── Two invariants, enforced here rather than at the edges ──
 *
 *   1. **No set exists beyond the one that decides the match** (note 10B). Every score transition
 *      ends in `normalize`, which empties every set past the first prefix the FACTORY calls decided.
 *      Only a best-of can be decided early; an `exactly` format plays every set and is never trimmed.
 *   2. **Every set before the last must be complete** (note 10A). That one cannot be enforced by
 *      refusing keystrokes — the operator clearing set 1 to retype it is mid-edit, not wrong — so it is
 *      a PROPERTY the selectors report: such a model is never `isComplete` and always carries an
 *      `error`. See `scoreEntrySelectors.ts`.
 *
 * ── What is delegated ──
 *
 * Nothing about tennis is decided here. Set completeness, set winners, match completeness, the digit
 * ceiling, the set and tiebreak complements and format retention are all the factory's answers, mostly
 * through `dynamicSetsLogic.ts`, which the shipping dialog shares and which this module therefore
 * only adds to. Where a factory answer is known to be wrong the workaround is named at the site.
 *
 * ── What is NOT here ──
 *
 * Presentation: which panel is open, where focus goes next, which set the operator clicked back into.
 * A model that owns `otherMenuOpen` is a store, not an engine. Nothing consumes this module yet; the
 * regions start rendering it in S2–S4 of `Mentat/planning/SCORE_ENTRY_STATE_ENGINE.md`.
 */

import { scoreGovernor } from 'tods-competition-factory';
import { completeTiebreakOnly } from './tiebreakEntry';
import {
  hydrateScoreEntryState,
  toggleBothSidesOut,
  chooseMatchEnding,
  chooseSideEnding,
  chooseReasonCode,
  emptyScoreEntryState
} from './scoreEntryState';
import {
  getSetFormatForIndex,
  calculateComplement,
  shouldShowTiebreak,
  isSetTiebreakOnly,
  matchUpConfigFor,
  isMatchComplete,
  buildSetScore,
  isSetTimed
} from './dynamicSetsLogic';

// constants and types
import type { ScoreEntryState, SideNumber } from './scoreEntryState';
import { aggregateDeciderSetNumber } from '../utils/aggregateDecider';
import type { MatchUpConfig, SetFormat } from './dynamicSetsLogic';
import type { SetScore } from '../types';

/** The three ways of typing a score. The dialog's own union of the same three names is re-pointed here in S5. */
export type ScoreEntryApproach = 'dynamicSets' | 'freeScore' | 'dialPad';

/**
 * One set as ENTERED, cell by cell. Any cell may be empty, which is how a half-entered set is kept.
 *
 * `side1` / `side2` are the set's principal score — games, or the POINTS of a tiebreak-only set, exactly
 * as the regions' cells hold them. `tiebreak1` / `tiebreak2` are the points that decided an ordinary set
 * that went to a tiebreak.
 */
export type SetEntry = {
  side1?: number;
  side2?: number;
  tiebreak1?: number;
  tiebreak2?: number;
};

/** Which cell of which set an intent is aimed at. A tiebreak-only set has no `tiebreak` cells. */
export type CellRef = {
  setIndex: number;
  side: SideNumber;
  kind: 'games' | 'tiebreak';
};

export type ScoreEntryModel = {
  matchUpFormat: string;
  approach: ScoreEntryApproach;
  /** Exactly the set count the format plays, every entry possibly empty. */
  sets: readonly SetEntry[];
  /** The existing pure ending engine, folded in unchanged. */
  ending: ScoreEntryState;
};

/** The ways an ending is chosen, one per transition in `scoreEntryState.ts`. */
export type EndingIntent =
  | { kind: 'side'; sideNumber: SideNumber; status: string }
  | { kind: 'match'; status: string }
  | { kind: 'bothSidesOut' }
  | { kind: 'reasonCode'; code: string | undefined };

export type CreateScoreEntryModelParams = {
  matchUpFormat?: string;
  approach?: ScoreEntryApproach;
  /** A saved score to open with, in factory shape. */
  sets?: SetScore[];
  /** A saved matchUp whose outcome hydrates the ending — see `hydrateScoreEntryState`. */
  matchUp?: Parameters<typeof hydrateScoreEntryState>[0];
};

/** What a model with no format opens under. The same fallback `freeScoreRegion` and `matchUpConfigFor` use. */
export const DEFAULT_MATCH_UP_FORMAT = 'SET3-S:6/TB7';

/** The most digits one cell takes. No games or points score needs three — the Dial Pad's cap, kept. */
const MAX_CELL_DIGITS = 2;

const EMPTY_SET: SetEntry = {};

// ── Construction ─────────────────────────────────────────────────────

export function createScoreEntryModel(params: CreateScoreEntryModelParams = {}): ScoreEntryModel {
  const matchUpFormat = params.matchUpFormat ?? DEFAULT_MATCH_UP_FORMAT;
  const config = matchUpConfigFor(matchUpFormat);
  const seeded = seedEntries(params.sets ?? [], config);

  return {
    matchUpFormat,
    approach: params.approach ?? 'dynamicSets',
    // A saved record is held to the same invariants as a typed one: a stale set past the decider is
    // trimmed on open rather than round-tripped, which is the whole of note 10B.
    sets: normalize(seeded, config),
    ending: params.matchUp ? hydrateScoreEntryState(params.matchUp) : emptyScoreEntryState
  };
}

/**
 * Entries from saved sets, positioned by index and cut to the format's set count.
 *
 * A tiebreak-only set keeps its score in the TIEBREAK fields of a `SetScore`, its games being 0-0 by
 * construction, so its points seed the principal cells — the same reading both regions make. `=== undefined`
 * and not `||`, so a set lost to love seeds as 0 rather than empty.
 */
function seedEntries(sets: SetScore[], config: MatchUpConfig): SetEntry[] {
  const count = setCountOf(config);
  return Array.from({ length: count }, (_, index) => {
    const set = sets[index];
    if (!set) return EMPTY_SET;

    if (isSetTiebreakOnly(getSetFormatForIndex(index, config))) {
      return compact({ side1: set.side1TiebreakScore, side2: set.side2TiebreakScore });
    }
    return compact({
      side1: set.side1Score,
      side2: set.side2Score,
      tiebreak1: set.side1TiebreakScore,
      tiebreak2: set.side2TiebreakScore
    });
  });
}

// ── Score transitions ────────────────────────────────────────────────

export type TypeDigitIntent = {
  cell: CellRef;
  digit: number;
  /**
   * Derive the OTHER side from what was typed, where the format makes that a single answer.
   *
   * For a games cell this is the smart complement — a `4` typed into an EMPTY cell writes `6` opposite,
   * over whatever the other cell held: the inference is about the pair. Whether to offer it again for
   * the same set is the caller's policy. For an ordinary tiebreak it derives the
   * winner's points from the loser's, and fires only from the games LOSER's cell, because a winner's 7
   * could have beaten anything. For a tiebreak-only set it derives the other side from the one typed —
   * CA's rule for the Dial Pad, which always asks; Dynamic Sets asks while its Smart toggle is on.
   */
  complement?: boolean;
};

/**
 * Append a digit to a cell, as a keystroke does.
 *
 * Refused — the same model comes back — when the digit could not become a legal score: past the
 * ceiling for a games cell, or past two digits where no ceiling exists. Refusal is what lets a keypad
 * move on to the next cell rather than the model guessing.
 *
 * The ceiling is `getMaxSetScore`'s, given the OPPONENT's games where they are in: 7 in a set to six,
 * tightened to 6 for a side facing 3 — 7 is reachable only through a tiebreak at six-all — and left at
 * 7 for a side facing 5, since 7-5 needs no tiebreak. That last answer is `#5043(factory)`, merged
 * 2026-09-30; this module is written to the fixed factory, and a `7` typed against a `5` is pinned.
 */
export function typeDigit(model: ScoreEntryModel, intent: TypeDigitIntent): ScoreEntryModel {
  const { cell, digit } = intent;
  if (!isValidCell(model, cell) || !Number.isInteger(digit) || digit < 0 || digit > 9) return model;

  const config = matchUpConfigFor(model.matchUpFormat);
  const setFormat = getSetFormatForIndex(cell.setIndex, config);
  const entry = model.sets[cell.setIndex];

  if (isSetTiebreakOnly(setFormat)) return typeTiebreakOnlyDigit(model, cell, digit, setFormat, !!intent.complement);

  const current = readCell(entry, cell);
  const ceiling = cell.kind === 'games' ? ceilingFor(setFormat, readCell(entry, otherCell(cell))) : undefined;
  const next = appendDigit(current, digit, ceiling);
  if (next === undefined) return model;

  let updated = writeCell(entry, cell, next);
  if (intent.complement) updated = withComplement(updated, cell, next, current, setFormat);

  return withSet(model, cell.setIndex, updated, config, cell.kind === 'games');
}

/**
 * A tiebreak-only set takes ONE typed number — the lower — and derives the other.
 *
 * Which row holds the typed number is the row with the LOWER points, since the derivation always puts
 * the other row ahead; so a digit on that row extends it, and a digit on the other row starts a new low
 * THERE (CA: `Shift` chooses which row the lower score belongs to). No refusal is needed for typing on
 * the derived row — it is a statement about which side lost, and is honoured as one.
 */
function typeTiebreakOnlyDigit(
  model: ScoreEntryModel,
  cell: CellRef,
  digit: number,
  setFormat: SetFormat | undefined,
  complement: boolean
): ScoreEntryModel {
  if (cell.kind !== 'games') return model;

  const entry = model.sets[cell.setIndex];
  const mine = cell.side === 1 ? entry.side1 : entry.side2;
  const theirs = cell.side === 1 ? entry.side2 : entry.side1;
  const extendsTyped = mine !== undefined && (theirs === undefined || mine < theirs);

  const low = appendDigit(extendsTyped ? mine : undefined, digit, undefined);
  if (low === undefined) return model;

  // Derived only when asked, like every other complement: the Dial Pad always asks, because CA's rule
  // there is that the operator types ONE number; Dynamic Sets asks only while its Smart toggle is on.
  // No target to complete against: keep what was typed and leave the other side alone rather than
  // inventing it. `completeTiebreakOnly` declines in exactly that case.
  const pair = complement ? completeTiebreakOnly(low, cell.side, setFormat) : undefined;
  const updated = pair ? { side1: pair.side1, side2: pair.side2 } : writeCell(entry, cell, low);

  return withSet(model, cell.setIndex, updated, matchUpConfigFor(model.matchUpFormat), true);
}

/** The set with the other side derived, per the `complement` rules on `TypeDigitIntent`. */
function withComplement(
  entry: SetEntry,
  cell: CellRef,
  value: number,
  previous: number | undefined,
  setFormat: SetFormat | undefined
): SetEntry {
  const other = otherCell(cell);

  if (cell.kind === 'games') {
    // Only the FIRST digit into an empty cell infers the pair, and it infers the whole pair: a 4 says the
    // set was 6-4 whatever the other cell held, which is the shipping dialog's rule and what the keyboard
    // tests pin. Firing once per set is the caller's policy, held beside its Smart toggle.
    if (previous !== undefined) return entry;
    const complement = calculateComplement(value, setFormat);
    return complement === null ? entry : writeCell(entry, other, complement);
  }

  const loser = gamesLoser(entry);
  if (loser !== cell.side) return entry;

  const tiebreakTo = setFormat?.tiebreakFormat?.tiebreakTo;
  if (tiebreakTo === undefined) return entry;

  const pair = scoreGovernor.getTiebreakComplement({
    lowValue: value,
    tiebreakTo,
    // The PARAMETER is `tiebreakNoAd` and the FIELD is `NoAD`; see `tiebreakEntry.ts` for why neither
    // spelling can be guessed from the other.
    tiebreakNoAd: setFormat?.tiebreakFormat?.NoAD,
    isSide1: cell.side === 1
  });
  if (!pair || pair[0] === undefined || pair[1] === undefined) return entry;

  return { ...entry, tiebreak1: pair[0], tiebreak2: pair[1] };
}

/**
 * Write a whole value into a cell, as setting an input's value does. `undefined` empties it.
 *
 * Nothing is clamped or derived: the value recorded is the value given, and whether it is legal is
 * `error`'s question. A keystroke goes through `typeDigit`, which is where the derivations live.
 */
export function setCell(model: ScoreEntryModel, cell: CellRef, value: number | undefined): ScoreEntryModel {
  if (!isValidCell(model, cell)) return model;
  if (value !== undefined && (!Number.isInteger(value) || value < 0)) return model;

  const entry = model.sets[cell.setIndex];
  if (readCell(entry, cell) === value) return model;

  return withSet(
    model,
    cell.setIndex,
    writeCell(entry, cell, value),
    matchUpConfigFor(model.matchUpFormat),
    cell.kind === 'games'
  );
}

export function clearCell(model: ScoreEntryModel, cell: CellRef): ScoreEntryModel {
  return setCell(model, cell, undefined);
}

/**
 * Empty every set and keep the ending: what a score-clearing ending does to the cells.
 *
 * CA, 2026-09-30: *"when I enter set score(s) and then select (Walkover) the set score(s) should
 * clear."* The card calls this when the chosen ending carries no score, having first read `scoreString`
 * for the band. Final, like `[Clear]`: un-choosing the walkover does not bring the score back, because a
 * remembered score that silently reappears on an approach switch was the worse bug.
 */
export function clearScore(model: ScoreEntryModel): ScoreEntryModel {
  if (model.sets.every((entry) => isEmptyEntry(entry))) return model;
  return { ...model, sets: model.sets.map(() => EMPTY_SET) };
}

/** Empty every set and un-choose the ending: the card's `[Clear]`. Format and approach stay. */
export function clearAll(model: ScoreEntryModel): ScoreEntryModel {
  const empty = model.sets.every((entry) => isEmptyEntry(entry));
  if (empty && model.ending === emptyScoreEntryState) return model;

  return { ...model, sets: model.sets.map(() => EMPTY_SET), ending: emptyScoreEntryState };
}

// ── Ending, format, approach ─────────────────────────────────────────

/**
 * Choose (or un-choose) an ending, delegating to `scoreEntryState.ts` — every control there is a
 * toggle, and that is preserved.
 *
 * The SETS are left exactly as they are, even for an ending that carries no score. The card today
 * clears the region on a walkover and keeps the string aside for the band; here the selectors suppress
 * the score while such an ending is chosen (`scoreString` answers nothing, `discardedScore` names what
 * was typed) and it comes back if the ending is un-chosen. Keeping the keystrokes is the point of the
 * model; whether the card should ALSO clear explicitly is S5's decision, and `clearAll` is there for it.
 */
export function chooseEnding(model: ScoreEntryModel, intent: EndingIntent): ScoreEntryModel {
  const ending = nextEnding(model.ending, intent);
  return ending === model.ending ? model : { ...model, ending };
}

function nextEnding(ending: ScoreEntryState, intent: EndingIntent): ScoreEntryState {
  switch (intent.kind) {
    case 'side':
      return chooseSideEnding(ending, intent.sideNumber, intent.status);
    case 'match':
      return chooseMatchEnding(ending, intent.status);
    case 'bothSidesOut':
      return toggleBothSidesOut(ending);
    case 'reasonCode':
      return chooseReasonCode(ending, intent.code);
    default:
      return ending;
  }
}

/**
 * Move to another format, keeping what the new format has not invalidated.
 *
 * `retainScoreForFormat` decides, given both formats: a set whose position keeps the same rule survives
 * finished or not, a set whose rule changed must stand as a complete legal set, and everything after the
 * first casualty goes with it. It keeps a PREFIX, so the entries are cut to its length rather than
 * rebuilt from its output — the operator's cells survive untouched. The array is then resized to the
 * new format's set count.
 */
export function changeFormat(model: ScoreEntryModel, matchUpFormat: string): ScoreEntryModel {
  if (matchUpFormat === model.matchUpFormat) return model;

  const previousConfig = matchUpConfigFor(model.matchUpFormat);
  const { sets } = scoreGovernor.retainScoreForFormat({
    sets: model.sets.map((entry, index) => toFactorySet(entry, index, previousConfig)),
    matchUpFormat,
    previousMatchUpFormat: model.matchUpFormat
  });

  const config = matchUpConfigFor(matchUpFormat);
  const kept = model.sets.slice(0, sets.length);
  const resized = Array.from({ length: setCountOf(config) }, (_, index) => kept[index] ?? EMPTY_SET);

  return { ...model, matchUpFormat, sets: normalize(resized, config) };
}

/** Change how the score is typed. A no-op on the score itself: the sets are the sets whichever region shows them. */
export function switchApproach(model: ScoreEntryModel, approach: ScoreEntryApproach): ScoreEntryModel {
  return approach === model.approach ? model : { ...model, approach };
}

// ── The invariant, and the housekeeping every score transition shares ─

/** Replace one set, then re-establish the invariants over the whole array. */
function withSet(
  model: ScoreEntryModel,
  setIndex: number,
  entry: SetEntry,
  config: MatchUpConfig,
  gamesEdited: boolean
): ScoreEntryModel {
  const sets = model.sets.map((existing, index) => (index === setIndex ? compact(entry) : existing));
  return { ...model, sets: normalize(sets, config, gamesEdited ? setIndex : undefined) };
}

/**
 * The array every transition ends with:
 *
 *   - a tiebreak whose games no longer call for one is forgotten, WHEN THE GAMES ARE WHAT CHANGED. Editing
 *     a 7-6(3) down to 6-3 must not leave the points attached — the band read `6-3(3)` when it did. Only
 *     a set with both games in is judged, because a set mid-retype may be about to call for the tiebreak
 *     again. A tiebreak typed ONTO a 6-2 is the opposite case: the operator said it, so it stays and
 *     `error` reports it — the Dial Pad's "SAYS a tiebreak on a 6-2 is wrong rather than hiding it";
 *   - **no set exists beyond the one that decides the match.** The first prefix the factory calls decided
 *     is the match; everything after it is emptied. An `exactly` format plays every set, and the factory's
 *     own winner test for it (`>= setsToWin`) would otherwise read five bolts of nine as the end — so it is
 *     never trimmed.
 */
function normalize(sets: readonly SetEntry[], config: MatchUpConfig, gamesEditedAt?: number): SetEntry[] {
  const settled = sets.map((entry, index) =>
    index === gamesEditedAt ? dropStaleTiebreak(entry, index, config) : entry
  );
  const decider = decidingIndex(settled, config);
  if (decider === undefined) return settled;
  return settled.map((entry, index) => (index > decider ? EMPTY_SET : entry));
}

function dropStaleTiebreak(entry: SetEntry, index: number, config: MatchUpConfig): SetEntry {
  if (entry.tiebreak1 === undefined && entry.tiebreak2 === undefined) return entry;
  if (entry.side1 === undefined || entry.side2 === undefined) return entry;
  if (isSetTiebreakOnly(getSetFormatForIndex(index, config))) return entry;
  if (shouldShowTiebreak(index, { side1: entry.side1, side2: entry.side2 }, config)) return entry;
  return compact({ side1: entry.side1, side2: entry.side2 });
}

/**
 * The index of the set that decides the match, or `undefined` while nothing does.
 *
 * Asked of the factory prefix by prefix, so that a decision reached at set 2 is found even when a stale
 * set 3 would make the whole array read as undecided — measured: `analyzeMatchUp` on `6-2 6-2 6-3` with
 * three winning sides answers NO winner, because three is not `setsToWin`.
 */
export function decidingIndex(sets: readonly SetEntry[], config: MatchUpConfig): number | undefined {
  if (config.exactly !== undefined) return undefined;

  for (let index = 0; index < sets.length; index += 1) {
    const prefix = enteredFactorySets(sets.slice(0, index + 1), config);
    if (prefix.length && isMatchComplete(prefix, config)) return index;
  }
  return undefined;
}

/** The sets with BOTH principal cells in, as the factory reads them, positioned by `setNumber`. */
export function enteredFactorySets(sets: readonly SetEntry[], config: MatchUpConfig): SetScore[] {
  return sets.flatMap((entry, index) => (isEntered(entry) ? [toFactorySet(entry, index, config)] : []));
}

/**
 * One entry in the factory's shape.
 *
 * `buildSetScore` derives the winning side and the tiebreak pair from the loser's points, which is the
 * contract this module keeps: the lower of two tiebreak cells is the loser's. A cell that is empty stays
 * empty in the output — it is not read as 0, which is what let a half-entered set claim `6-0`.
 *
 * A tiebreak-only set is built here rather than by `buildSetScore`. When this was written that function's
 * winner rule was a hand-rolled "both sides above zero and unequal" (a `3-1` won, a `10-0` not); it asks
 * the factory now too, and this path simply never left. The set's winner is `analyzeSet`'s, given the
 * points AS points — `getSetWinner` would hand them over as games, which a tiebreak-only format has no
 * rule for.
 */
export function toFactorySet(entry: SetEntry, index: number, config: MatchUpConfig): SetScore {
  const tiebreakOnly = isSetTiebreakOnly(getSetFormatForIndex(index, config));

  if (!isEntered(entry)) {
    // A partial set carries only what was typed. `retainScoreForFormat` sees it as the part-entered
    // set it is, and `validateSetScore` with `allowIncomplete` accepts a lone side.
    return compact({
      setNumber: index + 1,
      side1Score: tiebreakOnly ? undefined : entry.side1,
      side2Score: tiebreakOnly ? undefined : entry.side2,
      side1TiebreakScore: tiebreakOnly ? entry.side1 : entry.tiebreak1,
      side2TiebreakScore: tiebreakOnly ? entry.side2 : entry.tiebreak2
    });
  }

  if (tiebreakOnly) {
    return compact({
      setNumber: index + 1,
      side1Score: 0,
      side2Score: 0,
      side1TiebreakScore: entry.side1,
      side2TiebreakScore: entry.side2,
      winningSide: tiebreakOnlyWinner(entry, index, config)
    });
  }

  const built = buildSetScore(index, text(entry.side1), text(entry.side2), lowerTiebreak(entry), config);
  // `buildSetScore` derives the winner's points from the loser's. Where the operator typed BOTH, the
  // typed pair stands, so the record carries what was entered rather than a recomputation of it — and a
  // pair that disagrees with the games is `error`'s to report, not this function's to repair.
  if (entry.tiebreak1 !== undefined && entry.tiebreak2 !== undefined) {
    return { ...built, side1TiebreakScore: entry.tiebreak1, side2TiebreakScore: entry.tiebreak2 };
  }
  return built;
}

/** The factory's winner of a tiebreak-only set, or `undefined` while nobody has won it. */
function tiebreakOnlyWinner(entry: SetEntry, index: number, config: MatchUpConfig): SideNumber | undefined {
  const { winningSide } = scoreGovernor.analyzeSet({
    setObject: { setNumber: index + 1, side1TiebreakScore: entry.side1, side2TiebreakScore: entry.side2 },
    matchUpScoringFormat: config
  });
  return winningSide === 1 || winningSide === 2 ? winningSide : undefined;
}

/**
 * Replace every set from a factory-shaped array: the Free Score boundary, where TEXT becomes sets.
 *
 * Free Score keeps the text as the field's own value while it is being typed — a half-typed `6-4 re` is
 * nothing the model can represent — and commits here at the points where the text parses to sets. The
 * same seeding and the same invariants as opening a saved score: a set past the decider is trimmed.
 * The same model comes back when nothing changed, so a keystroke inside a word is not a transition.
 */
export function replaceSets(model: ScoreEntryModel, sets: SetScore[]): ScoreEntryModel {
  const config = matchUpConfigFor(model.matchUpFormat);
  const next = normalize(seedEntries(sets, config), config);
  if (JSON.stringify(next) === JSON.stringify(model.sets)) return model;
  return { ...model, sets: next };
}

// ── Cell arithmetic ──────────────────────────────────────────────────

/** `current` with `digit` appended, or `undefined` where that would pass the ceiling or the digit cap. */
function appendDigit(current: number | undefined, digit: number, ceiling: number | undefined): number | undefined {
  const next = current === undefined ? digit : current * 10 + digit;
  if (String(next).length > MAX_CELL_DIGITS) return undefined;
  if (ceiling !== undefined && next > ceiling) return undefined;
  return next;
}

/** The largest games score a cell may hold under its set format, or `undefined` where the factory says none exists. */
function ceilingFor(setFormat: SetFormat | undefined, opponentScore: number | undefined): number | undefined {
  if (!setFormat) return undefined;
  return scoreGovernor.getMaxSetScore({
    opponentScore,
    setTo: setFormat.setTo,
    tiebreakAt: setFormat.tiebreakAt,
    tiebreakTo: setFormat.tiebreakSet?.tiebreakTo,
    NoAD: setFormat.NoAD,
    winBy: setFormat.winBy,
    timed: isSetTimed(setFormat)
  });
}

function isValidCell(model: ScoreEntryModel, cell: CellRef): boolean {
  if (!Number.isInteger(cell.setIndex) || cell.setIndex < 0 || cell.setIndex >= model.sets.length) return false;
  if (cell.side !== 1 && cell.side !== 2) return false;
  if (cell.kind === 'games') return true;
  if (cell.kind !== 'tiebreak') return false;
  // A tiebreak-only set's points ARE its principal cells; it has no tiebreak cells of its own.
  return !isSetTiebreakOnly(getSetFormatForIndex(cell.setIndex, matchUpConfigFor(model.matchUpFormat)));
}

export function readCell(entry: SetEntry, cell: CellRef): number | undefined {
  if (cell.kind === 'games') return cell.side === 1 ? entry.side1 : entry.side2;
  return cell.side === 1 ? entry.tiebreak1 : entry.tiebreak2;
}

function writeCell(entry: SetEntry, cell: CellRef, value: number | undefined): SetEntry {
  const key =
    cell.kind === 'games' ? (cell.side === 1 ? 'side1' : 'side2') : cell.side === 1 ? 'tiebreak1' : 'tiebreak2';
  return compact({ ...entry, [key]: value });
}

function otherCell(cell: CellRef): CellRef {
  return { ...cell, side: cell.side === 1 ? 2 : 1 };
}

/** The side that lost the set on games, or `undefined` while the games are level or not both in. */
export function gamesLoser(entry: SetEntry): SideNumber | undefined {
  if (entry.side1 === undefined || entry.side2 === undefined || entry.side1 === entry.side2) return undefined;
  return entry.side1 > entry.side2 ? 2 : 1;
}

/** The loser's tiebreak points as text — the one value `buildSetScore` takes — or `undefined`. */
function lowerTiebreak(entry: SetEntry): string | undefined {
  const pair = [entry.tiebreak1, entry.tiebreak2].filter((points): points is number => points !== undefined);
  return pair.length ? String(Math.min(...pair)) : undefined;
}

function text(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

/** Whether both principal cells are in — the regions' `bothEntered`. */
export function isEntered(entry: SetEntry): boolean {
  return entry.side1 !== undefined && entry.side2 !== undefined;
}

/** Whether the set holds anything at all, in any cell. */
export function isEmptyEntry(entry: SetEntry): boolean {
  return (
    entry.side1 === undefined &&
    entry.side2 === undefined &&
    entry.tiebreak1 === undefined &&
    entry.tiebreak2 === undefined
  );
}

/**
 * How many sets the format can hold: every set of an `exactly` format, otherwise the best-of. An
 * aggregate format with a final tiebreak holds one more, its sudden-death decider, which is set N + 1
 * and never one of the N (factory #5166; CA, 2026-10-04). It opens only on a level total.
 */
export function setCountOf(config: MatchUpConfig): number {
  return deciderSetNumberOf(config) ?? config.exactly ?? config.bestOf;
}

/** The set number of an aggregate format's final-tiebreak decider, or `undefined` when it has none. */
export function deciderSetNumberOf(config: MatchUpConfig): number | undefined {
  if (config.finalSetFormat?.tiebreakSet?.tiebreakTo === undefined) return undefined;
  return aggregateDeciderSetNumber(config);
}

/** An object with its `undefined` members removed, so two empty cells compare equal however they became empty. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, member]) => member !== undefined)) as T;
}
