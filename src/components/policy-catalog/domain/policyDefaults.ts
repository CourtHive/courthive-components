/**
 * Policy Catalog — Static metadata for all 18 factory policy types.
 */

import type { PolicyTypeMeta, PolicyTypeGroup } from '../types';
import { emptyRankingPolicy } from '../editors/ranking/domain/emptyRankingPolicy';
import { emptySchedulingPolicy } from '../editors/scheduling/domain/schedulingProjections';

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

const GROUP_TOURNAMENT_OPS: PolicyTypeGroup = 'Tournament Operations';
const GROUP_SCORING: PolicyTypeGroup = 'Scoring & Results';
const GROUP_RANKING_POINTS: PolicyTypeGroup = 'Ranking Points';
const GROUP_DRAW_CONFIG: PolicyTypeGroup = 'Draw Configuration';
const GROUP_PARTICIPANTS: PolicyTypeGroup = 'Participants';
const GROUP_DISPLAY_AUDIT: PolicyTypeGroup = 'Display & Audit';

const meta = (
  policyType: string,
  label: string,
  description: string,
  group: PolicyTypeGroup,
  hasEditor: boolean
): PolicyTypeMeta => ({ policyType, label, description, group, hasEditor });

export const POLICY_TYPE_METADATA: PolicyTypeMeta[] = [
  // Tournament Operations
  meta(
    POLICY_TYPE_SCHEDULING,
    'Scheduling',
    'Match scheduling, average times, recovery times, daily limits',
    GROUP_TOURNAMENT_OPS,
    true
  ),
  meta(
    POLICY_TYPE_POSITION_ACTIONS,
    'Position Actions',
    'Allowed position actions (alternates, walkovers, withdrawals)',
    GROUP_TOURNAMENT_OPS,
    false
  ),
  meta(
    POLICY_TYPE_MATCHUP_ACTIONS,
    'MatchUp Actions',
    'Allowed matchUp status transitions and actions',
    GROUP_TOURNAMENT_OPS,
    false
  ),
  meta(
    POLICY_TYPE_AVOIDANCE,
    'Avoidance',
    'Draw placement avoidance rules (club, nationality, region)',
    GROUP_TOURNAMENT_OPS,
    false
  ),

  // Scoring & Results
  meta(POLICY_TYPE_SCORING, 'Scoring', 'Score entry validation and completion rules', GROUP_SCORING, false),
  meta(
    POLICY_TYPE_ROUND_ROBIN_TALLY,
    'Round Robin Tally',
    'Round-robin group standing calculation method',
    GROUP_SCORING,
    false
  ),
  meta(
    POLICY_TYPE_RANKING_POINTS,
    'Ranking Points',
    'Point allocation by draw size, round, and result',
    GROUP_RANKING_POINTS,
    true
  ),
  meta(
    POLICY_TYPE_COMPETITIVE_BANDS,
    'Competitive Bands',
    'Rating/ranking band definitions for competitive grouping',
    GROUP_SCORING,
    false
  ),

  // Draw Configuration
  meta(POLICY_TYPE_DRAWS, 'Draws', 'Draw generation rules and structure options', GROUP_DRAW_CONFIG, false),
  meta(POLICY_TYPE_SEEDING, 'Seeding', 'Seeding thresholds and placement rules by draw size', GROUP_DRAW_CONFIG, false),
  meta(POLICY_TYPE_FEED_IN, 'Feed-In', 'Feed-in consolation structure rules', GROUP_DRAW_CONFIG, false),
  meta(POLICY_TYPE_PROGRESSION, 'Progression', 'Player progression between draw structures', GROUP_DRAW_CONFIG, false),
  meta(
    POLICY_TYPE_VOLUNTARY_CONSOLATION,
    'Voluntary Consolation',
    'Voluntary consolation entry rules',
    GROUP_DRAW_CONFIG,
    false
  ),
  meta(
    POLICY_TYPE_ROUND_NAMING,
    'Round Naming',
    'Custom round name labels (QF, SF, F, etc.)',
    GROUP_DRAW_CONFIG,
    false
  ),

  // Participants
  meta(POLICY_TYPE_PARTICIPANT, 'Participant', 'Participant display and data rules', GROUP_PARTICIPANTS, false),

  // Display & Audit
  meta(
    POLICY_TYPE_DISPLAY,
    'Display',
    'Client display configuration (public vs admin views)',
    GROUP_DISPLAY_AUDIT,
    false
  ),
  meta(POLICY_TYPE_AUDIT, 'Audit', 'Audit trail and change logging configuration', GROUP_DISPLAY_AUDIT, false)
];

/** Lookup metadata by policyType string */
export function getPolicyTypeMeta(policyType: string): PolicyTypeMeta | undefined {
  return POLICY_TYPE_METADATA.find((m) => m.policyType === policyType);
}

/** Get empty policy data for a given policy type */
export function getEmptyPolicyData(policyType: string): Record<string, unknown> {
  if (policyType === POLICY_TYPE_RANKING_POINTS) return emptyRankingPolicy() as unknown as Record<string, unknown>;
  if (policyType === POLICY_TYPE_SCHEDULING) return emptySchedulingPolicy() as unknown as Record<string, unknown>;
  return {};
}

/** Get all unique group names in display order */
export const POLICY_TYPE_GROUPS: PolicyTypeGroup[] = [
  GROUP_TOURNAMENT_OPS,
  GROUP_SCORING,
  GROUP_RANKING_POINTS,
  GROUP_DRAW_CONFIG,
  GROUP_PARTICIPANTS,
  GROUP_DISPLAY_AUDIT
];
