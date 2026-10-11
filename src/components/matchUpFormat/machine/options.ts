/**
 * What the picker offers for a match root and a set's tiebreak point. Moved unchanged from the retired
 * `matchUpFormatLogic.ts`, whose other exports served the modal the state machine replaced.
 */

export const MATCH_ROOTS = ['SET', 'HAL', 'QTR', 'PER', 'INN', 'RND', 'FRM', 'MAP'] as const;

export const MATCH_ROOT_LABELS: Record<string, string> = {
  SET: 'Set',
  HAL: 'Half',
  QTR: 'Quarter',
  PER: 'Period',
  INN: 'Inning',
  RND: 'Round',
  FRM: 'Frame',
  MAP: 'Map'
};

/**
 * Returns valid bestOf options for a given match root.
 * SET root: [1,3,5,7,9] — odd counts; the factory parses any best-of count (#5136)
 * Other roots: [1..12] (wide range for cross-sport)
 */
export function getBestOfOptionsForRoot(matchRoot?: string): number[] {
  if (!matchRoot || matchRoot === 'SET') {
    return [1, 3, 5, 7, 9];
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
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
