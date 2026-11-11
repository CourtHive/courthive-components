import { parseScore } from '../../../tools/freeScore/freeScore';
import { ScoreEntryModel } from './scoreEntryModel';
export type FreeScoreNoteTone = 'idle' | 'good' | 'error';
export type FreeScoreNoteParams = {
    /** What is in the field. */
    text: string;
    /** `parseScore` of that text under the model's format; omitted when the field is blank. */
    result?: ReturnType<typeof parseScore>;
    /** The model the parsed sets were committed to. */
    model: ScoreEntryModel;
    disabledMatchUpStatuses?: string[];
    statusScopeLabels?: Record<string, string>;
    labels?: Record<string, string | undefined>;
};
export declare function freeScoreNote(params: FreeScoreNoteParams): {
    tone: FreeScoreNoteTone;
    text: string;
};
