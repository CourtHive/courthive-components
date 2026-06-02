/**
 * Seeding Policy Editor — Defaults and lookup helpers.
 */

import type { SeedingPolicyData, SeedingPositioning } from '../types';

export const POSITIONING_OPTIONS: { value: SeedingPositioning; label: string; description: string }[] = [
  { value: 'SEPARATE', label: 'Separate', description: 'Each seed placed in its own section of the draw' },
  { value: 'WATERFALL', label: 'Waterfall', description: 'Seeds cascade down section by section' },
  { value: 'CLUSTER', label: 'Cluster', description: 'Seeds grouped in clusters (e.g. 5-8 together)' }
];

/** Draw types that meaningfully use a positioning override. Mirrors factory drawDefinitionConstants. */
export const DRAW_TYPE_OPTIONS: string[] = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'ROUND_ROBIN',
  'ROUND_ROBIN_WITH_PLAYOFF',
  'FEED_IN',
  'FEED_IN_CHAMPIONSHIP',
  'FEED_IN_CHAMPIONSHIP_TO_SF',
  'FEED_IN_CHAMPIONSHIP_TO_QF',
  'FEED_IN_CHAMPIONSHIP_TO_R16',
  'FIRST_MATCH_LOSER_CONSOLATION',
  'CURTIS_CONSOLATION',
  'COMPASS',
  'OLYMPIC'
];

export function emptySeedingPolicy(): SeedingPolicyData {
  return {
    policyName: '',
    seedingProfile: { positioning: 'SEPARATE' },
    validSeedPositions: { ignore: true },
    duplicateSeedNumbers: true,
    drawSizeProgression: true,
    seedsCountThresholds: [
      { drawSize: 4, minimumParticipantCount: 3, seedsCount: 2 },
      { drawSize: 16, minimumParticipantCount: 12, seedsCount: 4 },
      { drawSize: 32, minimumParticipantCount: 24, seedsCount: 8 },
      { drawSize: 64, minimumParticipantCount: 48, seedsCount: 16 }
    ]
  };
}

export function positioningLabel(value: SeedingPositioning | undefined): string {
  return POSITIONING_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '';
}
