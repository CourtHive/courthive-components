import { resolveCapabilities, capabilityReasons } from './capabilities';

// constants and types
import type { Capabilities, Codec, EditorState, FormatState, SegmentDraft } from './types';

export const DEFAULT_FORMAT = 'SET3-S:6/TB7';

export function defaultSegment(): SegmentDraft {
  return {
    type: 'SET',
    setTo: 6,
    noAd: false,
    tiebreak: false,
    tiebreakAt: 6,
    setWinBy: 2,
    tiebreakTo: 7,
    tiebreakWinBy: 2,
    minutes: 10,
    based: undefined,
    timedTiebreak: false,
    outs: 3,
    modifier: undefined
  };
}

function segmentFromParsed(parsedSet: any): SegmentDraft {
  const segment = defaultSegment();
  if (!parsedSet) return segment;

  if (parsedSet.outs) {
    segment.type = 'OUTS';
    segment.outs = parsedSet.outs;
    return segment;
  }

  if (parsedSet.timed) {
    segment.type = 'TIMED';
    segment.minutes = parsedSet.minutes ?? segment.minutes;
    segment.based = parsedSet.based && parsedSet.based !== 'G' ? parsedSet.based : undefined;
    segment.modifier = parsedSet.modifier;
    segment.timedTiebreak = !!parsedSet.tiebreakFormat;
    if (parsedSet.tiebreakFormat) segment.tiebreakTo = parsedSet.tiebreakFormat.tiebreakTo ?? segment.tiebreakTo;
    return segment;
  }

  if (parsedSet.tiebreakSet && !parsedSet.setTo) {
    segment.type = 'TIEBREAK';
    segment.tiebreakTo = parsedSet.tiebreakSet.tiebreakTo ?? segment.tiebreakTo;
    segment.tiebreakWinBy = parsedSet.tiebreakSet.NoAD ? 1 : 2;
    segment.modifier = parsedSet.tiebreakSet.modifier;
    return segment;
  }

  segment.setTo = parsedSet.setTo ?? segment.setTo;
  segment.noAd = !!parsedSet.NoAD;
  segment.setWinBy = parsedSet.winBy ?? 2;
  segment.tiebreakAt = Number(parsedSet.tiebreakAt ?? segment.setTo);
  const tiebreak = parsedSet.tiebreakFormat;
  segment.tiebreak = !!tiebreak;
  if (tiebreak) {
    segment.tiebreakTo = tiebreak.tiebreakTo ?? segment.tiebreakTo;
    segment.tiebreakWinBy = tiebreak.NoAD ? 1 : 2;
    segment.modifier = tiebreak.modifier;
  }
  return segment;
}

/** The parsed shape the factory's stringify reads, built from a segment of the state. */
export function segmentToParsed(segment: SegmentDraft): any {
  if (segment.type === 'OUTS') return { outs: segment.outs };

  if (segment.type === 'TIMED') {
    // A timed set's tiebreak has no advantage rule (the grammar refuses `T20/TB7NOAD`), and its modifier
    // belongs to the timed set, not the tiebreak.
    return {
      timed: true,
      minutes: segment.minutes,
      ...(segment.based ? { based: segment.based } : {}),
      ...(segment.timedTiebreak ? { tiebreakFormat: { tiebreakTo: segment.tiebreakTo } } : {}),
      ...(segment.modifier ? { modifier: segment.modifier } : {})
    };
  }

  if (segment.type === 'TIEBREAK') {
    return {
      tiebreakSet: {
        tiebreakTo: segment.tiebreakTo,
        ...(segment.tiebreakWinBy === 1 ? { NoAD: true } : {}),
        ...(segment.modifier ? { modifier: segment.modifier } : {})
      }
    };
  }

  const parsedSet: any = { setTo: segment.setTo };
  if (segment.noAd) parsedSet.NoAD = true;
  if (segment.tiebreak) {
    parsedSet.tiebreakAt = segment.tiebreakAt;
    parsedSet.tiebreakFormat = {
      tiebreakTo: segment.tiebreakTo,
      ...(segment.tiebreakWinBy === 1 ? { NoAD: true } : {}),
      ...(segment.modifier ? { modifier: segment.modifier } : {})
    };
  } else if (segment.setWinBy && segment.setWinBy !== 2) {
    parsedSet.winBy = segment.setWinBy;
  }
  return parsedSet;
}

export function formatFromParsed(parsed: any): FormatState {
  const set = segmentFromParsed(parsed.setFormat);
  return {
    matchRoot: parsed.matchRoot ?? 'SET',
    countMode: parsed.exactly ? 'EXACTLY' : 'BEST_OF',
    count: parsed.exactly ?? parsed.bestOf ?? 3,
    aggregate: !!parsed.aggregate,
    gameFormat: parsed.gameFormat ?? undefined,
    set,
    finalSetEnabled: !!parsed.finalSetFormat,
    finalSet: parsed.finalSetFormat ? segmentFromParsed(parsed.finalSetFormat) : { ...set },
    maxMinutes: parsed.matchUpConstraint?.timed ? parsed.matchUpConstraint.minutes : undefined,
    matchMods: parsed.matchMods ? [...parsed.matchMods] : [],
    shortForm: !!parsed.simplified
  };
}

/** `T10` can stand for `SET1-S:T10` only while the format is one timed set and nothing else. */
function canUseShortForm(format: FormatState): boolean {
  return (
    format.shortForm &&
    format.countMode === 'BEST_OF' &&
    format.count === 1 &&
    format.set.type === 'TIMED' &&
    format.matchRoot === 'SET' &&
    !format.finalSetEnabled &&
    !format.aggregate &&
    !format.gameFormat &&
    !format.maxMinutes &&
    !format.matchMods.length
  );
}

export function formatToParsed(format: FormatState): any {
  const parsed: any = { setFormat: segmentToParsed(format.set) };
  if (format.matchRoot && format.matchRoot !== 'SET') parsed.matchRoot = format.matchRoot;
  if (format.aggregate) parsed.aggregate = true;
  if (format.gameFormat) parsed.gameFormat = format.gameFormat;
  if (format.countMode === 'EXACTLY') parsed.exactly = format.count;
  else parsed.bestOf = format.count;
  if (format.finalSetEnabled) parsed.finalSetFormat = segmentToParsed(format.finalSet);
  if (format.maxMinutes) parsed.matchUpConstraint = { timed: true, minutes: format.maxMinutes };
  if (format.matchMods.length) parsed.matchMods = [...format.matchMods];
  if (canUseShortForm(format)) parsed.simplified = true;
  return parsed;
}

export function toCode(format: FormatState, codec: Codec): string {
  return codec.stringify(formatToParsed(format));
}

/**
 * The picker's starting state for a code.
 *
 * The code is editable only if the state rebuilds it exactly: compared canonically, so a redundant
 * spelling (`@6` on a set to 6) still counts as representable. Anything else (a set type, a field or
 * a modifier the state has no place for) makes it read-only, so it is returned untouched rather than
 * rebuilt without the parts the controls cannot hold. A code that does not parse falls back to the
 * default format, which is then what Select returns, as the picker always has.
 */
export function fromCode(code: string, codec: Codec, capabilities?: Capabilities): EditorState {
  const parsed = code ? codec.parse(code) : undefined;
  if (!parsed) {
    const fallback = codec.parse(DEFAULT_FORMAT);
    return { format: formatFromParsed(fallback), original: DEFAULT_FORMAT, dirty: false, readOnlyReasons: [] };
  }

  const format = formatFromParsed(parsed);
  const readOnlyReasons: string[] = [];
  if (toCode(format, codec) !== codec.stringify(parsed)) readOnlyReasons.push('unrepresentable');
  readOnlyReasons.push(...capabilityReasons(format, resolveCapabilities(capabilities)));
  return { format, original: code, dirty: false, readOnlyReasons };
}

/** What Select returns: the original code until something is edited, the rebuilt code after. */
export function selectedCode(state: EditorState, codec: Codec): string {
  return state.dirty && !state.readOnlyReasons.length ? toCode(state.format, codec) : state.original;
}
