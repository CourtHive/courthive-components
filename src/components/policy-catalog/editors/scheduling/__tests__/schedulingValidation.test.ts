import { describe, it, expect } from 'vitest';
import { validateSchedulingPolicy } from '../domain/schedulingValidation';
import type { SchedulingPolicyData } from '../types';
import { fixtures } from 'tods-competition-factory';

const { FORMAT_STANDARD } = fixtures.matchUpFormats;

describe('validateSchedulingPolicy', () => {
  it('returns no errors for valid policy', () => {
    const policy: SchedulingPolicyData = {
      defaultTimes: {
        averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
        recoveryTimes: [{ minutes: { default: 60 } }]
      },
      defaultDailyLimits: { SINGLES: 2, DOUBLES: 2, total: 3 },
      matchUpAverageTimes: [
        {
          matchUpFormatCodes: [FORMAT_STANDARD],
          averageTimes: [{ categoryNames: [], minutes: { default: 90 } }]
        }
      ],
      matchUpRecoveryTimes: []
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.filter((r) => r.severity === 'error')).toHaveLength(0);
  });

  it('flags negative default average time', () => {
    const policy: SchedulingPolicyData = {
      defaultTimes: {
        averageTimes: [{ categoryNames: [], minutes: { default: -10 } }]
      }
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.some((r) => r.severity === 'error' && r.path.includes('averageTimes'))).toBe(true);
  });

  it('flags negative daily limits', () => {
    const policy: SchedulingPolicyData = {
      defaultDailyLimits: { SINGLES: -1, DOUBLES: 2, total: 3 }
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.some((r) => r.severity === 'error' && r.path.includes('SINGLES'))).toBe(true);
  });

  it('flags empty format codes in average time group', () => {
    const policy: SchedulingPolicyData = {
      matchUpAverageTimes: [
        {
          matchUpFormatCodes: [],
          averageTimes: [{ categoryNames: [], minutes: { default: 90 } }]
        }
      ]
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.some((r) => r.severity === 'error' && r.message.includes('format code'))).toBe(true);
  });

  it('flags empty format codes in recovery time group', () => {
    const policy: SchedulingPolicyData = {
      matchUpRecoveryTimes: [
        {
          matchUpFormatCodes: [],
          recoveryTimes: [{ categoryNames: [], minutes: { default: 30 } }]
        }
      ]
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.some((r) => r.severity === 'error' && r.message.includes('format code'))).toBe(true);
  });

  it('warns on duplicate format codes across average time groups', () => {
    const policy: SchedulingPolicyData = {
      matchUpAverageTimes: [
        {
          matchUpFormatCodes: [FORMAT_STANDARD],
          averageTimes: [{ categoryNames: [], minutes: { default: 90 } }]
        },
        {
          matchUpFormatCodes: [FORMAT_STANDARD],
          averageTimes: [{ categoryNames: [], minutes: { default: 80 } }]
        }
      ]
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.some((r) => r.severity === 'warning' && r.message.includes(FORMAT_STANDARD))).toBe(true);
  });

  it('flags negative doubles time in format group', () => {
    const policy: SchedulingPolicyData = {
      matchUpAverageTimes: [
        {
          matchUpFormatCodes: [FORMAT_STANDARD],
          averageTimes: [{ categoryNames: [], minutes: { default: 90, DOUBLES: -5 } }]
        }
      ]
    };
    const results = validateSchedulingPolicy(policy);
    expect(results.some((r) => r.severity === 'error' && r.path.includes('DOUBLES'))).toBe(true);
  });

  it('returns empty for empty policy', () => {
    const results = validateSchedulingPolicy({});
    expect(results).toHaveLength(0);
  });
});
