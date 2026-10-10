// constants and types
import type { Capabilities, FormatState, ResolvedCapabilities, SegmentDraft } from './types';

/** Everything the picker offered before capabilities existed is on unless a consumer turns it off. */
export function resolveCapabilities(capabilities?: Capabilities): ResolvedCapabilities {
  const on = (value?: boolean) => value !== false;
  return {
    setTypes: {
      set: on(capabilities?.setTypes?.set),
      tiebreak: on(capabilities?.setTypes?.tiebreak),
      timed: on(capabilities?.setTypes?.timed)
    },
    matchRoots: on(capabilities?.matchRoots),
    exactly: on(capabilities?.exactly),
    aggregate: on(capabilities?.aggregate),
    gameFormat: on(capabilities?.gameFormat),
    finalSet: on(capabilities?.finalSet),
    setTiebreak: on(capabilities?.setTiebreak),
    scoringBasis: on(capabilities?.scoringBasis),
    modifiers: on(capabilities?.modifiers),
    catalog: on(capabilities?.catalog)
  };
}

const SET_TYPE_CAPABILITY = { SET: 'set', TIEBREAK: 'tiebreak', TIMED: 'timed' } as const;

function segmentReasons(segment: SegmentDraft, capabilities: ResolvedCapabilities): string[] {
  const reasons: string[] = [];
  if (!capabilities.setTypes[SET_TYPE_CAPABILITY[segment.type]])
    reasons.push(`setTypes.${SET_TYPE_CAPABILITY[segment.type]}`);
  if (segment.type === 'SET' && segment.tiebreak && !capabilities.setTiebreak) reasons.push('setTiebreak');
  if (segment.type === 'TIMED' && segment.based && !capabilities.scoringBasis) reasons.push('scoringBasis');
  const hasModifier = !!segment.modifier && (segment.type !== 'SET' || segment.tiebreak);
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
  return [...new Set(reasons)];
}
