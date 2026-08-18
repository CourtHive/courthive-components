import { resolveCurrentLabel } from '../createTypeAhead';
import { describe, expect, it } from 'vitest';

/**
 * `currentValue` was never "the current value" — it resolves a stored CODE to its
 * display LABEL by searching the list for a `{ value, label }` entry. That only
 * works when the two differ, which is true for countries ('FRA' → '🇫🇷 France')
 * and false for a list of plain strings, where there is nothing to map.
 *
 * When the lookup missed, the old code did nothing at all: no label, no error,
 * no warning. TMX's Edit Dates modal shipped that way against
 * `getSupportedTimeZones()` (plain strings), so the field rendered empty beside
 * a panel that displayed the zone, and a blind Save read as "clear the zone"
 * (TMX #1305). The parameter is now `currentCode`, and an unresolved code warns.
 *
 * These cover the resolution itself. The wired input behaviour — that a resolved
 * label reaches `element.value` — belongs in a Storybook play function, which is
 * the DOM test layer for this repo.
 */

const FRA = 'FRA';
const FRANCE = '🇫🇷 France';

const COUNTRIES = [
  { value: FRA, label: FRANCE },
  { value: 'ESP', label: '🇪🇸 Spain' },
  { value: 'USA', label: '🇺🇸 United States' }
];

const TIME_ZONES = ['UTC', 'Europe/Paris', 'America/New_York'];

describe('resolveCurrentLabel', () => {
  it('resolves a code to its label when the list maps one to the other', () => {
    expect(resolveCurrentLabel(COUNTRIES, FRA)).toEqual(FRANCE);
    expect(resolveCurrentLabel(COUNTRIES, 'USA')).toEqual('🇺🇸 United States');
  });

  it('returns undefined for a code absent from a mapping list', () => {
    expect(resolveCurrentLabel(COUNTRIES, 'GBR')).toBeUndefined();
  });

  it('returns undefined for a plain-string list — the case that shipped empty', () => {
    // The string IS the label, so there is no mapping to perform. The caller
    // sets the field's `value` instead; this returning undefined is what now
    // triggers the warning rather than silence.
    expect(resolveCurrentLabel(TIME_ZONES, 'Europe/Paris')).toBeUndefined();
  });

  it('returns undefined without a code, so an empty field is left alone', () => {
    expect(resolveCurrentLabel(COUNTRIES, undefined)).toBeUndefined();
    expect(resolveCurrentLabel(COUNTRIES, '')).toBeUndefined();
  });

  it('tolerates a missing or malformed list rather than throwing', () => {
    // A type-ahead whose list has not loaded yet must not take down the form.
    expect(resolveCurrentLabel(undefined as any, 'FRA')).toBeUndefined();
    expect(resolveCurrentLabel([null, undefined, 3] as any, 'FRA')).toBeUndefined();
  });

  it('matches on value, never on label — a label lookup would resolve the wrong way round', () => {
    expect(resolveCurrentLabel(COUNTRIES, FRANCE)).toBeUndefined();
  });
});
