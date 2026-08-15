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
export function toCoordinate(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

/** The first candidate that coerces to a finite coordinate. */
export function firstCoordinate(...values: unknown[]): number | undefined {
  for (const value of values) {
    const coordinate = toCoordinate(value);
    if (coordinate !== undefined) return coordinate;
  }
  return undefined;
}
