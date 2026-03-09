/**
 * Test data for Schedule Grid Cell stories.
 *
 * Covers: singles with seeds, doubles pairs, team matchUps, BYEs,
 * walkovers, completed/in-progress/abandoned, potential participants,
 * blocked cells, and conflict states.
 */

import type { ScheduleCellData } from '../../components/schedule-page';
import { mocksEngine, genderConstants, matchUpStatusConstants, fixtures } from 'tods-competition-factory';

const { FORMAT_STANDARD, FORMAT_ATP_DOUBLES } = fixtures.matchUpFormats;

const { MALE, FEMALE } = genderConstants;
const { COMPLETED, IN_PROGRESS, TO_BE_PLAYED, WALKOVER, RETIRED, DEFAULTED, ABANDONED, DOUBLE_WALKOVER, BYE } = matchUpStatusConstants;

// ============================================================================
// Generated Names
// ============================================================================

const { participants: males } = mocksEngine.generateParticipants({ participantsCount: 12, sex: MALE });
const { participants: females } = mocksEngine.generateParticipants({ participantsCount: 12, sex: FEMALE });
const M = males.map((p) => p.participantName);
const F = females.map((p) => p.participantName);

const MENS_SINGLES = "Men's Singles";
const WOMENS_SINGLES = "Women's Singles";
const DAVIS_CUP_SF = 'Davis Cup SF';

// ============================================================================
// Singles — Seeded, various statuses
// ============================================================================

/** Completed singles with seeds, score, winner */
export const SINGLES_COMPLETED: ScheduleCellData = {
  matchUpId: 'cell-s01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'QF',
  matchUpFormat: FORMAT_STANDARD,
  matchUpType: 'SINGLES',
  matchUpStatus: COMPLETED,
  winningSide: 1,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, ranking: 3, nationality: 'ESP' },
    { sideNumber: 2, participantName: M[1], participantId: 'P02', seedNumber: 5, ranking: 18, nationality: 'SRB' },
  ],
  schedule: { scheduledTime: '14:00', courtId: 'C1', courtOrder: 1 },
  score: { scoreStringSide1: '6-4 3-6 7-5', scoreStringSide2: '4-6 6-3 5-7' },
};

/** In-progress singles with seeds */
export const SINGLES_IN_PROGRESS: ScheduleCellData = {
  matchUpId: 'cell-s02',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'SF',
  matchUpFormat: FORMAT_STANDARD,
  matchUpType: 'SINGLES',
  matchUpStatus: IN_PROGRESS,
  sides: [
    { sideNumber: 1, participantName: M[2], participantId: 'P03', seedNumber: 3, ranking: 7, nationality: 'GBR' },
    { sideNumber: 2, participantName: M[3], participantId: 'P04', seedNumber: 2, ranking: 5, nationality: 'RUS' },
  ],
  schedule: { scheduledTime: '16:00', timeModifiers: ['NB'], courtId: 'C1', courtOrder: 3 },
  score: { scoreStringSide1: '6-3 4-5', scoreStringSide2: '3-6 5-4' },
};

/** To-be-played singles — no score yet */
export const SINGLES_TO_BE_PLAYED: ScheduleCellData = {
  matchUpId: 'cell-s03',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'R32',
  matchUpFormat: FORMAT_STANDARD,
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: F[0], participantId: 'PF01', seedNumber: 1, ranking: 1, nationality: 'POL' },
    { sideNumber: 2, participantName: F[1], participantId: 'PF02', nationality: 'USA' },
  ],
  schedule: { scheduledTime: '10:00', courtId: 'C2', courtOrder: 1 },
};

/** Walkover */
export const SINGLES_WALKOVER: ScheduleCellData = {
  matchUpId: 'cell-s04',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R16',
  matchUpType: 'SINGLES',
  matchUpStatus: WALKOVER,
  winningSide: 1,
  sides: [
    { sideNumber: 1, participantName: M[4], participantId: 'P05', seedNumber: 4, nationality: 'FRA' },
    { sideNumber: 2, participantName: M[5], participantId: 'P06', nationality: 'GER' },
  ],
  schedule: { scheduledTime: '11:00', courtId: 'C3', courtOrder: 2 },
};

/** Retired */
export const SINGLES_RETIRED: ScheduleCellData = {
  matchUpId: 'cell-s05',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'R16',
  matchUpType: 'SINGLES',
  matchUpStatus: RETIRED,
  winningSide: 2,
  sides: [
    { sideNumber: 1, participantName: F[2], participantId: 'PF03', seedNumber: 7, nationality: 'AUS' },
    { sideNumber: 2, participantName: F[3], participantId: 'PF04', seedNumber: 3, nationality: 'JPN' },
  ],
  schedule: { scheduledTime: '13:00', courtId: 'C4', courtOrder: 1 },
  score: { scoreStringSide1: '4-6 2-1 RET.', scoreStringSide2: '6-4 1-2 RET.' },
};

/** Defaulted */
export const SINGLES_DEFAULTED: ScheduleCellData = {
  matchUpId: 'cell-s06',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R32',
  matchUpType: 'SINGLES',
  matchUpStatus: DEFAULTED,
  winningSide: 2,
  sides: [
    { sideNumber: 1, participantName: M[6], participantId: 'P07', nationality: 'ITA' },
    { sideNumber: 2, participantName: M[7], participantId: 'P08', seedNumber: 8, nationality: 'CAN' },
  ],
  schedule: { scheduledTime: '09:00', courtId: 'C5', courtOrder: 1 },
};

/** Abandoned */
export const SINGLES_ABANDONED: ScheduleCellData = {
  matchUpId: 'cell-s07',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'QF',
  matchUpType: 'SINGLES',
  matchUpStatus: ABANDONED,
  sides: [
    { sideNumber: 1, participantName: F[4], participantId: 'PF05', seedNumber: 2, nationality: 'CZE' },
    { sideNumber: 2, participantName: F[5], participantId: 'PF06', nationality: 'BEL' },
  ],
  schedule: { scheduledTime: '15:00', courtId: 'C1', courtOrder: 4 },
  score: { scoreStringSide1: '6-4 3-4', scoreStringSide2: '4-6 4-3' },
};

/** Double walkover */
export const SINGLES_DOUBLE_WALKOVER: ScheduleCellData = {
  matchUpId: 'cell-s08',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R32',
  matchUpType: 'SINGLES',
  matchUpStatus: DOUBLE_WALKOVER,
  sides: [
    { sideNumber: 1, participantName: M[8], participantId: 'P09' },
    { sideNumber: 2, participantName: M[9], participantId: 'P10' },
  ],
};

// ============================================================================
// BYE
// ============================================================================

/** BYE — one side present, other is a bye */
export const BYE_MATCHUP: ScheduleCellData = {
  matchUpId: 'cell-bye1',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R64',
  matchUpType: 'SINGLES',
  matchUpStatus: BYE,
  winningSide: 1,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, nationality: 'ESP' },
  ],
};

/** BYE with explicit bye side (factory shape) */
export const BYE_EXPLICIT: ScheduleCellData = {
  matchUpId: 'cell-bye2',
  drawId: 'D2',
  eventName: WOMENS_SINGLES,
  roundName: 'R64',
  matchUpType: 'SINGLES',
  matchUpStatus: BYE,
  winningSide: 1,
  sides: [
    { sideNumber: 1, participantName: F[0], participantId: 'PF01', seedNumber: 1, nationality: 'POL' },
    { sideNumber: 2, bye: true },
  ],
};

/** BYE with team member */
export const BYE_TEAM_MEMBER: ScheduleCellData = {
  matchUpId: 'cell-bye3',
  drawId: 'D4',
  eventName: 'Davis Cup QF',
  roundName: 'Singles 1',
  matchUpType: 'SINGLES',
  matchUpStatus: BYE,
  winningSide: 1,
  sides: [
    { sideNumber: 1, participantName: M[2], participantId: 'P03', seedNumber: 3, nationality: 'GBR', teamName: 'Great Britain' },
  ],
};

// ============================================================================
// Doubles
// ============================================================================

/** Doubles completed */
export const DOUBLES_COMPLETED: ScheduleCellData = {
  matchUpId: 'cell-d01',
  drawId: 'D3',
  eventName: "Men's Doubles",
  roundName: 'QF',
  matchUpFormat: FORMAT_ATP_DOUBLES,
  matchUpType: 'DOUBLES',
  matchUpStatus: COMPLETED,
  winningSide: 2,
  sides: [
    { sideNumber: 1, participantName: `${M[0]} / ${M[1]}`, participantId: 'DP01', seedNumber: 1 },
    { sideNumber: 2, participantName: `${M[2]} / ${M[3]}`, participantId: 'DP02', seedNumber: 4 },
  ],
  schedule: { scheduledTime: '12:00', courtId: 'C2', courtOrder: 3 },
  score: { scoreStringSide1: '4-6 6-3 8-10', scoreStringSide2: '6-4 3-6 10-8' },
};

/** Doubles to be played */
export const DOUBLES_TO_BE_PLAYED: ScheduleCellData = {
  matchUpId: 'cell-d02',
  drawId: 'D3',
  eventName: "Women's Doubles",
  roundName: 'SF',
  matchUpFormat: FORMAT_ATP_DOUBLES,
  matchUpType: 'DOUBLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: `${F[0]} / ${F[1]}`, participantId: 'DPF01', seedNumber: 1 },
    { sideNumber: 2, participantName: `${F[2]} / ${F[3]}`, participantId: 'DPF02', seedNumber: 2 },
  ],
  schedule: { scheduledTime: '15:00', courtId: 'C3', courtOrder: 4 },
};

// ============================================================================
// Team Member MatchUps (individual matchUps within a tie/team event)
// ============================================================================

/** Singles within a tie — completed, players show their team */
export const TIE_SINGLES_COMPLETED: ScheduleCellData = {
  matchUpId: 'cell-t01',
  drawId: 'D4',
  eventName: DAVIS_CUP_SF,
  roundName: 'Singles 1',
  matchUpFormat: FORMAT_STANDARD,
  matchUpType: 'SINGLES',
  matchUpStatus: COMPLETED,
  winningSide: 1,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, nationality: 'ESP', teamName: 'Spain' },
    { sideNumber: 2, participantName: M[4], participantId: 'P05', nationality: 'FRA', teamName: 'France' },
  ],
  schedule: { scheduledTime: '10:00', courtId: 'C1', courtOrder: 1 },
  score: { scoreStringSide1: '6-4 6-3', scoreStringSide2: '4-6 3-6' },
};

/** Singles within a tie — in progress */
export const TIE_SINGLES_IN_PROGRESS: ScheduleCellData = {
  matchUpId: 'cell-t02',
  drawId: 'D4',
  eventName: DAVIS_CUP_SF,
  roundName: 'Singles 2',
  matchUpFormat: FORMAT_STANDARD,
  matchUpType: 'SINGLES',
  matchUpStatus: IN_PROGRESS,
  sides: [
    { sideNumber: 1, participantName: M[2], participantId: 'P03', seedNumber: 3, nationality: 'GBR', teamName: 'Great Britain' },
    { sideNumber: 2, participantName: M[6], participantId: 'P07', nationality: 'AUS', teamName: 'Australia' },
  ],
  schedule: { scheduledTime: '14:00', timeModifiers: ['NB'], courtId: 'C1', courtOrder: 3 },
  score: { scoreStringSide1: '6-3 4-5', scoreStringSide2: '3-6 5-4' },
};

/** Doubles within a tie — to be played */
export const TIE_DOUBLES_TO_BE_PLAYED: ScheduleCellData = {
  matchUpId: 'cell-t03',
  drawId: 'D4',
  eventName: DAVIS_CUP_SF,
  roundName: 'Doubles',
  matchUpFormat: FORMAT_ATP_DOUBLES,
  matchUpType: 'DOUBLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: `${M[0]} / ${M[1]}`, participantId: 'DP-ESP', teamName: 'Spain' },
    { sideNumber: 2, participantName: `${M[4]} / ${M[5]}`, participantId: 'DP-FRA', teamName: 'France' },
  ],
  schedule: { scheduledTime: '16:00', courtId: 'C1', courtOrder: 5 },
};

// ============================================================================
// Potential Participants (TBD)
// ============================================================================

/** MatchUp with potential (unresolved) participants */
export const POTENTIAL_PARTICIPANTS: ScheduleCellData = {
  matchUpId: 'cell-pot01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'SF',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [],
  potentialParticipants: [
    [{ participantName: M[0] }, { participantName: M[2] }],
    [{ participantName: M[4] }, { participantName: M[6] }],
  ],
  schedule: { scheduledTime: '16:00', courtId: 'C1', courtOrder: 5 },
};

/** Partially resolved — one side known, other TBD */
export const PARTIAL_POTENTIAL: ScheduleCellData = {
  matchUpId: 'cell-pot02',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'Final',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: F[0], participantId: 'PF01', seedNumber: 1, nationality: 'POL' },
  ],
  potentialParticipants: [
    [],
    [{ participantName: F[2] }, { participantName: F[4] }],
  ],
  schedule: { scheduledTime: '18:00', courtId: 'C1', courtOrder: 7 },
};

// ============================================================================
// Conflict States
// ============================================================================

/** Schedule conflict — double booked participant */
export const CONFLICT_DOUBLE_BOOKING: ScheduleCellData = {
  matchUpId: 'cell-conf01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R16',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, nationality: 'ESP' },
    { sideNumber: 2, participantName: M[10], participantId: 'P11' },
  ],
  schedule: { scheduledTime: '14:00', courtId: 'C3', courtOrder: 1 },
  scheduleState: 'SCHEDULE_CONFLICT',
  issueType: 'DOUBLE_BOOKING',
  issueIds: ['cell-conf02'],
};

/** The conflicting matchUp */
export const CONFLICT_OTHER: ScheduleCellData = {
  matchUpId: 'cell-conf02',
  drawId: 'D3',
  eventName: "Men's Doubles",
  roundName: 'R16',
  matchUpType: 'DOUBLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: `${M[0]} / ${M[3]}`, participantId: 'DP03', seedNumber: 2 },
    { sideNumber: 2, participantName: `${M[8]} / ${M[9]}`, participantId: 'DP04' },
  ],
  schedule: { scheduledTime: '14:00', courtId: 'C5', courtOrder: 1 },
  scheduleState: 'SCHEDULE_CONFLICT',
  issueType: 'DOUBLE_BOOKING',
  issueIds: ['cell-conf01'],
};

/** Schedule warning */
export const CONFLICT_WARNING: ScheduleCellData = {
  matchUpId: 'cell-warn01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R32',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[2], participantId: 'P03', seedNumber: 3, nationality: 'GBR' },
    { sideNumber: 2, participantName: M[11], participantId: 'P12' },
  ],
  schedule: { scheduledTime: '09:00', courtId: 'C1', courtOrder: 1 },
  scheduleState: 'SCHEDULE_WARNING',
};

/** Schedule error */
export const CONFLICT_ERROR: ScheduleCellData = {
  matchUpId: 'cell-err01',
  drawId: 'D2',
  eventName: WOMENS_SINGLES,
  roundName: 'R32',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: F[6], participantId: 'PF07', nationality: 'SWE' },
    { sideNumber: 2, participantName: F[7], participantId: 'PF08', seedNumber: 6, nationality: 'NED' },
  ],
  schedule: { scheduledTime: '11:00', courtId: 'C2', courtOrder: 2 },
  scheduleState: 'SCHEDULE_ERROR',
};

/** Schedule issue (e.g. insufficient recovery time) */
export const CONFLICT_ISSUE: ScheduleCellData = {
  matchUpId: 'cell-iss01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R16',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[4], participantId: 'P05', seedNumber: 4, nationality: 'FRA' },
    { sideNumber: 2, participantName: M[8], participantId: 'P09' },
  ],
  schedule: { scheduledTime: '12:00', courtId: 'C4', courtOrder: 1 },
  scheduleState: 'SCHEDULE_ISSUE',
};

// ============================================================================
// With Umpire
// ============================================================================

export const WITH_UMPIRE: ScheduleCellData = {
  matchUpId: 'cell-ump01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'Final',
  matchUpFormat: 'SET5-S:6/TB7',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, ranking: 3, nationality: 'ESP' },
    { sideNumber: 2, participantName: M[2], participantId: 'P03', seedNumber: 3, ranking: 7, nationality: 'GBR' },
  ],
  schedule: { scheduledTime: '14:00', timeModifiers: ['NB'], courtId: 'C1', courtOrder: 1 },
  umpire: 'Carlos Bernardes',
};

// ============================================================================
// Time Modifier Variants
// ============================================================================

/** Not Before — NB prefix before the time */
export const NB_SINGLES: ScheduleCellData = {
  matchUpId: 'cell-nb01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'QF',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, nationality: 'ESP' },
    { sideNumber: 2, participantName: M[1], participantId: 'P02', seedNumber: 5, nationality: 'SRB' },
  ],
  schedule: { scheduledTime: '14:00', timeModifiers: ['NB'], courtId: 'C1', courtOrder: 2 },
};

/** Not Before + Next Available — NB NA (e.g. not before 2pm, next available court) */
export const NB_NEXT_AVAILABLE: ScheduleCellData = {
  matchUpId: 'cell-nb02',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'SF',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[2], participantId: 'P03', seedNumber: 3, nationality: 'GBR' },
    { sideNumber: 2, participantName: M[3], participantId: 'P04', seedNumber: 2, nationality: 'RUS' },
  ],
  schedule: { scheduledTime: '16:00', timeModifiers: ['NB', 'NA'], courtId: 'C1', courtOrder: 3 },
};

/** Not Before + After Rest — NB AR (not before time, after required rest period) */
export const NB_AFTER_REST: ScheduleCellData = {
  matchUpId: 'cell-nb03',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'QF',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: F[0], participantId: 'PF01', seedNumber: 1, nationality: 'POL' },
    { sideNumber: 2, participantName: F[1], participantId: 'PF02', nationality: 'USA' },
  ],
  schedule: { scheduledTime: '15:00', timeModifiers: ['NB', 'AR'], courtId: 'C2', courtOrder: 4 },
};

/** Next Available only (no specific time) */
export const NEXT_AVAILABLE_ONLY: ScheduleCellData = {
  matchUpId: 'cell-na01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R16',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[4], participantId: 'P05', seedNumber: 4, nationality: 'FRA' },
    { sideNumber: 2, participantName: M[5], participantId: 'P06', nationality: 'GER' },
  ],
  schedule: { timeModifiers: ['NA'], courtId: 'C3' },
};

/** After Rest only (no specific time) */
export const AFTER_REST_ONLY: ScheduleCellData = {
  matchUpId: 'cell-ar01',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'R16',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: F[2], participantId: 'PF03', seedNumber: 7, nationality: 'AUS' },
    { sideNumber: 2, participantName: F[3], participantId: 'PF04', seedNumber: 3, nationality: 'JPN' },
  ],
  schedule: { timeModifiers: ['AR'], courtId: 'C4' },
};

/** Followed By — FB (this matchUp follows previous on same court) */
export const FOLLOWED_BY_ONLY: ScheduleCellData = {
  matchUpId: 'cell-fb01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'R32',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[6], participantId: 'P07', nationality: 'ITA' },
    { sideNumber: 2, participantName: M[7], participantId: 'P08', seedNumber: 8, nationality: 'CAN' },
  ],
  schedule: { timeModifiers: ['FB'], courtId: 'C1' },
};

/** To Be Announced — TBA (time not yet determined) */
export const TBA_ONLY: ScheduleCellData = {
  matchUpId: 'cell-tba01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'Final',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, nationality: 'ESP' },
    { sideNumber: 2, participantName: M[2], participantId: 'P03', seedNumber: 3, nationality: 'GBR' },
  ],
  schedule: { timeModifiers: ['TBA'], courtId: 'C1' },
};

/** Court TBA — time known but court not yet assigned */
export const COURT_TBA: ScheduleCellData = {
  matchUpId: 'cell-ctba01',
  drawId: 'D1',
  eventName: MENS_SINGLES,
  roundName: 'SF',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: M[0], participantId: 'P01', seedNumber: 1, nationality: 'ESP' },
    { sideNumber: 2, participantName: M[3], participantId: 'P04', seedNumber: 2, nationality: 'RUS' },
  ],
  schedule: { scheduledTime: '14:00', courtAnnotation: 'Court TBA' },
};

/** Court TBA with NB — not before time, court not yet assigned */
export const NB_COURT_TBA: ScheduleCellData = {
  matchUpId: 'cell-ctba02',
  drawId: 'D1',
  eventName: WOMENS_SINGLES,
  roundName: 'Final',
  matchUpType: 'SINGLES',
  matchUpStatus: TO_BE_PLAYED,
  sides: [
    { sideNumber: 1, participantName: F[0], participantId: 'PF01', seedNumber: 1, nationality: 'POL' },
    { sideNumber: 2, participantName: F[2], participantId: 'PF03', seedNumber: 7, nationality: 'AUS' },
  ],
  schedule: { scheduledTime: '16:00', timeModifiers: ['NB'], courtAnnotation: 'Court TBA' },
};

/** All time modifier examples */
export const ALL_TIME_MODIFIERS: ScheduleCellData[] = [
  NB_SINGLES,
  NB_NEXT_AVAILABLE,
  NB_AFTER_REST,
  NEXT_AVAILABLE_ONLY,
  AFTER_REST_ONLY,
  FOLLOWED_BY_ONLY,
  TBA_ONLY,
  COURT_TBA,
  NB_COURT_TBA,
];

// ============================================================================
// Blocked Cells
// ============================================================================

export const BLOCKED_MAINTENANCE: ScheduleCellData = {
  matchUpId: '',
  isBlocked: true,
  booking: { bookingType: 'MAINTENANCE', rowCount: 3, notes: 'Court resurfacing' },
};

export const BLOCKED_PRACTICE: ScheduleCellData = {
  matchUpId: '',
  isBlocked: true,
  booking: { bookingType: 'PRACTICE', rowCount: 2, notes: 'Junior training session' },
};

export const BLOCKED_GENERIC: ScheduleCellData = {
  matchUpId: '',
  isBlocked: true,
  booking: { bookingType: 'BLOCKED', rowCount: 1 },
};

// ============================================================================
// Empty Cell
// ============================================================================

export const EMPTY_CELL: ScheduleCellData = {
  matchUpId: '',
};

// ============================================================================
// Collections for stories
// ============================================================================

/** All status variants in one array */
export const ALL_STATUSES: ScheduleCellData[] = [
  SINGLES_TO_BE_PLAYED,
  SINGLES_IN_PROGRESS,
  SINGLES_COMPLETED,
  SINGLES_WALKOVER,
  SINGLES_RETIRED,
  SINGLES_DEFAULTED,
  SINGLES_ABANDONED,
  SINGLES_DOUBLE_WALKOVER,
];

/** BYE matchUps */
export const ALL_BYES: ScheduleCellData[] = [
  BYE_MATCHUP,
  BYE_EXPLICIT,
  BYE_TEAM_MEMBER,
];

/** Team member matchUps (individual matchUps within a tie) */
export const ALL_TEAMS: ScheduleCellData[] = [
  TIE_SINGLES_COMPLETED,
  TIE_SINGLES_IN_PROGRESS,
  TIE_DOUBLES_TO_BE_PLAYED,
];

/** Doubles matchUps */
export const ALL_DOUBLES: ScheduleCellData[] = [
  DOUBLES_COMPLETED,
  DOUBLES_TO_BE_PLAYED,
];

/** Conflict cells */
export const ALL_CONFLICTS: ScheduleCellData[] = [
  CONFLICT_DOUBLE_BOOKING,
  CONFLICT_OTHER,
  CONFLICT_WARNING,
  CONFLICT_ERROR,
  CONFLICT_ISSUE,
];

/** Blocked cells */
export const ALL_BLOCKED: ScheduleCellData[] = [
  BLOCKED_MAINTENANCE,
  BLOCKED_PRACTICE,
  BLOCKED_GENERIC,
];
