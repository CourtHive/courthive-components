export interface FlightProfileConfig {
    labels?: {
        title?: string;
        flightsCountLabel?: string;
        namingTypeLabel?: string;
        customNameLabel?: string;
        suffixTypeLabel?: string;
        scaleTypeLabel?: string;
        scaleNameLabel?: string;
        eventTypeLabel?: string;
        splitMethodLabel?: string;
        flightNamesLabel?: string;
        ratingMinLabel?: string;
        ratingMaxLabel?: string;
        cancel?: string;
        ok?: string;
        existingNote?: string;
    };
    options?: {
        eventTypes?: string[];
        ratingTypes?: string[];
        minFlights?: number;
        ratingBand?: boolean;
    };
    eventType?: string;
}
/**
 * Opens the Flight Profile editor modal
 * @param existingFlightProfile - Optional existing flight profile to edit
 * @param editorConfig - Optional configuration for labels and options
 * @param callback - Called with the flight profile configuration when user clicks OK
 * @returns Modal result with open() and close() functions
 */
export declare function getFlightProfileModal(params: {
    existingFlightProfile?: any;
    editorConfig?: FlightProfileConfig;
    callback?: (config: any) => void;
}): any;
