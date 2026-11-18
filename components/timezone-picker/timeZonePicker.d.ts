export interface TimeZonePickerLabels {
    showMap?: string;
    hideMap?: string;
    noMatches?: string;
    /** Read out for the map, which is decorative to assistive technology. */
    mapLabel?: string;
}
export interface TimeZonePickerOptions {
    /** The IANA id to start with; empty for none. */
    value?: string;
    /** The zones to offer; the runtime's own by default. A valid `value` outside it is added. */
    timeZones?: string[];
    /** For zone, country and time names; the runtime's by default. */
    locale?: string;
    placeholder?: string;
    id?: string;
    disabled?: boolean;
    /** Show the map when the picker renders (default true). The director can always toggle it. */
    showMap?: boolean;
    /** Clearing the box clears the value (default true); otherwise it restores the last zone. */
    allowEmpty?: boolean;
    labels?: TimeZonePickerLabels;
    onChange?: (timeZone: string) => void;
    /** The clock the offsets and local times are read at; for tests. */
    now?: () => Date;
}
export interface TimeZonePicker {
    element: HTMLDivElement;
    /** Hidden input holding the IANA id; it fires `input` and `change` when the zone changes. */
    input: HTMLInputElement;
    /** The visible search box. */
    search: HTMLInputElement;
    getValue(): string;
    setValue(timeZone: string): void;
    /** Resolves once the map and zone locations have loaded (or failed to). */
    ready: Promise<void>;
    destroy(): void;
}
export declare function createTimeZonePicker(options?: TimeZonePickerOptions): TimeZonePicker;
