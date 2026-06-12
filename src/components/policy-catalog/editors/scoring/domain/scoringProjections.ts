/**
 * Scoring Editor — Pure projections.
 *
 * - emptyScoringPolicy(): the shape a fresh "new policy" or "use as template"
 *   duplicate starts from. Mirrors the factory's POLICY_SCORING_DEFAULT
 *   without dragging the runtime fixture in.
 * - MATCH_UP_FORMAT_REGISTRY_SORTED: the same matchUpFormats.json registry
 *   the runtime MatchUp Format Dialog reads. Surfaced in the picker's
 *   preset dropdown and the allowed-formats section's "From preset…"
 *   dropdown so both surfaces show identical names ("Standard Advantage",
 *   "Wimbledon 2018", "MLP Format", …).
 * - formatNameOf / formatDescriptionOf fall back to the registry when an
 *   entry doesn't carry its own name/description.
 */

import matchUpFormatRegistry from '../../../../matchUpFormat/matchUpFormats.json';
import type { ScoringPolicyData, AllowedFormatEntry } from '../types';

// matchUpFormats.json is the canonical registry of named formats the
// MatchUp Format Dialog surfaces to operators (entries look like
// { key, name: "Standard Advantage", format: "SET3-S:6/TB7", desc: … }).
// We mirror the same source in the scoring editor so a policy entry
// that arrives with only { matchUpFormat } displays the registry's
// "Standard Advantage" rather than a generic placeholder.
type RegistryEntry = { key?: string; name?: string; format?: string; desc?: string; desc2?: string };

const MATCH_UP_FORMAT_REGISTRY = matchUpFormatRegistry as RegistryEntry[];

const REGISTRY_BY_FORMAT: Map<string, RegistryEntry> = (() => {
  const map = new Map<string, RegistryEntry>();
  for (const entry of MATCH_UP_FORMAT_REGISTRY) {
    if (entry.format) map.set(entry.format, entry);
  }
  return map;
})();

// Public lookup — preferred over re-deriving in section code so the
// fallback logic stays consistent across name + description columns.
export function lookupRegistryFormat(format: string | undefined): RegistryEntry | undefined {
  if (!format) return undefined;
  return REGISTRY_BY_FORMAT.get(format);
}

// The full registry (sorted by name) — used by the "From preset…"
// dropdown in allowedFormatsSection so the operator picks from the
// same set the runtime dialog reads.
export const MATCH_UP_FORMAT_REGISTRY_SORTED: RegistryEntry[] = MATCH_UP_FORMAT_REGISTRY.filter(
  (e) => e.format && e.name,
).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

// matchUpFormats entries can be either a bare string or the richer
// { name?, description?, matchUpFormat, ... } object shape (TMX ships
// the latter for its built-in POLICY_SCORING). Projections always read
// from the shape the editor surfaces; the canonical object form is
// what the editor writes back on every edit.
export function formatStringOf(entry: AllowedFormatEntry): string {
  return typeof entry === 'string' ? entry : entry.matchUpFormat;
}

// Name + description fall back to the matchUpFormats.json registry
// when the entry doesn't carry one. The display value the operator
// sees in the row matches the dialog's dropdown label without forcing
// the editor to mutate the entry on load.
export function formatNameOf(entry: AllowedFormatEntry): string {
  const explicit = typeof entry === 'string' ? '' : entry.name ?? '';
  if (explicit) return explicit;
  return lookupRegistryFormat(formatStringOf(entry))?.name ?? '';
}

export function formatDescriptionOf(entry: AllowedFormatEntry): string {
  const explicit = typeof entry === 'string' ? '' : entry.description ?? '';
  if (explicit) return explicit;
  return lookupRegistryFormat(formatStringOf(entry))?.desc ?? '';
}

// Lift a (possibly string) entry into its object form, preserving any
// existing extra fields (categoryNames/Types).
export function asMatchUpFormatEntry(entry: AllowedFormatEntry): {
  name?: string;
  description?: string;
  matchUpFormat: string;
  categoryNames?: string[];
  categoryTypes?: string[];
} {
  if (typeof entry === 'string') return { matchUpFormat: entry };
  return { ...entry };
}

// The factory default uses FORMAT_STANDARD = 'SET3-S:6/TB7'. Hard-coding
// the literal here avoids a dev-time runtime dependency on the factory
// fixture from a courthive-components consumer; the editor's stringifier
// will round-trip the exact same value on save.
export const FORMAT_STANDARD = 'SET3-S:6/TB7';

export function emptyScoringPolicy(): ScoringPolicyData {
  return {
    defaultMatchUpFormat: FORMAT_STANDARD,
    matchUpFormats: [],
    requireParticipantsForScoring: false,
    allowChangePropagation: false,
    allowDeletionWithScoresPresent: {
      drawDefinitions: false,
      structures: false,
    },
    matchUpStatusCodes: {
      ABANDONED: [],
      CANCELLED: [],
      DEFAULTED: [],
      INCOMPLETE: [],
      RETIRED: [],
      WALKOVER: [],
    },
  };
}

