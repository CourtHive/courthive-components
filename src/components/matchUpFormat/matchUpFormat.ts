/**
 * Match format configuration modal.
 *
 * A renderer over the picker's state machine (`./machine`). The state lives in one per-instance
 * `EditorState`; every control dispatches an `Edit` through `applyEdit`, and `render` redraws every
 * control from `deriveView`. Nothing here decides visibility or enforces a rule: those live in the
 * machine, once. Element ids are unchanged, so stories, tests and hosts that read them still work.
 */
import { createDropdown, createGameFormatDropdown, closeCurrentDropdown } from './dropdowns';
import { deriveView, CUSTOM, DEFAULT_LABELS } from './machine/view';
import { matchUpFormatCode } from 'tods-competition-factory';
import { fromCode, selectedCode } from './machine/codec';
import { applyEdit } from './machine/edits';
import { cModal } from '../modal/cmodal';

import matchUpFormats from './matchUpFormats.json';
import './matchUpFormat.css';

// constants and types
import type { Capabilities, CombinedPointsConfig, Edit, EditorState, SegmentKey, SegmentField } from './machine/types';
import type { ControlView, EditorView, SegmentView } from './machine/view';
import { MATCH_ROOTS } from './matchUpFormatLogic';

const NONE = 'none';
const TRANSITION_STYLE = 'all .2s ease-in-out';
const CHC_TEXT_PRIMARY = 'var(--chc-text-primary)';

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

const defaultConfig: MatchUpFormatConfig = {
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

const codec = { parse: matchUpFormatCode.parse, stringify: matchUpFormatCode.stringify };

/** The set-row controls in display order. Descriptor and count belong to the match, not the final set. */
const SET_CONTROLS = [
  'descriptor',
  'bestOf',
  'advantage',
  'what',
  'setTo',
  'tiebreakTo',
  'tiebreakAt',
  'winBy',
  'minutes',
  'based',
  'modifier',
  'outs',
  'pointsTotal',
  'tieRule'
] as const;
type SetControl = (typeof SET_CONTROLS)[number];
const MATCH_ONLY = new Set<SetControl>(['descriptor', 'bestOf']);
/** A points total is the whole match, so its controls have no place in the final set. */
const NOT_IN_FINAL_SET = new Set<SetControl>([...MATCH_ONLY, 'pointsTotal', 'tieRule']);
const SEGMENT_FIELDS: Partial<Record<SetControl, SegmentField>> = {
  setTo: 'setTo',
  tiebreakTo: 'tiebreakTo',
  tiebreakAt: 'tiebreakAt',
  minutes: 'minutes',
  based: 'based',
  modifier: 'modifier',
  outs: 'outs',
  advantage: 'noAd',
  pointsTotal: 'combinedPointTotal',
  tieRule: 'tieMargin'
};

function styleButton(button: HTMLButtonElement): void {
  // Inline, because courthive-components has no .mfcButton stylesheet
  button.className = 'mfcButton';
  button.style.transition = TRANSITION_STYLE;
  button.style.backgroundColor = 'inherit';
  button.style.border = 'none';
  button.style.color = 'inherit';
  button.style.padding = '.3em';
  button.style.textAlign = 'center';
  button.style.textDecoration = 'none';
  button.style.fontSize = '1em';
  button.style.cursor = 'pointer';
}

function newButton(id: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = id;
  styleButton(button);
  return button;
}

function newToggle(id: string, className: string, label: string, labelId: string) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = className;
  checkbox.id = id;
  checkbox.name = id;
  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.id = labelId;
  labelElement.innerHTML = label;
  labelElement.style.marginRight = '1em';
  return { checkbox, label: labelElement };
}

function showControl(element: HTMLElement, control: ControlView, readOnly: boolean): void {
  element.style.display = control.visible ? '' : NONE;
  if (control.visible) element.innerHTML = control.label;
  (element as HTMLButtonElement).disabled = readOnly || !!control.locked;
}

function mergeConfig(config?: MatchUpFormatConfig): MatchUpFormatConfig {
  if (!config) return defaultConfig;
  return {
    labels: { ...defaultConfig.labels, ...config.labels },
    options: { ...defaultConfig.options, ...config.options },
    capabilities: config.capabilities,
    combinedPoints: config.combinedPoints,
    preDefinedFormats: config.preDefinedFormats || defaultConfig.preDefinedFormats
  };
}

export function getMatchUpFormatModal({
  existingMatchUpFormat = 'SET3-S:6/TB7',
  callback,
  onClose,
  config,
  modalConfig
}: {
  existingMatchUpFormat?: string;
  callback?: (format: string) => void;
  /** Called however the modal closes — Select, Cancel, or anything else that closes it. */
  onClose?: () => void;
  config?: MatchUpFormatConfig;
  modalConfig?: any;
} = {}) {
  const editorConfig = mergeConfig(config);
  const labels = editorConfig.labels;
  const capabilities = editorConfig.capabilities;

  const catalog = editorConfig.preDefinedFormats
    ? editorConfig.preDefinedFormats.map((entry) => ({ code: entry.code, label: entry.text }))
    : (matchUpFormats as { format?: string; name: string }[])
        .filter((entry) => entry.format)
        .map((entry) => ({ code: entry.format, label: entry.name }));
  const viewConfig = {
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

  if (existingMatchUpFormat && !codec.parse(existingMatchUpFormat)) {
    console.warn('Invalid matchUpFormat:', existingMatchUpFormat);
  }
  let state: EditorState = fromCode(existingMatchUpFormat, codec, capabilities);
  let view: EditorView;
  const elements: Record<string, HTMLElement> = {};

  const dispatch = (edit: Edit) => {
    state = applyEdit(state, edit, editContext);
    render();
  };

  /** A control's dropdown, built from the view at the moment it opens. */
  const openChoices = (e: Event, control: () => ControlView, toEdit: (value: any) => Edit) => {
    createDropdown(
      e,
      control().options.map((option) => ({ text: option.text, onClick: () => dispatch(toEdit(option.value)) }))
    );
  };

  const segmentOf = (index?: number): SegmentKey => (index ? 'finalSet' : 'set');
  const segmentView = (segment: SegmentKey): SegmentView => (segment === 'set' ? view.set : view.finalSet);

  function editForControl(id: SetControl, segment: SegmentKey, value: any): Edit {
    if (id === 'descriptor') return { type: 'setCountMode', mode: value };
    if (id === 'bestOf') return { type: 'setCount', count: value };
    if (id === 'what') return { type: 'setSetType', segment, setType: value };
    if (id === 'winBy') return { type: 'setSegmentValue', segment, field: segmentView(segment).winBy.field, value };
    return { type: 'setSegmentValue', segment, field: SEGMENT_FIELDS[id], value };
  }

  function controlView(id: SetControl, segment: SegmentKey): ControlView {
    if (id === 'descriptor') return view.descriptor;
    if (id === 'bestOf') return view.count;
    return segmentView(segment)[id];
  }

  function setControlButton(id: SetControl, index?: number): HTMLButtonElement {
    const segment = segmentOf(index);
    const button = newButton(index ? `${id}-${index}` : id);
    button.onclick = (e) =>
      openChoices(
        e,
        () => controlView(id, segment),
        (value) => editForControl(id, segment, value)
      );
    elements[button.id] = button;
    return button;
  }

  const content = document.createElement('div');
  // Close an open dropdown on a click elsewhere in the modal
  content.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.classList.contains('mfcButton')) closeCurrentDropdown();
  });

  const codeDisplay = document.createElement('div');
  codeDisplay.id = 'matchUpFormatString';
  codeDisplay.style.fontSize = '1.5em';
  // The card's accent, like every other emphasis in the picker
  codeDisplay.style.color = 'var(--chc-card-accent)';
  codeDisplay.style.marginBottom = '1em';
  elements.matchUpFormatString = codeDisplay;
  content.appendChild(codeDisplay);

  const selectorRow = document.createElement('div');
  selectorRow.style.marginBlockEnd = '1em';
  const selector = document.createElement('select');
  selector.id = 'matchUpFormatSelector';
  selector.className = 'input';
  selector.style.width = '100%';
  selector.style.backgroundColor = 'var(--chc-input-bg)';
  selector.style.color = CHC_TEXT_PRIMARY;
  selector.style.border = '1px solid var(--chc-input-border)';
  for (const option of [{ code: CUSTOM, label: labels.custom || CUSTOM }, ...catalog]) {
    const element = document.createElement('option');
    element.value = option.code || '';
    element.text = option.label || '';
    element.style.backgroundColor = 'var(--chc-input-bg)';
    element.style.color = CHC_TEXT_PRIMARY;
    selector.appendChild(element);
  }
  selector.onchange = () => {
    // Choosing "Custom" keeps the current format; choosing a catalog entry replaces it whole.
    if (selector.value !== CUSTOM) dispatch({ type: 'loadCode', code: selector.value });
    else render();
  };
  elements.matchUpFormatSelector = selector;
  selectorRow.appendChild(selector);
  content.appendChild(selectorRow);

  const readOnlyNotice = document.createElement('div');
  readOnlyNotice.id = 'matchUpFormatReadOnly';
  readOnlyNotice.textContent = labels.readOnly;
  readOnlyNotice.style.marginBottom = '1em';
  readOnlyNotice.style.color = 'var(--chc-text-muted)';
  elements.matchUpFormatReadOnly = readOnlyNotice;
  content.appendChild(readOnlyNotice);

  // Match-level controls: root, aggregate, game format
  const matchRow = document.createElement('div');
  matchRow.style.display = 'flex';
  matchRow.style.flexWrap = 'wrap';
  matchRow.style.gap = '0.5em';
  matchRow.style.marginBottom = '0.5em';
  matchRow.style.alignItems = 'center';

  const matchRootButton = newButton('matchRoot');
  matchRootButton.onclick = (e) =>
    openChoices(
      e,
      () => view.matchRoot,
      (matchRoot) => ({ type: 'setMatchRoot', matchRoot })
    );
  elements.matchRoot = matchRootButton;

  const aggregate = newToggle(
    'aggregateOption',
    'switch is-rounded is-warning',
    labels.aggregate || 'Aggregate',
    'aggregateOptionLabel'
  );
  aggregate.checkbox.onchange = () => dispatch({ type: 'setAggregate', on: aggregate.checkbox.checked });
  elements.aggregateOption = aggregate.checkbox;
  elements.aggregateOptionLabel = aggregate.label;

  const gameFormatButton = newButton('gameFormat');
  gameFormatButton.onclick = (e) =>
    createGameFormatDropdown(e, view.gameFormat.gameFormat, labels, (gameFormat) =>
      dispatch({ type: 'setGameFormat', gameFormat })
    );
  elements.gameFormat = gameFormatButton;
  const maxTimeButton = newButton('maxTime');
  maxTimeButton.onclick = (e) =>
    openChoices(
      e,
      () => view.maxTime,
      (minutes) => ({ type: 'setMaxMinutes', minutes })
    );
  elements.maxTime = maxTimeButton;
  matchRow.append(matchRootButton, aggregate.checkbox, aggregate.label, gameFormatButton, maxTimeButton);
  content.appendChild(matchRow);

  // The main set
  const setRow = document.createElement('div');
  setRow.id = 'setFormat';
  setRow.style.display = 'flex';
  setRow.style.flexWrap = 'wrap';
  setRow.style.gap = '0.5em';
  setRow.style.marginBottom = '1em';
  for (const id of SET_CONTROLS) setRow.appendChild(setControlButton(id));
  content.appendChild(setRow);

  const setConfig = document.createElement('div');
  setConfig.className = 'field';
  setConfig.style.fontSize = '1em';
  const tiebreakSwitch = 'switch is-rounded is-info';
  const setTiebreak = newToggle('setTiebreak', tiebreakSwitch, labels.tiebreakLabel || 'Tiebreak', 'setTiebreakToggle');
  setTiebreak.checkbox.onchange = () =>
    dispatch({ type: 'setTiebreak', segment: 'set', on: setTiebreak.checkbox.checked });
  const finalSetOption = newToggle(
    'finalSetOption',
    'switch is-rounded is-info',
    labels.finalSetLabel || 'Final set',
    'finalSetOptionLabel'
  );
  finalSetOption.checkbox.onchange = () => dispatch({ type: 'setFinalSet', on: finalSetOption.checkbox.checked });
  Object.assign(elements, {
    setTiebreak: setTiebreak.checkbox,
    setTiebreakToggle: setTiebreak.label,
    finalSetOption: finalSetOption.checkbox,
    finalSetOptionLabel: finalSetOption.label
  });
  setConfig.append(setTiebreak.checkbox, setTiebreak.label, finalSetOption.checkbox, finalSetOption.label);
  content.appendChild(setConfig);

  // The final set
  const finalSetRow = document.createElement('div');
  finalSetRow.id = 'finalSetFormat';
  finalSetRow.style.flexWrap = 'wrap';
  finalSetRow.style.gap = '0.5em';
  finalSetRow.style.marginBottom = '1em';
  const finalSetHeading = document.createElement('div');
  finalSetHeading.style.fontWeight = 'bold';
  finalSetHeading.style.padding = '.3em';
  finalSetHeading.innerHTML = labels.finalSetLabel || 'Final set';
  finalSetRow.appendChild(finalSetHeading);
  for (const id of SET_CONTROLS) if (!NOT_IN_FINAL_SET.has(id)) finalSetRow.appendChild(setControlButton(id, 1));
  elements.finalSetFormat = finalSetRow;
  content.appendChild(finalSetRow);

  const finalSetConfig = document.createElement('div');
  finalSetConfig.id = 'finalSetConfig';
  finalSetConfig.className = 'field';
  finalSetConfig.style.fontSize = '1em';
  const finalSetTiebreak = newToggle(
    'finalSetTiebreak',
    tiebreakSwitch,
    labels.tiebreakLabel || 'Tiebreak',
    'finalSetTiebreakToggle'
  );
  finalSetTiebreak.checkbox.onchange = () =>
    dispatch({ type: 'setTiebreak', segment: 'finalSet', on: finalSetTiebreak.checkbox.checked });
  Object.assign(elements, {
    finalSetConfig,
    finalSetTiebreak: finalSetTiebreak.checkbox,
    finalSetTiebreakToggle: finalSetTiebreak.label
  });
  finalSetConfig.append(finalSetTiebreak.checkbox, finalSetTiebreak.label);
  content.appendChild(finalSetConfig);

  function renderToggle(checkbox: HTMLInputElement, label: HTMLElement, visible: boolean, checked: boolean) {
    checkbox.style.display = visible ? '' : NONE;
    label.style.display = visible ? '' : NONE;
    checkbox.checked = checked;
    checkbox.disabled = view.readOnly;
  }

  function renderSegment(index?: number) {
    for (const id of SET_CONTROLS) {
      if (index && NOT_IN_FINAL_SET.has(id)) continue;
      const element = elements[index ? `${id}-${index}` : id];
      showControl(element, controlView(id, segmentOf(index)), view.readOnly);
    }
  }

  function render(): void {
    view = deriveView(state, viewConfig);
    codeDisplay.innerHTML = view.code;
    selector.style.display = view.catalogVisible ? '' : NONE;
    selector.value = view.catalogValue;
    readOnlyNotice.style.display = view.readOnly ? '' : NONE;

    showControl(matchRootButton, view.matchRoot, view.readOnly);
    showControl(gameFormatButton, view.gameFormat, view.readOnly);
    showControl(maxTimeButton, view.maxTime, view.readOnly);
    renderToggle(aggregate.checkbox, aggregate.label, view.aggregate.visible, view.aggregate.checked);

    renderSegment();
    renderToggle(
      setTiebreak.checkbox,
      setTiebreak.label,
      view.set.tiebreakToggle.visible,
      view.set.tiebreakToggle.checked
    );
    renderToggle(
      finalSetOption.checkbox,
      finalSetOption.label,
      view.finalSetToggle.visible,
      view.finalSetToggle.checked
    );

    finalSetRow.style.display = view.finalSet.visible ? 'flex' : NONE;
    finalSetConfig.style.display = view.finalSet.visible ? '' : NONE;
    renderSegment(1);
    renderToggle(
      finalSetTiebreak.checkbox,
      finalSetTiebreak.label,
      view.finalSet.tiebreakToggle.visible,
      view.finalSet.tiebreakToggle.checked
    );
  }

  render();

  const buttons = [
    {
      onClick: () => {
        closeCurrentDropdown();
        callback?.('');
      },
      label: labels.cancel || 'Cancel',
      intent: 'none',
      footer: {
        className: 'button',
        style:
          'background-color: var(--chc-bg-elevated); color: var(--chc-text-primary); border: 1px solid var(--chc-border-primary);'
      },
      close: true
    },
    {
      label: labels.select || 'Select',
      intent: 'is-info',
      close: true,
      onClick: () => {
        closeCurrentDropdown();
        callback?.(selectedCode(state, codec));
      }
    }
  ];

  // The score-entry dialog's surface, radius and shadow, so the picker reads as part of it when it opens
  // above it — CA, 2026-10-08: "the matchUpFormat selector should be styled to match the new score entry".
  // `chc-mfc-modal` scopes the accent rules in matchUpFormat.css (toggles and the Select button).
  const defaultModalConfig = {
    className: 'chc-mfc-modal',
    content: { padding: '1.5' },
    maxWidth: 480,
    fontSize: '14px', // cModal expects fontSize at top level, not in style
    style: {
      backgroundColor: 'var(--chc-bg-elevated)',
      border: '1px solid var(--chc-border-primary)',
      borderRadius: '14px',
      boxShadow: '0 10px 26px rgb(0 0 0 / 18%)'
    }
  };
  // Extract fontSize from style if provided there, and move it to the top level
  const fontSize = modalConfig?.fontSize || modalConfig?.style?.fontSize || defaultModalConfig.fontSize;
  const finalModalConfig = {
    ...defaultModalConfig,
    ...modalConfig,
    fontSize,
    style: {
      ...defaultModalConfig.style,
      ...((config as any)?.style || {}), // the old config.style, for backward compatibility
      ...(modalConfig?.style || {}) // modalConfig.style takes precedence
    }
  };

  return cModal.open({
    title: labels.title || 'Score format',
    content,
    buttons,
    config: finalModalConfig,
    onClose: () => {
      closeCurrentDropdown();
      onClose?.();
    }
  });
}
