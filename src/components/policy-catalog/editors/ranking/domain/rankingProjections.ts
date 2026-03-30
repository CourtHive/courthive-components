/**
 * Ranking Policy Projections — Data → View-Model Transforms
 *
 * Analyzes PositionValue polymorphism and determines table layout.
 * Resolves values for display in specific contexts (level, flight, drawSize).
 */
import type { AwardProfileData, TableLayout } from '../types';

// ── Position Labels ─────────────────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  1: 'W',
  2: 'F',
  4: 'SF',
  8: 'QF',
  16: 'R16',
  32: 'R32',
  64: 'R64',
  128: 'R128',
  256: 'R256'
};

const LEVEL_KEYED = 'level-keyed';

export function positionToRoundLabel(position: number): string {
  return ROUND_LABELS[position] ?? `R${position}`;
}

// ── PositionValue Shape Analysis ────────────────────────────────────────────

/**
 * Analyze a profile's finishingPositionRanges to determine the best table layout.
 * Examines all values to find the common shape.
 */
export function analyzePositionValueShape(ranges: Record<string, any> | undefined): TableLayout {
  if (!ranges) return { type: 'flat' };

  const values = Object.values(ranges);
  if (!values.length) return { type: 'flat' };

  // Check if all values are flat numbers
  if (values.every((v) => typeof v === 'number')) return { type: 'flat' };

  // Collect all levels and flights seen across values
  const allLevels = new Set<number>();
  const allFlights = new Set<number>();
  let hasConditionalArray = false;
  let hasLevelFlightNesting = false;

  for (const v of values) {
    const info = classifyValue(v);
    if (info.type === LEVEL_KEYED) {
      for (const lv of info.levels) allLevels.add(lv);
      if (info.hasFlightNesting) hasLevelFlightNesting = true;
    } else if (info.type === 'flight-keyed') {
      for (let i = 0; i < info.flightCount; i++) allFlights.add(i + 1);
    } else if (info.type === 'conditional-array') {
      hasConditionalArray = true;
    }
    // flat numbers mixed in are fine — they apply to all columns
  }

  if (hasConditionalArray) return { type: 'conditional' };

  if (hasLevelFlightNesting) {
    const flightsPerLevel: Record<number, number[]> = {};
    const levels = [...allLevels].sort((a, b) => a - b);
    for (const v of values) {
      const info = classifyValue(v);
      if (info.type === LEVEL_KEYED && info.flightDetails) {
        for (const [lv, flights] of Object.entries(info.flightDetails)) {
          const lvNum = Number(lv);
          if (!flightsPerLevel[lvNum]) flightsPerLevel[lvNum] = [];
          for (const f of flights) {
            if (!flightsPerLevel[lvNum].includes(f)) flightsPerLevel[lvNum].push(f);
          }
        }
      }
    }
    return { type: 'level-flight-tabs', levels, flightsPerLevel };
  }

  if (allLevels.size > 0) {
    return { type: 'level-columns', levels: [...allLevels].sort((a, b) => a - b) };
  }

  if (allFlights.size > 0) {
    return { type: 'flight-columns', flights: [...allFlights].sort((a, b) => a - b) };
  }

  return { type: 'flat' };
}

interface ValueClassification {
  type: 'flat' | typeof LEVEL_KEYED | 'flight-keyed' | 'conditional-array' | 'explicit-flat';
  levels: number[];
  flightCount: number;
  hasFlightNesting: boolean;
  flightDetails?: Record<number, number[]>;
}

function classifyValue(v: any): ValueClassification {
  if (typeof v === 'number') return { type: 'flat', levels: [], flightCount: 0, hasFlightNesting: false };

  if (Array.isArray(v)) return { type: 'conditional-array', levels: [], flightCount: 0, hasFlightNesting: false };

  if (typeof v !== 'object' || v === null) return { type: 'flat', levels: [], flightCount: 0, hasFlightNesting: false };

  if (v.level !== undefined) {
    if (Array.isArray(v.level)) {
      return {
        type: LEVEL_KEYED,
        levels: v.level.map((_: any, i: number) => i + 1),
        flightCount: 0,
        hasFlightNesting: false
      };
    }
    if (typeof v.level === 'object') {
      const levels = Object.keys(v.level)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      // Check for flight nesting within level values
      let hasFlightNesting = false;
      const flightDetails: Record<number, number[]> = {};
      for (const [lk, lv] of Object.entries(v.level)) {
        if (typeof lv === 'object' && lv !== null && (lv as any).flights) {
          hasFlightNesting = true;
          flightDetails[Number(lk)] = (lv as any).flights.map((_: any, i: number) => i + 1);
        }
      }
      return { type: LEVEL_KEYED, levels, flightCount: 0, hasFlightNesting, flightDetails };
    }
  }

  if (v.flights !== undefined || v.f !== undefined) {
    const arr = v.flights ?? v.f ?? [];
    return { type: 'flight-keyed', levels: [], flightCount: arr.length, hasFlightNesting: false };
  }

  if (v.value !== undefined) return { type: 'explicit-flat', levels: [], flightCount: 0, hasFlightNesting: false };

  return { type: 'flat', levels: [], flightCount: 0, hasFlightNesting: false };
}

// ── Value Resolution ────────────────────────────────────────────────────────

/**
 * Resolve a PositionValue for display in a specific context.
 * Returns the numeric value or undefined if not applicable.
 */
export function resolvePositionValue(
  value: any,
  context: { level?: number; flight?: number; drawSize?: number } = {}
): number | undefined {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return undefined;

  // Array form (conditional)
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry.drawSizes && context.drawSize && entry.drawSizes.includes(context.drawSize)) {
        return resolvePositionValue(entry, context);
      }
      if (entry.drawSize !== undefined && context.drawSize !== undefined) {
        if (entry.threshold ? context.drawSize >= entry.drawSize : context.drawSize === entry.drawSize) {
          return resolvePositionValue(
            { ...entry, drawSize: undefined, drawSizes: undefined, threshold: undefined },
            context
          );
        }
      }
      // Default entry (no drawSize constraints)
      if (entry.drawSize === undefined && entry.drawSizes === undefined) {
        return resolvePositionValue(entry, context);
      }
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  // Level-keyed
  if (value.level !== undefined && context.level !== undefined) {
    const levelValue = Array.isArray(value.level) ? value.level[context.level - 1] : value.level[context.level];
    if (levelValue === undefined) return undefined;
    // Level value could itself be a flight-keyed value
    if (typeof levelValue === 'object' && levelValue !== null) {
      return resolvePositionValue(levelValue, context);
    }
    return typeof levelValue === 'number' ? levelValue : undefined;
  }

  // Flight-keyed
  if (context.flight !== undefined) {
    const flights = value.flights ?? value.f;
    if (Array.isArray(flights)) {
      return flights[context.flight - 1];
    }
  }

  // Explicit flat
  if (value.value !== undefined) return value.value;

  return undefined;
}

// ── Profile Summary ─────────────────────────────────────────────────────────

/**
 * Generate a one-line summary for a collapsed profile card.
 */
export function profileSummaryText(profile: AwardProfileData): string {
  const parts: string[] = [];

  const positionCount = Object.keys(profile.finishingPositionRanges ?? {}).length;
  if (positionCount) parts.push(`${positionCount} positions`);

  if (profile.perWinPoints || profile.pointsPerWin) parts.push('per-win');
  if (profile.bonusPoints?.length) parts.push(`${profile.bonusPoints.length} bonus`);

  return parts.join(', ') || 'empty';
}

// ── Scope Summary ───────────────────────────────────────────────────────────

export interface ScopeBadge {
  label: string;
  intent: string; // Bulma intent class
}

/**
 * Extract displayable scope badges from an award profile.
 */
export function getProfileScopeBadges(profile: AwardProfileData): ScopeBadge[] {
  const badges: ScopeBadge[] = [];

  for (const et of profile.eventTypes ?? []) {
    badges.push({ label: et, intent: 're-badge--accent' });
  }
  for (const stage of profile.stages ?? []) {
    badges.push({ label: stage, intent: 're-badge--success' });
  }
  for (const level of profile.levels ?? []) {
    badges.push({ label: `L${level}`, intent: 're-badge--warn' });
  }
  for (const dt of profile.drawTypes ?? []) {
    badges.push({ label: dt.replaceAll('_', ' '), intent: 're-badge--primary' });
  }
  if (profile.participationOrder !== undefined) {
    badges.push({ label: `PO:${profile.participationOrder}`, intent: 're-badge--info' });
  }

  return badges;
}

/**
 * Format a number for display in a points table cell.
 */
export function formatPointValue(value: number | undefined): string {
  if (value === undefined || value === null) return '--';
  return value.toLocaleString();
}
