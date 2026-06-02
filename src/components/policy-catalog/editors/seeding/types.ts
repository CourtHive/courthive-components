/**
 * Seeding Policy Editor — Type Definitions
 *
 * Mirrors the factory's seeding policy data shape (see
 * factory/src/fixtures/policies/POLICY_SEEDING_*.ts).
 */

export type SeedingPositioning = 'SEPARATE' | 'WATERFALL' | 'CLUSTER';

export interface SeedsCountThreshold {
  drawSize: number;
  minimumParticipantCount: number;
  seedsCount: number;
}

export interface SeedingProfile {
  positioning?: SeedingPositioning;
  drawTypes?: Record<string, { positioning: SeedingPositioning }>;
}

export interface SeedingPolicyData {
  policyName?: string;
  seedingProfile?: SeedingProfile;
  validSeedPositions?: { ignore: boolean };
  duplicateSeedNumbers?: boolean;
  drawSizeProgression?: boolean;
  seedsCountThresholds?: SeedsCountThreshold[];
}

export type SeedingEditorSection = 'profile' | 'flags' | 'thresholds' | 'drawTypeOverrides';

export interface SeedingEditorState {
  draft: SeedingPolicyData;
  expandedSections: Set<SeedingEditorSection>;
  dirty: boolean;
}

export type SeedingEditorChangeListener = (state: SeedingEditorState) => void;

export interface SeedingEditorConfig {
  initialPolicy?: SeedingPolicyData;
  /** Override the list of drawTypes offered in the overrides picker. */
  drawTypes?: string[];
  onChange?: (policy: SeedingPolicyData) => void;
}
