/**
 * Coordinate coercion for venue/court geo values.
 *
 * Geo values reach these components in both forms. TODS/CODES `Address` and
 * `Court` historically declared `latitude`/`longitude` as `string`, production
 * venue records store them as `number`, and the factory itself emits both —
 * `activateFromSanctioning` stringifies sanctioning coordinates while venue
 * records carry numbers. A consumer that gates on `typeof === 'number'`
 * silently drops every string-valued coordinate, rendering no map for a venue
 * whose record looks correctly populated.
 *
 * Strings are parsed with `Number()` rather than `parseFloat` so that trailing
 * junk ("12abc") is rejected outright instead of yielding 12.
 */
export declare function toCoordinate(value: unknown): number | undefined;
/** The first candidate that coerces to a finite coordinate. */
export declare function firstCoordinate(...values: unknown[]): number | undefined;
