/**
 * Temporal Grid Engine - Main Entry Point
 * 
 * Export all core engine modules for easy importing.
 */

// Core engine
export { TemporalGridEngine } from './temporalGridEngine';

// Types
export type * from './types';

// Utilities
export {
  buildDayRange,
  clampToDayRange,
  courtDayKey,
  courtKey,
  deriveRailSegments,
  diffMinutes,
  extractDay,
  mergeAdjacentSegments,
  overlappingRange,
  rangesOverlap,
  resolveStatus,
  validateSegments,
} from './railDerivation';

export {
  calculateCapacityStats,
  compareCapacityCurves,
  filterCapacityCurve,
  generateCapacityCurve,
  sampleCapacityCurve,
  type CapacityDiff,
  type CapacityStats,
} from './capacityCurve';
