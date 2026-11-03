import { SeedingPolicyData, SeedingPositioning } from '../types';
export declare const POSITIONING_OPTIONS: {
    value: SeedingPositioning;
    label: string;
    description: string;
}[];
/** Draw types that meaningfully use a positioning override. Mirrors factory drawDefinitionConstants. */
export declare const DRAW_TYPE_OPTIONS: string[];
export declare function emptySeedingPolicy(): SeedingPolicyData;
export declare function positioningLabel(value: SeedingPositioning | undefined): string;
/**
 * `ADJACENT` is the factory's synonym for `CLUSTER` — `generateBlockPattern` and
 * `getContainerBlocks` treat them identically. The picker deliberately offers ONE option
 * rather than two that do the same thing, so either stored value selects it.
 *
 * This is display-only: the stored value is left exactly as it arrived, because rewriting
 * a caller's `ADJACENT` to `CLUSTER` would be an unrequested edit to their policy.
 */
export declare function canonicalPositioning(value?: SeedingPositioning): SeedingPositioning | undefined;
