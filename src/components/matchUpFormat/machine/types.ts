/**
 * The format picker as an explicit state machine.
 *
 * One `FormatState` holds the whole format; the DOM holds none of it. A code becomes state through
 * `fromCode`, state becomes a code through `toCode`, every change is an `Edit` applied by `applyEdit`
 * (where each invariant lives once), and `deriveView` says what every control shows. The modal only
 * renders the view and dispatches edits.
 */

export type SetType = 'SET' | 'TIEBREAK' | 'TIMED' | 'OUTS';
export type CountMode = 'BEST_OF' | 'EXACTLY';
export type SegmentKey = 'set' | 'finalSet';

export type GameFormat =
  { type: 'CONSECUTIVE'; count: number; deuceAfter?: number } | { type: 'TRADITIONAL'; deuceAfter?: number };

/**
 * One segment (the main set or the final set). It keeps a value for every set type's controls, so
 * switching type and back restores what the operator had rather than resetting to defaults.
 */
export interface SegmentDraft {
  type: SetType;
  /** Standard set: games to win the set. */
  setTo: number;
  /** Standard set: no-advantage games. */
  noAd: boolean;
  /** Standard set: whether it ends in a tiebreak. */
  tiebreak: boolean;
  /** Standard set with a tiebreak: the game score at which it is played. */
  tiebreakAt: number;
  /** Standard set without a tiebreak: the game margin needed to win (2 is the default). */
  setWinBy: number;
  /** A set tiebreak or a tiebreak-only set: points to win. */
  tiebreakTo: number;
  /** A set tiebreak or a tiebreak-only set: 1 is no-advantage, 2 is win by two. */
  tiebreakWinBy: number;
  /** Timed set: minutes. */
  minutes: number;
  /** Timed set: scoring basis. Undefined is games, the grammar's default. */
  based?: string;
  /**
   * Timed set: whether it ends in a tiebreak (`T10P/TB1`). Separate from a standard set's `tiebreak`, so
   * switching a set with a tiebreak to timed does not give the timed set one.
   */
  timedTiebreak: boolean;
  /** Outs set (baseball and similar): outs per side. */
  outs: number;
  /** A tiebreak's or a timed set's modifier, e.g. RALLY. */
  modifier?: string;
}

export interface FormatState {
  /** SET, HAL, QTR, PER, INN, RND, FRM or MAP. */
  matchRoot: string;
  countMode: CountMode;
  count: number;
  aggregate: boolean;
  gameFormat?: GameFormat;
  set: SegmentDraft;
  finalSetEnabled: boolean;
  /** Kept even while disabled, so turning the final set back on restores it. */
  finalSet: SegmentDraft;
  /** A match-level time limit in minutes (`-M:T60`), or undefined for none. */
  maxMinutes?: number;
  /**
   * Match modifiers the grammar keeps for forward compatibility (`SET3Z`). The picker has no control for
   * them; they are carried through unchanged.
   */
  matchMods: string[];
  /**
   * The code used the standalone timed short form (`T10` for `SET1-S:T10`). Kept while the format can
   * still be written that way, so an edit that keeps it a single timed set keeps its spelling.
   */
  shortForm: boolean;
}

/** Each capability can be switched off; a code that needs a switched-off one opens read-only. */
export interface Capabilities {
  setTypes?: { set?: boolean; tiebreak?: boolean; timed?: boolean; outs?: boolean };
  /** Choosing a match root other than SET. */
  matchRoots?: boolean;
  /** "Exactly N" set counts. */
  exactly?: boolean;
  aggregate?: boolean;
  gameFormat?: boolean;
  finalSet?: boolean;
  /** A standard or timed set's tiebreak toggle. */
  setTiebreak?: boolean;
  /** A match-level time limit (`-M:T60`). */
  maxMatchTime?: boolean;
  /** A timed set's scoring basis (games or points). */
  scoringBasis?: boolean;
  /** Tiebreak and timed-set modifiers, e.g. RALLY. */
  modifiers?: boolean;
  /** The dropdown of predefined formats. */
  catalog?: boolean;
}

export type ResolvedCapabilities = {
  setTypes: { set: boolean; tiebreak: boolean; timed: boolean; outs: boolean };
  matchRoots: boolean;
  exactly: boolean;
  aggregate: boolean;
  gameFormat: boolean;
  finalSet: boolean;
  setTiebreak: boolean;
  maxMatchTime: boolean;
  scoringBasis: boolean;
  modifiers: boolean;
  catalog: boolean;
};

/** What the picker is working on: the format, the code it opened with, and whether it may be edited. */
export interface EditorState {
  format: FormatState;
  /** The code the picker was opened with or last loaded. Returned unchanged until something is edited. */
  original: string;
  /** True once any control has changed the format. */
  dirty: boolean;
  /**
   * Why the format cannot be edited here, or empty when it can. A code the state cannot represent
   * exactly, or one that needs a switched-off capability, is shown and returned unchanged instead of
   * being rebuilt from controls that would silently drop part of it.
   */
  readOnlyReasons: string[];
}

export type SegmentField =
  | 'setTo'
  | 'noAd'
  | 'tiebreakAt'
  | 'setWinBy'
  | 'tiebreakTo'
  | 'tiebreakWinBy'
  | 'minutes'
  | 'based'
  | 'modifier'
  | 'outs';

export type Edit =
  | { type: 'loadCode'; code: string }
  | { type: 'setCountMode'; mode: CountMode }
  | { type: 'setCount'; count: number }
  | { type: 'setMatchRoot'; matchRoot: string }
  | { type: 'setAggregate'; on: boolean }
  | { type: 'setGameFormat'; gameFormat?: GameFormat }
  | { type: 'setMaxMinutes'; minutes?: number }
  | { type: 'setFinalSet'; on: boolean }
  | { type: 'setSetType'; segment: SegmentKey; setType: SetType }
  | { type: 'setTiebreak'; segment: SegmentKey; on: boolean }
  | { type: 'setSegmentValue'; segment: SegmentKey; field: SegmentField; value: any };

/** The factory's parse and stringify, injected so the machine stays pure and testable. */
export interface Codec {
  parse: (code: string) => any;
  stringify: (parsed: any) => string;
}
