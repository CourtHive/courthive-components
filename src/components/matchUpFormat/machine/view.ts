import { getBestOfOptionsForRoot, getTiebreakAtOptions, MATCH_ROOT_LABELS } from '../matchUpFormatLogic';
import { effectiveFormat, offeredTieMargins, offeredTotals, tieRuleApplies } from './pointsTotal';
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
// The set-type and advantage names have always been shown in English; see the plan's i18n follow-up.
const SET_TYPE_LABELS: Record<SetType, [string, string]> = {
  SET: ['Set', 'Sets'],
  TIEBREAK: ['Tiebreak', 'Tiebreaks'],
  TIMED: ['Timed set', 'Timed sets'],
  OUTS: ['Outs', 'Outs'],
  POINTS_TOTAL: ['Points total', 'Points total']
};
const SET_TYPES: SetType[] = ['SET', 'TIEBREAK', 'TIMED', 'OUTS', 'POINTS_TOTAL'];
const DEFAULT_MAX_MINUTES = [20, 30, 40, 45, 50, 60, 75, 90, 100, 120, 150, 180];
const ADVANTAGE_LABELS = { AD: 'Ad', NOAD: 'No-Ad' };

const button = (text: string) => `${text}${CLICKABLE}`;
const asOptions = (values: any[], text: (value: any) => string = String): Option[] =>
  values.map((value) => ({ value, text: text(value) }));

export function gameFormatText(gameFormat: GameFormat | undefined, labels: any = {}): string {
  const none = labels.none || 'None';
  if (!gameFormat) return none;
  let text: string;
  if (gameFormat.type === 'TRADITIONAL') text = labels.traditional || 'Traditional';
  else if (gameFormat.type === 'CONSECUTIVE') {
    text = labels[`consecutive${gameFormat.count}`] || `${gameFormat.count} consecutive`;
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

const tieRuleText = (margin: number) => (margin ? `Win by ${margin}` : 'Tie allowed');

function pointsTotalViews(
  segment: SegmentDraft,
  config: ViewConfig
): { pointsTotal: ControlView; tieRule: ControlView } {
  if (segment.type !== 'POINTS_TOTAL') return { pointsTotal: hidden(), tieRule: hidden() };
  const { combinedPoints } = config;
  const totalsFromPolicy = !!combinedPoints?.permittedPointTotals?.length;
  const marginsFromPolicy = !!combinedPoints?.permittedVariants?.length;
  const totals = offeredTotals(combinedPoints, config.options?.combinedPointTotals);
  return {
    pointsTotal: choiceView(segment.combinedPointTotal, totals, totalsFromPolicy, (total) => `${total} points`),
    tieRule: tieRuleApplies(segment)
      ? choiceView(segment.tieMargin, offeredTieMargins(combinedPoints), marginsFromPolicy, tieRuleText)
      : hidden()
  };
}

const setTypeLabel = (setType: SetType, plural: boolean) => SET_TYPE_LABELS[setType][plural ? 1 : 0];

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
      label: button(`Win by ${segment.tiebreakWinBy}`),
      options: asOptions(options.winBy ?? [1, 2]),
      field: 'tiebreakWinBy'
    };
  } else if (isSet) {
    winBy = {
      visible: true,
      label: button(`Win by ${segment.setWinBy}`),
      options: asOptions(options.winBy ?? [1, 2]),
      field: 'setWinBy'
    };
  }

  const basedLabels: Record<string, string> = { G: labels.games || 'Games', P: labels.points || 'Points' };
  const modifierVisible = capabilities.modifiers && (type === 'TIEBREAK' || isTimed || (isSet && segment.tiebreak));

  return {
    what: {
      visible: true,
      setType: type,
      label: button(setTypeLabel(type, plural)),
      options: asOptions(allowedTypes, (setType) => setTypeLabel(setType, plural))
    },
    setTo: isSet
      ? {
          visible: true,
          label: button(`to ${segment.setTo}`),
          options: asOptions(options.setTo ?? [1, 2, 3, 4, 5, 6, 7, 8, 9])
        }
      : hidden(),
    tiebreakTo:
      hasTiebreak || timedTiebreak
        ? { visible: true, label: button(`TB to ${segment.tiebreakTo}`), options: asOptions(tiebreakToValues) }
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
          label: button(segment.noAd ? ADVANTAGE_LABELS.NOAD : ADVANTAGE_LABELS.AD),
          options: [
            { value: false, text: ADVANTAGE_LABELS.AD },
            { value: true, text: ADVANTAGE_LABELS.NOAD }
          ]
        }
      : hidden(),
    minutes:
      type === 'TIMED'
        ? {
            visible: true,
            label: button(`${segment.minutes} Minutes`),
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
          label: button(`@${segment.modifier ?? 'None'}`),
          options: asOptions(options.modifiers ?? ['None', 'RALLY'])
        }
      : hidden(),
    outs:
      type === 'OUTS'
        ? { visible: true, label: button(`${segment.outs} outs`), options: asOptions(options.outs ?? [1, 2, 3, 4, 5]) }
        : hidden(),
    ...pointsTotalViews(segment, config),
    tiebreakToggle: {
      visible: (isSet || isTimed) && capabilities.setTiebreak,
      checked: (isSet && segment.tiebreak) || timedTiebreak
    }
  };
}

const minutesText = (minutes: number) => `${minutes} min`;

/** A dropdown button, or its value as fixed text while a points total locks it. */
function lockable(control: ControlView, locked: boolean): ControlView {
  return locked ? { ...control, locked } : { ...control, label: button(control.label) };
}

function maxTimeView(maxMinutes: number | undefined, visible: boolean, labels: any, options: any): ControlView {
  const minutes: number[] = options.maxMinutes ?? DEFAULT_MAX_MINUTES;
  // A code's own limit is always offered, even when it is not in the list.
  const values = maxMinutes && !minutes.includes(maxMinutes) ? [...minutes, maxMinutes].sort((a, b) => a - b) : minutes;
  const none = labels.none || 'None';
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
        label: MATCH_ROOT_LABELS[format.matchRoot] || format.matchRoot,
        options: asOptions(roots, (root) => MATCH_ROOT_LABELS[root] || root)
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
