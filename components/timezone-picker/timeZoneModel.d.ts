/**
 * The time zone picker's model: what each IANA zone is called, where it is, and how a director finds it.
 *
 * The stored value is always the IANA id (`America/New_York`): it is what carries daylight saving and history.
 * Everything here is presentation of that id — a city, the zone's own name in the director's language
 * ("Eastern Time"), its country, its offset now — and a search over all of them. Pure: no DOM.
 */
export interface TimeZoneOption {
    /** The IANA id, as the runtime or the caller named it. */
    timeZone: string;
    /** The zone's principal city: `New York`. */
    city: string;
    /** The zone's generic name in the locale (`Eastern Time`); empty when the runtime knows it only as an offset. */
    name: string;
    country?: string;
    countryCode?: string;
    /** Minutes east of UTC, at the moment the options were built. */
    offsetMinutes: number;
    /** Minutes east of UTC outside daylight saving: the band the zone sits in on the map. */
    standardOffsetMinutes: number;
    /** `UTC−5`, `UTC+5:30`, `UTC`. */
    offsetLabel: string;
    /** `EST`, where the locale has an abbreviation for the zone. */
    abbreviation?: string;
    /** Map position (see `data/worldMap.ts`), when the tz database places the zone. */
    location?: readonly [number, number];
    /** Lower-cased, accent-free text the search matches against. */
    search: string;
}
/** Map positions and countries, from `data/zoneLocations.ts` (loaded with the map). */
export interface ZoneLocations {
    locations: Readonly<Record<string, readonly [number, number, string]>>;
    aliases: Readonly<Record<string, string>>;
}
/** The runtime's zones, with UTC (which `supportedValuesOf` leaves out). Only UTC on a runtime without the API. */
export declare function runtimeTimeZones(): string[];
export declare function isValidTimeZone(timeZone: unknown): timeZone is string;
/** Minutes east of UTC for `timeZone` at `date`. */
export declare function offsetMinutesAt(timeZone: string, date: Date): number;
/** The offset outside daylight saving: the lesser of January's and July's (DST only ever adds). */
export declare function standardOffsetMinutes(timeZone: string, date: Date): number;
export declare function formatOffset(minutes: number): string;
/** The local time in `timeZone`, as the locale writes a time of day. */
export declare function formatLocalTime(timeZone: string, date: Date, locale?: string): string;
export declare function zoneCity(timeZone: string): string;
/** Lower-case, accents removed, the typographic minus read as a hyphen: what the director types matches what is shown. */
export declare function normalizeSearch(text: string): string;
export declare function locateZone(timeZone: string, zones?: ZoneLocations): readonly [number, number, string] | undefined;
export declare function buildTimeZoneOption(timeZone: string, { date, locale, zones, country }: {
    date: Date;
    locale?: string;
    zones?: ZoneLocations;
    country?: (code: string) => string | undefined;
}): TimeZoneOption;
/** One option per zone, ordered west to east and then by city. */
export declare function buildTimeZoneOptions({ timeZones, date, locale, zones }?: {
    timeZones?: string[];
    date?: Date;
    locale?: string;
    zones?: ZoneLocations;
}): TimeZoneOption[];
/** `New York · Eastern Time (UTC−5)`: what the field shows for a chosen zone. */
export declare function timeZoneDisplay(option: TimeZoneOption): string;
/**
 * The options matching every word of `query`, best first: a city that starts with the query, then a word that does,
 * then any match. An offset (`-5`, `UTC+5:30`) matches a zone at that offset now or in standard time.
 */
export declare function searchTimeZones(options: TimeZoneOption[], query: string): TimeZoneOption[];
/**
 * The zone nearest a point on the map. Given the band under the point, zones in that band are preferred, so a click
 * in eastern Ohio finds New York's zone rather than Chicago's; off the land, only a zone within `reach` is returned.
 */
export declare function nearestTimeZone(options: TimeZoneOption[], [x, y]: readonly [number, number], { bandOffsetMinutes, reach }?: {
    bandOffsetMinutes?: number;
    reach?: number;
}): TimeZoneOption | undefined;
