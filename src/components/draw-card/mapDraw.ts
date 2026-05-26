/**
 * Draw Card — Data Mapper
 *
 * Pure function: TODS drawDefinition → flat DrawCardData.
 * Caller decides whether to walk matchUps (`lightMode: true` skips it).
 */

import { DrawCardData, DrawMatchUpCounts, DrawStatusPill } from './types';

const DRAW_TYPE_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ELIMINATION: 'Elimination',
  ROUND_ROBIN: 'Round Robin',
  ROUND_ROBIN_WITH_PLAYOFF: 'Round Robin + Playoff',
  COMPASS: 'Compass',
  FEED_IN_CHAMPIONSHIP: 'Feed-In Championship',
  FIRST_MATCH_LOSER_CONSOLATION: 'First Match Loser Consolation',
  FIRST_ROUND_LOSER_CONSOLATION: 'First Round Loser Consolation',
  PLAY_OFF: 'Play-Off',
  CURTIS_CONSOLATION: 'Curtis Consolation',
  AD_HOC: 'Ad-Hoc',
  OLYMPIC: 'Olympic',
  LUCKY_DRAW: 'Lucky Draw',
  STAGGERED_ENTRY: 'Staggered Entry'
};

function labelForDrawType(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (DRAW_TYPE_LABELS[code]) return DRAW_TYPE_LABELS[code];
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function walkDrawMatchUps(drawDefinition: any): DrawMatchUpCounts {
  let total = 0;
  let completed = 0;
  let scheduled = 0;
  let inProgress = 0;
  for (const structure of drawDefinition?.structures ?? []) {
    for (const matchUp of structure?.matchUps ?? []) {
      total += 1;
      if (matchUp?.winningSide || matchUp?.matchUpStatus === 'BYE') completed += 1;
      else if (matchUp?.schedule?.scheduledTime) scheduled += 1;
      if (matchUp?.matchUpStatus === 'IN_PROGRESS') inProgress += 1;
    }
  }
  return { total, completed, scheduled, inProgress };
}

function resolveDrawSize(drawDefinition: any): number | undefined {
  const fromTop = drawDefinition?.drawSize;
  if (typeof fromTop === 'number') return fromTop;
  const main = drawDefinition?.structures?.find((s: any) => s?.stage === 'MAIN');
  const positions = main?.positionAssignments?.length;
  return typeof positions === 'number' ? positions : undefined;
}

function resolveStatus(input: {
  generated: boolean;
  cancelled: boolean;
  matchUpCounts?: DrawMatchUpCounts;
}): DrawStatusPill {
  if (input.cancelled) return { kind: 'cancelled', label: 'Cancelled' };
  if (!input.generated) return { kind: 'ungenerated', label: 'Not generated' };
  const c = input.matchUpCounts;
  if (!c || c.total === 0) return { kind: 'ready', label: 'Ready' };
  if (c.completed === c.total) return { kind: 'completed', label: 'Completed' };
  if (c.inProgress > 0 || c.completed > 0) return { kind: 'in-progress', label: 'In progress' };
  return { kind: 'ready', label: 'Ready' };
}

export interface MapDrawOptions {
  lightMode?: boolean;
  matchUpStats?: DrawMatchUpCounts;
  /** Pre-computed averages (consumer might fetch via factory.getRatingsStats). */
  utrAvg?: number;
  wtnAvg?: number;
  /** Pre-resolved publish flags from publishingGovernor. */
  published?: boolean;
  embargoActive?: boolean;
  /** Pre-resolved entry count (consumer often has this via getAssignedParticipantIds). */
  entryCount?: number;
  /** Back-reference for click handlers. */
  eventId?: string;
  /** Override the resolved status. */
  statusOverride?: DrawStatusPill | null;
}

export function mapDrawDefinitionToCardData(drawDefinition: any, options?: MapDrawOptions): DrawCardData {
  const generated = Array.isArray(drawDefinition?.structures) && drawDefinition.structures.length > 0;
  const matchUpCounts =
    options?.matchUpStats ??
    (options?.lightMode || !generated ? undefined : walkDrawMatchUps(drawDefinition));

  const cancelled = drawDefinition?.drawStatus === 'CANCELLED';
  const status =
    options?.statusOverride !== undefined
      ? options.statusOverride
      : resolveStatus({ generated, cancelled, matchUpCounts });

  return {
    drawId: drawDefinition?.drawId ?? '',
    drawName: drawDefinition?.drawName ?? '',
    drawType: drawDefinition?.drawType,
    drawTypeLabel: labelForDrawType(drawDefinition?.drawType),
    drawSize: resolveDrawSize(drawDefinition),
    entryCount: options?.entryCount,
    matchUpFormat: drawDefinition?.matchUpFormat,
    flightNumber: drawDefinition?.flightNumber,
    matchUpCounts,
    generated,
    published: options?.published,
    embargoActive: options?.embargoActive,
    utrAvg: options?.utrAvg,
    wtnAvg: options?.wtnAvg,
    status,
    eventId: options?.eventId
  };
}
