import { SavedComposition } from './compositionEditorTypes';
import { Composition } from '../../types';
/** Capture the complete persistent display state, leaving runtime callbacks and assignment inputs behind. */
export declare function compositionSnapshot(value: Composition & {
    compositionName: string;
}): SavedComposition;
