import { ScoringPolicyData, AllowedFormatEntry } from '../types';
type RegistryEntry = {
    key?: string;
    name?: string;
    format?: string;
    desc?: string;
    desc2?: string;
};
export declare function lookupRegistryFormat(format: string | undefined): RegistryEntry | undefined;
export declare const MATCH_UP_FORMAT_REGISTRY_SORTED: RegistryEntry[];
export declare function formatStringOf(entry: AllowedFormatEntry): string;
export declare function formatNameOf(entry: AllowedFormatEntry): string;
export declare function formatDescriptionOf(entry: AllowedFormatEntry): string;
export declare function asMatchUpFormatEntry(entry: AllowedFormatEntry): {
    name?: string;
    description?: string;
    matchUpFormat: string;
    categoryNames?: string[];
    categoryTypes?: string[];
};
export declare const FORMAT_STANDARD = "SET3-S:6/TB7";
export declare function emptyScoringPolicy(): ScoringPolicyData;
export {};
