import { NormalisedSeedingProfile, SeedingPolicyData, SeedingPolicyDraft } from '../types';
/** Widen a policy's `seedingProfile` — and every drawType override — to the object form. */
export declare function normaliseSeedingProfile(profile: SeedingPolicyData['seedingProfile']): NormalisedSeedingProfile | undefined;
/** Widen a whole policy to the editor's internal draft form. */
export declare function toDraft(policy: SeedingPolicyData): SeedingPolicyDraft;
