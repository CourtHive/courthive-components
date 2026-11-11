import { ControlView, EditorView } from './view';
import { Edit, SegmentKey } from './types';
/** The set-row controls in display order. Descriptor and count belong to the match, not the final set. */
export declare const SET_CONTROLS: readonly ["descriptor", "bestOf", "advantage", "what", "setTo", "tiebreakTo", "tiebreakAt", "winBy", "minutes", "based", "modifier", "outs", "pointsTotal", "tieRule"];
export type SetControl = (typeof SET_CONTROLS)[number];
export declare const MATCH_ONLY: Set<"setTo" | "tiebreakAt" | "tiebreakTo" | "minutes" | "based" | "modifier" | "outs" | "pointsTotal" | "what" | "advantage" | "winBy" | "descriptor" | "bestOf" | "tieRule">;
/** A points total is the whole match, so its controls have no place in the final set. */
export declare const NOT_IN_FINAL_SET: Set<"setTo" | "tiebreakAt" | "tiebreakTo" | "minutes" | "based" | "modifier" | "outs" | "pointsTotal" | "what" | "advantage" | "winBy" | "descriptor" | "bestOf" | "tieRule">;
/** The segment a control belongs to: the main set, or (index 1) the final set. */
export declare const segmentOf: (index?: number) => SegmentKey;
/** The edit that choosing `value` from a control's dropdown dispatches. */
export declare function editForControl(view: EditorView, id: SetControl, segment: SegmentKey, value: any): Edit;
/** What a control reads and offers. */
export declare function controlView(view: EditorView, id: SetControl, segment: SegmentKey): ControlView;
