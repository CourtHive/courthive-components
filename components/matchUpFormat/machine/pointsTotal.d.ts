import { CombinedPointsConfig, FormatState, SegmentDraft } from './types';
/**
 * Points total (`SET1-S:P32`): one rally-scored segment that ends at a combined total.
 *
 * The grammar allows it only as a single set of a SET match: no other root, no count but 1, no Exactly,
 * aggregate, game format, final set, match time limit or match modifiers. Rather than overwrite those
 * values when points total is chosen, the state keeps them and this overlay locks them, so choosing
 * another set type brings back what the operator had.
 */
export declare const DEFAULT_COMBINED_POINT_TOTALS: number[];
/** Tie allowed, then win by 1 (the deciding point), 2 or 3 (CA, 2026-10-10). */
export declare const DEFAULT_TIE_MARGINS: number[];
export declare const isPointsTotal: (format: FormatState) => boolean;
/** The format as it is written: a points total locks every match-level value. */
export declare function effectiveFormat(format: FormatState): FormatState;
/** A tie is possible only on an even total, so only an even total says what follows one. */
export declare const tieRuleApplies: (segment: SegmentDraft) => boolean;
export declare function tieMarginFromParsed(parsedSet: any): number;
/** The parsed set the factory writes as `P{n}`, `P{n}DP` or `P{n}WB{m}`. Win by 1 is the deciding point. */
export declare function pointsTotalToParsed(segment: SegmentDraft): any;
/** The totals offered: the policy's, else the configured list, else the defaults. */
export declare function offeredTotals(combinedPoints?: CombinedPointsConfig, configured?: number[]): number[];
/** The tie margins offered: the policy's variants, else all of them. */
export declare function offeredTieMargins(combinedPoints?: CombinedPointsConfig): number[];
/**
 * Entering points total, a total or margin the policy does not permit moves to the first one it does,
 * so the picker starts on a permitted format. A code opened with other values keeps them.
 */
export declare function snapToPermitted(segment: SegmentDraft, combinedPoints?: CombinedPointsConfig): void;
