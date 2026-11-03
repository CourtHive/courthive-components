import { Capabilities, CombinedPointsConfig, Codec, Edit, EditorState, FormatState } from './types';
/**
 * Whether the format may be scored as an aggregate. The factory refuses an aggregate of standard sets for
 * a new format (CA 2026-10-18, scoring engine spec § 9.3 rule 5): an aggregate sums segments whose scores
 * are units — timed, tiebreak-only and outs segments — and a standard set's games are not. Every segment
 * is summed except an "Exactly" aggregate's final set, which is the decider played after the N.
 */
export declare function aggregateAllowed(format: FormatState): boolean;
/** A final set's tiebreak targets outside "Exactly" mode; "Exactly" also offers 1 and 3. */
export declare const DEFAULT_TIEBREAK_TO_OPTIONS: number[];
export interface EditContext {
    codec: Codec;
    capabilities?: Capabilities;
    /** The tiebreak targets offered outside "Exactly" mode (the picker's configured options). */
    tiebreakToOptions?: number[];
    /** A policy's permitted points totals and tie rules (Phase 3). */
    combinedPoints?: CombinedPointsConfig;
}
/**
 * The picker's single transition function. Pure: it returns a new state and never touches the one it
 * was given. A read-only state accepts only a new code (choosing another format replaces it whole).
 */
export declare function applyEdit(state: EditorState, edit: Edit, context: EditContext): EditorState;
