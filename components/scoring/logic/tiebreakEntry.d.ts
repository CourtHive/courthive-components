import { SetFormat } from './dynamicSetsLogic';
import { SideNumber } from './scoreEntryState';
/** The points a tiebreak-only set is played to, or `undefined` if this set is not one. */
export declare function tiebreakOnlyTarget(setFormat?: SetFormat): number | undefined;
/**
 * Both sides' points, from the LOWER score and the side it was entered on.
 *
 * `undefined` when the set carries no target to complete against, or when the factory declines — never
 * a guess. The caller leaves what was typed alone in that case rather than inventing the other half.
 */
export declare function completeTiebreakOnly(lowValue: number, lowSide: SideNumber, setFormat?: SetFormat): {
    side1: number;
    side2: number;
} | undefined;
