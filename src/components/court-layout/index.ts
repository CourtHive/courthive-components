/**
 * Court Layout — public surface.
 *
 * A venue's courts as an ordered, grouped grid of court cards. No map, no coordinates, no optional
 * dependency — see venue-locator for the map.
 */

export { buildCourtLayout, cellCardConfig, groupCourts, settingOf, summarizeCourts, surfaceOf } from './buildCourtLayout';
export { DEFAULT_COURT_LAYOUT_CONFIG, mergeCourtLayoutConfig } from './defaultConfig';

export type { CourtGroup } from './buildCourtLayout';
export type {
  CourtLayoutCallbacks,
  CourtLayoutConfig,
  CourtLayoutCourt,
  CourtLayoutData,
  CourtLayoutGrouping
} from './types';
