/**
 * Pure logic for match format configuration
 * Extracted from matchUpFormat.ts for testability
 */

// Constants
export const TIMED_SETS = 'Timed set';
export const TIEBREAKS = 'Tiebreak';
export const NOAD = 'No-Ad';
export const SETS = 'Set';
export const AD = 'Ad';

// Match root constants
export const MATCH_ROOTS = ['SET', 'HAL', 'QTR', 'PER', 'INN', 'RND', 'FRM', 'MAP'] as const;

export const MATCH_ROOT_LABELS: Record<string, string> = {
  SET: 'Set',
  HAL: 'Half',
  QTR: 'Quarter',
  PER: 'Period',
  INN: 'Inning',
  RND: 'Round',
  FRM: 'Frame',
  MAP: 'Map',
};

/**
 * Returns valid bestOf options for a given match root.
 * SET root: [1,3,5] (standard tennis)
 * Other roots: [1..12] (wide range for cross-sport)
 */
export function getBestOfOptionsForRoot(matchRoot?: string): number[] {
  if (!matchRoot || matchRoot === 'SET') {
    return [1, 3, 5];
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

// Types
export interface SetFormatConfig {
  descriptor: string;
  bestOf?: number;
  exactly?: number;
  advantage: string;
  what: string;
  setTo: number;
  tiebreakAt: number;
  tiebreakTo: number;
  winBy: number;
  minutes: number;
  based?: string; // 'P' (Points), 'G' (Games), or undefined (default Games)
  modifier?: string; // e.g., 'RALLY'
}

export interface FormatConfig {
  matchRoot?: string;      // 'SET'|'HAL'|'QTR'|'PER'|'INN'|'RND'|'FRM'|'MAP'
  aggregate?: boolean;
  gameFormat?: { type: 'CONSECUTIVE'; count: number; deuceAfter?: number } | { type: 'TRADITIONAL'; deuceAfter?: number };
  setFormat: SetFormatConfig;
  finalSetFormat: SetFormatConfig;
}

export interface ParsedMatchUpFormat {
  matchRoot?: string;
  aggregate?: boolean;
  gameFormat?: { type: 'CONSECUTIVE'; count: number; deuceAfter?: number } | { type: 'TRADITIONAL'; deuceAfter?: number };
  bestOf?: number;
  exactly?: number;
  setFormat: any;
  finalSetFormat?: any;
}

/**
 * Create default set format configuration
 */
export function createDefaultSetFormat(isFinalSet = false): SetFormatConfig {
  return {
    descriptor: isFinalSet ? 'Final set' : 'Best of',
    bestOf: isFinalSet ? undefined : 3,
    advantage: AD,
    what: SETS,
    setTo: 6,
    tiebreakAt: 6,
    tiebreakTo: 7,
    winBy: 2,
    minutes: 10
    // based is undefined by default (Games is default when omitted)
  };
}

/**
 * Create default format configuration
 */
export function createDefaultFormat(): FormatConfig {
  return {
    matchRoot: undefined,
    aggregate: undefined,
    gameFormat: undefined,
    setFormat: createDefaultSetFormat(false),
    finalSetFormat: createDefaultSetFormat(true)
  };
}

/**
 * Check if a set format is tiebreak-only (e.g., F:TB10)
 */
export function isTiebreakOnlySet(setFormat: any): boolean {
  return !!(setFormat?.tiebreakSet?.tiebreakTo && !setFormat?.setTo);
}

/**
 * Generate a setFormat object from FormatConfig
 * Pure function - no DOM dependencies
 */
export function buildSetFormat(config: SetFormatConfig, hasTiebreak: boolean): any {
  const { what, setTo, tiebreakAt, tiebreakTo, winBy, minutes, advantage, based, modifier } = config;

  const setFormat: any = {
    setTo
  };

  if (what === SETS && advantage === NOAD) {
    setFormat.NoAD = true;
  }

  if (hasTiebreak && what === SETS) {
    setFormat.tiebreakAt = tiebreakAt;
    setFormat.tiebreakFormat = {
      tiebreakTo
    };
    if (winBy === 1) {
      setFormat.tiebreakFormat.NoAD = true;
    }
    if (modifier) {
      setFormat.tiebreakFormat.modifier = modifier;
    }
  }

  if (what === TIMED_SETS) {
    setFormat.minutes = minutes;
    setFormat.timed = true;

    // Include 'based' property if specified (A/P/G)
    // If undefined, omit it (defaults to games in factory)
    if (based) {
      setFormat.based = based;
    }
    if (modifier) {
      setFormat.modifier = modifier;
    }
  }

  if (what === TIEBREAKS) {
    setFormat.tiebreakSet = {
      tiebreakTo
    };
    if (winBy === 1) {
      setFormat.tiebreakSet.NoAD = true;
    }
    if (modifier) {
      setFormat.tiebreakSet.modifier = modifier;
    }
  }

  return setFormat;
}

/**
 * Build parsed matchUp format from current configuration
 * Pure function - no DOM dependencies
 */
export function buildParsedFormat(
  config: FormatConfig,
  hasSetTiebreak: boolean,
  hasFinalSet: boolean,
  hasFinalSetTiebreak: boolean
): ParsedMatchUpFormat {
  const setFormat = buildSetFormat(config.setFormat, hasSetTiebreak);

  const parsed: ParsedMatchUpFormat = {
    setFormat
  };

  // Include match-level properties only when non-default
  if (config.matchRoot && config.matchRoot !== 'SET') {
    parsed.matchRoot = config.matchRoot;
  }
  if (config.aggregate) {
    parsed.aggregate = true;
  }
  if (config.gameFormat) {
    parsed.gameFormat = config.gameFormat;
  }

  // Use exactly or bestOf based on which is defined
  if (config.setFormat.exactly) {
    parsed.exactly = config.setFormat.exactly;
  } else {
    parsed.bestOf = config.setFormat.bestOf || 3;
  }

  if (hasFinalSet) {
    parsed.finalSetFormat = buildSetFormat(config.finalSetFormat, hasFinalSetTiebreak);
  }

  return parsed;
}

/**
 * Determine which components should be visible based on the current 'what' value
 */
export function getComponentVisibility(what: string): {
  setTo: boolean;
  tiebreakAt: boolean;
  tiebreakTo: boolean;
  winBy: boolean;
  advantage: boolean;
  minutes: boolean;
} {
  return {
    setTo: what === SETS,
    tiebreakAt: what === SETS,
    tiebreakTo: what === SETS || what === TIEBREAKS,
    winBy: what === TIEBREAKS,
    advantage: what === SETS,
    minutes: what === TIMED_SETS
  };
}

/**
 * Calculate valid tiebreakAt options based on setTo value
 */
export function getTiebreakAtOptions(setTo: number): number[] {
  if (setTo <= 1) return [];
  return [setTo - 1, setTo];
}

/**
 * Auto-adjust tiebreakAt when setTo changes
 * Returns the new tiebreakAt value that should be used
 */
export function autoAdjustTiebreakAt(newSetTo: number, currentTiebreakAt: number): number {
  const validOptions = getTiebreakAtOptions(newSetTo);

  // If current value is still valid, keep it
  if (validOptions.includes(currentTiebreakAt)) {
    return currentTiebreakAt;
  }

  // Otherwise, default to setTo (e.g., 6-6 tiebreak for setTo=6)
  return newSetTo;
}

/**
 * Validate that a tiebreakAt value is valid for the given setTo
 */
export function isValidTiebreakAt(setTo: number, tiebreakAt: number): boolean {
  const validOptions = getTiebreakAtOptions(setTo);
  return validOptions.includes(tiebreakAt);
}

/**
 * Check if final set option should be shown
 */
export function shouldShowFinalSetOption(bestOf: number): boolean {
  return bestOf > 1;
}

/**
 * Initialize format configuration from a matchUp format string
 * Merges parsed format with defaults to ensure all properties exist
 */
/**
 * Extract modifier from a parsed set format object.
 * Checks tiebreakSet.modifier, tiebreakFormat.modifier, and setFormat.modifier (timed sets).
 */
function extractModifier(parsedSetFormat: any): string | undefined {
  if (!parsedSetFormat) return undefined;
  return (
    parsedSetFormat.tiebreakSet?.modifier ||
    parsedSetFormat.tiebreakFormat?.modifier ||
    parsedSetFormat.modifier ||
    undefined
  );
}

export function initializeFormatFromString(
  matchUpFormat: string,
  parseFunction: (format: string) => any
): FormatConfig {
  const parsedMatchUpFormat = parseFunction(matchUpFormat);

  // Guard against parse returning undefined
  if (!parsedMatchUpFormat) {
    return createDefaultFormat();
  }

  const setDefaults = createDefaultSetFormat(false);
  const finalSetDefaults = createDefaultSetFormat(true);

  const format: FormatConfig = {
    matchRoot: parsedMatchUpFormat.matchRoot || undefined,
    aggregate: parsedMatchUpFormat.aggregate || undefined,
    gameFormat: parsedMatchUpFormat.gameFormat || undefined,
    setFormat: { ...setDefaults, ...parsedMatchUpFormat.setFormat },
    finalSetFormat: { ...finalSetDefaults, ...parsedMatchUpFormat.finalSetFormat }
  };

  // Copy 'based' property directly from parsed format (no conversion needed)
  if (parsedMatchUpFormat.setFormat?.based) {
    format.setFormat.based = parsedMatchUpFormat.setFormat.based;
  }

  if (parsedMatchUpFormat.finalSetFormat?.based) {
    format.finalSetFormat.based = parsedMatchUpFormat.finalSetFormat.based;
  }

  // Extract modifier from parsed set formats
  const setModifier = extractModifier(parsedMatchUpFormat.setFormat);
  if (setModifier) {
    format.setFormat.modifier = setModifier;
  }

  const finalSetModifier = extractModifier(parsedMatchUpFormat.finalSetFormat);
  if (finalSetModifier) {
    format.finalSetFormat.modifier = finalSetModifier;
  }

  // Handle both bestOf and exactly attributes
  if (parsedMatchUpFormat.exactly) {
    format.setFormat.exactly = parsedMatchUpFormat.exactly;
    format.setFormat.descriptor = 'Exactly';
    delete format.setFormat.bestOf;
    // IMPORTANT: Exactly only works with timed sets
    // Ensure the "what" is set correctly
    if ((format.setFormat as any).timed) {
      format.setFormat.what = TIMED_SETS;
    }
  } else {
    format.setFormat.bestOf = parsedMatchUpFormat.bestOf || 3;
    format.setFormat.descriptor = 'Best of';
    delete format.setFormat.exactly;
  }

  // Detect if main set is tiebreak-only (e.g., S:TB11)
  if (isTiebreakOnlySet(parsedMatchUpFormat.setFormat)) {
    format.setFormat.what = TIEBREAKS;
    format.setFormat.tiebreakTo = parsedMatchUpFormat.setFormat.tiebreakSet.tiebreakTo;
    format.setFormat.winBy = parsedMatchUpFormat.setFormat.tiebreakSet.NoAD ? 1 : 2;
  }

  // Detect if main set is timed (e.g., S:T45) for bestOf formats
  if (parsedMatchUpFormat.setFormat?.timed) {
    format.setFormat.what = TIMED_SETS;
    format.setFormat.minutes = parsedMatchUpFormat.setFormat.minutes;
  }

  // Detect if final set is tiebreak-only (e.g., F:TB10)
  if (isTiebreakOnlySet(parsedMatchUpFormat.finalSetFormat)) {
    format.finalSetFormat.what = TIEBREAKS;
    format.finalSetFormat.tiebreakTo = parsedMatchUpFormat.finalSetFormat.tiebreakSet.tiebreakTo;
    format.finalSetFormat.winBy = parsedMatchUpFormat.finalSetFormat.tiebreakSet.NoAD ? 1 : 2;
  }

  // Detect if final set is timed
  if (parsedMatchUpFormat.finalSetFormat?.timed) {
    format.finalSetFormat.what = TIMED_SETS;
    format.finalSetFormat.minutes = parsedMatchUpFormat.finalSetFormat.minutes;
  }

  return format;
}
