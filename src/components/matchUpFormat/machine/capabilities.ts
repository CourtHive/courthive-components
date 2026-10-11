// constants and types
import type { Capabilities, FormatState, ResolvedCapabilities, SegmentDraft } from './types';

/** Everything the picker offered before capabilities existed is on unless a consumer turns it off. */
export function resolveCapabilities(capabilities?: Capabilities): ResolvedCapabilities {
  const on = (value?: boolean) => value !== false;
  return {
    setTypes: {
      set: on(capabilities?.setTypes?.set),
      tiebreak: on(capabilities?.setTypes?.tiebreak),
      timed: on(capabilities?.setTypes?.timed),
      outs: on(capabilities?.setTypes?.outs),
      pointsTotal: on(capabilities?.setTypes?.pointsTotal)
    },
    matchRoots: on(capabilities?.matchRoots),
    exactly: on(capabilities?.exactly),
    aggregate: on(capabilities?.aggregate),
    gameFormat: on(capabilities?.gameFormat),
    finalSet: on(capabilities?.finalSet),
    setTiebreak: on(capabilities?.setTiebreak),
    maxMatchTime: on(capabilities?.maxMatchTime),
    scoringBasis: on(capabilities?.scoringBasis),
    modifiers: on(capabilities?.modifiers),
    catalog: on(capabilities?.catalog)
  };
}

export const SET_TYPE_CAPABILITY = {
  SET: 'set',
  TIEBREAK: 'tiebreak',
  TIMED: 'timed',
  OUTS: 'outs',
  POINTS_TOTAL: 'pointsTotal'
} as const;

function segmentReasons(segment: SegmentDraft, capabilities: ResolvedCapabilities): string[] {
  const reasons: string[] = [];
  if (!capabilities.setTypes[SET_TYPE_CAPABILITY[segment.type]])
    reasons.push(`setTypes.${SET_TYPE_CAPABILITY[segment.type]}`);
  const hasTiebreak =
    (segment.type === 'SET' && segment.tiebreak) || (segment.type === 'TIMED' && segment.timedTiebreak);
  if (hasTiebreak && !capabilities.setTiebreak) reasons.push('setTiebreak');
  if (segment.type === 'TIMED' && segment.based && !capabilities.scoringBasis) reasons.push('scoringBasis');
  const hasModifier =
    !!segment.modifier &&
    (segment.type === 'TIEBREAK' || segment.type === 'TIMED' || (segment.type === 'SET' && segment.tiebreak));
  if (hasModifier && !capabilities.modifiers) reasons.push('modifiers');
  return reasons;
}

/** The switched-off capabilities this format needs, each named once. Empty means it may be edited. */
export function capabilityReasons(format: FormatState, capabilities: ResolvedCapabilities): string[] {
  const reasons = segmentReasons(format.set, capabilities);
  if (format.finalSetEnabled) {
    if (!capabilities.finalSet) reasons.push('finalSet');
    reasons.push(...segmentReasons(format.finalSet, capabilities));
  }
  if (format.matchRoot !== 'SET' && !capabilities.matchRoots) reasons.push('matchRoots');
  if (format.countMode === 'EXACTLY' && !capabilities.exactly) reasons.push('exactly');
  if (format.aggregate && !capabilities.aggregate) reasons.push('aggregate');
  if (format.gameFormat && !capabilities.gameFormat) reasons.push('gameFormat');
  if (format.maxMinutes && !capabilities.maxMatchTime) reasons.push('maxMatchTime');
  return [...new Set(reasons)];
}
