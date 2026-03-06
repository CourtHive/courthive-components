/**
 * Policy Catalog — Static metadata for all 18 factory policy types.
 */

import type { PolicyTypeMeta, PolicyTypeGroup } from '../types';

// Policy type constants (mirrored from tods-competition-factory)
export const POLICY_TYPE_SCHEDULING = 'scheduling';
export const POLICY_TYPE_SCORING = 'scoring';
export const POLICY_TYPE_SEEDING = 'seeding';
export const POLICY_TYPE_DRAWS = 'draws';
export const POLICY_TYPE_AVOIDANCE = 'avoidance';
export const POLICY_TYPE_FEED_IN = 'feedIn';
export const POLICY_TYPE_PROGRESSION = 'progression';
export const POLICY_TYPE_ROUND_NAMING = 'roundNaming';
export const POLICY_TYPE_POSITION_ACTIONS = 'positionActions';
export const POLICY_TYPE_MATCHUP_ACTIONS = 'matchUpActions';
export const POLICY_TYPE_ROUND_ROBIN_TALLY = 'roundRobinTally';
export const POLICY_TYPE_RANKING_POINTS = 'rankingPoints';
export const POLICY_TYPE_COMPETITIVE_BANDS = 'competitiveBands';
export const POLICY_TYPE_VOLUNTARY_CONSOLATION = 'voluntaryConsolation';
export const POLICY_TYPE_PARTICIPANT = 'participant';
export const POLICY_TYPE_DISPLAY = 'display';
export const POLICY_TYPE_AUDIT = 'audit';
export const POLICY_TYPE_PRIVACY = 'participant';

const meta = (
  policyType: string,
  label: string,
  description: string,
  group: PolicyTypeGroup,
  hasEditor: boolean,
): PolicyTypeMeta => ({ policyType, label, description, group, hasEditor });

export const POLICY_TYPE_METADATA: PolicyTypeMeta[] = [
  // Tournament Operations
  meta(POLICY_TYPE_SCHEDULING, 'Scheduling', 'Match scheduling, average times, recovery times, daily limits', 'Tournament Operations', true),
  meta(POLICY_TYPE_POSITION_ACTIONS, 'Position Actions', 'Allowed position actions (alternates, walkovers, withdrawals)', 'Tournament Operations', false),
  meta(POLICY_TYPE_MATCHUP_ACTIONS, 'MatchUp Actions', 'Allowed matchUp status transitions and actions', 'Tournament Operations', false),
  meta(POLICY_TYPE_AVOIDANCE, 'Avoidance', 'Draw placement avoidance rules (club, nationality, region)', 'Tournament Operations', false),

  // Scoring & Results
  meta(POLICY_TYPE_SCORING, 'Scoring', 'Score entry validation and completion rules', 'Scoring & Results', false),
  meta(POLICY_TYPE_ROUND_ROBIN_TALLY, 'Round Robin Tally', 'Round-robin group standing calculation method', 'Scoring & Results', false),
  meta(POLICY_TYPE_RANKING_POINTS, 'Ranking Points', 'Point allocation by draw size, round, and result', 'Scoring & Results', false),
  meta(POLICY_TYPE_COMPETITIVE_BANDS, 'Competitive Bands', 'Rating/ranking band definitions for competitive grouping', 'Scoring & Results', false),

  // Draw Configuration
  meta(POLICY_TYPE_DRAWS, 'Draws', 'Draw generation rules and structure options', 'Draw Configuration', false),
  meta(POLICY_TYPE_SEEDING, 'Seeding', 'Seeding thresholds and placement rules by draw size', 'Draw Configuration', false),
  meta(POLICY_TYPE_FEED_IN, 'Feed-In', 'Feed-in consolation structure rules', 'Draw Configuration', false),
  meta(POLICY_TYPE_PROGRESSION, 'Progression', 'Player progression between draw structures', 'Draw Configuration', false),
  meta(POLICY_TYPE_VOLUNTARY_CONSOLATION, 'Voluntary Consolation', 'Voluntary consolation entry rules', 'Draw Configuration', false),
  meta(POLICY_TYPE_ROUND_NAMING, 'Round Naming', 'Custom round name labels (QF, SF, F, etc.)', 'Draw Configuration', false),

  // Participants
  meta(POLICY_TYPE_PARTICIPANT, 'Participant', 'Participant display and data rules', 'Participants', false),

  // Display & Audit
  meta(POLICY_TYPE_DISPLAY, 'Display', 'Client display configuration (public vs admin views)', 'Display & Audit', false),
  meta(POLICY_TYPE_AUDIT, 'Audit', 'Audit trail and change logging configuration', 'Display & Audit', false),
];

/** Lookup metadata by policyType string */
export function getPolicyTypeMeta(policyType: string): PolicyTypeMeta | undefined {
  return POLICY_TYPE_METADATA.find((m) => m.policyType === policyType);
}

/** Get all unique group names in display order */
export const POLICY_TYPE_GROUPS: PolicyTypeGroup[] = [
  'Tournament Operations',
  'Scoring & Results',
  'Draw Configuration',
  'Participants',
  'Display & Audit',
];
