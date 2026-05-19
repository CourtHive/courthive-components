import { DrawCardConfig } from './types';

export const DEFAULT_DRAW_CARD_CONFIG: DrawCardConfig = {
  cornerBadges: ['status', 'publishedBadge', 'embargoBadge'],
  body: ['title', 'drawTypeLabel', 'matchUpProgress'],
  footer: ['drawSize', 'entries', 'matchUpFormat', 'flightNumber', 'ratings'],
  showVisualization: false
};

export function mergeDrawCardConfig(override?: Partial<DrawCardConfig>): DrawCardConfig {
  if (!override) return DEFAULT_DRAW_CARD_CONFIG;
  return {
    cornerBadges: override.cornerBadges ?? DEFAULT_DRAW_CARD_CONFIG.cornerBadges,
    body: override.body ?? DEFAULT_DRAW_CARD_CONFIG.body,
    footer: override.footer ?? DEFAULT_DRAW_CARD_CONFIG.footer,
    showVisualization: override.showVisualization ?? DEFAULT_DRAW_CARD_CONFIG.showVisualization
  };
}
