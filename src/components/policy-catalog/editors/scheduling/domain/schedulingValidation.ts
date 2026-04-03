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

function validateNonNegative(
  value: number | undefined,
  path: string,
  message: string,
  results: SchedulingValidationResult[]
): void {
  if (value !== undefined && value < 0) {
    results.push({ severity: 'error', path, message });
  }
}

function validateDefaultTimes(data: SchedulingPolicyData, results: SchedulingValidationResult[]): void {
  if (!data.defaultTimes) return;

  const avg = data.defaultTimes.averageTimes;
  if (avg) {
    for (let i = 0; i < avg.length; i++) {
      validateNonNegative(avg[i].minutes.default, `defaultTimes.averageTimes[${i}].minutes.default`, 'Default average time must be non-negative', results);
      validateNonNegative(avg[i].minutes.DOUBLES, `defaultTimes.averageTimes[${i}].minutes.DOUBLES`, 'Doubles average time must be non-negative', results);
    }
  }
  const rec = data.defaultTimes.recoveryTimes;
  if (rec) {
    for (let i = 0; i < rec.length; i++) {
      validateNonNegative(rec[i].minutes.default, `defaultTimes.recoveryTimes[${i}].minutes.default`, 'Default recovery time must be non-negative', results);
    }
  }
}

function validateDailyLimits(data: SchedulingPolicyData, results: SchedulingValidationResult[]): void {
  if (!data.defaultDailyLimits) return;
  const dl = data.defaultDailyLimits;
  validateNonNegative(dl.SINGLES, 'defaultDailyLimits.SINGLES', 'Singles daily limit must be non-negative', results);
  validateNonNegative(dl.DOUBLES, 'defaultDailyLimits.DOUBLES', 'Doubles daily limit must be non-negative', results);
  validateNonNegative(dl.total, 'defaultDailyLimits.total', 'Total daily limit must be non-negative', results);
}

export function validateSchedulingPolicy(data: SchedulingPolicyData): SchedulingValidationResult[] {
  const results: SchedulingValidationResult[] = [];

  validateDefaultTimes(data, results);
  validateDailyLimits(data, results);

  if (data.matchUpAverageTimes) {
    validateFormatGroups(data.matchUpAverageTimes, 'matchUpAverageTimes', 'averageTimes', results);
  }

  if (data.matchUpRecoveryTimes) {
    validateRecoveryGroups(data.matchUpRecoveryTimes, 'matchUpRecoveryTimes', results);
  }

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
        validateNonNegative(times[t].minutes.default, `${basePath}[${g}].${timesKey}[${t}].minutes.default`, 'Time must be non-negative', results);
        validateNonNegative(times[t].minutes.DOUBLES, `${basePath}[${g}].${timesKey}[${t}].minutes.DOUBLES`, 'Doubles time must be non-negative', results);
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
      validateNonNegative(group.recoveryTimes[t].minutes.default, `${basePath}[${g}].recoveryTimes[${t}].minutes.default`, 'Recovery time must be non-negative', results);
      validateNonNegative(group.recoveryTimes[t].minutes.DOUBLES, `${basePath}[${g}].recoveryTimes[${t}].minutes.DOUBLES`, 'Doubles recovery time must be non-negative', results);
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
