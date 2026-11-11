/**
 * The picker's set-row controls: which exist, in what order, and which edit and which part of the view
 * each one stands for. Moved out of `matchUpFormat.ts` unchanged; the renderer draws a button per
 * control and asks these two functions what it reads and what choosing an option does.
 */
// constants and types
import type { ControlView, EditorView, SegmentView } from './view';
import type { Edit, SegmentField, SegmentKey } from './types';

/** The set-row controls in display order. Descriptor and count belong to the match, not the final set. */
export const SET_CONTROLS = [
  'descriptor',
  'bestOf',
  'advantage',
  'what',
  'setTo',
  'tiebreakTo',
  'tiebreakAt',
  'winBy',
  'minutes',
  'based',
  'modifier',
  'outs',
  'pointsTotal',
  'tieRule'
] as const;
export type SetControl = (typeof SET_CONTROLS)[number];
export const MATCH_ONLY = new Set<SetControl>(['descriptor', 'bestOf']);
/** A points total is the whole match, so its controls have no place in the final set. */
export const NOT_IN_FINAL_SET = new Set<SetControl>([...MATCH_ONLY, 'pointsTotal', 'tieRule']);
const SEGMENT_FIELDS: Partial<Record<SetControl, SegmentField>> = {
  setTo: 'setTo',
  tiebreakTo: 'tiebreakTo',
  tiebreakAt: 'tiebreakAt',
  minutes: 'minutes',
  based: 'based',
  modifier: 'modifier',
  outs: 'outs',
  advantage: 'noAd',
  pointsTotal: 'combinedPointTotal',
  tieRule: 'tieMargin'
};

/** The segment a control belongs to: the main set, or (index 1) the final set. */
export const segmentOf = (index?: number): SegmentKey => (index ? 'finalSet' : 'set');

const segmentView = (view: EditorView, segment: SegmentKey): SegmentView =>
  segment === 'set' ? view.set : view.finalSet;

/** The edit that choosing `value` from a control's dropdown dispatches. */
export function editForControl(view: EditorView, id: SetControl, segment: SegmentKey, value: any): Edit {
  if (id === 'descriptor') return { type: 'setCountMode', mode: value };
  if (id === 'bestOf') return { type: 'setCount', count: value };
  if (id === 'what') return { type: 'setSetType', segment, setType: value };
  if (id === 'winBy') return { type: 'setSegmentValue', segment, field: segmentView(view, segment).winBy.field, value };
  return { type: 'setSegmentValue', segment, field: SEGMENT_FIELDS[id], value };
}

/** What a control reads and offers. */
export function controlView(view: EditorView, id: SetControl, segment: SegmentKey): ControlView {
  if (id === 'descriptor') return view.descriptor;
  if (id === 'bestOf') return view.count;
  return segmentView(view, segment)[id];
}
