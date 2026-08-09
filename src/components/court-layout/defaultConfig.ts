/**
 * Court Layout — Default Configuration.
 */

import { CourtLayoutConfig } from './types';

export const DEFAULT_COURT_LAYOUT_CONFIG: CourtLayoutConfig = {
  grouping: 'setting',
  sport: 'tennis',
  showGroupHeadings: true,
  showSummary: true,
  minCardWidth: '11rem',
  emptyMessage: 'No courts recorded for this venue'
};

export function mergeCourtLayoutConfig(override?: Partial<CourtLayoutConfig>): CourtLayoutConfig {
  if (!override) return DEFAULT_COURT_LAYOUT_CONFIG;
  return {
    grouping: override.grouping ?? DEFAULT_COURT_LAYOUT_CONFIG.grouping,
    sport: override.sport ?? DEFAULT_COURT_LAYOUT_CONFIG.sport,
    showGroupHeadings: override.showGroupHeadings ?? DEFAULT_COURT_LAYOUT_CONFIG.showGroupHeadings,
    showSummary: override.showSummary ?? DEFAULT_COURT_LAYOUT_CONFIG.showSummary,
    minCardWidth: override.minCardWidth ?? DEFAULT_COURT_LAYOUT_CONFIG.minCardWidth,
    emptyMessage: override.emptyMessage ?? DEFAULT_COURT_LAYOUT_CONFIG.emptyMessage
  };
}
