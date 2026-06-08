/**
 * Tournament Card — Default Configuration.
 *
 * Sensible card layout used when no provider config is supplied.
 * A consumer-provided partial config merges over this via {@link mergeTournamentCardConfig}.
 */

import { TournamentCardConfig } from './types';

export const DEFAULT_TOURNAMENT_CARD_CONFIG: TournamentCardConfig = {
  showImage: true,
  cornerBadges: ['status'],
  body: ['title', 'tier', 'location', 'dateRange'],
  footer: ['feeBadge', 'playerCount']
};

/**
 * Merge a partial provider config over the default.
 * Arrays are replaced wholesale when present (no element-level merge).
 */
export function mergeTournamentCardConfig(
  override?: Partial<TournamentCardConfig>
): TournamentCardConfig {
  if (!override) return DEFAULT_TOURNAMENT_CARD_CONFIG;
  return {
    showImage: override.showImage ?? DEFAULT_TOURNAMENT_CARD_CONFIG.showImage,
    cornerBadges: override.cornerBadges ?? DEFAULT_TOURNAMENT_CARD_CONFIG.cornerBadges,
    body: override.body ?? DEFAULT_TOURNAMENT_CARD_CONFIG.body,
    footer: override.footer ?? DEFAULT_TOURNAMENT_CARD_CONFIG.footer
  };
}
