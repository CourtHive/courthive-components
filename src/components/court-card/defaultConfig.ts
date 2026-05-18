/**
 * Court Card — Default Configuration.
 */

import { CourtCardConfig } from './types';

export const DEFAULT_COURT_CARD_CONFIG: CourtCardConfig = {
  showImage: true,
  cornerBadges: ['indoorOutdoor', 'floodlit'],
  body: ['title', 'surface'],
  footer: ['amenityRow']
};

export function mergeCourtCardConfig(override?: Partial<CourtCardConfig>): CourtCardConfig {
  if (!override) return DEFAULT_COURT_CARD_CONFIG;
  return {
    showImage: override.showImage ?? DEFAULT_COURT_CARD_CONFIG.showImage,
    cornerBadges: override.cornerBadges ?? DEFAULT_COURT_CARD_CONFIG.cornerBadges,
    body: override.body ?? DEFAULT_COURT_CARD_CONFIG.body,
    footer: override.footer ?? DEFAULT_COURT_CARD_CONFIG.footer
  };
}
