/**
 * The picker's configuration, resolved: the defaults a consumer's `MatchUpFormatConfig` is merged over,
 * the catalog the dropdown offers, and the contexts the view and the edits are computed in. Moved out of
 * `matchUpFormat.ts` unchanged, so the picker's own view of a code can be asked for without a DOM.
 */
import { matchUpFormatCode } from 'tods-competition-factory';
import matchUpFormats from '../matchUpFormats.json';
import { DEFAULT_LABELS } from './view';
import { MATCH_ROOTS } from './options';

// constants and types
import type { Capabilities, Codec, CombinedPointsConfig } from './types';
import type { ViewConfig } from './view';

// Configuration interface for customizing the matchUpFormat editor
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
    // Templates: `{n}` is replaced by the number, wherever the language puts it.
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
    tiebreakToExactly?: number[]; // Additional options for Exactly + Final Set
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

export const DEFAULT_CONFIG: MatchUpFormatConfig = {
  labels: {
    title: 'Match format',
    setFormatLabel: 'Set format',
    finalSetLabel: 'Final set',
    tiebreakLabel: 'Tiebreak',
    finalSetToggleLabel: 'Final set',
    standardFormatsLabel: 'Standard formats',
    cancel: 'Cancel',
    select: 'Select',
    custom: 'Custom',
    aggregate: 'Aggregate',
    game: 'Game',
    gameType: 'Game type',
    deuceRule: 'Deuce rule',
    none: 'None',
    traditional: 'Traditional',
    consecutive2: '2 consecutive',
    consecutive3: '3 consecutive',
    consecutive4: '4 consecutive',
    goldenPoint: 'Golden point',
    starPoint: 'Star point',
    games: 'Games',
    points: 'Points',
    readOnly: 'This format cannot be edited here. Select keeps it unchanged; choose another format to replace it.',
    maxTime: 'Max time',
    descriptors: {
      bestOf: 'Best of',
      exactly: 'Exactly'
    },
    ...DEFAULT_LABELS
  },
  options: {
    bestOf: [1, 3, 5, 7, 9],
    exactly: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    setTo: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    tiebreakTo: [1, 3, 5, 7, 9, 10, 11, 12, 13, 15, 21, 25],
    tiebreakToExactly: [1, 3],
    tiebreakAt: [3, 4, 5, 6, 7, 8],
    minutes: [3, 5, 8, 10, 12, 15, 20, 25, 30, 45, 60, 90, 120],
    winBy: [1, 2],
    matchRoots: [...MATCH_ROOTS],
    gameFormats: ['None', 'TN', '2C', '3C', '4C'],
    modifiers: ['None', 'RALLY']
  }
};

export const codec: Codec = { parse: matchUpFormatCode.parse, stringify: matchUpFormatCode.stringify };

export function mergeConfig(config?: MatchUpFormatConfig): MatchUpFormatConfig {
  if (!config) return DEFAULT_CONFIG;
  return {
    labels: { ...DEFAULT_CONFIG.labels, ...config.labels },
    options: { ...DEFAULT_CONFIG.options, ...config.options },
    capabilities: config.capabilities,
    combinedPoints: config.combinedPoints,
    preDefinedFormats: config.preDefinedFormats || DEFAULT_CONFIG.preDefinedFormats
  };
}

/** Everything the picker derives from its configuration before it draws anything. */
export function resolvePickerConfig(config?: MatchUpFormatConfig) {
  const editorConfig = mergeConfig(config);
  const labels = editorConfig.labels;
  const capabilities = editorConfig.capabilities;

  const catalog = editorConfig.preDefinedFormats
    ? editorConfig.preDefinedFormats.map((entry) => ({ code: entry.code, label: entry.text }))
    : (matchUpFormats as { format?: string; name: string }[])
        .filter((entry) => entry.format)
        .map((entry) => ({ code: entry.format, label: entry.name }));
  const viewConfig: ViewConfig = {
    codec,
    capabilities,
    labels,
    options: editorConfig.options,
    catalogCodes: catalog.map((entry) => entry.code),
    combinedPoints: editorConfig.combinedPoints
  };
  const editContext = {
    codec,
    capabilities,
    tiebreakToOptions: editorConfig.options.tiebreakTo,
    combinedPoints: editorConfig.combinedPoints
  };
  return { editorConfig, labels, capabilities, catalog, viewConfig, editContext };
}
