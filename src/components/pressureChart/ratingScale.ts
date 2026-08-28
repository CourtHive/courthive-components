/**
 * Rating -> common-scale conversion.
 *
 * Mirrors `tods-competition-factory`'s ELO conversion
 * (`convertRange` + `getRatingConvertedToELO`, consumed there via
 * `getConvertedRating`) because **that function is not on the factory's public
 * surface** — verified at runtime against the installed package: `fixtures`,
 * `ratingConstants` and `scaleConstants` are exported, `getConvertedRating` and
 * `ratingsParameters` are not. Same reason `burstChart/competitiveness.ts`
 * mirrors the competitive-band logic rather than importing it.
 *
 * The range fixture itself IS public (`fixtures.ratingsParameters`), so the
 * scale definitions are read from the factory rather than copied — only the ~10
 * lines of arithmetic are local. If `getConvertedRating` is ever exported, this
 * module reduces to a thin adapter.
 *
 * Caveat worth stating plainly: the source -> ELO map is **linear across the
 * scale's declared range**, which is what the factory does today. It is an
 * assumption, not a calibrated fit; the factory ships `getPredictiveAccuracy`
 * precisely to measure how well a scale predicts outcomes, and that is the tool
 * to calibrate against before any of these numbers are presented as authoritative.
 */

import { fixtures, ratingConstants } from 'tods-competition-factory';

// constants and types
import type { ResolvedRating } from './types';

const { ELO } = ratingConstants;

const SINGLES = 'SINGLES';
const DOUBLES = 'DOUBLES';

type RatingsParameter = {
  range?: [number, number];
  accessor?: string;
  accessors?: string[];
  decimalsCount?: number;
  ascending?: boolean;
};

function ratingsParameters(): Record<string, RatingsParameter> {
  return (fixtures as any)?.ratingsParameters ?? {};
}

/** Linear map of a value from one range onto another. Mirrors factory `convertRange`. */
export function convertRange({
  value,
  sourceRange,
  targetRange,
}: {
  value: number;
  sourceRange?: number[];
  targetRange?: number[];
}): number {
  if (!Array.isArray(sourceRange) || sourceRange.length !== 2) return 0;
  if (!Array.isArray(targetRange) || targetRange.length !== 2) return 0;
  const minSource = Math.min(...sourceRange);
  const maxSource = Math.max(...sourceRange);
  const minTarget = Math.min(...targetRange);
  const maxTarget = Math.max(...targetRange);
  if (maxSource === minSource) return minTarget;
  return ((value - minSource) * (maxTarget - minTarget)) / (maxSource - minSource) + minTarget;
}

/**
 * Convert a value on `scaleName` to its ELO equivalent.
 *
 * Scales where a LOWER number is better (WTN, declared `range: [40, 1]`) are
 * declared high-to-low; the factory detects that as `range[0] > range[1]` and
 * reflects the value before mapping, which is reproduced here.
 */
export function ratingToElo({ scaleName, value }: { scaleName?: string; value?: number }): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  if (scaleName === ELO) return value;
  const sourceRange = scaleName ? ratingsParameters()[scaleName]?.range : undefined;
  if (!sourceRange) return undefined;
  const eloRange = ratingsParameters()[ELO]?.range;
  if (!eloRange) return undefined;
  const invertedScale = sourceRange[0] > sourceRange[1];
  return convertRange({
    value: invertedScale ? sourceRange[0] - value : value,
    sourceRange,
    targetRange: eloRange,
  });
}

/** Read the numeric value out of a `scaleValue`, which may be a number or an accessor-keyed object. */
function scaleValueToNumber(scaleName: string, scaleValue: any): number | undefined {
  if (typeof scaleValue === 'number') return scaleValue;
  if (!scaleValue || typeof scaleValue !== 'object') return undefined;
  const params = ratingsParameters()[scaleName];
  const accessors = [params?.accessor, ...(params?.accessors ?? [])].filter(Boolean) as string[];
  for (const accessor of accessors) {
    const candidate = scaleValue[accessor];
    if (typeof candidate === 'number' && !Number.isNaN(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Resolve a participant's rating onto the common scale.
 *
 * Expects the `participant.ratings` shape produced with
 * `participantsProfile: { withScaleValues: true }` — the hydration CFS already
 * requests in `getEventData`:
 *
 * ```
 * ratings: { SINGLES: [{ scaleName: 'WTN', scaleValue: { wtnRating: 4.13 } }] }
 * ```
 *
 * **Without `withScaleValues` the `ratings` key is present but empty** and the
 * value lives in `participant.timeItems` instead; this returns `null` in that
 * case rather than inventing a default. A blank chart is the correct outcome for
 * an unrated field — see `PRESSURE_UNSUPPORTED.NO_RATINGS`.
 */
export function resolveParticipantRating({
  participant,
  matchUpType,
  preferredScaleName,
}: {
  participant?: any;
  matchUpType?: string;
  preferredScaleName?: string;
}): ResolvedRating | null {
  const type = matchUpType === DOUBLES ? DOUBLES : SINGLES;
  const scaleRatings = participant?.ratings?.[type];
  if (!Array.isArray(scaleRatings) || !scaleRatings.length) return null;

  const preferred = preferredScaleName && scaleRatings.find((r: any) => r?.scaleName === preferredScaleName);
  const entry = preferred ?? scaleRatings.find((r: any) => typeof r?.scaleName === 'string');
  if (!entry?.scaleName) return null;

  const sourceValue = scaleValueToNumber(entry.scaleName, entry.scaleValue);
  if (sourceValue === undefined) return null;

  const elo = ratingToElo({ scaleName: entry.scaleName, value: sourceValue });
  if (elo === undefined) return null;

  return { elo, scaleName: entry.scaleName, sourceValue };
}

/**
 * The scale name that appears most often across a set of resolved ratings.
 * Reported so a caller can label the axis honestly when a field is mixed-scale.
 */
export function dominantScaleName(ratings: (ResolvedRating | null)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const rating of ratings) {
    if (!rating) continue;
    counts.set(rating.scaleName, (counts.get(rating.scaleName) ?? 0) + 1);
  }
  if (!counts.size) return undefined;
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))[0][0];
}
