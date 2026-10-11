// constants and types
import type { CombinedPointsConfig, FormatState, SegmentDraft } from './types';

/**
 * Points total (`SET1-S:P32`): one rally-scored segment that ends at a combined total.
 *
 * The grammar allows it only as a single set of a SET match: no other root, no count but 1, no Exactly,
 * aggregate, game format, final set, match time limit or match modifiers. Rather than overwrite those
 * values when points total is chosen, the state keeps them and this overlay locks them, so choosing
 * another set type brings back what the operator had.
 */

export const DEFAULT_COMBINED_POINT_TOTALS = [11, 15, 16, 21, 24, 31, 32];
/** Tie allowed, then win by 1 (the deciding point), 2 or 3 (CA, 2026-10-10). */
export const DEFAULT_TIE_MARGINS = [0, 1, 2, 3];

export const isPointsTotal = (format: FormatState) => format.set.type === 'POINTS_TOTAL';

/** The format as it is written: a points total locks every match-level value. */
export function effectiveFormat(format: FormatState): FormatState {
  if (!isPointsTotal(format)) return format;
  return {
    ...format,
    matchRoot: 'SET',
    countMode: 'BEST_OF',
    count: 1,
    aggregate: false,
    gameFormat: undefined,
    finalSetEnabled: false,
    maxMinutes: undefined,
    matchMods: [],
    shortForm: false
  };
}

/** A tie is possible only on an even total, so only an even total says what follows one. */
export const tieRuleApplies = (segment: SegmentDraft) => segment.combinedPointTotal % 2 === 0;

export function tieMarginFromParsed(parsedSet: any): number {
  if (parsedSet.tieResolution === 'DECIDING_POINT') return 1;
  if (parsedSet.tieResolution === 'WIN_BY_MARGIN') return parsedSet.winningMargin;
  return 0;
}

/** The parsed set the factory writes as `P{n}`, `P{n}DP` or `P{n}WB{m}`. Win by 1 is the deciding point. */
export function pointsTotalToParsed(segment: SegmentDraft): any {
  const margin = tieRuleApplies(segment) ? segment.tieMargin : 0;
  if (margin === 1) return { combinedPointTotal: segment.combinedPointTotal, tieResolution: 'DECIDING_POINT' };
  if (margin > 1) {
    return { combinedPointTotal: segment.combinedPointTotal, tieResolution: 'WIN_BY_MARGIN', winningMargin: margin };
  }
  return { combinedPointTotal: segment.combinedPointTotal, tieResolution: 'ALLOW' };
}

/** The totals offered: the policy's, else the configured list, else the defaults. */
export function offeredTotals(combinedPoints?: CombinedPointsConfig, configured?: number[]): number[] {
  return combinedPoints?.permittedPointTotals?.length
    ? combinedPoints.permittedPointTotals
    : (configured ?? DEFAULT_COMBINED_POINT_TOTALS);
}

/** The tie margins offered: the policy's variants, else all of them. */
export function offeredTieMargins(combinedPoints?: CombinedPointsConfig): number[] {
  return combinedPoints?.permittedVariants?.length
    ? combinedPoints.permittedVariants.map(tieMarginFromParsed)
    : DEFAULT_TIE_MARGINS;
}

/**
 * Entering points total, a total or margin the policy does not permit moves to the first one it does,
 * so the picker starts on a permitted format. A code opened with other values keeps them.
 */
export function snapToPermitted(segment: SegmentDraft, combinedPoints?: CombinedPointsConfig): void {
  const totals = combinedPoints?.permittedPointTotals;
  if (totals?.length && !totals.includes(segment.combinedPointTotal)) segment.combinedPointTotal = totals[0];
  const margins = combinedPoints?.permittedVariants?.length ? offeredTieMargins(combinedPoints) : undefined;
  if (margins && !margins.includes(segment.tieMargin)) segment.tieMargin = margins[0];
}
