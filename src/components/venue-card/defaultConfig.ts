/**
 * Venue Card — Default Configuration.
 */

import { VenueCardConfig } from './types';

export const DEFAULT_VENUE_CARD_CONFIG: VenueCardConfig = {
  showImage: true,
  showMap: true,
  cornerBadges: ['primaryBadge'],
  body: ['title', 'address', 'courtBreakdown'],
  footer: ['amenityRow']
};

export function mergeVenueCardConfig(override?: Partial<VenueCardConfig>): VenueCardConfig {
  if (!override) return DEFAULT_VENUE_CARD_CONFIG;
  return {
    showImage: override.showImage ?? DEFAULT_VENUE_CARD_CONFIG.showImage,
    showMap: override.showMap ?? DEFAULT_VENUE_CARD_CONFIG.showMap,
    cornerBadges: override.cornerBadges ?? DEFAULT_VENUE_CARD_CONFIG.cornerBadges,
    body: override.body ?? DEFAULT_VENUE_CARD_CONFIG.body,
    footer: override.footer ?? DEFAULT_VENUE_CARD_CONFIG.footer
  };
}
