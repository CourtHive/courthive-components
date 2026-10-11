import { effectiveFormat, offeredTieMargins, offeredTotals, tieRuleApplies } from './pointsTotal';
import { getBestOfOptionsForRoot, getTiebreakAtOptions, MATCH_ROOT_LABELS } from './options';
import { resolveCapabilities, SET_TYPE_CAPABILITY } from './capabilities';
import { DEFAULT_TIEBREAK_TO_OPTIONS } from './edits';
import { selectedCode } from './codec';

// constants and types
import type {
  Capabilities,
  Codec,
  CombinedPointsConfig,
  EditorState,
  GameFormat,
  SegmentDraft,
  SegmentField,
  SetType
} from './types';

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
  what: ControlView & { setType: SetType };
  setTo: ControlView;
  tiebreakTo: ControlView;
  tiebreakAt: ControlView;
  /** One button, two meanings: the tiebreak's win-by when there is a tiebreak, the set's otherwise. */
  winBy: ControlView & { field?: SegmentField };
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
  gameFormat: ControlView & { gameFormat?: GameFormat };
  /** The match-level time limit (`-M:T60`). Its option value 0 means none. */
  maxTime: ControlView;
  finalSetToggle: ToggleView;
  set: SegmentView;
  finalSet: SegmentView & { visible: boolean };
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

export const CUSTOM = 'Custom';
const CLICKABLE = '▾';
/**
 * The picker's own words, in English. A consumer translates them through `config.labels` (CA, 2026-10-11):
 * `what` holds the singular set-type names and `whatPlural` the plural ones, and a label that carries a
 * number is a template with `{n}`, so a language can put the number where its word order needs it. Each
 * key falls back to English on its own, so a consumer that translates some keys keeps the rest.
 */
export const DEFAULT_LABELS = {
  what: { sets: 'Set', tiebreaks: 'Tiebreak', timedSets: 'Timed set', outs: 'Outs', pointsTotal: 'Points total' },
  whatPlural: {
    sets: 'Sets',
    tiebreaks: 'Tiebreaks',
    timedSets: 'Timed sets',
    outs: 'Outs',
    pointsTotal: 'Points total'
  },
  advantage: { ad: 'Ad', noAd: 'No-Ad' },
  matchRoots: MATCH_ROOT_LABELS,
  setTo: 'to {n}',
  tiebreakTo: 'TB to {n}',
  winBy: 'Win by {n}',
  minutes: '{n} Minutes',
  outs: '{n} outs',
  maxMinutes: '{n} min',
  pointsTotal: '{n} points',
  tieAllowed: 'Tie allowed',
  consecutive: '{n} consecutive'
};

/** The `labels.what` / `labels.whatPlural` key for each set type. */
const SET_TYPE_KEYS: Record<SetType, keyof typeof DEFAULT_LABELS.what> = {
  SET: 'sets',
  TIEBREAK: 'tiebreaks',
  TIMED: 'timedSets',
  OUTS: 'outs',
  POINTS_TOTAL: 'pointsTotal'
};
const SET_TYPES: SetType[] = ['SET', 'TIEBREAK', 'TIMED', 'OUTS', 'POINTS_TOTAL'];
const DEFAULT_MAX_MINUTES = [20, 30, 40, 45, 50, 60, 75, 90, 100, 120, 150, 180];
const NONE_MODIFIER = 'None';

type Template = Exclude<keyof typeof DEFAULT_LABELS, 'what' | 'whatPlural' | 'advantage' | 'matchRoots'>;

/** A label's template with every `{n}` replaced by the value. */
function fill(labels: any, key: Template, value: number | string): string {
  const template: string = labels?.[key] || DEFAULT_LABELS[key];
  return template.split('{n}').join(String(value));
}

function setTypeLabel(labels: any, setType: SetType, plural: boolean): string {
  const key = SET_TYPE_KEYS[setType];
  const group = plural ? 'whatPlural' : 'what';
  return labels?.[group]?.[key] || DEFAULT_LABELS[group][key];
}

const advantageLabel = (labels: any, noAd: boolean) =>
  noAd ? labels?.advantage?.noAd || DEFAULT_LABELS.advantage.noAd : labels?.advantage?.ad || DEFAULT_LABELS.advantage.ad;

const matchRootLabel = (labels: any, root: string) =>
  labels?.matchRoots?.[root] || MATCH_ROOT_LABELS[root] || root;

const button = (text: string) => `${text}${CLICKABLE}`;
const asOptions = (values: any[], text: (value: any) => string = String): Option[] =>
  values.map((value) => ({ value, text: text(value) }));

export function gameFormatText(gameFormat: GameFormat | undefined, labels: any = {}): string {
  const none = labels.none || 'None';
  if (!gameFormat) return none;
  let text: string;
  if (gameFormat.type === 'TRADITIONAL') text = labels.traditional || 'Traditional';
  else if (gameFormat.type === 'CONSECUTIVE') {
    text = labels[`consecutive${gameFormat.count}`] || fill(labels, 'consecutive', gameFormat.count);
  } else return none;
  if (gameFormat.deuceAfter) {
    const deuceLabels: Record<number, string> = {
      1: labels.goldenPoint || 'Golden point',
      3: labels.starPoint || 'Star point'
    };
    const deuce = deuceLabels[gameFormat.deuceAfter] || String(gameFormat.deuceAfter) + 'D';
    text += ` + ${deuce}`;
  }
  return text;
}

function hidden(): ControlView {
  return { visible: false, label: '', options: [] };
}

/**
 * A choice among values. A value outside the list is still offered when the list is the picker's own,
 * so an opened code can be chosen again; a policy's list is offered as it is. When only the current value
 * is offered there is nothing to choose, so it reads as fixed text.
 */
function choiceView(current: number, values: number[], fromPolicy: boolean, text: (value: number) => string) {
  const offered = fromPolicy || values.includes(current) ? values : [...values, current].sort((a, b) => a - b);
  const fixed = offered.length === 1 && offered[0] === current;
  return {
    visible: true,
    label: fixed ? text(current) : button(text(current)),
    options: asOptions(offered, text),
    ...(fixed ? { locked: true } : {})
  };
}

function pointsTotalViews(
  segment: SegmentDraft,
  config: ViewConfig
): { pointsTotal: ControlView; tieRule: ControlView } {
  if (segment.type !== 'POINTS_TOTAL') return { pointsTotal: hidden(), tieRule: hidden() };
  const { combinedPoints } = config;
  const totalsFromPolicy = !!combinedPoints?.permittedPointTotals?.length;
  const marginsFromPolicy = !!combinedPoints?.permittedVariants?.length;
  const totals = offeredTotals(combinedPoints, config.options?.combinedPointTotals);
  const labels = config.labels;
  const tieRuleText = (margin: number) =>
    margin ? fill(labels, 'winBy', margin) : labels?.tieAllowed || DEFAULT_LABELS.tieAllowed;
  return {
    pointsTotal: choiceView(segment.combinedPointTotal, totals, totalsFromPolicy, (total) =>
      fill(labels, 'pointsTotal', total)
    ),
    tieRule: tieRuleApplies(segment)
      ? choiceView(segment.tieMargin, offeredTieMargins(combinedPoints), marginsFromPolicy, tieRuleText)
      : hidden()
  };
}

function segmentView(segment: SegmentDraft, plural: boolean, isFinal: boolean, config: ViewConfig, exactly: boolean) {
  const capabilities = resolveCapabilities(config.capabilities);
  const options = config.options ?? {};
  const labels = config.labels ?? {};
  const { type } = segment;
  const isSet = type === 'SET';
  const isTimed = type === 'TIMED';
  /** A tiebreak whose win-by can be set: a standard set's, or a tiebreak-only set. */
  const hasTiebreak = (isSet && segment.tiebreak) || type === 'TIEBREAK';
  const timedTiebreak = isTimed && segment.timedTiebreak;
  // A points total is the whole match, so a final set is never offered one.
  const allowedTypes = SET_TYPES.filter(
    (setType) => capabilities.setTypes[SET_TYPE_CAPABILITY[setType]] && !(isFinal && setType === 'POINTS_TOTAL')
  );

  const standardTiebreakTo = options.tiebreakTo ?? DEFAULT_TIEBREAK_TO_OPTIONS;
  const tiebreakToValues =
    isFinal && exactly ? [...(options.tiebreakToExactly ?? [1, 3]), ...standardTiebreakTo] : standardTiebreakTo;

  let winBy: ControlView & { field?: SegmentField } = hidden();
  if (hasTiebreak) {
    winBy = {
      visible: true,
      label: button(fill(labels, 'winBy', segment.tiebreakWinBy)),
      options: asOptions(options.winBy ?? [1, 2]),
      field: 'tiebreakWinBy'
    };
  } else if (isSet) {
    winBy = {
      visible: true,
      label: button(fill(labels, 'winBy', segment.setWinBy)),
      options: asOptions(options.winBy ?? [1, 2]),
      field: 'setWinBy'
    };
  }

  const basedLabels: Record<string, string> = { G: labels.games || 'Games', P: labels.points || 'Points' };
  const noneText = labels.none || 'None';
  const modifierVisible = capabilities.modifiers && (type === 'TIEBREAK' || isTimed || (isSet && segment.tiebreak));

  return {
    what: {
      visible: true,
      setType: type,
      label: button(setTypeLabel(labels, type, plural)),
      options: asOptions(allowedTypes, (setType) => setTypeLabel(labels, setType, plural))
    },
    setTo: isSet
      ? {
          visible: true,
          label: button(fill(labels, 'setTo', segment.setTo)),
          options: asOptions(options.setTo ?? [1, 2, 3, 4, 5, 6, 7, 8, 9])
        }
      : hidden(),
    tiebreakTo:
      hasTiebreak || timedTiebreak
        ? {
            visible: true,
            label: button(fill(labels, 'tiebreakTo', segment.tiebreakTo)),
            options: asOptions(tiebreakToValues)
          }
        : hidden(),
    tiebreakAt:
      isSet && segment.tiebreak
        ? {
            visible: true,
            label: button(`@${segment.tiebreakAt}`),
            options: asOptions(getTiebreakAtOptions(segment.setTo))
          }
        : hidden(),
    winBy,
    advantage: isSet
      ? {
          visible: true,
          label: button(advantageLabel(labels, segment.noAd)),
          options: [
            { value: false, text: advantageLabel(labels, false) },
            { value: true, text: advantageLabel(labels, true) }
          ]
        }
      : hidden(),
    minutes:
      type === 'TIMED'
        ? {
            visible: true,
            label: button(fill(labels, 'minutes', segment.minutes)),
            options: asOptions(options.minutes ?? [3, 5, 8, 10, 12, 15, 20, 25, 30, 45, 60, 90, 120])
          }
        : hidden(),
    based:
      type === 'TIMED' && capabilities.scoringBasis
        ? {
            visible: true,
            label: button(basedLabels[segment.based ?? 'G'] ?? segment.based),
            options: asOptions(['G', 'P'], (code) => basedLabels[code])
          }
        : hidden(),
    modifier: modifierVisible
      ? {
          visible: true,
          label: button(`@${segment.modifier ?? noneText}`),
          // 'None' is the value that clears the modifier; only its text is translated
          options: asOptions(options.modifiers ?? [NONE_MODIFIER, 'RALLY'], (modifier) =>
            modifier === NONE_MODIFIER ? noneText : modifier
          )
        }
      : hidden(),
    outs:
      type === 'OUTS'
        ? {
            visible: true,
            label: button(fill(labels, 'outs', segment.outs)),
            options: asOptions(options.outs ?? [1, 2, 3, 4, 5])
          }
        : hidden(),
    ...pointsTotalViews(segment, config),
    tiebreakToggle: {
      visible: (isSet || isTimed) && capabilities.setTiebreak,
      checked: (isSet && segment.tiebreak) || timedTiebreak
    }
  };
}


/** A dropdown button, or its value as fixed text while a points total locks it. */
function lockable(control: ControlView, locked: boolean): ControlView {
  return locked ? { ...control, locked } : { ...control, label: button(control.label) };
}

function maxTimeView(maxMinutes: number | undefined, visible: boolean, labels: any, options: any): ControlView {
  const minutes: number[] = options.maxMinutes ?? DEFAULT_MAX_MINUTES;
  // A code's own limit is always offered, even when it is not in the list.
  const values = maxMinutes && !minutes.includes(maxMinutes) ? [...minutes, maxMinutes].sort((a, b) => a - b) : minutes;
  const none = labels.none || 'None';
  const minutesText = (value: number) => fill(labels, 'maxMinutes', value);
  return {
    visible,
    label: button(`${labels.maxTime || 'Max time'}: ${maxMinutes ? minutesText(maxMinutes) : none}`),
    options: [{ value: 0, text: none }, ...asOptions(values, minutesText)]
  };
}

export function deriveView(state: EditorState, config: ViewConfig): EditorView {
  const capabilities = resolveCapabilities(config.capabilities);
  // A points total shows the match-level values it locks (Best of 1, SET), not the ones it keeps aside.
  const format = effectiveFormat(state.format);
  const locked = format !== state.format;
  const labels = config.labels ?? {};
  const options = config.options ?? {};
  const code = selectedCode(state, config.codec);
  const exactly = format.countMode === 'EXACTLY';
  const plural = format.count > 1;

  const bestOfText = labels.descriptors?.bestOf || 'Best of';
  const exactlyText = labels.descriptors?.exactly || 'Exactly';
  const descriptorOptions: Option[] = [{ value: 'BEST_OF', text: bestOfText }];
  if (capabilities.exactly) descriptorOptions.push({ value: 'EXACTLY', text: exactlyText });

  const countValues = exactly
    ? (options.exactly ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    : getBestOfOptionsForRoot(format.matchRoot);
  const roots = options.matchRoots ?? Object.keys(MATCH_ROOT_LABELS);

  const finalSetView = segmentView(format.finalSet, false, true, config, exactly);

  return {
    code,
    catalogValue: config.catalogCodes.includes(code) ? code : CUSTOM,
    catalogVisible: capabilities.catalog,
    readOnly: state.readOnlyReasons.length > 0,
    descriptor: lockable(
      { visible: true, label: exactly ? exactlyText : bestOfText, options: descriptorOptions },
      locked
    ),
    count: lockable({ visible: true, label: String(format.count), options: asOptions(countValues) }, locked),
    matchRoot: lockable(
      {
        visible: capabilities.matchRoots,
        label: matchRootLabel(labels, format.matchRoot),
        options: asOptions(roots, (root) => matchRootLabel(labels, root))
      },
      locked
    ),
    aggregate: { visible: capabilities.aggregate && !locked, checked: format.aggregate },
    gameFormat: {
      visible: capabilities.gameFormat && !locked && format.set.based !== 'P',
      label: button(`${labels.game || 'Game'}: ${gameFormatText(format.gameFormat, labels)}`),
      options: [],
      gameFormat: format.gameFormat
    },
    maxTime: maxTimeView(format.maxMinutes, capabilities.maxMatchTime && !locked, labels, options),
    finalSetToggle: { visible: capabilities.finalSet && format.count > 1, checked: format.finalSetEnabled },
    set: segmentView(format.set, plural, false, config, exactly),
    finalSet: { ...finalSetView, visible: format.finalSetEnabled }
  };
}
