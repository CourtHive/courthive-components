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

// Types
export interface SetFormatConfig {
  descriptor: string;
  bestOf?: number;
  advantage: string;
  what: string;
  setTo: number;
  tiebreakAt: number;
  tiebreakTo: number;
  winBy: number;
  minutes: number;
}

export interface FormatConfig {
  setFormat: SetFormatConfig;
  finalSetFormat: SetFormatConfig;
}

export interface ParsedMatchUpFormat {
  bestOf: number;
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
    minutes: 10,
  };
}

/**
 * Create default format configuration
 */
export function createDefaultFormat(): FormatConfig {
  return {
    setFormat: createDefaultSetFormat(false),
    finalSetFormat: createDefaultSetFormat(true),
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
export function buildSetFormat(
  config: SetFormatConfig,
  hasTiebreak: boolean
): any {
  const { what, setTo, tiebreakAt, tiebreakTo, winBy, minutes, advantage } = config;
  
  const setFormat: any = {
    setTo,
  };

  if (what === SETS && advantage === NOAD) {
    setFormat.NoAD = true;
  }

  if (hasTiebreak && what === SETS) {
    setFormat.tiebreakAt = tiebreakAt;
    setFormat.tiebreakFormat = {
      tiebreakTo,
    };
    if (winBy === 1) {
      setFormat.tiebreakFormat.NoAD = true;
    }
  }

  if (what === TIMED_SETS) {
    setFormat.minutes = minutes;
    setFormat.timed = true;
  }

  if (what === TIEBREAKS) {
    setFormat.tiebreakSet = {
      tiebreakTo,
    };
    if (winBy === 1) {
      setFormat.tiebreakSet.NoAD = true;
    }
  }

  return setFormat;
}

/**
 * Build parsed match up format from current configuration
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
    bestOf: config.setFormat.bestOf || 3,
    setFormat,
  };

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
    minutes: what === TIMED_SETS,
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
export function autoAdjustTiebreakAt(
  newSetTo: number,
  currentTiebreakAt: number
): number {
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
 * Initialize format configuration from a match up format string
 * Merges parsed format with defaults to ensure all properties exist
 */
export function initializeFormatFromString(
  matchUpFormat: string,
  parseFunction: (format: string) => any
): FormatConfig {
  const parsedMatchUpFormat = parseFunction(matchUpFormat);
  
  const setDefaults = createDefaultSetFormat(false);
  const finalSetDefaults = createDefaultSetFormat(true);
  
  const format: FormatConfig = {
    setFormat: { ...setDefaults, ...parsedMatchUpFormat.setFormat },
    finalSetFormat: { ...finalSetDefaults, ...parsedMatchUpFormat.finalSetFormat },
  };
  
  format.setFormat.bestOf = parsedMatchUpFormat.bestOf || 3;
  
  // Detect if final set is tiebreak-only (e.g., F:TB10)
  if (isTiebreakOnlySet(parsedMatchUpFormat.finalSetFormat)) {
    format.finalSetFormat.what = TIEBREAKS;
    format.finalSetFormat.tiebreakTo = parsedMatchUpFormat.finalSetFormat.tiebreakSet.tiebreakTo;
    format.finalSetFormat.winBy = parsedMatchUpFormat.finalSetFormat.tiebreakSet.NoAD ? 1 : 2;
  }
  
  return format;
}
