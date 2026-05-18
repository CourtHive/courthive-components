/**
 * Event Card — Public API.
 */

import './event-card.css';

export { buildEventCard } from './buildEventCard';
export { buildEventSkeletonCard } from './buildSkeletonCard';
export { mapEventToCardData } from './mapEvent';
export { resolveEventStatus } from './statusResolver';
export {
  DEFAULT_EVENT_CARD_CONFIG,
  EVENT_CARD_LIGHT_MODE_THRESHOLD,
  mergeEventCardConfig
} from './defaultConfig';

export type { MapEventOptions } from './mapEvent';
export type { EventStatusResolverInput } from './statusResolver';
export type {
  EventCardCallbacks,
  EventCardConfig,
  EventCardCornerField,
  EventCardData,
  EventCardField,
  EventGenderKind,
  EventMatchUpCounts,
  EventStatusKind,
  EventStatusPill,
  EventTypeKind
} from './types';
