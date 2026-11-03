import { Capabilities, Codec, CombinedPointsConfig, EditorState, GameFormat, SegmentField, SetType } from './types';
/**
 * Everything the picker shows, derived from the state. The modal renders this and decides nothing
 * itself: which controls are visible, what each one reads, and what each dropdown offers.
 */
export interface Option {
    value: any;
    text: string;
}
export interface ControlView {
    visible: boolean;
    label: string;
    options: Option[];
    /** Shown but not changeable: a value a points total fixes, or the only one a policy permits. */
    locked?: boolean;
}
export interface ToggleView {
    visible: boolean;
    checked: boolean;
}
export interface SegmentView {
    what: ControlView & {
        setType: SetType;
    };
    setTo: ControlView;
    tiebreakTo: ControlView;
    tiebreakAt: ControlView;
    /** One button, two meanings: the tiebreak's win-by when there is a tiebreak, the set's otherwise. */
    winBy: ControlView & {
        field?: SegmentField;
    };
    advantage: ControlView;
    minutes: ControlView;
    based: ControlView;
    modifier: ControlView;
    outs: ControlView;
    /** Points total: the rallies played. */
    pointsTotal: ControlView;
    /** Points total: tie allowed, or win by 1 (the deciding point), 2 or 3. Hidden for an odd total. */
    tieRule: ControlView;
    tiebreakToggle: ToggleView;
}
export interface EditorView {
    code: string;
    /** The catalog entry matching the code, or 'Custom'. */
    catalogValue: string;
    catalogVisible: boolean;
    readOnly: boolean;
    descriptor: ControlView;
    count: ControlView;
    matchRoot: ControlView;
    aggregate: ToggleView;
    gameFormat: ControlView & {
        gameFormat?: GameFormat;
    };
    /** The match-level time limit (`-M:T60`). Its option value 0 means none. */
    maxTime: ControlView;
    finalSetToggle: ToggleView;
    set: SegmentView;
    finalSet: SegmentView & {
        visible: boolean;
    };
}
export interface ViewConfig {
    codec: Codec;
    capabilities?: Capabilities;
    labels?: any;
    options?: any;
    /** The codes the catalog dropdown offers. */
    catalogCodes: string[];
    /** A policy's permitted points totals and tie rules: they narrow what is offered (Phase 3). */
    combinedPoints?: CombinedPointsConfig;
}
export declare const CUSTOM = "Custom";
/**
 * The picker's own words, in English. A consumer translates them through `config.labels` (CA, 2026-10-11):
 * `what` holds the singular set-type names and `whatPlural` the plural ones, and a label that carries a
 * number is a template with `{n}`, so a language can put the number where its word order needs it. Each
 * key falls back to English on its own, so a consumer that translates some keys keeps the rest.
 */
export declare const DEFAULT_LABELS: {
    what: {
        sets: string;
        tiebreaks: string;
        timedSets: string;
        outs: string;
        pointsTotal: string;
    };
    whatPlural: {
        sets: string;
        tiebreaks: string;
        timedSets: string;
        outs: string;
        pointsTotal: string;
    };
    advantage: {
        ad: string;
        noAd: string;
    };
    matchRoots: Record<string, string>;
    setTo: string;
    tiebreakTo: string;
    winBy: string;
    minutes: string;
    outs: string;
    maxMinutes: string;
    pointsTotal: string;
    tieAllowed: string;
    consecutive: string;
};
export declare function gameFormatText(gameFormat: GameFormat | undefined, labels?: any): string;
export declare function deriveView(state: EditorState, config: ViewConfig): EditorView;
