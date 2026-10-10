import { autoAdjustTiebreakAt, getBestOfOptionsForRoot } from '../matchUpFormatLogic';
import { fromCode } from './codec';

// constants and types
import type { Capabilities, Codec, Edit, EditorState, FormatState, SegmentDraft } from './types';

/** The set types that may be counted "Exactly N" (`SET3X-S:T10`, `INN4X-S:O3`); the others are "Best of". */
const EXACTLY_SET_TYPES = new Set(['TIMED', 'OUTS']);
/** A final set's tiebreak targets outside "Exactly" mode; "Exactly" also offers 1 and 3. */
export const DEFAULT_TIEBREAK_TO_OPTIONS = [1, 3, 5, 7, 9, 10, 11, 12, 13, 15, 21, 25];

export interface EditContext {
  codec: Codec;
  capabilities?: Capabilities;
  /** The tiebreak targets offered outside "Exactly" mode (the picker's configured options). */
  tiebreakToOptions?: number[];
}

/** "Best of" counts are odd; an even count rounds up, as it always has. */
const toOdd = (count: number) => (count % 2 === 0 ? count + 1 : count);

/**
 * The largest option not above the count, or the largest option when the count exceeds them all —
 * how the picker has always clamped "Best of" when the match root changes.
 */
function clampToOptions(count: number, options: number[]): number {
  if (options.includes(count)) return count;
  const largest = options.at(-1);
  if (largest < count) return largest;
  return options.reduce((previous, current) => (current <= count ? current : previous), options[0]);
}

function toBestOf(format: FormatState, tiebreakToOptions: number[]): void {
  format.countMode = 'BEST_OF';
  format.count = toOdd(format.count);
  // A final-set tiebreak target that is not offered outside "Exactly" goes back to the default.
  if (format.finalSetEnabled && !tiebreakToOptions.includes(format.finalSet.tiebreakTo)) format.finalSet.tiebreakTo = 7;
}

function applySegmentValue(format: FormatState, segment: SegmentDraft, field: string, value: any): void {
  if (field === 'setTo') {
    segment.setTo = value;
    segment.tiebreakAt = autoAdjustTiebreakAt(value, segment.tiebreakAt);
  } else if (field === 'based') {
    segment.based = value === 'G' ? undefined : value;
    // A points-based timed set has no games, so it has no game format either.
    if (segment === format.set && segment.based === 'P') format.gameFormat = undefined;
  } else if (field === 'modifier') {
    segment.modifier = value === 'None' ? undefined : value;
  } else {
    (segment as any)[field] = value;
  }
}

function applyToFormat(format: FormatState, edit: Exclude<Edit, { type: 'loadCode' }>, tiebreakToOptions: number[]) {
  switch (edit.type) {
    case 'setCountMode':
      if (edit.mode === 'EXACTLY') {
        // "Exactly" counts only timed sets, so choosing it makes the main set timed.
        if (!EXACTLY_SET_TYPES.has(format.set.type)) format.set.type = 'TIMED';
        format.countMode = 'EXACTLY';
      } else {
        toBestOf(format, tiebreakToOptions);
      }
      break;
    case 'setCount':
      format.count = edit.count;
      // A single set has no final set.
      if (edit.count <= 1) format.finalSetEnabled = false;
      break;
    case 'setMatchRoot':
      format.matchRoot = edit.matchRoot;
      if (format.countMode === 'BEST_OF') {
        format.count = clampToOptions(format.count, getBestOfOptionsForRoot(edit.matchRoot));
      }
      break;
    case 'setAggregate':
      format.aggregate = edit.on;
      break;
    case 'setGameFormat':
      format.gameFormat = edit.gameFormat;
      break;
    case 'setMaxMinutes':
      format.maxMinutes = edit.minutes || undefined;
      break;
    case 'setFinalSet':
      if (edit.on && format.count <= 1) break;
      // Turning the final set on starts it as a copy of the main set, tiebreak included.
      if (edit.on) format.finalSet = { ...format.set };
      format.finalSetEnabled = edit.on;
      break;
    case 'setSetType': {
      format[edit.segment].type = edit.setType;
      const leavesExactly = edit.segment === 'set' && format.countMode === 'EXACTLY';
      if (leavesExactly && !EXACTLY_SET_TYPES.has(edit.setType)) toBestOf(format, tiebreakToOptions);
      break;
    }
    case 'setTiebreak': {
      // One toggle, two flags: a timed set's tiebreak is kept apart from a standard set's.
      const segment = format[edit.segment];
      if (segment.type === 'TIMED') segment.timedTiebreak = edit.on;
      else segment.tiebreak = edit.on;
      break;
    }
    case 'setSegmentValue':
      applySegmentValue(format, format[edit.segment], edit.field, edit.value);
      break;
    default:
      break;
  }
}

function copyFormat(format: FormatState): FormatState {
  return {
    ...format,
    gameFormat: format.gameFormat ? { ...format.gameFormat } : undefined,
    set: { ...format.set },
    finalSet: { ...format.finalSet },
    matchMods: [...format.matchMods]
  };
}

/**
 * The picker's single transition function. Pure: it returns a new state and never touches the one it
 * was given. A read-only state accepts only a new code (choosing another format replaces it whole).
 */
export function applyEdit(state: EditorState, edit: Edit, context: EditContext): EditorState {
  if (edit.type === 'loadCode') return fromCode(edit.code, context.codec, context.capabilities);
  if (state.readOnlyReasons.length) return state;

  const format = copyFormat(state.format);
  applyToFormat(format, edit, context.tiebreakToOptions ?? DEFAULT_TIEBREAK_TO_OPTIONS);
  return { ...state, format, dirty: true };
}
