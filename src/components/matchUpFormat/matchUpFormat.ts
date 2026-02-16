/**
 * Match format configuration modal.
 * Allows users to configure set formats, tiebreaks, and final set options.
 */
import { governors, matchUpFormatCode } from 'tods-competition-factory';
import { cModal } from '../modal/cmodal';
import {
  initializeFormatFromString,
  buildSetFormat,
  autoAdjustTiebreakAt,
  getTiebreakAtOptions,
  MATCH_ROOTS,
  MATCH_ROOT_LABELS,
  getBestOfOptionsForRoot
} from './matchUpFormatLogic';

import matchUpFormats from './matchUpFormats.json';

const NONE = 'none';
const clickable = '▾'; // clickable character

// Helper functions
function isFunction(fx: any): fx is (...args: any[]) => any {
  return typeof fx === 'function';
}

// Configuration interface for customizing the matchUpFormat editor
interface MatchUpFormatConfig {
  labels?: {
    title?: string;
    setFormatLabel?: string;
    finalSetLabel?: string;
    tiebreakLabel?: string;
    finalSetToggleLabel?: string;
    standardFormatsLabel?: string;
    descriptors?: {
      bestOf?: string;
      exactly?: string;
    };
    what?: {
      sets?: string;
      tiebreaks?: string;
      timedSets?: string;
    };
    advantage?: {
      ad?: string;
      noAd?: string;
    };
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
  };
  preDefinedFormats?: Array<{
    code: string;
    text: string;
  }>;
}

// Default configuration
const defaultConfig: MatchUpFormatConfig = {
  labels: {
    title: 'Match format',
    setFormatLabel: 'Set format',
    finalSetLabel: 'Final set',
    tiebreakLabel: 'Tiebreak',
    finalSetToggleLabel: 'Final set',
    standardFormatsLabel: 'Standard formats',
    descriptors: {
      bestOf: 'Best of',
      exactly: 'Exactly'
    },
    what: {
      sets: 'Set',
      tiebreaks: 'Tiebreak',
      timedSets: 'Timed set'
    },
    advantage: {
      ad: 'Ad',
      noAd: 'No-Ad'
    }
  },
  options: {
    bestOf: [1, 3, 5],
    exactly: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    setTo: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    tiebreakTo: [1, 3, 5, 7, 9, 10, 11, 12, 13, 15, 21, 25],
    tiebreakToExactly: [1, 3], // Additional for Exactly
    tiebreakAt: [3, 4, 5, 6, 7, 8],
    minutes: [3, 5, 8, 10, 12, 15, 20, 25, 30, 45, 60, 90, 120],
    winBy: [1, 2],
    matchRoots: [...MATCH_ROOTS],
    gameFormats: ['None', 'AGGR', '2C', '3C', '4C'],
    modifiers: ['None', 'RALLY']
  }
};

let editorConfig: MatchUpFormatConfig = defaultConfig;

let selectedMatchUpFormat: string;
let parsedMatchUpFormat: any;

// Direct element references - avoids document.getElementById lookups
// Populated when the modal renders, used by handlers to update controls
let modalInputs: Record<string, HTMLElement> = {};

/**
 * Get an element by key from modalInputs, falling back to document.getElementById.
 * This ensures handlers work even if modalInputs references become stale.
 */
function getEl(key: string): HTMLElement | null {
  return modalInputs[key] || document.getElementById(key) || null;
}

const TIMED_SETS = 'Timed set';
const TIEBREAKS = 'Tiebreak';
const NOAD = 'No-Ad';
const SETS = 'Set';
const AD = 'Ad';

// Display labels for the 'based' scoring method (timed sets)
const BASED_LABELS: Record<string, string> = { G: 'Games', P: 'Points', A: 'Aggregate' };
const BASED_CODES: Record<string, string> = { Games: 'G', Points: 'P', Aggregate: 'A' };

// Display labels for game format codes
const GAME_FORMAT_LABELS: Record<string, string> = {
  None: 'None',
  AGGR: 'Aggregate',
  '2C': '2 consecutive points',
  '3C': '3 consecutive points',
  '4C': '4 consecutive points'
};
const GAME_FORMAT_CODES: Record<string, string> = {
  None: 'None',
  Aggregate: 'AGGR',
  '2 consecutive points': '2C',
  '3 consecutive points': '3C',
  '4 consecutive points': '4C'
};

/** Convert a gameFormat object to its display label */
function gameFormatLabel(gf: any): string {
  if (!gf) return 'None';
  if (gf.type === 'AGGR') return GAME_FORMAT_LABELS['AGGR'];
  if (gf.type === 'CONSECUTIVE') return GAME_FORMAT_LABELS[`${gf.count}C`] || `${gf.count} consecutive points`;
  return 'None';
}

interface SetFormatConfig {
  descriptor: string;
  bestOf?: number;
  exactly?: number;
  advantage: string;
  what: string;
  setTo: number;
  tiebreakAt: number;
  tiebreakTo: number;
  winBy: number;
  minutes: number;
  tiebreakFormat?: any;
  NoAD?: boolean;
  tiebreakSet?: any;
  timed?: boolean;
  based?: string;
  modifier?: string;
}

interface FormatConfig {
  matchRoot?: string;
  aggregate?: boolean;
  gameFormat?: { type: 'AGGR' } | { type: 'CONSECUTIVE'; count: number };
  setFormat: SetFormatConfig;
  finalSetFormat: SetFormatConfig;
}

const format: FormatConfig = {
  matchRoot: undefined,
  aggregate: undefined,
  gameFormat: undefined,
  setFormat: {
    descriptor: 'Best of',
    bestOf: 3,
    advantage: AD,
    what: SETS,
    setTo: 6,
    tiebreakAt: 6,
    tiebreakTo: 7,
    winBy: 2,
    minutes: 10
    // based is undefined by default
  },
  finalSetFormat: {
    descriptor: 'Final set',
    advantage: AD,
    what: SETS,
    setTo: 6,
    tiebreakAt: 6,
    tiebreakTo: 7,
    winBy: 2,
    minutes: 10
    // based is undefined by default
  }
};

// REFACTORED: Thin wrapper around pure buildSetFormat function
// Now just reads DOM state and delegates to pure logic
function getSetFormat(index?: number): any {
  const which = index ? 'finalSetFormat' : 'setFormat';
  const config = format[which];

  // Check if tiebreak checkbox is checked
  const tiebreakKey = index ? 'finalSetTiebreak' : 'setTiebreak';
  const hasTiebreak = (getEl(tiebreakKey) as HTMLInputElement)?.checked || false;

  // Delegate to pure logic function
  return buildSetFormat(config, hasTiebreak);
}

function generateMatchUpFormat(): string {
  const setFormat = getSetFormat();

  parsedMatchUpFormat = {
    setFormat
  };

  // Include match-level properties
  if (format.matchRoot && format.matchRoot !== 'SET') {
    parsedMatchUpFormat.matchRoot = format.matchRoot;
  }
  if (format.aggregate) {
    parsedMatchUpFormat.aggregate = true;
  }
  if (format.gameFormat) {
    parsedMatchUpFormat.gameFormat = format.gameFormat;
  }

  // Use exactly or bestOf based on descriptor
  const descriptor = format.setFormat.descriptor;
  const numValue = format.setFormat.exactly ?? format.setFormat.bestOf ?? 3;

  if (descriptor === 'Exactly') {
    parsedMatchUpFormat.exactly = numValue;
    // Make sure we don't include bestOf when we have exactly
    delete parsedMatchUpFormat.bestOf;
  } else {
    parsedMatchUpFormat.bestOf = numValue;
    // Make sure we don't include exactly when we have bestOf
    delete parsedMatchUpFormat.exactly;
  }

  const hasFinalSet = (getEl('finalSetOption') as HTMLInputElement)?.checked;
  if (hasFinalSet) parsedMatchUpFormat.finalSetFormat = getSetFormat(1);

  const matchUpFormat = governors.scoreGovernor.stringifyMatchUpFormat(parsedMatchUpFormat);

  const predefinedFormats = editorConfig.preDefinedFormats
    ? editorConfig.preDefinedFormats.map((f) => ({ value: f.code, label: f.text, format: f.code }))
    : matchUpFormats;
  const predefined = predefinedFormats.some((format) => format.format === matchUpFormat);
  const elem = getEl('matchUpFormatSelector') as HTMLSelectElement;

  // Update select dropdown WITHOUT triggering onchange event
  if (elem) {
    const currentValue = elem.value;
    const newValue = predefined ? matchUpFormat : 'Custom';

    // Only update if the value actually changed
    if (currentValue !== newValue) {
      // Temporarily remove onchange to prevent recursion
      const originalOnChange = elem.onchange;
      elem.onchange = null;

      elem.value = newValue;

      // Restore onchange handler
      elem.onchange = originalOnChange;
    }
  }

  return matchUpFormat;
}

function setMatchUpFormatString(value?: string): void {
  const matchUpFormat = value || generateMatchUpFormat();
  // Update selectedMatchUpFormat so onSelect uses the current format
  selectedMatchUpFormat = matchUpFormat;
  const formatStringElem = getEl('matchUpFormatString');
  if (formatStringElem) {
    formatStringElem.innerHTML = matchUpFormat;
  }
}

const whichSetFormat = (pmf: any, isFinal?: boolean) => {
  if (isFinal) return pmf.finalSetFormat || pmf.setFormat;
  return pmf.setFormat;
};

interface SetComponent {
  getValue?: (pmf: any, isFinal?: boolean) => any;
  options: any[] | ((index?: number) => any[]);
  id: string;
  value?: any;
  finalSet?: boolean;
  defaultValue?: any;
  whats?: string[];
  onChange?: string;
  onChangeCallback?: string;
  pluralize?: boolean;
  prefix?: string;
  suffix?: string;
  finalSetLabel?: string;
  tb?: boolean;
  tbSet?: boolean;
  timed?: boolean;
}

const setComponents: SetComponent[] = [
  {
    getValue: (pmf) =>
      pmf.exactly
        ? editorConfig.labels?.descriptors?.exactly || 'Exactly'
        : editorConfig.labels?.descriptors?.bestOf || 'Best of',
    options: () => [
      editorConfig.labels?.descriptors?.bestOf || 'Best of',
      editorConfig.labels?.descriptors?.exactly || 'Exactly'
    ],
    id: 'descriptor',
    value: editorConfig.labels?.descriptors?.bestOf || 'Best of',
    finalSet: false,
    onChange: 'changeDescriptor'
  },
  {
    getValue: (pmf) => pmf.bestOf || pmf.exactly,
    finalSet: false,
    id: 'bestOf',
    options: () => {
      // Return configured options for 'Exactly' or 'Best of'
      const descriptor = format.setFormat.descriptor;
      const exactlyLabel = editorConfig.labels?.descriptors?.exactly || 'Exactly';
      if (descriptor === exactlyLabel) {
        return editorConfig.options?.exactly || defaultConfig.options!.exactly!;
      }
      // For Best of, use root-aware options
      return getBestOfOptionsForRoot(format.matchRoot);
    },
    onChange: 'pluralize',
    onChangeCallback: 'updateFinalSetVisibility',
    value: 3
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      const adType = setFormat?.NoAD ? NOAD : AD;
      return setFormat?.timed || setFormat?.tiebreakSet ? undefined : adType;
    },
    options: [AD, NOAD],
    onChange: 'changeAdvantage',
    defaultValue: AD,
    id: 'advantage',
    whats: [SETS]
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      if (!setFormat) console.log({ pmf });
      if (setFormat?.timed) return TIMED_SETS;
      if (setFormat?.tiebreakSet) return TIEBREAKS;
      return SETS;
    },
    options: [SETS, TIEBREAKS, TIMED_SETS],
    finalSetLabel: `${SETS}${clickable}`,
    onChange: 'changeWhat',
    onChangeCallback: 'updateWhatValue',
    pluralize: true,
    id: 'what'
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      return setFormat.setTo;
    },
    options: () => editorConfig.options?.setTo || defaultConfig.options!.setTo!,
    onChange: 'changeCount',
    defaultValue: 6,
    whats: [SETS],
    prefix: 'to ',
    id: 'setTo'
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      return setFormat.tiebreakFormat?.tiebreakTo || setFormat.tiebreakSet?.tiebreakTo;
    },
    options: (index?: number) => {
      // For Final Set tiebreak when Exactly is selected, include [1,3]
      const descriptor = format.setFormat.descriptor;
      const standardOptions = editorConfig.options?.tiebreakTo || defaultConfig.options!.tiebreakTo!;
      const exactlyOptions = editorConfig.options?.tiebreakToExactly || defaultConfig.options!.tiebreakToExactly!;

      if (index && descriptor === 'Exactly') {
        // Final set + Exactly: prepend [1, 3] options
        return [...exactlyOptions, ...standardOptions];
      }
      return standardOptions;
    },
    onChange: 'changeTiebreakTo',
    whats: [SETS, TIEBREAKS],
    id: 'tiebreakTo',
    defaultValue: 7,
    prefix: 'TB to ',
    tbSet: true,
    value: 7,
    tb: true
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      return setFormat.tiebreakAt;
    },
    // REFACTORED: Use pure logic function for tiebreakAt options
    options: (index?: number) => {
      const setTo = format[index ? 'finalSetFormat' : 'setFormat'].setTo;
      return getTiebreakAtOptions(setTo);
    },
    onChange: 'changeTiebreakAt',
    id: 'tiebreakAt',
    defaultValue: 6,
    whats: [SETS],
    prefix: '@',
    value: 6,
    tb: true
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      if (!setFormat.tiebreakFormat && !setFormat.tiebreakSet) return undefined;
      // Check both tiebreakFormat (regular sets) and tiebreakSet (tiebreak-only sets)
      const NoAD = setFormat.tiebreakFormat?.NoAD || setFormat.tiebreakSet?.NoAD;
      return NoAD ? 1 : 2;
    },
    whats: [SETS, TIEBREAKS],
    onChange: 'changeWinBy',
    prefix: 'Win by ',
    options: [1, 2],
    defaultValue: 2,
    tbSet: true,
    id: 'winBy',
    tb: true
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      return (setFormat.timed && setFormat.minutes) || undefined;
    },
    options: () => editorConfig.options?.minutes || defaultConfig.options!.minutes!,
    onChange: 'changeMinutes',
    whats: [TIMED_SETS],
    suffix: ' Minutes',
    defaultValue: 10,
    id: 'minutes',
    timed: true
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      if (!setFormat?.timed) return undefined;
      // Map code to display label
      const code = setFormat.based || 'G';
      return BASED_LABELS[code] || code;
    },
    options: () => {
      // Only include 'Aggregate' if the current format already uses it
      const hasAggregate =
        format.setFormat.based === 'A' || format.finalSetFormat.based === 'A';
      const opts = ['Games', 'Points'];
      if (hasAggregate) opts.push('Aggregate');
      return opts;
    },
    onChange: 'changeBased',
    whats: [TIMED_SETS],
    defaultValue: 'Games',
    id: 'based',
    timed: true
  },
  {
    getValue: (pmf, isFinal) => {
      const setFormat = whichSetFormat(pmf, isFinal);
      // Extract modifier from tiebreakSet, tiebreakFormat, or timed set
      const modifier =
        setFormat?.tiebreakSet?.modifier || setFormat?.tiebreakFormat?.modifier || setFormat?.modifier;
      return modifier || undefined;
    },
    options: () => editorConfig.options?.modifiers || defaultConfig.options!.modifiers!,
    onChange: 'changeModifier',
    whats: [TIEBREAKS, TIMED_SETS],
    prefix: '@',
    defaultValue: 'None',
    id: 'modifier',
    tb: true
  }
];

const onClicks: Record<string, (_e: Event, index: number | undefined, opt: any) => void> = {
  changeDescriptor: (_e, _index, opt) => {
    format.setFormat.descriptor = opt;

    // When switching between 'Best of' and 'Exactly', ensure the value is valid
    const currentValue = format.setFormat.bestOf || format.setFormat.exactly || 3;

    if (opt === 'Exactly') {
      // IMPORTANT: 'Exactly' is only valid with timed sets
      // Switch to timed format if not already
      if (format.setFormat.what !== TIMED_SETS) {
        // Clean out regular set properties before switching to timed
        delete format.setFormat.setTo;
        delete format.setFormat.tiebreakAt;
        delete format.setFormat.tiebreakTo;
        delete format.setFormat.winBy;
        delete format.setFormat.tiebreakFormat;
        delete format.setFormat.NoAD;

        format.setFormat.what = TIMED_SETS;
        // Set default timed set values if not already set
        if (!format.setFormat.minutes) {
          format.setFormat.minutes = 10;
        }
        // Keep existing 'based' or leave undefined (defaults to Games)

        // Trigger UI update for component visibility
        onClicks.changeWhat(new Event('click'), undefined, TIMED_SETS);

        // Update the "what" button text to show "Timed set" or "Timed sets"
        const whatElem = getEl('what');
        if (whatElem) {
          const plural = currentValue > 1 ? 's' : '';
          whatElem.innerHTML = `${TIMED_SETS}${plural}${clickable}`;
        }

        // Update the Minutes button display
        const minutesElem = getEl('minutes');
        if (minutesElem) {
          minutesElem.innerHTML = `${format.setFormat.minutes} Minutes${clickable}`;
          minutesElem.style.display = '';
        }

        // Update the based button display
        const basedElem = getEl('based');
        if (basedElem) {
          const basedCode = format.setFormat.based || 'G';
          basedElem.innerHTML = `${BASED_LABELS[basedCode] || basedCode}${clickable}`;
          basedElem.style.display = '';
        }
      }

      // Switch to exactly mode
      format.setFormat.exactly = currentValue;
      delete format.setFormat.bestOf;
    } else {
      // Switch to bestOf mode
      // If current value is even (2, 4), change to nearest odd (3, 5)
      const validBestOf = currentValue % 2 === 0 ? currentValue + 1 : currentValue;
      format.setFormat.bestOf = validBestOf;
      delete format.setFormat.exactly;

      // Always update the bestOf button display with the valid odd number
      const bestOfElem = getEl('bestOf');
      if (bestOfElem) {
        bestOfElem.innerHTML = `${validBestOf}${clickable}`;
      }

      // Trigger pluralize to update the "what" text if needed
      if (validBestOf !== currentValue) {
        onClicks.pluralize(new Event('click'), undefined, validBestOf);
      }
    }

    // Refresh tiebreakTo options for Final Set (index=1) when descriptor changes
    // This adds/removes [1,3] options based on Exactly vs Best of
    const finalSetTiebreakToElem = getEl('tiebreakTo-1');
    if (finalSetTiebreakToElem && finalSetTiebreakToElem.style.display !== NONE) {
      // Just refresh the button - the options function will automatically return the correct list
      const currentTiebreakTo = format.finalSetFormat.tiebreakTo || 7;
      const tiebreakComponent = setComponents.find((c) => c.id === 'tiebreakTo');
      if (tiebreakComponent) {
        const { prefix = '', suffix = '' } = tiebreakComponent;
        // Ensure current value is still valid for new descriptor
        const newOptions = isFunction(tiebreakComponent.options)
          ? tiebreakComponent.options(1) // Final set (index=1)
          : tiebreakComponent.options;
        // If current value is not in new options, reset to default
        const validValue = newOptions.includes(currentTiebreakTo) ? currentTiebreakTo : 7;
        if (validValue !== currentTiebreakTo) {
          format.finalSetFormat.tiebreakTo = validValue;
        }
        finalSetTiebreakToElem.innerHTML = `${prefix}${validValue}${suffix}${clickable}`;
      }
    }

    setMatchUpFormatString();
  },
  changeWhat: (_e, index, opt) => {
    const tiebreakOptionVisible = opt === SETS;
    const elementId = index ? 'finalSetTiebreakToggle' : 'setTiebreakToggle';
    const tiebreakToggle = getEl(elementId);
    if (tiebreakToggle) tiebreakToggle.style.display = tiebreakOptionVisible ? '' : NONE;

    // IMPORTANT: 'Exactly' is only valid with timed sets
    // If changing away from timed sets while in 'Exactly' mode, switch to 'Best of'
    if (!index && opt !== TIMED_SETS && format.setFormat.descriptor === 'Exactly') {
      format.setFormat.descriptor = 'Best of';
      const currentValue = format.setFormat.exactly || 3;
      // If current value is even, change to nearest odd
      const validBestOf = currentValue % 2 === 0 ? currentValue + 1 : currentValue;
      format.setFormat.bestOf = validBestOf;
      delete format.setFormat.exactly;

      // Update the descriptor button display
      const descriptorElem = getEl('descriptor');
      if (descriptorElem) {
        descriptorElem.innerHTML = `Best of${clickable}`;
      }

      // Update the number button display
      const bestOfElem = getEl('bestOf');
      if (bestOfElem) {
        bestOfElem.innerHTML = `${validBestOf}${clickable}`;
      }
    }

    setComponents.forEach((component) => {
      if (component.whats) {
        const { prefix = '', suffix = '', pluralize } = component;
        const visible = component.whats.includes(opt);
        const id = index ? `${component.id}-${index}` : component.id;
        const elem = getEl(id);
        if (!elem) return;

        if (elem.style.display === NONE && visible) {
          const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
          const plural = !index && pluralize && setCount > 1 ? 's' : '';
          const value = component.defaultValue;
          elem.innerHTML = `${prefix}${value}${plural}${suffix}${clickable}`;
          // Store the default value, but apply the same transformations
          // that the onChange handlers would (e.g., 'None' → undefined, 'Games' → undefined)
          let storedValue = value;
          if (component.id === 'modifier' && value === 'None') storedValue = undefined;
          if (component.id === 'based') {
            const code = BASED_CODES[value] || value;
            storedValue = code === 'G' ? undefined : code;
          }
          format[index ? 'finalSetFormat' : 'setFormat'][component.id] = storedValue;
        }

        elem.style.display = visible ? '' : NONE;
      }
    });

    // Update format string and dropdown after changing what type
    setMatchUpFormatString();
  },
  changeCount: (_e, index, opt) => {
    // REFACTORED: Use pure logic for tiebreakAt auto-adjustment
    const which = index ? 'finalSetFormat' : 'setFormat';
    format[which].setTo = opt;

    // Auto-adjust tiebreakAt using pure logic function
    const currentTiebreakAt = format[which].tiebreakAt;
    const newTiebreakAt = autoAdjustTiebreakAt(opt, currentTiebreakAt);

    if (newTiebreakAt !== currentTiebreakAt) {
      format[which].tiebreakAt = newTiebreakAt;
      // Update the tiebreakAt button display
      const tiebreakAtElem = getEl(index ? `tiebreakAt-${index}` : 'tiebreakAt');
      if (tiebreakAtElem) {
        tiebreakAtElem.innerHTML = `@${newTiebreakAt}${clickable}`;
      }
    }

    // Update format string and dropdown
    setMatchUpFormatString();
  },
  changeTiebreakAt: (_e, index, opt) => {
    format[index ? 'finalSetFormat' : 'setFormat'].tiebreakAt = opt;
    // Update format string and dropdown
    setMatchUpFormatString();
  },
  updateWhatValue: (_e, index, opt) => {
    // Update the format.what value when user clicks Sets/Tiebreaks/Timed Sets
    format[index ? 'finalSetFormat' : 'setFormat'].what = opt;
  },
  changeAdvantage: (_e, index, opt) => {
    format[index ? 'finalSetFormat' : 'setFormat'].advantage = opt;
    setMatchUpFormatString();
  },
  changeTiebreakTo: (_e, index, opt) => {
    format[index ? 'finalSetFormat' : 'setFormat'].tiebreakTo = opt;
    setMatchUpFormatString();
  },
  changeWinBy: (_e, index, opt) => {
    format[index ? 'finalSetFormat' : 'setFormat'].winBy = opt;
    setMatchUpFormatString();
  },
  changeMinutes: (_e, index, opt) => {
    format[index ? 'finalSetFormat' : 'setFormat'].minutes = opt;
    setMatchUpFormatString();
  },
  changeBased: (_e, index, opt) => {
    const which = index ? 'finalSetFormat' : 'setFormat';
    // Map display label to code (Games→G, Points→P, Aggregate→A)
    const code = BASED_CODES[opt] || opt;
    // If 'G' (Games), omit it since it's the default
    format[which].based = code === 'G' ? undefined : code;

    // Hide game format button when Points is selected (not applicable)
    if (!index) {
      const gfElem = getEl('gameFormat');
      if (gfElem) {
        if (code === 'P') {
          // Clear game format when switching to Points
          format.gameFormat = undefined;
          gfElem.style.display = NONE;
        } else {
          gfElem.style.display = '';
        }
      }
    }

    setMatchUpFormatString();
  },
  changeModifier: (_e, index, opt) => {
    const which = index ? 'finalSetFormat' : 'setFormat';
    format[which].modifier = opt === 'None' ? undefined : opt;
    setMatchUpFormatString();
  },
  changeMatchRoot: (_e, _index, opt) => {
    const prevRoot = format.matchRoot || 'SET';
    format.matchRoot = opt === 'SET' ? undefined : opt;

    // When switching roots, validate bestOf is in allowed range
    if (prevRoot !== opt) {
      const bestOfOptions = getBestOfOptionsForRoot(format.matchRoot);
      const currentBestOf = format.setFormat.bestOf;
      if (currentBestOf && !bestOfOptions.includes(currentBestOf)) {
        // Reset to nearest valid value
        const validBestOf = bestOfOptions[bestOfOptions.length - 1] >= currentBestOf
          ? bestOfOptions.reduce((prev, curr) => (curr <= currentBestOf ? curr : prev), bestOfOptions[0])
          : bestOfOptions[bestOfOptions.length - 1];
        format.setFormat.bestOf = validBestOf;
        const bestOfElem = getEl('bestOf');
        if (bestOfElem) {
          bestOfElem.innerHTML = `${validBestOf}${clickable}`;
        }
      }
    }

    setMatchUpFormatString();
  },
  changeAggregate: (_e, _index, _opt) => {
    const checkbox = getEl('aggregateOption') as HTMLInputElement;
    format.aggregate = checkbox?.checked || undefined;
    setMatchUpFormatString();
  },
  changeGameFormat: (_e, _index, opt) => {
    // Map display label to code (e.g., '3 consecutive points' → '3C')
    const code = GAME_FORMAT_CODES[opt] || opt;
    if (code === 'None') {
      format.gameFormat = undefined;
    } else if (code === 'AGGR') {
      format.gameFormat = { type: 'AGGR' };
    } else {
      // Parse '2C', '3C', '4C' etc.
      const match = /^(\d+)C$/.exec(code);
      if (match) {
        format.gameFormat = { type: 'CONSECUTIVE', count: Number(match[1]) };
      }
    }
    setMatchUpFormatString();
  },
  pluralize: (_e, index, opt) => {
    const which = index ? 'finalSetFormat' : 'setFormat';
    const what = format[which].what;
    const elementId = index ? `what-${index}` : 'what';
    const elem = getEl(elementId);
    const plural = opt > 1 ? 's' : '';
    if (elem) elem.innerHTML = `${what}${plural}${clickable}`;

    // Update bestOf or exactly based on descriptor
    if (!index) {
      if (format.setFormat.descriptor === 'Exactly') {
        format.setFormat.exactly = opt;
        delete format.setFormat.bestOf;
      } else {
        format.setFormat.bestOf = opt;
        delete format.setFormat.exactly;
      }
    }

    // Update format string and dropdown
    setMatchUpFormatString();
  },
  updateFinalSetVisibility: (_e, _index, opt) => {
    // When bestOf/exactly changes, show/hide final set toggle
    const showFinalSet = opt > 1;
    const finalSetOption = getEl('finalSetOption') as HTMLInputElement;
    const finalSetLabel = getEl('finalSetOptionLabel') as HTMLElement;

    if (finalSetOption && finalSetLabel) {
      if (showFinalSet) {
        // Show the toggle and label
        finalSetOption.style.display = '';
        finalSetLabel.style.display = '';
      } else {
        // If value becomes 1, uncheck the toggle (this will hide config panels via onchange)
        if (finalSetOption.checked) {
          finalSetOption.checked = false;
          // Trigger the onchange event to hide the panels
          finalSetOption.dispatchEvent(new Event('change'));
        }
        // Hide the toggle and label
        finalSetOption.style.display = 'none';
        finalSetLabel.style.display = 'none';
      }
    }
  }
};

export function getMatchUpFormatModal({
  existingMatchUpFormat = 'SET3-S:6/TB7',
  callback,
  config,
  modalConfig
}: {
  existingMatchUpFormat?: string;
  callback?: (format: string) => void;
  config?: MatchUpFormatConfig;
  modalConfig?: any;
} = {}) {
  // Merge user config with defaults
  if (config) {
    editorConfig = {
      labels: { ...defaultConfig.labels, ...config.labels },
      options: { ...defaultConfig.options, ...config.options },
      preDefinedFormats: config.preDefinedFormats || defaultConfig.preDefinedFormats
    };
  } else {
    editorConfig = defaultConfig;
  }

  // REFACTORED: Use pure function for format initialization
  // This prevents state pollution and ensures proper handling of all format types
  selectedMatchUpFormat = existingMatchUpFormat;

  // Reset direct element references for this modal instance
  modalInputs = {};

  parsedMatchUpFormat = matchUpFormatCode.parse(selectedMatchUpFormat);

  // Handle invalid format strings that parse to undefined
  if (!parsedMatchUpFormat) {
    console.warn('Invalid matchUpFormat:', selectedMatchUpFormat);
    // Fall back to default format
    selectedMatchUpFormat = 'SET3-S:6/TB7';
    parsedMatchUpFormat = matchUpFormatCode.parse(selectedMatchUpFormat);
  }

  // Initialize format object using pure logic function
  const initializedFormat = initializeFormatFromString(selectedMatchUpFormat, matchUpFormatCode.parse);

  // Update module-level format object
  // Use spread to ensure we get a copy, not a reference
  format.matchRoot = initializedFormat.matchRoot;
  format.aggregate = initializedFormat.aggregate;
  format.gameFormat = initializedFormat.gameFormat;
  format.setFormat = { ...initializedFormat.setFormat };
  format.finalSetFormat = { ...initializedFormat.finalSetFormat };
  const onSelect = () => {
    // Use selectedMatchUpFormat if it's a predefined format (from dropdown selection)
    // Otherwise generate from current button states
    const dropdown = getEl('matchUpFormatSelector') as HTMLSelectElement;
    const isPredefined = dropdown?.value && dropdown.value !== 'Custom';
    const specifiedFormat = isPredefined ? selectedMatchUpFormat : generateMatchUpFormat();
    if (isFunction(callback)) callback(specifiedFormat);
  };

  const buttons = [
    {
      onClick: () => {
        closeCurrentDropdown(); // Clean up any open dropdowns
        callback?.('');
      },
      label: 'Cancel',
      intent: 'none',
      footer: {
        className: 'button',
        style: 'background-color: white; color: #363636; border: 1px solid #dbdbdb;'
      },
      close: true
    },
    {
      label: 'Select',
      intent: 'is-info',
      close: true,
      onClick: () => {
        closeCurrentDropdown(); // Clean up any open dropdowns
        onSelect();
      }
    }
  ];

  const tiebreakSwitch = 'switch is-rounded is-danger';
  const content = document.createElement('div');

  // Close any open dropdown when clicking inside the modal content
  // (except on dropdown elements or buttons that open dropdowns)
  content.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Don't close if clicking on a dropdown or a button that will open one
    if (!target.closest('.dropdown') && !target.classList.contains('mfcButton')) {
      closeCurrentDropdown();
    }
  });

  const matchUpFormatString = document.createElement('div');
  matchUpFormatString.id = 'matchUpFormatString';
  matchUpFormatString.innerHTML = selectedMatchUpFormat;
  matchUpFormatString.style.fontSize = '1.5em';
  matchUpFormatString.style.color = 'blue';
  matchUpFormatString.style.marginBottom = '1em';
  modalInputs['matchUpFormatString'] = matchUpFormatString;
  content.appendChild(matchUpFormatString);

  const standardFormatSelector = document.createElement('div');
  standardFormatSelector.style.marginBlockEnd = '1em';

  // Use configured predefined formats if available, otherwise use default from JSON
  const predefinedFormats = editorConfig.preDefinedFormats
    ? editorConfig.preDefinedFormats.map((f) => ({ value: f.code, label: f.text, format: f.code }))
    : matchUpFormats;

  const formatSelector = {
    id: 'matchUpFormatSelector',
    options: [
      { value: 'Custom', label: 'Custom', selected: false },
      ...predefinedFormats
        .filter((format) => format.format) // Skip the "Custom" entry from JSON
        .map((format) => ({
          selected: format.format === selectedMatchUpFormat,
          value: format.format,
          label: ('label' in format ? format.label : format.name) || ''
        }))
    ]
  };

  // Create simple select field
  const select = document.createElement('select');
  select.id = 'matchUpFormatSelector';
  select.className = 'input';
  select.style.width = '100%';
  select.style.backgroundColor = '#ffffff'; // Force white background
  select.style.color = '#363636'; // Dark text for contrast
  select.style.border = '1px solid #b5b5b5'; // Darker border for better visibility
  for (const option of formatSelector.options) {
    const opt = document.createElement('option');
    opt.value = option.value || '';
    opt.text = option.label || '';
    opt.style.backgroundColor = '#ffffff'; // Force white background for options
    opt.style.color = '#363636'; // Dark text
    if (option.selected) opt.selected = true;
    select.appendChild(opt);
  }

  modalInputs['matchUpFormatSelector'] = select;

  select.onchange = (e) => {
    selectedMatchUpFormat = (e.target as HTMLSelectElement).value;
    setMatchUpFormatString(selectedMatchUpFormat);
    parsedMatchUpFormat = matchUpFormatCode.parse(selectedMatchUpFormat);

    // Handle invalid format strings
    if (!parsedMatchUpFormat) {
      console.warn('Invalid matchUpFormat selected:', selectedMatchUpFormat);
      return;
    }

    // Use initializeFormatFromString for full extraction
    const initialized = initializeFormatFromString(selectedMatchUpFormat, matchUpFormatCode.parse);

    // Apply match-level properties
    format.matchRoot = initialized.matchRoot;
    format.aggregate = initialized.aggregate;
    format.gameFormat = initialized.gameFormat;

    // Start with the setFormat from initialized result (includes modifier, based, etc.)
    format.setFormat = { ...initialized.setFormat };
    format.finalSetFormat = { ...initialized.finalSetFormat };

    // Update match-level controls
    const matchRootElem = getEl('matchRoot');
    if (matchRootElem) {
      const rootLabel = format.matchRoot || 'SET';
      matchRootElem.innerHTML = `${MATCH_ROOT_LABELS[rootLabel] || rootLabel}${clickable}`;
    }

    const aggElem = getEl('aggregateOption') as HTMLInputElement;
    if (aggElem) {
      aggElem.checked = !!format.aggregate;
    }

    const gfElem = getEl('gameFormat');
    if (gfElem) {
      gfElem.innerHTML = `Game: ${gameFormatLabel(format.gameFormat)}${clickable}`;
      // Hide game format when scoring is Points-based
      gfElem.style.display = format.setFormat.based === 'P' ? NONE : '';
    }

    // Update Final Set toggle visibility based on bestOf/exactly value
    const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
    onClicks.updateFinalSetVisibility(null, 0, setCount);

    const finalSet = parsedMatchUpFormat.finalSetFormat;
    finalSetFormat.style.display = finalSet ? '' : NONE;
    finalSetConfig.style.display = finalSet ? '' : NONE;
    finalSetOption.checked = !!finalSet;

    // Check if final set is tiebreak-only (e.g., F:TB10)
    const finalSetIsTiebreakOnly = finalSet?.tiebreakSet?.tiebreakTo && !finalSet?.setTo;
    finalSetTiebreak.checked = !!finalSet?.tiebreakFormat;
    // Hide tiebreak checkbox/label if final set is tiebreak-only
    finalSetTiebreak.style.display = finalSetIsTiebreakOnly ? NONE : '';
    const finalSetTiebreakLabelElem = getEl('finalSetTiebreakToggle');
    if (finalSetTiebreakLabelElem) finalSetTiebreakLabelElem.style.display = finalSetIsTiebreakOnly ? NONE : '';

    // Determine the main set 'what' type from the parsed format
    const mainWhat = format.setFormat.what;
    const mainSetHasTiebreak = !!parsedMatchUpFormat.setFormat.tiebreakFormat;

    // Update tiebreak checkbox and toggle visibility based on 'what' type
    setTiebreak.checked = mainSetHasTiebreak;
    const tiebreakToggleVisible = mainWhat === SETS;
    setTiebreak.style.display = tiebreakToggleVisible ? '' : NONE;
    const setTiebreakToggleElem = getEl('setTiebreakToggle');
    if (setTiebreakToggleElem) setTiebreakToggleElem.style.display = tiebreakToggleVisible ? '' : NONE;

    // Update all button values to match the selected format
    setComponents.forEach((component) => {
      if (component.getValue) {
        const setComponentValue = component.getValue(parsedMatchUpFormat);
        const elem = getEl(component.id);

        if (elem && setComponentValue !== undefined && setComponentValue !== null) {
          const { prefix = '', suffix = '', pluralize } = component;
          const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
          const plural = pluralize && setCount > 1 ? 's' : '';
          elem.innerHTML = `${prefix}${setComponentValue}${plural}${suffix}${clickable}`;
          elem.style.display = '';
        } else if (elem) {
          elem.style.display = NONE;
        }

        // For tb (tiebreak-related) components: update visibility based on what type
        // In SETS mode: only visible when tiebreak is checked
        // In TIEBREAKS/TIMED_SETS mode: visibility determined by whats and getValue above
        if (component.tb && mainWhat === SETS) {
          const tbElem = getEl(component.id);
          if (tbElem) {
            tbElem.style.display = mainSetHasTiebreak ? tbElem.style.display : NONE;
          }
        }

        if (finalSet) {
          const finalComponentValue = component.getValue(parsedMatchUpFormat, true);
          const finalElem = getEl(`${component.id}-1`);

          if (finalElem && finalComponentValue !== undefined && finalComponentValue !== null) {
            const { prefix = '', suffix = '', pluralize } = component;
            const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
            const plural = pluralize && setCount > 1 ? 's' : '';
            finalElem.innerHTML = `${prefix}${finalComponentValue}${plural}${suffix}${clickable}`;
            finalElem.style.display = '';
          } else if (finalElem) {
            finalElem.style.display = NONE;
          }
        }
      }
    });
  };
  standardFormatSelector.appendChild(select);
  content.appendChild(standardFormatSelector);

  // Match root button (SET, HAL, QTR, PER, etc.)
  const matchRootRow = document.createElement('div');
  matchRootRow.style.display = 'flex';
  matchRootRow.style.flexWrap = 'wrap';
  matchRootRow.style.gap = '0.5em';
  matchRootRow.style.marginBottom = '0.5em';
  matchRootRow.style.alignItems = 'center';

  const matchRootLabel = format.matchRoot || 'SET';
  const matchRootButton = document.createElement('button');
  matchRootButton.className = 'mfcButton';
  matchRootButton.id = 'matchRoot';
  matchRootButton.innerHTML = `${MATCH_ROOT_LABELS[matchRootLabel] || matchRootLabel}${clickable}`;
  matchRootButton.style.transition = 'all .2s ease-in-out';
  matchRootButton.style.backgroundColor = 'inherit';
  matchRootButton.style.border = 'none';
  matchRootButton.style.color = 'inherit';
  matchRootButton.style.padding = '.3em';
  matchRootButton.style.textAlign = 'center';
  matchRootButton.style.textDecoration = 'none';
  matchRootButton.style.fontSize = '1em';
  matchRootButton.style.cursor = 'pointer';
  matchRootButton.onclick = (e) => {
    const roots = editorConfig.options?.matchRoots || defaultConfig.options!.matchRoots!;
    const items = roots.map((root: string) => ({
      text: `${MATCH_ROOT_LABELS[root] || root}`,
      onClick: () => {
        matchRootButton.innerHTML = `${MATCH_ROOT_LABELS[root] || root}${clickable}`;
        onClicks.changeMatchRoot(e, undefined, root);
      }
    }));
    createDropdown(e, items);
  };
  matchRootRow.appendChild(matchRootButton);

  // Aggregate checkbox
  const aggregateCheckbox = document.createElement('input');
  aggregateCheckbox.type = 'checkbox';
  aggregateCheckbox.className = 'switch is-rounded is-warning';
  aggregateCheckbox.id = 'aggregateOption';
  aggregateCheckbox.name = 'aggregateOption';
  aggregateCheckbox.checked = !!format.aggregate;
  aggregateCheckbox.onchange = () => {
    onClicks.changeAggregate(new Event('change'), undefined, undefined);
  };
  matchRootRow.appendChild(aggregateCheckbox);

  const aggregateLabel = document.createElement('label');
  aggregateLabel.setAttribute('for', 'aggregateOption');
  aggregateLabel.innerHTML = 'Aggregate';
  aggregateLabel.style.marginRight = '1em';
  matchRootRow.appendChild(aggregateLabel);

  // Game format button — hidden when scoring is Points-based
  const currentGameFormatDisplay = gameFormatLabel(format.gameFormat);
  const gameFormatButton = document.createElement('button');
  gameFormatButton.className = 'mfcButton';
  gameFormatButton.id = 'gameFormat';
  gameFormatButton.innerHTML = `Game: ${currentGameFormatDisplay}${clickable}`;
  gameFormatButton.style.transition = 'all .2s ease-in-out';
  gameFormatButton.style.backgroundColor = 'inherit';
  gameFormatButton.style.border = 'none';
  gameFormatButton.style.color = 'inherit';
  gameFormatButton.style.padding = '.3em';
  gameFormatButton.style.textAlign = 'center';
  gameFormatButton.style.textDecoration = 'none';
  gameFormatButton.style.fontSize = '1em';
  gameFormatButton.style.cursor = 'pointer';
  // Hide if scoring method is Points (game format not applicable)
  if (format.setFormat.based === 'P') gameFormatButton.style.display = NONE;
  gameFormatButton.onclick = (e) => {
    const gameFormats = editorConfig.options?.gameFormats || defaultConfig.options!.gameFormats!;
    const items = gameFormats.map((gf: string) => {
      const label = GAME_FORMAT_LABELS[gf] || gf;
      return {
        text: label,
        onClick: () => {
          gameFormatButton.innerHTML = `Game: ${label}${clickable}`;
          onClicks.changeGameFormat(e, undefined, label);
        }
      };
    });
    createDropdown(e, items);
  };
  matchRootRow.appendChild(gameFormatButton);

  // Store match-level control references
  modalInputs['matchRoot'] = matchRootButton;
  modalInputs['aggregateOption'] = aggregateCheckbox;
  modalInputs['gameFormat'] = gameFormatButton;

  content.appendChild(matchRootRow);

  const setFormat = document.createElement('div');
  setFormat.style.display = 'flex';
  setFormat.style.flexWrap = 'wrap';
  setFormat.style.gap = '0.5em';
  setFormat.style.marginBottom = '1em';

  setComponents
    .map((component) => {
      const value = component.getValue ? component.getValue(parsedMatchUpFormat) : undefined;
      const button = createButton({ ...component, value });
      modalInputs[component.id] = button; // Store direct reference
      return button;
    })
    .forEach((button) => setFormat.appendChild(button));
  setFormat.id = 'setFormat';
  content.appendChild(setFormat);
  const setConfig = document.createElement('div');
  setConfig.className = 'field';
  setConfig.style.fontSize = '1em';

  const setTiebreak = document.createElement('input');
  setTiebreak.className = tiebreakSwitch;
  setTiebreak.name = 'setTiebreak';
  setTiebreak.id = 'setTiebreak';
  setTiebreak.type = 'checkbox';
  setTiebreak.checked = !!parsedMatchUpFormat.setFormat.tiebreakFormat;
  modalInputs['setTiebreak'] = setTiebreak;
  setTiebreak.onchange = (e) => {
    const active = (e.target as HTMLInputElement).checked;
    setComponents
      .filter(({ tb }) => tb)
      .forEach((component) => {
        const elem = getEl(component.id);
        if (!elem) return;

        if (elem.style.display === NONE && active) {
          const { prefix = '', suffix = '', pluralize, defaultValue: value } = component;
          const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
          const plural = pluralize && setCount > 1 ? 's' : '';
          elem.innerHTML = `${prefix}${value}${plural}${suffix}${clickable}`;
        }

        elem.style.display = active ? '' : NONE;
      });
    setMatchUpFormatString();
  };
  setConfig.appendChild(setTiebreak);

  const tiebreakLabel = document.createElement('label');
  tiebreakLabel.setAttribute('for', 'setTiebreak');
  tiebreakLabel.id = 'setTiebreakToggle';
  tiebreakLabel.innerHTML = 'Tiebreak';
  tiebreakLabel.style.marginRight = '1em';
  modalInputs['setTiebreakToggle'] = tiebreakLabel;
  setConfig.appendChild(tiebreakLabel);

  // Only show final set option if setCount > 1 (can't have a final set with only 1 set)
  const showFinalSetOption = (parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly) > 1;

  const finalSetOption = document.createElement('input');
  finalSetOption.className = 'switch is-rounded is-info';
  finalSetOption.type = 'checkbox';
  finalSetOption.name = 'finalSetOption';
  finalSetOption.checked = !!parsedMatchUpFormat.finalSetFormat;
  finalSetOption.id = 'finalSetOption';
  modalInputs['finalSetOption'] = finalSetOption;
  finalSetOption.style.display = showFinalSetOption ? '' : 'none';
  finalSetOption.onchange = (e) => {
    const active = (e.target as HTMLInputElement).checked;

    if (active) {
      // When enabling final set, copy ALL properties from main set format
      format.finalSetFormat = {
        ...format.setFormat,
        descriptor: 'Final set'
      };

      const what = format.setFormat.what;
      const setCount = format.setFormat.bestOf || format.setFormat.exactly || 3;

      // Update the "what" button for final set
      const whatElem = getEl('what-1');
      if (whatElem) {
        const plural = setCount > 1 ? 's' : '';
        whatElem.innerHTML = `${what}${plural}${clickable}`;
      }

      // Update ALL final set component buttons from format data
      setComponents.forEach((component) => {
        // Try to find the final set version of this component (id-1)
        const elem = getEl(`${component.id}-1`);

        // Skip if this component doesn't have a final set version
        if (!elem) return;

        // Check if this component should be visible for the current 'what'
        // Components without 'whats' are always visible (like 'what' selector itself)
        const visible = component.whats ? component.whats.includes(what) : true;

        if (visible) {
          // Build innerHTML from format data, not from stale buttons
          const value = format.finalSetFormat[component.id];
          if (value !== undefined) {
            const { prefix = '', suffix = '' } = component;
            elem.innerHTML = `${prefix}${value}${suffix}${clickable}`;
          }
          elem.style.display = '';
        } else {
          // Hide component not applicable to this 'what' type
          elem.style.display = NONE;
        }
      });

      // Handle tiebreak toggle visibility (only for regular sets)
      const fsTiebreakToggle = getEl('finalSetTiebreakToggle');
      if (fsTiebreakToggle) {
        fsTiebreakToggle.style.display = what === SETS ? '' : NONE;
      }

      // Copy tiebreak checkbox state for regular sets
      if (what === SETS) {
        const mainTiebreak = getEl('setTiebreak') as HTMLInputElement;
        const finalTiebreak = getEl('finalSetTiebreak') as HTMLInputElement;
        if (mainTiebreak && finalTiebreak) {
          finalTiebreak.checked = mainTiebreak.checked;
        }
      }
    }

    finalSetFormat.style.display = active ? '' : NONE;
    finalSetConfig.style.display = active ? '' : NONE;
    setMatchUpFormatString();
  };

  setConfig.appendChild(finalSetOption);

  const finalSetLabel = document.createElement('label');
  finalSetLabel.setAttribute('for', 'finalSetOption');
  finalSetLabel.innerHTML = 'Final set';
  finalSetLabel.style.display = showFinalSetOption ? '' : 'none';
  modalInputs['finalSetOptionLabel'] = finalSetLabel;
  setConfig.appendChild(finalSetLabel);

  content.appendChild(setConfig);

  const finalSetFormat = document.createElement('div');
  finalSetFormat.style.display = parsedMatchUpFormat.finalSetFormat ? 'flex' : NONE;
  finalSetFormat.style.flexWrap = 'wrap';
  finalSetFormat.style.gap = '0.5em';
  finalSetFormat.style.marginBottom = '1em';
  finalSetFormat.id = 'finalSetFormat';
  modalInputs['finalSetFormatDiv'] = finalSetFormat;
  ([{ label: `<div style='font-weight: bold'>Final set</div>`, options: [] as any[], finalSet: true }] as any[])
    .concat(
      setComponents.map((component) => {
        const value = component.getValue ? component.getValue(parsedMatchUpFormat, true) : undefined;
        return { ...component, value };
      })
    )
    .filter((def: any) => def.finalSet !== false)
    .map((def: any) => {
      const button = createButton({ ...def, index: 1 });
      if (def.id) modalInputs[`${def.id}-1`] = button;
      return button;
    })
    .forEach((button) => finalSetFormat.appendChild(button));
  content.appendChild(finalSetFormat);

  const finalSetConfig = document.createElement('div');
  finalSetConfig.id = 'finalSetConfig';
  modalInputs['finalSetConfigDiv'] = finalSetConfig;
  finalSetConfig.style.display = parsedMatchUpFormat.finalSetFormat ? '' : NONE;
  finalSetConfig.className = 'field';
  finalSetConfig.style.fontSize = '1em';

  // Check if final set is tiebreak-only format (e.g., F:TB10)
  // Tiebreak-only formats have tiebreakSet.tiebreakTo but no setTo
  const finalSetIsTiebreakOnly =
    parsedMatchUpFormat.finalSetFormat?.tiebreakSet?.tiebreakTo && !parsedMatchUpFormat.finalSetFormat?.setTo;

  const finalSetTiebreak = document.createElement('input');
  finalSetTiebreak.className = tiebreakSwitch;
  finalSetTiebreak.name = 'finalSetTiebreak';
  finalSetTiebreak.id = 'finalSetTiebreak';
  modalInputs['finalSetTiebreak'] = finalSetTiebreak;
  finalSetTiebreak.type = 'checkbox';
  // Initialize final set tiebreak:
  // - If final set doesn't exist, default to match main set's tiebreak
  // - If final set exists, preserve its explicit tiebreakFormat setting (which could be false)
  finalSetTiebreak.checked = parsedMatchUpFormat.finalSetFormat
    ? !!parsedMatchUpFormat.finalSetFormat.tiebreakFormat
    : !!parsedMatchUpFormat.setFormat.tiebreakFormat;
  // Hide tiebreak checkbox if final set is already tiebreak-only
  finalSetTiebreak.style.display = finalSetIsTiebreakOnly ? NONE : '';
  finalSetConfig.onchange = (e) => {
    const active = (e.target as HTMLInputElement).checked;
    setComponents
      .filter(({ tb }) => tb)
      .forEach((component) => {
        const elem = getEl(`${component.id}-1`);
        if (!elem) return;

        if (elem.style.display === NONE && active) {
          const { prefix = '', suffix = '', pluralize, defaultValue: value } = component;
          const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
          const plural = pluralize && setCount > 1 ? 's' : '';
          elem.innerHTML = `${prefix}${value}${plural}${suffix}${clickable}`;
        }

        elem.style.display = active ? '' : NONE;
      });
    setMatchUpFormatString();
  };
  finalSetConfig.appendChild(finalSetTiebreak);

  const finalSetTiebreakLabel = document.createElement('label');
  finalSetTiebreakLabel.setAttribute('for', 'finalSetTiebreak');
  finalSetTiebreakLabel.id = 'finalSetTiebreakToggle';
  finalSetTiebreakLabel.innerHTML = 'Tiebreak';
  finalSetTiebreakLabel.style.marginRight = '1em';
  // Hide tiebreak label if final set is already tiebreak-only
  finalSetTiebreakLabel.style.display = finalSetIsTiebreakOnly ? NONE : '';
  modalInputs['finalSetTiebreakToggle'] = finalSetTiebreakLabel;
  finalSetConfig.appendChild(finalSetTiebreakLabel);

  content.appendChild(finalSetConfig);

  // Merge modalConfig with defaults
  const defaultModalConfig = {
    content: { padding: '1.5' },
    maxWidth: 480,
    fontSize: '14px', // cModal expects fontSize at top level, not in style
    style: {
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 8px 16px rgba(0, 102, 204, 0.2)'
    }
  };

  // Extract fontSize from style if provided there, and move to top level
  const fontSize = modalConfig?.fontSize || modalConfig?.style?.fontSize || defaultModalConfig.fontSize;

  const finalModalConfig = {
    ...defaultModalConfig,
    ...modalConfig,
    fontSize, // Ensure fontSize is at top level for cModal
    style: {
      ...defaultModalConfig.style,
      ...((config as any)?.style || {}), // Include old config.style for backward compatibility
      ...(modalConfig?.style || {}) // modalConfig.style takes precedence
    }
  };

  const modalResult = cModal.open({
    title: 'Score format',
    content: content,
    buttons,
    config: finalModalConfig
  });

  // Update final set UI after modal DOM is ready
  // This handles tiebreak-only final sets like F:TB7
  setTimeout(() => {
    if (parsedMatchUpFormat.finalSetFormat?.tiebreakSet?.tiebreakTo && !parsedMatchUpFormat.finalSetFormat?.setTo) {
      // Trigger the changeWhat callback for final set to update UI
      const whatElem = getEl('what-1');
      if (whatElem) {
        whatElem.innerHTML = `${TIEBREAKS}${clickable}`;
      }

      // Update component visibility for tiebreak-only final set
      onClicks.changeWhat(new Event('click'), 1, TIEBREAKS);
    }

    // Watch for modal removal and clean up dropdowns
    const modalElement = document.querySelector('.modal.is-active');
    if (modalElement) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node === modalElement) {
              closeCurrentDropdown();
              observer.disconnect();
            }
          });
        });
      });
      observer.observe(document.body, { childList: true });
    }
  }, 0);

  return modalResult;
}

function generateLabel({ index, finalSetLabel, label, prefix = '', suffix = '', value, pluralize }: any): string {
  const setCount = format.setFormat.bestOf || format.setFormat.exactly || 1;
  const plural = !index && pluralize && setCount > 1 ? 's' : '';
  return label || (index && finalSetLabel) || `${prefix}${value}${plural}${suffix}${clickable}`;
}

function createButton(params: any): HTMLButtonElement {
  const { id, initiallyHidden, index, value } = params;
  const button = document.createElement('button');
  button.className = 'mfcButton';
  button.id = index ? `${id}-${index}` : id;
  button.innerHTML = generateLabel(params);
  button.onclick = (e) => getButtonClick({ e, button, ...params });
  button.style.display = value || params.label ? '' : NONE;
  if (initiallyHidden) button.style.display = NONE;

  // Apply TMX button styles inline since courthive-components doesn't have .mfcButton CSS
  button.style.transition = 'all .2s ease-in-out';
  button.style.backgroundColor = 'inherit';
  button.style.border = 'none';
  button.style.color = 'inherit';
  button.style.padding = '.3em';
  button.style.textAlign = 'center';
  button.style.textDecoration = 'none';
  button.style.fontSize = '1em';
  button.style.cursor = 'pointer';

  return button;
}

function getButtonClick(params: any): void {
  const { e, id, button, pluralize, options, onChange, onChangeCallback, index, prefix = '', suffix = '' } = params;
  const setCount = format.setFormat.bestOf || format.setFormat.exactly || 1;
  const plural = !index && pluralize && setCount > 1 ? 's' : '';

  const itemConfig = isFunction(options) ? options(index) : options;
  const items = itemConfig.map((opt: any) => ({
    text: `${opt}${plural}`,
    onClick: () => {
      button.innerHTML = `${prefix}${opt}${plural}${suffix}${clickable}`;
      // Store raw value first; onChange handlers may override with transformed values
      // (e.g., changeModifier converts 'None' → undefined, changeBased converts 'G' → undefined)
      format[index ? 'finalSetFormat' : 'setFormat'][id] = opt;
      if (onChange && isFunction(onClicks[onChange])) {
        onClicks[onChange](e, index, opt);
      }
      // Call additional callback if specified
      if (onChangeCallback && isFunction(onClicks[onChangeCallback])) {
        onClicks[onChangeCallback](e, index, opt);
      }
      // Ensure format string is up-to-date (onChange handlers also call this,
      // but we call it as a safety net for any handler that might not)
      setMatchUpFormatString();
    }
  }));

  createDropdown(e, items);
}

// Track currently open dropdown to close it when opening a new one
let currentDropdown: HTMLElement | null = null;
let currentCleanupListener: ((event: MouseEvent) => void) | null = null;

function closeCurrentDropdown() {
  if (currentDropdown && document.body.contains(currentDropdown)) {
    currentDropdown.remove();
  }
  if (currentCleanupListener) {
    document.removeEventListener('click', currentCleanupListener);
    currentCleanupListener = null;
  }
  currentDropdown = null;
}

function createDropdown(e: any, items: any[]) {
  // Close any existing dropdown before opening a new one
  closeCurrentDropdown();

  const dropdown = document.createElement('div');
  dropdown.className = 'dropdown is-active';
  dropdown.style.position = 'absolute';
  dropdown.style.zIndex = '10000'; // Higher than modal (9999)

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'dropdown-menu';
  dropdownMenu.style.backgroundColor = 'white';
  dropdownMenu.style.border = '1px solid #ddd';
  dropdownMenu.style.borderRadius = '4px';
  dropdownMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

  const removeDropdown = () => {
    closeCurrentDropdown();
  };

  items.forEach((item: any) => {
    const itemDiv = document.createElement('div');
    // Don't use Bulma's dropdown-item class - it may have styling conflicts
    itemDiv.style.padding = '0.5em 1em';
    itemDiv.style.cursor = 'pointer';
    itemDiv.style.backgroundColor = 'white';
    itemDiv.style.color = '#363636';
    itemDiv.style.fontSize = '1rem';
    itemDiv.style.lineHeight = '1.5';
    itemDiv.textContent = item.text;
    itemDiv.onclick = (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      // Remove dropdown immediately, then call onClick synchronously
      removeDropdown();
      item.onClick();
    };
    itemDiv.onmouseenter = () => {
      itemDiv.style.backgroundColor = '#f5f5f5';
      itemDiv.style.color = '#363636';
    };
    itemDiv.onmouseleave = () => {
      itemDiv.style.backgroundColor = 'white';
      itemDiv.style.color = '#363636';
    };
    dropdownMenu.appendChild(itemDiv);
  });

  dropdown.appendChild(dropdownMenu);

  // Position near the clicked button
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;

  document.body.appendChild(dropdown);
  currentDropdown = dropdown;

  // Close on click outside (after a short delay to avoid immediate closure)
  setTimeout(() => {
    currentCleanupListener = (event: MouseEvent) => {
      if (!dropdown.contains(event.target as Node)) {
        removeDropdown();
      }
    };
    document.addEventListener('click', currentCleanupListener);
  }, 100);
}
