/**
 * Normalisation at the editor's ingest boundary.
 *
 * The factory accepts a seeding policy's `seedingProfile` in two forms — a profile object,
 * or a bare positioning string that `getSeedPattern` and `structureTemplate` still honour.
 * The same is true of each `drawTypes[drawType]` override. The editor holds and mutates an
 * object, so both string forms are widened to the object form on the way in.
 *
 * Before the factory declared `SeedingPolicy`, this module hand-mirrored a narrower shape and
 * simply assumed the object form. A policy carrying the string form rendered an empty
 * positioning control rather than the value it actually held.
 */
import type {
  NormalisedSeedingProfile,
  DrawSeedingProfile,
  SeedingPolicyData,
  SeedingPolicyDraft,
  SeedingPositioning
} from '../types';

function toProfile(value: DrawSeedingProfile | SeedingPositioning | undefined): DrawSeedingProfile | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? { positioning: value } : value;
}

/** Widen a policy's `seedingProfile` — and every drawType override — to the object form. */
export function normaliseSeedingProfile(
  profile: SeedingPolicyData['seedingProfile']
): NormalisedSeedingProfile | undefined {
  if (profile === undefined) return undefined;
  if (typeof profile === 'string') return { positioning: profile };

  const { drawTypes, ...rest } = profile;
  if (!drawTypes) return rest;

  const normalisedDrawTypes: Record<string, DrawSeedingProfile> = {};
  for (const [drawType, override] of Object.entries(drawTypes)) {
    const normalised = toProfile(override);
    if (normalised) normalisedDrawTypes[drawType] = normalised;
  }
  return { ...rest, drawTypes: normalisedDrawTypes };
}

/** Widen a whole policy to the editor's internal draft form. */
export function toDraft(policy: SeedingPolicyData): SeedingPolicyDraft {
  return { ...policy, seedingProfile: normaliseSeedingProfile(policy.seedingProfile) };
}
