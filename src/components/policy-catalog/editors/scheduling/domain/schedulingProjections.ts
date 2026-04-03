/**
 * Scheduling Policy Editor — Query helpers
 */

import type { SchedulingPolicyData } from '../types';

/** Get a human-readable description for a matchUp format code */
export function formatCodeLabel(code: string): string {
  return FORMAT_DESCRIPTIONS[code] ?? code;
}

/** Known format code descriptions */
const FORMAT_DESCRIPTIONS: Record<string, string> = {
  'SET3-S:6/TB7': 'Best of 3 TB sets',
  'SET3-S:6/TB7-F:TB10': '2 TB sets, MTB10',
  'SET3-S:6/TB7-F:TB7': '2 TB sets, MTB7',
  'SET3-S:4NOAD-F:TB7': '2 short sets (4, NOAD), MTB7',
  'SET3-S:4/TB7': 'Best of 3 short sets (4)',
  'SET3-S:4/TB7-F:TB7': '2 short sets (4), MTB7',
  'SET3-S:4/TB7-F:TB10': '2 short sets (4), MTB10',
  'SET3-S:4/TB5@3': '3 short sets (4), TB5@3',
  'SET1-S:8/TB7': '8-game pro-set, TB7',
  'SET1-S:8/TB7@7': '8-game pro-set, TB7@7',
  'SET1-S:5/TB9@4': '1 set to 5, TB9@4',
  'SET1-S:6/TB7': '1 TB set',
  'SET1-S:6NOAD': '1 set to 6, NOAD',
  'SET1-S:4/TB7': '1 short set (4), TB7',
  'SET1-S:4/TB5@3': '1 short set (4), TB5@3',
  'SET1-S:4NOAD': '1 short set (4), NOAD',
  'SET3-S:TB10': 'Best of 3 TB10 games',
  'SET1-S:T20': 'Timed 20 min',
  'SET1-S:TB10': '1 TB10 game',
  'SET5-S:6/TB7': 'Best of 5 TB sets',
  'SET5-S:6/TB7-F:TB10': '5 sets, MTB10',
  'SET1-S:6/TB10': '1 set, TB10',
  'SET1-S:8': 'Pro-set to 8',
  'SET1-S:10': 'Pro-set to 10',
  'SET1-S:T7': 'TB7 only',
  'SET1-S:T21': 'TB21 only'
};

/** Create empty scheduling policy with sensible structure */
export function emptySchedulingPolicy(): SchedulingPolicyData {
  return {
    allowModificationWhenMatchUpsScheduled: { courts: false, venues: false },
    defaultTimes: {
      averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
      recoveryTimes: [{ minutes: { default: 60 } }]
    },
    defaultDailyLimits: { SINGLES: 2, DOUBLES: 2, total: 3 },
    matchUpAverageTimes: [],
    matchUpRecoveryTimes: [],
    matchUpDailyLimits: []
  };
}
