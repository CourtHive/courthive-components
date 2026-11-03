import { ResolvedRating } from './types';
/** Linear map of a value from one range onto another. Mirrors factory `convertRange`. */
export declare function convertRange({ value, sourceRange, targetRange }: {
    value: number;
    sourceRange?: number[];
    targetRange?: number[];
}): number;
/**
 * Convert a value on `scaleName` to its ELO equivalent.
 *
 * Scales where a LOWER number is better (WTN, declared `range: [40, 1]`) are
 * declared high-to-low; the factory detects that as `range[0] > range[1]` and
 * reflects the value before mapping, which is reproduced here.
 */
export declare function ratingToElo({ scaleName, value }: {
    scaleName?: string;
    value?: number;
}): number | undefined;
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
export declare function resolveParticipantRating({ participant, matchUpType, preferredScaleName }: {
    participant?: any;
    matchUpType?: string;
    preferredScaleName?: string;
}): ResolvedRating | null;
/**
 * The scale name that appears most often across a set of resolved ratings.
 * Reported so a caller can label the axis honestly when a field is mixed-scale.
 */
export declare function dominantScaleName(ratings: (ResolvedRating | null)[]): string | undefined;
