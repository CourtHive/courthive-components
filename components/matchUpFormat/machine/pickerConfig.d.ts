import { Capabilities, Codec, CombinedPointsConfig } from './types';
import { ViewConfig } from './view';
export interface MatchUpFormatConfig {
    labels?: {
        title?: string;
        setFormatLabel?: string;
        finalSetLabel?: string;
        tiebreakLabel?: string;
        finalSetToggleLabel?: string;
        standardFormatsLabel?: string;
        cancel?: string;
        select?: string;
        custom?: string;
        aggregate?: string;
        game?: string;
        gameType?: string;
        deuceRule?: string;
        none?: string;
        traditional?: string;
        consecutive2?: string;
        consecutive3?: string;
        consecutive4?: string;
        goldenPoint?: string;
        starPoint?: string;
        games?: string;
        points?: string;
        /** Shown when a format cannot be edited here and will be returned unchanged. */
        readOnly?: string;
        /** The match-level time limit control. */
        maxTime?: string;
        descriptors?: {
            bestOf?: string;
            exactly?: string;
        };
        /** The set-type names, singular ("Best of 1 Set"). */
        what?: {
            sets?: string;
            tiebreaks?: string;
            timedSets?: string;
            outs?: string;
            pointsTotal?: string;
        };
        /** The set-type names, plural ("Best of 3 Sets"). */
        whatPlural?: {
            sets?: string;
            tiebreaks?: string;
            timedSets?: string;
            outs?: string;
            pointsTotal?: string;
        };
        advantage?: {
            ad?: string;
            noAd?: string;
        };
        /** Match-root names by code (SET, HAL, QTR, PER, INN, RND, FRM, MAP). */
        matchRoots?: Record<string, string>;
        /** 'to {n}': games to win a set. */
        setTo?: string;
        /** 'TB to {n}': points to win a tiebreak. */
        tiebreakTo?: string;
        /** 'Win by {n}': a margin to win (a tiebreak, a set, or a points total after a tie). */
        winBy?: string;
        /** '{n} Minutes': a timed set's length. */
        minutes?: string;
        /** '{n} outs': outs per side. */
        outs?: string;
        /** '{n} min': the match time limit. */
        maxMinutes?: string;
        /** '{n} points': a points total. */
        pointsTotal?: string;
        /** '{n} consecutive': a game format without its own consecutive2-4 label. */
        consecutive?: string;
        /** A points total whose tie stands as the result. */
        tieAllowed?: string;
    };
    options?: {
        bestOf?: number[];
        exactly?: number[];
        setTo?: number[];
        tiebreakTo?: number[];
        tiebreakToExactly?: number[];
        tiebreakAt?: number[];
        minutes?: number[];
        winBy?: number[];
        matchRoots?: string[];
        gameFormats?: string[];
        modifiers?: string[];
        /** Outs per side offered for an outs set. */
        outs?: number[];
        /** Minutes offered for the match-level time limit. */
        maxMinutes?: number[];
        /** Totals offered for a points total (`SET1-S:P32`). */
        combinedPointTotals?: number[];
    };
    /** A policy's permitted points totals and tie rules. Narrows what is offered; the engine still validates. */
    combinedPoints?: CombinedPointsConfig;
    /** Switch parts of the picker off. Everything is on unless set to false. */
    capabilities?: Capabilities;
    preDefinedFormats?: Array<{
        code: string;
        text: string;
    }>;
}
export declare const DEFAULT_CONFIG: MatchUpFormatConfig;
export declare const codec: Codec;
export declare function mergeConfig(config?: MatchUpFormatConfig): MatchUpFormatConfig;
/** Everything the picker derives from its configuration before it draws anything. */
export declare function resolvePickerConfig(config?: MatchUpFormatConfig): {
    editorConfig: MatchUpFormatConfig;
    labels: {
        title?: string;
        setFormatLabel?: string;
        finalSetLabel?: string;
        tiebreakLabel?: string;
        finalSetToggleLabel?: string;
        standardFormatsLabel?: string;
        cancel?: string;
        select?: string;
        custom?: string;
        aggregate?: string;
        game?: string;
        gameType?: string;
        deuceRule?: string;
        none?: string;
        traditional?: string;
        consecutive2?: string;
        consecutive3?: string;
        consecutive4?: string;
        goldenPoint?: string;
        starPoint?: string;
        games?: string;
        points?: string;
        /** Shown when a format cannot be edited here and will be returned unchanged. */
        readOnly?: string;
        /** The match-level time limit control. */
        maxTime?: string;
        descriptors?: {
            bestOf?: string;
            exactly?: string;
        };
        /** The set-type names, singular ("Best of 1 Set"). */
        what?: {
            sets?: string;
            tiebreaks?: string;
            timedSets?: string;
            outs?: string;
            pointsTotal?: string;
        };
        /** The set-type names, plural ("Best of 3 Sets"). */
        whatPlural?: {
            sets?: string;
            tiebreaks?: string;
            timedSets?: string;
            outs?: string;
            pointsTotal?: string;
        };
        advantage?: {
            ad?: string;
            noAd?: string;
        };
        /** Match-root names by code (SET, HAL, QTR, PER, INN, RND, FRM, MAP). */
        matchRoots?: Record<string, string>;
        /** 'to {n}': games to win a set. */
        setTo?: string;
        /** 'TB to {n}': points to win a tiebreak. */
        tiebreakTo?: string;
        /** 'Win by {n}': a margin to win (a tiebreak, a set, or a points total after a tie). */
        winBy?: string;
        /** '{n} Minutes': a timed set's length. */
        minutes?: string;
        /** '{n} outs': outs per side. */
        outs?: string;
        /** '{n} min': the match time limit. */
        maxMinutes?: string;
        /** '{n} points': a points total. */
        pointsTotal?: string;
        /** '{n} consecutive': a game format without its own consecutive2-4 label. */
        consecutive?: string;
        /** A points total whose tie stands as the result. */
        tieAllowed?: string;
    };
    capabilities: Capabilities;
    catalog: {
        code: string;
        label: string;
    }[];
    viewConfig: ViewConfig;
    editContext: {
        codec: Codec;
        capabilities: Capabilities;
        tiebreakToOptions: number[];
        combinedPoints: CombinedPointsConfig;
    };
};
