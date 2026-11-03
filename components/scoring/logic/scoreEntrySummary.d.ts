import { ScoreEntryResolution } from './scoreEntryState';
export type ResultTone = 'good' | 'warn' | 'neutral';
export type ResultBand = {
    tone: ResultTone;
    /** The main sentence. Always present — a band with no headline would be a band with no purpose. */
    headline: string;
    /** The quieter right-hand note: what happens next, or what was recorded. */
    detail?: string;
};
export type SummaryParams = {
    resolution: ScoreEntryResolution;
    /** Side 1's name first. */
    sideNames: [string, string];
    /** The score as it currently stands, already formatted (e.g. `'6-4 2-1'`). */
    scoreString?: string;
    /** Whether that score is a finished result — the score region's judgement, not this module's. */
    scoreComplete?: boolean;
    /** The winner a complete score implies, when no ending overrides it. */
    scoreWinningSide?: 1 | 2;
    /** Display labels for endings, so a locale can supply them. Defaults to English. */
    labels?: Record<string, string>;
    /** The chosen reason code's display form, e.g. `'Wo [inj]'`. */
    reasonDisplay?: string;
    /** What the winner advances to, e.g. `'the quarter-final'`. Omitted when unknown. */
    advancesTo?: string;
};
/** The band for the current state of the card. */
export declare function scoreEntrySummary(params: SummaryParams): ResultBand;
