/**
 * Shared utilities for card primitives (tournament-card, event-card, venue-card).
 *
 * Exported through `courthive-components` so consumers can build their own
 * card variants without re-implementing extraction + formatting.
 */

export { formatAddress, formatVenueLocation } from './formatAddress';
export { formatDateRange } from './formatDateRange';
export { extractImageURL, extractCourtSvgSport } from './resourceExtraction';
export { buildCardSkeleton } from './buildCardSkeleton';
export type { CardSkeletonConfig } from './buildCardSkeleton';
export type { CardAddress, CardOnlineResource, CardVenueLike } from './types';
