/**
 * Scoring Editor — Pure projections.
 *
 * - emptyScoringPolicy(): the shape a fresh "new policy" or "use as template"
 *   duplicate starts from. Mirrors the factory's POLICY_SCORING_DEFAULT
 *   without dragging the runtime fixture in.
 * - MATCH_UP_FORMAT_PRESETS: curated list surfaced in the format picker.
 *   Covers the highest-traffic tennis-family formats plus a few pickleball /
 *   padel / squash entries; any custom format string still goes through the
 *   builder + free-text fallback.
 */

import type { ScoringPolicyData, MatchUpFormatPreset, AllowedFormatEntry } from '../types';

// matchUpFormats entries can be either a bare string or the richer
// { matchUpFormat, description, ... } object shape (TMX ships the
// latter for its built-in POLICY_SCORING). Display chips always need
// the format string itself.
export function formatStringOf(entry: AllowedFormatEntry): string {
  return typeof entry === 'string' ? entry : entry.matchUpFormat;
}

export function formatDescriptionOf(entry: AllowedFormatEntry): string | undefined {
  return typeof entry === 'string' ? undefined : entry.description;
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

// Ordered by descending real-world frequency in the user base. The first
// preset is the same value as FORMAT_STANDARD so the dropdown opens on
// "Standard" for the empty / brand-new case.
export const MATCH_UP_FORMAT_PRESETS: MatchUpFormatPreset[] = [
  { label: 'Standard',                  description: 'Best of 3 sets to 6, TB7',                   format: 'SET3-S:6/TB7',                sport: 'tennis' },
  { label: 'Best of 5',                 description: 'Best of 5 sets to 6, TB7',                   format: 'SET5-S:6/TB7',                sport: 'tennis' },
  { label: 'Grand Slam',                description: 'Best of 5 with final-set TB10',              format: 'SET5-S:6/TB7-F:6/TB10',       sport: 'tennis' },
  { label: 'ATP Doubles',               description: 'Best of 3 with match TB10',                  format: 'SET3-S:6/TB7-F:TB10',         sport: 'tennis' },
  { label: 'No-Ad (BO3)',               description: 'Best of 3 with no-advantage games',          format: 'SET3-S:6NOAD/TB7',            sport: 'tennis' },
  { label: 'Short Sets (BO3)',          description: 'Best of 3 sets to 4',                        format: 'SET3-S:4/TB7',                sport: 'tennis' },
  { label: 'Fast4',                     description: 'Best of 3 sets to 4, TB5 at 3-3',            format: 'SET3-S:4/TB5@3',              sport: 'tennis' },
  { label: 'Pro Set (8)',               description: 'Single set to 8 with TB7',                   format: 'SET1-S:8/TB7',                sport: 'tennis' },
  { label: 'Match Tiebreak',            description: '10-point match tiebreak',                    format: 'SET1-S:TB10',                 sport: 'tennis' },

  { label: 'Pickleball (BO3 → 11)',     description: 'Best of 3 games to 11',                      format: 'SET3-S:TB11',                 sport: 'pickleball' },
  { label: 'Pickleball Rally (11)',     description: 'Best of 3 rally scoring to 11',              format: 'SET3-S:TB11@RALLY',           sport: 'pickleball' },
  { label: 'Pickleball Rally (21)',     description: 'Best of 3 rally scoring to 21',              format: 'SET3-S:TB21@RALLY',           sport: 'pickleball' },
  { label: 'MLP',                       description: '4 games to 21 + 5th to 15 (rally)',          format: 'SET5-S:TB21@RALLY-F:TB15@RALLY', sport: 'pickleball' },

  { label: 'Padel Golden Point',        description: 'BO3 no-advantage + match TB',                format: 'SET3-S:6NOAD/TB7-F:TB10',     sport: 'padel' },

  { label: 'Squash (BO5 → 11)',         description: 'Best of 5 to 11 (PAR-11)',                   format: 'SET5-S:TB11',                 sport: 'squash' },
  { label: 'Badminton',                 description: 'Best of 3 to 21',                            format: 'SET3-S:TB21',                 sport: 'badminton' },
  { label: 'Table Tennis',              description: 'Best of 5 to 11',                            format: 'SET5-S:TB11',                 sport: 'table-tennis' },
];

// Find the preset whose `format` matches the given string, if any. Used
// so the picker can highlight "Standard" when the underlying value is
// 'SET3-S:6/TB7'.
export function findPresetByFormat(format: string | undefined): MatchUpFormatPreset | undefined {
  if (!format) return undefined;
  return MATCH_UP_FORMAT_PRESETS.find((p) => p.format === format);
}
