/**
 * Scoring Policy Editor — Type Definitions
 *
 * Mirrors the factory's scoring policy data shape (see
 * factory/src/fixtures/policies/POLICY_SCORING_DEFAULT.ts).
 *
 * The factory does not export a TypeScript interface for the scoring
 * policy itself — the fixture defines the shape via runtime defaults.
 * We re-derive the shape here so the editor can stay type-safe without
 * dragging factory internals into courthive-components.
 */

// `matchUpStatusCodes` keys — the six statuses the factory's scoring
// policy can refine with caller-defined codes (see ABANDONED, CANCELLED,
// DEFAULTED, INCOMPLETE, RETIRED, WALKOVER in factory matchUpStatusConstants).
export type MatchUpStatusKey = 'ABANDONED' | 'CANCELLED' | 'DEFAULTED' | 'INCOMPLETE' | 'RETIRED' | 'WALKOVER';

export const MATCH_UP_STATUS_KEYS: MatchUpStatusKey[] = [
  'ABANDONED',
  'CANCELLED',
  'DEFAULTED',
  'INCOMPLETE',
  'RETIRED',
  'WALKOVER',
];

// requireAllPositionsAssigned is tri-state in the factory:
//   undefined → default (true)
//   true      → explicit yes
//   false     → explicit no (the case the policy was designed to express)
// The editor exposes this as a select with these three values so the
// distinction between "use default" and "explicit true" is visible.
export type RequireAllPositionsTriState = 'default' | 'true' | 'false';

export interface AllowDeletionWithScoresPresent {
  drawDefinitions?: boolean;
  structures?: boolean;
}

export interface StageSequenceOverride {
  requireAllPositionsAssigned?: boolean;
}

// Allowed match-up format entries. The MatchUp Format Dialog (which
// downstream consumers like TMX surface to operators) renders one
// option per entry using `name` as the dropdown label and
// `description` as the sub-text — so policies need to carry both.
// The legacy factory shape carried only `{ matchUpFormat, description,
// categoryNames?, categoryTypes? }`; the catalog reads either shape
// and writes the richer one on every edit.
export interface MatchUpFormatEntry {
  name?: string;
  description?: string;
  matchUpFormat: string;
  categoryNames?: string[];
  categoryTypes?: string[];
}
export type AllowedFormatEntry = string | MatchUpFormatEntry;

// What the section editor exposes per row; categoryNames / Types stay
// hidden behind an advanced expander (v2) but round-trip on save.
export type AllowedFormatField = 'name' | 'description' | 'matchUpFormat';

export interface ScoringPolicyData {
  // Catalog metadata (the catalog item carries name/source separately,
  // but the policy itself can also carry a `policyName` per the
  // factory's pattern). Mirrored from how seeding does it.
  policyName?: string;

  // Primary scoring rules
  defaultMatchUpFormat?: string;
  matchUpFormats?: AllowedFormatEntry[];
  requireParticipantsForScoring?: boolean;
  requireAllPositionsAssigned?: boolean;
  allowChangePropagation?: boolean;
  allowDeletionWithScoresPresent?: AllowDeletionWithScoresPresent;
  matchUpStatusCodes?: Partial<Record<MatchUpStatusKey, string[]>>;

  // Stage-keyed sequence overrides (the factory's POLICY_SCORING_DEFAULT
  // ships with `stage.MAIN.stageSequence[1].requireAllPositionsAssigned`).
  // V1 of the editor leaves this read-only / advanced — we only round-trip
  // it through the draft so the JSON shape stays intact after a save.
  stage?: Record<string, { stageSequence?: Record<string, StageSequenceOverride> }>;

  // Process-code tokens that downstream governors interpret (e.g.
  // `RANKING.IGNORE` for incomplete-on-default). V1 exposes the
  // `incompleteAssignmentsOnDefault` list under an Advanced panel.
  processCodes?: { incompleteAssignmentsOnDefault?: string[] };
}

export type ScoringEditorSection = 'defaults' | 'allowedFormats' | 'statusCodes';

export interface ScoringEditorState {
  draft: ScoringPolicyData;
  expandedSections: Set<ScoringEditorSection>;
  expandedStatuses: Set<MatchUpStatusKey>;
  advancedOpen: boolean;
  dirty: boolean;
}

export type ScoringEditorChangeListener = (state: ScoringEditorState) => void;

export interface ScoringEditorConfig {
  initialPolicy?: ScoringPolicyData;
  readonly?: boolean;
  onChange?: (policy: ScoringPolicyData) => void;
}

