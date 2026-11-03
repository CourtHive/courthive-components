export declare const FLIGHTS_COUNT = "flightsCount";
export declare const NAMING_TYPE = "namingType";
export declare const CUSTOM_NAME = "customName";
export declare const SUFFIX_TYPE = "suffixType";
export declare const SCALE_TYPE = "scaleType";
export declare const SCALE_NAME = "scaleName";
export declare const SPLIT_METHOD = "splitMethod";
export declare const RATING_MIN = "ratingMin";
export declare const RATING_MAX = "ratingMax";
interface FlightProfileFormItemsParams {
    existingProfile?: any;
    editorConfig?: any;
}
export declare function getFlightProfileFormItems({ existingProfile, editorConfig }?: FlightProfileFormItemsParams): any[];
export {};
