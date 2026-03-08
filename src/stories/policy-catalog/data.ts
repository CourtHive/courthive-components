/**
 * Shared test data for Policy Catalog & Scheduling Editor stories.
 */

import type {
  PolicyCatalogItem,
  PolicyCatalogConfig,
  SchedulingPolicyData,
  SchedulingEditorConfig,
} from '../../components/policy-catalog';

import { fixtures } from 'tods-competition-factory';

const {
  FORMAT_STANDARD,
  FORMAT_ATP_DOUBLES,
  FORMAT_SHORT_SETS,
  FORMAT_PRO_SET,
} = fixtures.matchUpFormats;

const FORMAT_ONE_SET = 'SET1-S:6/TB7';
const FORMAT_MATCH_TIEBREAK = 'SET1-S:TB10';

// ============================================================================
// Scheduling Policy Fixtures (mirrors factory POLICY_SCHEDULING_DEFAULT)
// ============================================================================

export const SCHEDULING_POLICY_DEFAULT: SchedulingPolicyData = {
  allowModificationWhenMatchUpsScheduled: {
    courts: false,
    venues: false,
  },
  defaultTimes: {
    averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
    recoveryTimes: [{ minutes: { DOUBLES: 30, default: 60 } }],
  },
  defaultDailyLimits: {
    SINGLES: 2,
    DOUBLES: 2,
    total: 3,
  },
  matchUpAverageTimes: [
    {
      matchUpFormatCodes: [FORMAT_STANDARD],
      averageTimes: [
        { categoryNames: [], minutes: { default: 90 } },
        { categoryTypes: ['WHEELCHAIR'], minutes: { default: 120 } },
      ],
    },
    {
      matchUpFormatCodes: [FORMAT_ATP_DOUBLES],
      averageTimes: [{ categoryNames: [], minutes: { default: 85 } }],
    },
    {
      matchUpFormatCodes: [FORMAT_SHORT_SETS],
      averageTimes: [{ categoryNames: [], minutes: { default: 60 } }],
    },
    {
      matchUpFormatCodes: [FORMAT_PRO_SET, 'SET1-S:8/TB7@7'],
      averageTimes: [{ categoryNames: [], minutes: { default: 40 } }],
    },
    {
      matchUpFormatCodes: [FORMAT_ONE_SET],
      averageTimes: [{ categoryNames: [], minutes: { default: 30 } }],
    },
    {
      matchUpFormatCodes: [FORMAT_MATCH_TIEBREAK],
      averageTimes: [{ categoryNames: [], minutes: { default: 10 } }],
    },
  ],
  matchUpRecoveryTimes: [
    {
      matchUpFormatCodes: [FORMAT_STANDARD, FORMAT_ATP_DOUBLES],
      recoveryTimes: [
        { categoryTypes: ['ADULT', 'WHEELCHAIR'], minutes: { default: 60, DOUBLES: 30 } },
        { categoryTypes: ['JUNIOR'], minutes: { default: 60, DOUBLES: 60 } },
      ],
    },
    {
      matchUpFormatCodes: [FORMAT_SHORT_SETS, 'SET3-S:4/TB7-F:TB7'],
      recoveryTimes: [
        { categoryTypes: ['ADULT', 'WHEELCHAIR'], minutes: { default: 30 } },
        { categoryTypes: ['JUNIOR'], minutes: { default: 60 } },
      ],
    },
    {
      matchUpFormatCodes: [FORMAT_MATCH_TIEBREAK],
      recoveryTimes: [
        { categoryNames: [], minutes: { default: 15 } },
      ],
    },
  ],
  matchUpDailyLimits: [],
};

export const SCHEDULING_POLICY_MINIMAL: SchedulingPolicyData = {
  defaultTimes: {
    averageTimes: [{ categoryNames: [], minutes: { default: 60 } }],
    recoveryTimes: [{ minutes: { default: 30 } }],
  },
  defaultDailyLimits: { SINGLES: 3, DOUBLES: 3, total: 5 },
};

export const SCHEDULING_POLICY_EMPTY: SchedulingPolicyData = {
  allowModificationWhenMatchUpsScheduled: { courts: false, venues: false },
  defaultTimes: {
    averageTimes: [{ categoryNames: [], minutes: { default: 90 } }],
    recoveryTimes: [{ minutes: { default: 60 } }],
  },
  defaultDailyLimits: { SINGLES: 2, DOUBLES: 2, total: 3 },
  matchUpAverageTimes: [],
  matchUpRecoveryTimes: [],
  matchUpDailyLimits: [],
};

// ============================================================================
// Other Policy Fixtures
// ============================================================================

const SCORING_POLICY = {
  requireCompleteScores: true,
  allowRetirement: true,
  allowDefault: true,
  allowWalkover: true,
};

const SEEDING_POLICY = {
  seedsCount: { 4: 2, 8: 4, 16: 8, 32: 16, 64: 16, 128: 32 },
  duplicateSeedNumbers: true,
};

const DRAWS_POLICY = {
  allowRoundRobin: true,
  maxDrawSize: 128,
  minDrawSize: 2,
};

const AVOIDANCE_POLICY = {
  roundsToAvoid: [1, 2],
  avoidanceKeys: ['club', 'nationality'],
};

const ROUND_NAMING_POLICY = {
  1: 'F',
  2: 'SF',
  4: 'QF',
  8: 'R16',
  16: 'R32',
  32: 'R64',
  64: 'R128',
};

const POSITION_ACTIONS_POLICY = {
  enabledActions: ['ALTERNATE', 'WALKOVER', 'BYE', 'WITHDRAWAL'],
};

const AUDIT_POLICY = {
  enableAuditTrail: true,
  logLevel: 'INFO',
};

// ============================================================================
// Catalog Items
// ============================================================================

export const BUILTIN_POLICIES: PolicyCatalogItem[] = [
  {
    id: 'builtin-scheduling-default',
    name: 'Default Scheduling',
    policyType: 'scheduling',
    source: 'builtin',
    description: 'Standard scheduling with 90-min average times, per-format overrides, and age-group recovery',
    policyData: SCHEDULING_POLICY_DEFAULT as unknown as Record<string, unknown>,
  },
  {
    id: 'builtin-scoring-default',
    name: 'Default Scoring',
    policyType: 'scoring',
    source: 'builtin',
    description: 'Standard scoring rules with retirement, default, and walkover support',
    policyData: SCORING_POLICY,
  },
  {
    id: 'builtin-seeding-default',
    name: 'Default Seeding',
    policyType: 'seeding',
    source: 'builtin',
    description: 'Seeds by draw size: 4→2, 8→4, 16→8, 32→16, 64→16, 128→32',
    policyData: SEEDING_POLICY,
  },
  {
    id: 'builtin-draws-default',
    name: 'Default Draws',
    policyType: 'draws',
    source: 'builtin',
    description: 'Standard draw generation with round-robin support, sizes 2–128',
    policyData: DRAWS_POLICY,
  },
  {
    id: 'builtin-avoidance-default',
    name: 'Default Avoidance',
    policyType: 'avoidance',
    source: 'builtin',
    description: 'Avoid same club/nationality in rounds 1–2',
    policyData: AVOIDANCE_POLICY,
  },
  {
    id: 'builtin-round-naming',
    name: 'Standard Round Naming',
    policyType: 'roundNaming',
    source: 'builtin',
    description: 'F, SF, QF, R16, R32, R64, R128',
    policyData: ROUND_NAMING_POLICY,
  },
  {
    id: 'builtin-position-actions',
    name: 'Default Position Actions',
    policyType: 'positionActions',
    source: 'builtin',
    description: 'Alternates, walkovers, byes, and withdrawals',
    policyData: POSITION_ACTIONS_POLICY,
  },
  {
    id: 'builtin-audit',
    name: 'Default Audit',
    policyType: 'audit',
    source: 'builtin',
    description: 'Audit trail enabled at INFO level',
    policyData: AUDIT_POLICY,
  },
];

export const USER_POLICIES: PolicyCatalogItem[] = [
  {
    id: 'user-scheduling-junior',
    name: 'Junior Tournament Scheduling',
    policyType: 'scheduling',
    source: 'user',
    description: 'Adjusted for junior events: longer recovery, lower daily limits',
    policyData: {
      ...SCHEDULING_POLICY_DEFAULT,
      defaultDailyLimits: { SINGLES: 1, DOUBLES: 1, total: 2 },
    } as unknown as Record<string, unknown>,
  },
  {
    id: 'user-scheduling-fast',
    name: 'Fast Format Scheduling',
    policyType: 'scheduling',
    source: 'user',
    description: 'Short-set formats with quick turnarounds for exhibition events',
    policyData: SCHEDULING_POLICY_MINIMAL as unknown as Record<string, unknown>,
  },
  {
    id: 'user-scoring-custom',
    name: 'Custom Scoring Rules',
    policyType: 'scoring',
    source: 'user',
    description: 'No retirement allowed, strict score completion',
    policyData: { ...SCORING_POLICY, allowRetirement: false },
  },
  {
    id: 'user-seeding-conservative',
    name: 'Conservative Seeding',
    policyType: 'seeding',
    source: 'user',
    description: 'Fewer seeds for smaller draws',
    policyData: { seedsCount: { 8: 2, 16: 4, 32: 8, 64: 16, 128: 16 } },
  },
];

// ============================================================================
// Available Format Codes (for scheduling editor tag picker)
// ============================================================================

export const AVAILABLE_FORMAT_CODES = [
  'SET3-S:6/TB7',
  'SET3-S:6/TB7-F:TB10',
  'SET3-S:6/TB7-F:TB7',
  'SET3-S:4NOAD-F:TB7',
  'SET3-S:4/TB7',
  'SET3-S:4/TB7-F:TB7',
  'SET3-S:4/TB7-F:TB10',
  'SET3-S:4/TB5@3',
  'SET1-S:8/TB7',
  'SET1-S:8/TB7@7',
  'SET1-S:5/TB9@4',
  'SET1-S:6/TB7',
  'SET1-S:6NOAD',
  'SET1-S:4/TB7',
  'SET1-S:4/TB5@3',
  'SET1-S:4NOAD',
  'SET3-S:TB10',
  'SET1-S:T20',
  'SET1-S:TB10',
];

export const CATEGORY_NAMES = ['U10', 'U12', 'U14', 'U16', 'U18', 'Open'];
export const CATEGORY_TYPES = ['ADULT', 'JUNIOR', 'WHEELCHAIR'];

// ============================================================================
// Config Builders
// ============================================================================

export function makeCatalogConfig(overrides: Partial<PolicyCatalogConfig> = {}): PolicyCatalogConfig {
  return {
    builtinPolicies: BUILTIN_POLICIES,
    userPolicies: USER_POLICIES,
    ...overrides,
  };
}

export function makeSchedulingEditorConfig(
  overrides: Partial<SchedulingEditorConfig> = {},
): SchedulingEditorConfig {
  return {
    initialPolicy: SCHEDULING_POLICY_DEFAULT,
    categoryNames: CATEGORY_NAMES,
    categoryTypes: CATEGORY_TYPES,
    matchUpFormatCodes: AVAILABLE_FORMAT_CODES,
    ...overrides,
  };
}
