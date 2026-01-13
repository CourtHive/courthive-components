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
} from './matchUpFormatLogic';

import matchUpFormats from './matchUpFormats.json';

const NONE = 'none';
const clickable = '▾'; // clickable character

// Helper functions
function isFunction(fx: any): fx is (...args: any[]) => any {
  return typeof fx === 'function';
}

let selectedMatchUpFormat: string;
let parsedMatchUpFormat: any;

const TIMED_SETS = 'Timed set';
const TIEBREAKS = 'Tiebreak';
const NOAD = 'No-Ad';
const SETS = 'Set';
const AD = 'Ad';

interface SetFormatConfig {
  descriptor: string;
  bestOf?: number;
  advantage: string;
  what: string;
  setTo: number;
  tiebreakAt: number;
  tiebreakTo: number;
  winBy: number;
  minutes: number;
}

interface FormatConfig {
  setFormat: SetFormatConfig;
  finalSetFormat: SetFormatConfig;
}

const format: FormatConfig = {
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
  
  // Check if tiebreak checkbox is checked (DOM read)
  const hasTiebreak = (document.getElementById(index ? 'finalSetTiebreak' : 'setTiebreak') as HTMLInputElement)?.checked || false;
  
  // Delegate to pure logic function
  return buildSetFormat(config, hasTiebreak);
}

function generateMatchUpFormat(): string {
  const setFormat = getSetFormat();

  parsedMatchUpFormat = {
    setFormat
  };

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

  const hasFinalSet = (document.getElementById('finalSetOption') as HTMLInputElement)?.checked;
  if (hasFinalSet) parsedMatchUpFormat.finalSetFormat = getSetFormat(1);

  const matchUpFormat = governors.scoreGovernor.stringifyMatchUpFormat(parsedMatchUpFormat);

  const predefined = matchUpFormats.some((format) => format.format === matchUpFormat);
  const elem = document.getElementById('matchUpFormatSelector') as HTMLSelectElement;

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
  const matchUpFormatString = document.getElementById('matchUpFormatString');
  if (matchUpFormatString) {
    matchUpFormatString.innerHTML = matchUpFormat;
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
    getValue: (pmf) => (pmf.exactly ? 'Exactly' : 'Best of'),
    options: ['Best of', 'Exactly'],
    id: 'descriptor',
    value: 'Best of',
    finalSet: false,
    onChange: 'changeDescriptor'
  },
  {
    getValue: (pmf) => pmf.bestOf || pmf.exactly,
    finalSet: false,
    id: 'bestOf',
    options: (index?: number) => {
      // Return [1,2,3,4,5] for 'Exactly', [1,3,5] for 'Best of'
      const descriptor = format.setFormat.descriptor;
      return descriptor === 'Exactly' ? [1, 2, 3, 4, 5] : [1, 3, 5];
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
    options: [1, 2, 3, 4, 5, 6, 7, 8, 9],
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
    options: [5, 7, 9, 10, 12],
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
      if (!setFormat.tiebreakFormat) return undefined;
      return setFormat.tiebreakFormat?.NoAD ? 1 : 2;
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
    options: [10, 15, 20, 25, 30, 45, 60, 90],
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
      // Return 'based' property directly (A/P/G or undefined)
      return setFormat.based || 'G'; // Default to 'G' for display
    },
    options: ['G', 'P', 'A'],
    onChange: 'changeBased',
    whats: [TIMED_SETS],
    defaultValue: 'G',
    id: 'based',
    timed: true
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
        format.setFormat.what = TIMED_SETS;
        // Trigger UI update for component visibility
        onClicks.changeWhat(new Event('click'), undefined, TIMED_SETS);
        
        // Update the "what" button text to show "Timed set" or "Timed sets"
        const whatElem = document.getElementById('what');
        if (whatElem) {
          const plural = currentValue > 1 ? 's' : '';
          whatElem.innerHTML = `${TIMED_SETS}${plural}${clickable}`;
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
      const bestOfElem = document.getElementById('bestOf');
      if (bestOfElem) {
        bestOfElem.innerHTML = `${validBestOf}${clickable}`;
      }
      
      // Trigger pluralize to update the "what" text if needed
      if (validBestOf !== currentValue) {
        onClicks.pluralize(new Event('click'), undefined, validBestOf);
      }
    }
    
    setMatchUpFormatString();
  },
  changeWhat: (_e, index, opt) => {
    const tiebreakOptionVisible = opt === SETS;
    const elementId = index ? 'finalSetTiebreakToggle' : 'setTiebreakToggle';
    const elem = document.getElementById(elementId);
    elem.style.display = tiebreakOptionVisible ? '' : NONE;

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
      const descriptorElem = document.getElementById('descriptor');
      if (descriptorElem) {
        descriptorElem.innerHTML = `Best of${clickable}`;
      }
      
      // Update the number button display
      const bestOfElem = document.getElementById('bestOf');
      if (bestOfElem) {
        bestOfElem.innerHTML = `${validBestOf}${clickable}`;
      }
    }

    setComponents.forEach((component) => {
      if (component.whats) {
        const { prefix = '', suffix = '', pluralize } = component;
        const visible = component.whats.includes(opt);
        const id = index ? `${component.id}-${index}` : component.id;
        const elem = document.getElementById(id);

        if (elem.style.display === NONE && visible) {
          const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
          const plural = !index && pluralize && setCount > 1 ? 's' : '';
          const value = component.defaultValue;
          elem.innerHTML = `${prefix}${value}${plural}${suffix}${clickable}`;
          // Also update the format object with the default value
          format[index ? 'finalSetFormat' : 'setFormat'][component.id] = value;
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
      const tiebreakAtElem = document.getElementById(index ? `tiebreakAt-${index}` : 'tiebreakAt');
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
    // Set based property directly (A/P/G)
    // If 'G' is selected, we can omit it (undefined) since it's the default
    format[which].based = opt === 'G' ? undefined : opt;
    setMatchUpFormatString();
  },
  pluralize: (_e, index, opt) => {
    const which = index ? 'finalSetFormat' : 'setFormat';
    const what = format[which].what;
    const elementId = index ? `what-${index}` : 'what';
    const elem = document.getElementById(elementId);
    const plural = opt > 1 ? 's' : '';
    elem.innerHTML = `${what}${plural}${clickable}`;
    
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
    const finalSetOption = document.getElementById('finalSetOption') as HTMLInputElement;
    const finalSetLabel = document.querySelector('label[for="finalSetOption"]') as HTMLElement;

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
  config?: any;
  modalConfig?: any;
} = {}) {
  // REFACTORED: Use pure function for format initialization
  // This prevents state pollution and ensures proper handling of all format types
  selectedMatchUpFormat = existingMatchUpFormat;
  parsedMatchUpFormat = matchUpFormatCode.parse(selectedMatchUpFormat);
  
  // Handle invalid format strings that parse to undefined
  if (!parsedMatchUpFormat) {
    console.warn('Invalid matchUpFormat:', selectedMatchUpFormat);
    // Fall back to default format
    selectedMatchUpFormat = 'SET3-S:6/TB7';
    parsedMatchUpFormat = matchUpFormatCode.parse(selectedMatchUpFormat);
  }
  
  // Initialize format object using pure logic function
  const initializedFormat = initializeFormatFromString(
    selectedMatchUpFormat,
    matchUpFormatCode.parse
  );
  
  // Update module-level format object
  // Use spread to ensure we get a copy, not a reference
  format.setFormat = { ...initializedFormat.setFormat };
  format.finalSetFormat = { ...initializedFormat.finalSetFormat };
  const onSelect = () => {
    // Use selectedMatchUpFormat if it's a predefined format (from dropdown selection)
    // Otherwise generate from current button states
    const dropdown = document.getElementById('matchUpFormatSelector') as HTMLSelectElement;
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
  content.appendChild(matchUpFormatString);

  const standardFormatSelector = document.createElement('div');
  standardFormatSelector.style.marginBlockEnd = '1em';
  const formatSelector = {
    id: 'matchUpFormatSelector',
    options: [
      { value: 'Custom', label: 'Custom', selected: false },
      ...matchUpFormats
        .filter((format) => format.format) // Skip the "Custom" entry from JSON
        .map((format) => ({
          selected: format.format === selectedMatchUpFormat,
          value: format.format,
          label: format.name
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

  select.onchange = (e) => {
    selectedMatchUpFormat = (e.target as HTMLSelectElement).value;
    setMatchUpFormatString(selectedMatchUpFormat);
    parsedMatchUpFormat = matchUpFormatCode.parse(selectedMatchUpFormat);
    
    // Handle invalid format strings
    if (!parsedMatchUpFormat) {
      console.warn('Invalid matchUpFormat selected:', selectedMatchUpFormat);
      return;
    }

    // Start with the setFormat from parsed result
    format.setFormat = { ...parsedMatchUpFormat.setFormat };
    
    // Handle both bestOf and exactly attributes
    // These are at the top level of parsedMatchUpFormat, not in setFormat
    if (parsedMatchUpFormat.exactly) {
      format.setFormat.exactly = parsedMatchUpFormat.exactly;
      format.setFormat.descriptor = 'Exactly';
      delete format.setFormat.bestOf;
      // IMPORTANT: Exactly only works with timed sets
      // Ensure the "what" is set correctly
      if (format.setFormat.timed) {
        format.setFormat.what = TIMED_SETS;
      }
    } else {
      format.setFormat.bestOf = parsedMatchUpFormat.bestOf;
      format.setFormat.descriptor = 'Best of';
      delete format.setFormat.exactly;
    }
    
    if (parsedMatchUpFormat.finalSetFormat) format.finalSetFormat = parsedMatchUpFormat.finalSetFormat;

    // Update Final Set toggle visibility based on bestOf/exactly value
    const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
    onClicks.updateFinalSetVisibility(null, 0, setCount);

    const finalSet = parsedMatchUpFormat.finalSetFormat;
    finalSetFormat.style.display = finalSet ? '' : NONE;
    finalSetConfig.style.display = finalSet ? '' : NONE;
    finalSetOption.checked = finalSet;

    // Check if final set is tiebreak-only (e.g., F:TB10)
    const finalSetIsTiebreakOnly = finalSet?.tiebreakSet?.tiebreakTo && !finalSet?.setTo;
    finalSetTiebreak.checked = !!finalSet?.tiebreakFormat;
    // Hide tiebreak checkbox/label if final set is tiebreak-only
    finalSetTiebreak.style.display = finalSetIsTiebreakOnly ? NONE : '';
    const finalSetTiebreakLabelElem = document.getElementById('finalSetTiebreakToggle');
    if (finalSetTiebreakLabelElem) finalSetTiebreakLabelElem.style.display = finalSetIsTiebreakOnly ? NONE : '';

    setTiebreak.checked = parsedMatchUpFormat.setFormat.tiebreakFormat;

    // Update all button values to match the selected format
    setComponents.forEach((component) => {
      if (component.getValue) {
        const setComponentValue = component.getValue(parsedMatchUpFormat);
        const elem = document.getElementById(component.id);

        if (elem && setComponentValue) {
          const { prefix = '', suffix = '', pluralize } = component;
          const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
          const plural = pluralize && setCount > 1 ? 's' : '';
          elem.innerHTML = `${prefix}${setComponentValue}${plural}${suffix}${clickable}`;
          elem.style.display = '';
        } else if (elem) {
          elem.style.display = NONE;
        }

        if (finalSet) {
          const finalComponentValue = component.getValue(parsedMatchUpFormat, true);
          const elem = document.getElementById(`${component.id}-1`);

          if (elem && finalComponentValue) {
            const { prefix = '', suffix = '', pluralize } = component;
            const setCount = parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly;
            const plural = pluralize && setCount > 1 ? 's' : '';
            elem.innerHTML = `${prefix}${finalComponentValue}${plural}${suffix}${clickable}`;
            elem.style.display = '';
          } else if (elem) {
            elem.style.display = NONE;
          }
        }
      }
    });
  };
  standardFormatSelector.appendChild(select);
  content.appendChild(standardFormatSelector);

  const setFormat = document.createElement('div');
  setFormat.style.display = 'flex';
  setFormat.style.flexWrap = 'wrap';
  setFormat.style.gap = '0.5em';
  setFormat.style.marginBottom = '1em';
  setComponents
    .map((component) => {
      const value = component.getValue ? component.getValue(parsedMatchUpFormat) : undefined;
      return createButton({ ...component, value });
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
  setTiebreak.onchange = (e) => {
    const active = (e.target as HTMLInputElement).checked;
    setComponents
      .filter(({ tb }) => tb)
      .forEach((component) => {
        const elem = document.getElementById(component.id);
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
  setConfig.appendChild(tiebreakLabel);

  // Only show final set option if setCount > 1 (can't have a final set with only 1 set)
  const showFinalSetOption = (parsedMatchUpFormat.bestOf || parsedMatchUpFormat.exactly) > 1;

  const finalSetOption = document.createElement('input');
  finalSetOption.className = 'switch is-rounded is-info';
  finalSetOption.type = 'checkbox';
  finalSetOption.name = 'finalSetOption';
  finalSetOption.checked = !!parsedMatchUpFormat.finalSetFormat;
  finalSetOption.id = 'finalSetOption';
  finalSetOption.style.display = showFinalSetOption ? '' : 'none';
  finalSetOption.onchange = (e) => {
    const active = (e.target as HTMLInputElement).checked;
    finalSetFormat.style.display = active ? '' : NONE;
    finalSetConfig.style.display = active ? '' : NONE;
    setMatchUpFormatString();
  };

  setConfig.appendChild(finalSetOption);

  const finalSetLabel = document.createElement('label');
  finalSetLabel.setAttribute('for', 'finalSetOption');
  finalSetLabel.innerHTML = 'Final set';
  finalSetLabel.style.display = showFinalSetOption ? '' : 'none';
  setConfig.appendChild(finalSetLabel);

  content.appendChild(setConfig);

  const finalSetFormat = document.createElement('div');
  finalSetFormat.style.display = parsedMatchUpFormat.finalSetFormat ? 'flex' : NONE;
  finalSetFormat.style.flexWrap = 'wrap';
  finalSetFormat.style.gap = '0.5em';
  finalSetFormat.style.marginBottom = '1em';
  finalSetFormat.id = 'finalSetFormat';
  ([{ label: `<div style='font-weight: bold'>Final set</div>`, options: [] as any[], finalSet: true }] as any[])
    .concat(
      setComponents.map((component) => {
        const value = component.getValue ? component.getValue(parsedMatchUpFormat, true) : undefined;
        return { ...component, value };
      })
    )
    .filter((def: any) => def.finalSet !== false)
    .map((def: any) => createButton({ ...def, index: 1 }))
    .forEach((button) => finalSetFormat.appendChild(button));
  content.appendChild(finalSetFormat);

  const finalSetConfig = document.createElement('div');
  finalSetConfig.id = 'finalSetConfig'; // Add id for dynamic visibility control
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
        const elem = document.getElementById(`${component.id}-1`);

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
      ...(config?.style || {}), // Include old config.style for backward compatibility
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
      const whatElem = document.getElementById('what-1');
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
      if (onChange && isFunction(onClicks[onChange])) {
        onClicks[onChange](e, index, opt);
      }
      // Call additional callback if specified
      if (onChangeCallback && isFunction(onClicks[onChangeCallback])) {
        onClicks[onChangeCallback](e, index, opt);
      }
      format[index ? 'finalSetFormat' : 'setFormat'][id] = opt;
      // Update the format string display immediately
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
      // Remove dropdown immediately (like tipster does), then call onClick
      removeDropdown();
      // Use setTimeout to allow dropdown to fully close before state updates
      setTimeout(() => {
        item.onClick();
      }, 0);
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
