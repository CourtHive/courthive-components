/**
 * Capacity Curve Generation
 * 
 * Generates time-series views of court capacity showing how many courts
 * are available, soft-blocked, or hard-blocked at each point in time.
 * 
 * This provides the "capacity stream" view that is central to the
 * temporal grid's philosophy.
 */

import type {
  CapacityCurve,
  CapacityPoint,
  DayId,
  FacilityDayTimeline,
  RailSegment,
} from './types';

// ============================================================================
// Capacity Point Extraction
// ============================================================================

/**
 * Generate capacity points from facility day timelines.
 * Creates a time-series showing court counts by status.
 * 
 * Algorithm:
 * 1. Collect all unique time points from segments across all courts
 * 2. For each time point, count courts by status
 * 3. Return sorted capacity points
 */
export function generateCapacityCurve(
  day: DayId,
  timelines: FacilityDayTimeline[],
): CapacityCurve {
  // Collect all unique time points
  const timePoints = new Set<string>();

  for (const timeline of timelines) {
    for (const rail of timeline.rails) {
      for (const segment of rail.segments) {
        timePoints.add(segment.start);
        timePoints.add(segment.end);
      }
    }
  }

  // Sort time points
  const sortedTimes = Array.from(timePoints).sort();

  // For each time point, count courts by status
  const points: CapacityPoint[] = sortedTimes.map((time) => {
    return {
      time,
      courtsAvailable: 0,
      courtsSoftBlocked: 0,
      courtsHardBlocked: 0,
    };
  });

  // Count courts at each point
  for (const timeline of timelines) {
    for (const rail of timeline.rails) {
      for (let i = 0; i < sortedTimes.length; i++) {
        const time = sortedTimes[i];
        const segment = findSegmentAtTime(rail.segments, time);

        if (segment) {
          const point = points[i];
          categorizeSegment(segment, point);
        }
      }
    }
  }

  return {
    day,
    points,
  };
}

/**
 * Find the segment that contains a given time point
 */
function findSegmentAtTime(segments: RailSegment[], time: string): RailSegment | null {
  for (const segment of segments) {
    if (time >= segment.start && time < segment.end) {
      return segment;
    }
  }
  return null;
}

/**
 * Categorize a segment and increment appropriate counter
 */
function categorizeSegment(segment: RailSegment, point: CapacityPoint): void {
  switch (segment.status) {
    case 'AVAILABLE':
    case 'SOFT_BLOCK':
    case 'RESERVED':
      point.courtsAvailable++;
      break;

    case 'HARD_BLOCK':
    case 'LOCKED':
      point.courtsHardBlocked++;
      break;

    case 'BLOCKED':
    case 'PRACTICE':
    case 'MAINTENANCE':
      point.courtsSoftBlocked++;
      break;

    case 'UNSPECIFIED':
      // Don't count unspecified - it's "gray fog"
      break;
  }
}

// ============================================================================
// Capacity Statistics
// ============================================================================

/**
 * Calculate capacity statistics for a curve
 */
export interface CapacityStats {
  peakAvailable: number;
  peakTime: string;
  minAvailable: number;
  minTime: string;
  avgAvailable: number;
  totalCourtHours: number;
  utilizationPercent: number;
}

export function calculateCapacityStats(curve: CapacityCurve): CapacityStats {
  if (curve.points.length === 0) {
    return {
      peakAvailable: 0,
      peakTime: '',
      minAvailable: 0,
      minTime: '',
      avgAvailable: 0,
      totalCourtHours: 0,
      utilizationPercent: 0,
    };
  }

  let peakAvailable = 0;
  let peakTime = curve.points[0].time;
  let minAvailable = Infinity;
  let minTime = curve.points[0].time;
  let totalCourts = 0;
  let totalCourtHours = 0;

  for (let i = 0; i < curve.points.length - 1; i++) {
    const current = curve.points[i];
    const next = curve.points[i + 1];

    // Track peak/min
    if (current.courtsAvailable > peakAvailable) {
      peakAvailable = current.courtsAvailable;
      peakTime = current.time;
    }
    if (current.courtsAvailable < minAvailable) {
      minAvailable = current.courtsAvailable;
      minTime = current.time;
    }

    // Calculate court-hours
    const durationHours =
      (new Date(next.time).getTime() - new Date(current.time).getTime()) / (1000 * 60 * 60);
    totalCourtHours += current.courtsAvailable * durationHours;
    totalCourts += current.courtsAvailable;
  }

  const avgAvailable = totalCourts / (curve.points.length - 1);

  // Utilization: actual court-hours / potential court-hours
  const dayDurationHours =
    (new Date(curve.points[curve.points.length - 1].time).getTime() -
      new Date(curve.points[0].time).getTime()) /
    (1000 * 60 * 60);
  const maxPossibleCourtHours = peakAvailable * dayDurationHours;
  const utilizationPercent =
    maxPossibleCourtHours > 0 ? (totalCourtHours / maxPossibleCourtHours) * 100 : 0;

  return {
    peakAvailable,
    peakTime,
    minAvailable: minAvailable === Infinity ? 0 : minAvailable,
    minTime,
    avgAvailable,
    totalCourtHours,
    utilizationPercent,
  };
}

// ============================================================================
// Capacity Filtering
// ============================================================================

/**
 * Filter capacity curve to a specific time range
 */
export function filterCapacityCurve(
  curve: CapacityCurve,
  timeRange: { start: string; end: string },
): CapacityCurve {
  const filteredPoints = curve.points.filter(
    (point) => point.time >= timeRange.start && point.time <= timeRange.end,
  );

  return {
    ...curve,
    points: filteredPoints,
  };
}

/**
 * Sample capacity curve at regular intervals (for rendering)
 */
export function sampleCapacityCurve(curve: CapacityCurve, intervalMinutes: number): CapacityCurve {
  if (curve.points.length === 0) return curve;

  const sampledPoints: CapacityPoint[] = [];
  const startTime = new Date(curve.points[0].time);
  const endTime = new Date(curve.points[curve.points.length - 1].time);

  let currentTime = new Date(startTime);
  while (currentTime <= endTime) {
    const timeStr = currentTime.toISOString();
    const point = interpolateCapacityAt(curve.points, timeStr);
    if (point) {
      sampledPoints.push(point);
    }

    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return {
    ...curve,
    points: sampledPoints,
  };
}

/**
 * Interpolate capacity at a specific time
 */
function interpolateCapacityAt(points: CapacityPoint[], time: string): CapacityPoint | null {
  // Find the point at or immediately before this time
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].time <= time) {
      return {
        time,
        courtsAvailable: points[i].courtsAvailable,
        courtsSoftBlocked: points[i].courtsSoftBlocked,
        courtsHardBlocked: points[i].courtsHardBlocked,
      };
    }
  }

  return null;
}

// ============================================================================
// Capacity Comparison
// ============================================================================

/**
 * Compare two capacity curves to show changes
 */
export interface CapacityDiff {
  time: string;
  availableDelta: number;
  softBlockedDelta: number;
  hardBlockedDelta: number;
}

export function compareCapacityCurves(
  baseline: CapacityCurve,
  modified: CapacityCurve,
): CapacityDiff[] {
  const diffs: CapacityDiff[] = [];

  // Collect all unique time points from both curves
  const allTimes = new Set<string>();
  baseline.points.forEach((p) => allTimes.add(p.time));
  modified.points.forEach((p) => allTimes.add(p.time));

  const sortedTimes = Array.from(allTimes).sort();

  for (const time of sortedTimes) {
    const baselinePoint = baseline.points.find((p) => p.time === time) || {
      time,
      courtsAvailable: 0,
      courtsSoftBlocked: 0,
      courtsHardBlocked: 0,
    };

    const modifiedPoint = modified.points.find((p) => p.time === time) || {
      time,
      courtsAvailable: 0,
      courtsSoftBlocked: 0,
      courtsHardBlocked: 0,
    };

    diffs.push({
      time,
      availableDelta: modifiedPoint.courtsAvailable - baselinePoint.courtsAvailable,
      softBlockedDelta: modifiedPoint.courtsSoftBlocked - baselinePoint.courtsSoftBlocked,
      hardBlockedDelta: modifiedPoint.courtsHardBlocked - baselinePoint.courtsHardBlocked,
    });
  }

  return diffs;
}
