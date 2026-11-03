import { Capabilities, Codec, EditorState, FormatState, SegmentDraft } from './types';
export declare const DEFAULT_FORMAT = "SET3-S:6/TB7";
export declare function defaultSegment(): SegmentDraft;
/** The parsed shape the factory's stringify reads, built from a segment of the state. */
export declare function segmentToParsed(segment: SegmentDraft): any;
export declare function formatFromParsed(parsed: any): FormatState;
export declare function formatToParsed(written: FormatState): any;
export declare function toCode(format: FormatState, codec: Codec): string;
/**
 * The picker's starting state for a code.
 *
 * The code is editable only if the state rebuilds it exactly: compared canonically, so a redundant
 * spelling (`@6` on a set to 6) still counts as representable. Anything else (a set type, a field or
 * a modifier the state has no place for) makes it read-only, so it is returned untouched rather than
 * rebuilt without the parts the controls cannot hold. A code that does not parse falls back to the
 * default format, which is then what Select returns, as the picker always has.
 */
export declare function fromCode(code: string, codec: Codec, capabilities?: Capabilities): EditorState;
/** What Select returns: the original code until something is edited, the rebuilt code after. */
export declare function selectedCode(state: EditorState, codec: Codec): string;
