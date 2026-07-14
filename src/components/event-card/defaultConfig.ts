/**
 * Event Card — Default Configuration.
 */

import { EventCardConfig } from './types';

export const DEFAULT_EVENT_CARD_CONFIG: EventCardConfig = {
  showImage: true,
  // genderBadge (M/W/X) sits alongside the event-type badge so e.g. a men's
  // singles vs women's singles event is distinguishable at a glance. It
  // self-hides when the event has no gender (renderGenderBadge returns null).
  cornerBadges: ['status', 'eventTypeBadge', 'genderBadge'],
  body: ['title', 'categoryLabel', 'drawSummary'],
  footer: ['playerCount', 'matchUpProgress']
};

/** Threshold matching TMX's existing `EVENT_COUNT_THRESHOLD` in createEventsTable.ts.
 * Consumers reading many events should set `lightMode: true` when over this count. */
export const EVENT_CARD_LIGHT_MODE_THRESHOLD = 15;

export function mergeEventCardConfig(override?: Partial<EventCardConfig>): EventCardConfig {
  if (!override) return DEFAULT_EVENT_CARD_CONFIG;
  return {
    showImage: override.showImage ?? DEFAULT_EVENT_CARD_CONFIG.showImage,
    cornerBadges: override.cornerBadges ?? DEFAULT_EVENT_CARD_CONFIG.cornerBadges,
    body: override.body ?? DEFAULT_EVENT_CARD_CONFIG.body,
    footer: override.footer ?? DEFAULT_EVENT_CARD_CONFIG.footer
  };
}
