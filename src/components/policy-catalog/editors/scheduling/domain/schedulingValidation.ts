/**
 * Scheduling Policy Editor — Validation
 *
 * Validates the scheduling policy data structure.
 */

import type {
  SchedulingPolicyData,
  SchedulingValidationResult,
  MatchUpAverageTime,
  MatchUpRecoveryTime
} from '../types';

export function validateSchedulingPolicy(data: SchedulingPolicyData): SchedulingValidationResult[] {
  const results: SchedulingValidationResult[] = [];

  // Validate default times
  if (data.defaultTimes) {
    const avg = data.defaultTimes.averageTimes;
    if (avg) {
      for (let i = 0; i < avg.length; i++) {
        if (avg[i].minutes.default < 0) {
          results.push({
            severity: 'error',
            path: `defaultTimes.averageTimes[${i}].minutes.default`,
            message: 'Default average time must be non-negative'
          });
        }
        if (avg[i].minutes.DOUBLES !== undefined && avg[i].minutes.DOUBLES! < 0) {
          results.push({
            severity: 'error',
            path: `defaultTimes.averageTimes[${i}].minutes.DOUBLES`,
            message: 'Doubles average time must be non-negative'
          });
        }
      }
    }
    const rec = data.defaultTimes.recoveryTimes;
    if (rec) {
      for (let i = 0; i < rec.length; i++) {
        if (rec[i].minutes.default < 0) {
          results.push({
            severity: 'error',
            path: `defaultTimes.recoveryTimes[${i}].minutes.default`,
            message: 'Default recovery time must be non-negative'
          });
        }
      }
    }
  }

  // Validate daily limits
  if (data.defaultDailyLimits) {
    const dl = data.defaultDailyLimits;
    if (dl.SINGLES !== undefined && dl.SINGLES < 0) {
      results.push({
        severity: 'error',
        path: 'defaultDailyLimits.SINGLES',
        message: 'Singles daily limit must be non-negative'
      });
    }
    if (dl.DOUBLES !== undefined && dl.DOUBLES < 0) {
      results.push({
        severity: 'error',
        path: 'defaultDailyLimits.DOUBLES',
        message: 'Doubles daily limit must be non-negative'
      });
    }
    if (dl.total !== undefined && dl.total < 0) {
      results.push({
        severity: 'error',
        path: 'defaultDailyLimits.total',
        message: 'Total daily limit must be non-negative'
      });
    }
  }

  // Validate matchUpAverageTimes
  if (data.matchUpAverageTimes) {
    validateFormatGroups(data.matchUpAverageTimes, 'matchUpAverageTimes', 'averageTimes', results);
  }

  // Validate matchUpRecoveryTimes
  if (data.matchUpRecoveryTimes) {
    validateRecoveryGroups(data.matchUpRecoveryTimes, 'matchUpRecoveryTimes', results);
  }

  // Check for duplicate format codes across groups (warning)
  checkDuplicateFormats(data, results);

  return results;
}

function validateFormatGroups(
  groups: MatchUpAverageTime[],
  basePath: string,
  timesKey: string,
  results: SchedulingValidationResult[]
): void {
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    if (!group.matchUpFormatCodes.length) {
      results.push({
        severity: 'error',
        path: `${basePath}[${g}].matchUpFormatCodes`,
        message: 'At least one format code is required per format group'
      });
    }
    const times = group[timesKey as keyof typeof group] as { minutes: { default: number; DOUBLES?: number } }[];
    if (times) {
      for (let t = 0; t < times.length; t++) {
        if (times[t].minutes.default < 0) {
          results.push({
            severity: 'error',
            path: `${basePath}[${g}].${timesKey}[${t}].minutes.default`,
            message: 'Time must be non-negative'
          });
        }
        if (times[t].minutes.DOUBLES !== undefined && times[t].minutes.DOUBLES! < 0) {
          results.push({
            severity: 'error',
            path: `${basePath}[${g}].${timesKey}[${t}].minutes.DOUBLES`,
            message: 'Doubles time must be non-negative'
          });
        }
      }
    }
  }
}

function validateRecoveryGroups(
  groups: MatchUpRecoveryTime[],
  basePath: string,
  results: SchedulingValidationResult[]
): void {
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    if (!group.matchUpFormatCodes.length) {
      results.push({
        severity: 'error',
        path: `${basePath}[${g}].matchUpFormatCodes`,
        message: 'At least one format code is required per format group'
      });
    }
    for (let t = 0; t < group.recoveryTimes.length; t++) {
      if (group.recoveryTimes[t].minutes.default < 0) {
        results.push({
          severity: 'error',
          path: `${basePath}[${g}].recoveryTimes[${t}].minutes.default`,
          message: 'Recovery time must be non-negative'
        });
      }
      if (group.recoveryTimes[t].minutes.DOUBLES !== undefined && group.recoveryTimes[t].minutes.DOUBLES! < 0) {
        results.push({
          severity: 'error',
          path: `${basePath}[${g}].recoveryTimes[${t}].minutes.DOUBLES`,
          message: 'Doubles recovery time must be non-negative'
        });
      }
    }
  }
}

function checkDuplicateFormats(data: SchedulingPolicyData, results: SchedulingValidationResult[]): void {
  const checkSection = (groups: { matchUpFormatCodes: string[] }[] | undefined, sectionPath: string) => {
    if (!groups) return;
    const seen = new Map<string, number>();
    for (let g = 0; g < groups.length; g++) {
      for (const code of groups[g].matchUpFormatCodes) {
        if (seen.has(code)) {
          results.push({
            severity: 'warning',
            path: `${sectionPath}[${g}].matchUpFormatCodes`,
            message: `Format code "${code}" also appears in group ${seen.get(code)}`
          });
        } else {
          seen.set(code, g);
        }
      }
    }
  };

  checkSection(data.matchUpAverageTimes, 'matchUpAverageTimes');
  checkSection(data.matchUpRecoveryTimes, 'matchUpRecoveryTimes');
}
