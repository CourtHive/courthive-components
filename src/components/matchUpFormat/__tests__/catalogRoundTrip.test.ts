// @vitest-environment happy-dom
/**
 * Every format the picker OFFERS must survive the picker.
 *
 * CA, 2026-09-30: *"In the score matchUpFormat modal when I select 'Standard Doubles' I get
 * SET3-S:6NOAD/TB7-F:TB10 but then when I go to re-open the scoring dialog it shows 'Custom' and
 * SET3-S:6/TB7-F:TB10 somehow having dropped the NOAD."*
 *
 * The 'Custom' label is the same defect seen from the other end: the rebuilt code no longer matches
 * the catalog entry it came from, so nothing in the catalog claims it.
 *
 * He reported one format. Swept across the whole catalog, **six of 38 did not survive** — two losing
 * `NOAD`, two rebuilding a `TB5` as `TB7`, one dropping its entire final set. A sweep rather than a
 * fix for the one reported case, because the cause was shared and the other five were invisible.
 *
 * The round trip is the repo's own, copied from `matchUpFormatLogic.test.ts` § "cross-sport
 * round-trip tests" rather than invented here, so this file and that one cannot disagree about what
 * a round trip is.
 */
import { describe, expect, it } from 'vitest';

import { matchUpFormatCode } from 'tods-competition-factory';

import { initializeFormatFromString, buildParsedFormat } from '../matchUpFormatLogic';
import catalog from '../matchUpFormats.json';

/**
 * Formats the picker cannot yet represent at all, with what is missing.
 *
 * Listed rather than filtered out silently, and asserted to be EXACTLY the set that drifts — so
 * fixing one of them fails this test too, rather than leaving a stale exemption behind.
 */
const KNOWN_GAPS: Record<string, string> = {
  // `S:O3` parses to `{ outs: 3 }` and `M:T50` to a `matchUpConstraint`. The picker's FormatConfig has
  // no control for either, so both are dropped and the default `setTo: 6` is emitted in their place.
  'BLW Standard': 'no control for `outs`, and none for a match-level constraint'
};

function roundTrip(formatString: string): string {
  const format = initializeFormatFromString(formatString, matchUpFormatCode.parse);
  const parsed: any = matchUpFormatCode.parse(formatString);

  const hasSetTiebreak = !!parsed?.setFormat?.tiebreakFormat;
  const hasFinalSet = !!parsed?.finalSetFormat;
  const hasFinalSetTiebreak = !!parsed?.finalSetFormat?.tiebreakFormat;

  return matchUpFormatCode.stringify(buildParsedFormat(format, hasSetTiebreak, hasFinalSet, hasFinalSetTiebreak));
}

const offered = (catalog as any[]).filter((entry) => entry.format);

describe('the matchUpFormat catalog survives its own picker', () => {
  it('has formats to check, so a pass cannot mean an empty sweep', () => {
    expect(offered.length).toBeGreaterThan(30);
  });

  for (const entry of offered.filter((e) => !KNOWN_GAPS[e.name])) {
    it(`${entry.name} — ${entry.format}`, () => {
      expect(roundTrip(entry.format)).toBe(entry.format);
    });
  }

  it('the known gaps are EXACTLY the formats that still drift', () => {
    const drifting = offered.filter((entry) => roundTrip(entry.format) !== entry.format).map((entry) => entry.name);

    // Both directions. A gap that gets fixed must be removed from the list, and a format that starts
    // drifting must not be able to hide inside it.
    //
    // An explicit comparator and an explicit locale: a bare `.sort()` coerces to string and takes the
    // runtime's default collation, which can differ between machines and would make this comparison
    // fail somewhere other than here.
    const byName = (a: string, b: string) => a.localeCompare(b, 'en');
    expect(drifting.sort(byName)).toEqual(Object.keys(KNOWN_GAPS).sort(byName));
  });
});
