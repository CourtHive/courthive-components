import { EventCardConfig } from './types';
export declare const DEFAULT_EVENT_CARD_CONFIG: EventCardConfig;
/** Threshold matching TMX's existing `EVENT_COUNT_THRESHOLD` in createEventsTable.ts.
 * Consumers reading many events should set `lightMode: true` when over this count. */
export declare const EVENT_CARD_LIGHT_MODE_THRESHOLD = 15;
export declare function mergeEventCardConfig(override?: Partial<EventCardConfig>): EventCardConfig;
