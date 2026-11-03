/**
 * MatchUp format constants
 * Generated from matchUpFormats.json for use in tests
 */
export declare const MATCH_FORMATS: {
    readonly SET3_S6_TB7: "SET3-S:6/TB7";
    readonly SET3_S6_TB7_F_TB10: "SET3-S:6/TB7-F:TB10";
    readonly SET3_S6_TB10: "SET3-S:6/TB10";
    readonly SET3_S6_F_TB10: "SET3-S:6-F:TB10";
    readonly SET3_S6_TB7_NOAD: "SET3-S:6/TB7NOAD";
    readonly SET3_S8_TB7: "SET3-S:8/TB7";
    readonly SET3_S8_TB7_AT7: "SET3-S:8/TB7@7";
    readonly SET3_S4_TB7: "SET3-S:4/TB7";
    readonly SET3_S4_TB7_F_TB10: "SET3-S:4/TB7-F:TB10";
    readonly SET3_S4_TB5_AT3_F_TB10: "SET3-S:4/TB5@3-F:TB10";
    readonly SET5_S6_TB7: "SET5-S:6/TB7";
    readonly SET5_S6_TB7_F_TB10: "SET5-S:6/TB7-F:TB10";
    readonly SET1_S6_TB7: "SET1-S:6/TB7";
    readonly SET1_S6_TB10: "SET1-S:6/TB10";
    readonly SET1_S6_TB7_AT5: "SET1-S:6/TB7@5";
    readonly SET1_S8_TB7: "SET1-S:8/TB7";
    readonly SET1_S4_TB7: "SET1-S:4/TB7";
    readonly SET1_S5_TB9_AT4: "SET1-S:5/TB9@4";
    readonly SET1_S_TB7: "SET1-S:T7";
    readonly SET1_S_TB10: "SET1-S:TB10";
    readonly SET1_S_TB21: "SET1-S:T21";
    readonly SET1_S8: "SET1-S:8";
    readonly SET1_S10: "SET1-S:10";
    readonly FAST4: "SET5-S:4/NOAD";
    readonly SET3X_T10A_TB1: "SET3XA-S:T10-F:TB1";
    readonly SET3X_T10A_TB1_NOAD: "SET3XA-S:T10-F:TB1NOAD";
    readonly SET4X_T10A_TB1: "SET4XA-S:T10-F:TB1";
};
export type MatchUpFormatCode = (typeof MATCH_FORMATS)[keyof typeof MATCH_FORMATS];
