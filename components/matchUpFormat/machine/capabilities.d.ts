import { Capabilities, FormatState, ResolvedCapabilities } from './types';
/** Everything the picker offered before capabilities existed is on unless a consumer turns it off. */
export declare function resolveCapabilities(capabilities?: Capabilities): ResolvedCapabilities;
export declare const SET_TYPE_CAPABILITY: {
    readonly SET: "set";
    readonly TIEBREAK: "tiebreak";
    readonly TIMED: "timed";
    readonly OUTS: "outs";
    readonly POINTS_TOTAL: "pointsTotal";
};
/** The switched-off capabilities this format needs, each named once. Empty means it may be edited. */
export declare function capabilityReasons(format: FormatState, capabilities: ResolvedCapabilities): string[];
