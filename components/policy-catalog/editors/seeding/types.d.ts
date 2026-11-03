import { SeedingProfile as DrawSeedingProfile, PolicySeedingProfile, SeedingProfileUnion, SeedsCountThreshold, SeedingPolicy } from 'tods-competition-factory';
export type { SeedsCountThreshold, PolicySeedingProfile, DrawSeedingProfile };
/** `'ADJACENT' | 'CLUSTER' | 'SEPARATE' | 'WATERFALL'` — the factory's closed union. */
export type SeedingPositioning = SeedingProfileUnion;
/** The policy-level profile in its object form. */
export type SeedingProfile = PolicySeedingProfile;
/** What the editor accepts and emits — the factory's policy shape, verbatim. */
export type SeedingPolicyData = SeedingPolicy;
/**
 * The editor's INTERNAL draft.
 *
 * `SeedingPolicy.seedingProfile` is `PolicySeedingProfile | SeedingProfileUnion` — the
 * factory still honours a bare positioning string where a profile object is expected.
 * The editor holds and mutates an object, so the string form is normalised away on
 * ingest (see `normaliseSeedingProfile`) and the draft is the object form only.
 */
export type SeedingPolicyDraft = Omit<SeedingPolicyData, 'seedingProfile'> & {
    seedingProfile?: NormalisedSeedingProfile;
};
/**
 * A {@link PolicySeedingProfile} whose drawType overrides are known to be objects.
 * The factory types each override as `SeedingProfile | SeedingProfileUnion`; the editor
 * normalises the string form away on ingest, so the draft need not re-narrow at every read.
 */
export type NormalisedSeedingProfile = Omit<PolicySeedingProfile, 'drawTypes'> & {
    drawTypes?: Record<string, DrawSeedingProfile>;
};
export type SeedingEditorSection = 'profile' | 'flags' | 'thresholds' | 'drawTypeOverrides';
export interface SeedingEditorState {
    draft: SeedingPolicyDraft;
    expandedSections: Set<SeedingEditorSection>;
    dirty: boolean;
}
export type SeedingEditorChangeListener = (state: SeedingEditorState) => void;
export interface SeedingEditorConfig {
    /** Accepts either form the factory accepts; the string form is normalised on ingest. */
    initialPolicy?: SeedingPolicyData;
    /** Override the list of drawTypes offered in the overrides picker. */
    drawTypes?: string[];
    /** Emits the normalised object form, which is itself a valid {@link SeedingPolicyData}. */
    onChange?: (policy: SeedingPolicyDraft) => void;
}
