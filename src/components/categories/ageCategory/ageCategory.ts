/**
 * Age Category Code editor modal.
 * Allows users to configure age category codes following ITF TODS standards.
 */
import { eventGovernor } from 'tods-competition-factory';
import { renderForm } from '../../forms/renderForm';
import { cModal } from '../../modal/cmodal';
import {
  parseAgeCategoryCode,
  buildAgeCategoryCode,
  getAgeOptions,
  getCategoryTypeOptions,
  categoryTypeToInternal,
  internalToCategory,
  getDefaultPredefinedCodes,
  type ParsedAgeCategory
} from './ageCategoryLogic';

const clickable = '▾'; // clickable character

// Helper functions
function isFunction(fx: any): fx is (...args: any[]) => any {
  return typeof fx === 'function';
}

// Configuration interface
export interface AgeCategoryConfig {
  labels?: {
    title?: string;
    consideredDateLabel?: string;
    typeLabel?: string;
    ageLabel?: string;
    standardCodesLabel?: string;
  };
  options?: {
    ages?: number[];
    categoryTypes?: string[];
  };
  preDefinedCodes?: Array<{
    code: string;
    text: string;
  }>;
  defaultConsideredDate?: string; // YYYY-MM-DD format
}

// Default configuration
const defaultConfig: AgeCategoryConfig = {
  labels: {
    title: 'Age Category',
    consideredDateLabel: 'Considered Date',
    typeLabel: 'Category Type',
    ageLabel: 'Age',
    standardCodesLabel: 'Standard Categories'
  },
  options: {
    ages: getAgeOptions(),
    categoryTypes: getCategoryTypeOptions()
  },
  defaultConsideredDate: new Date().toISOString().split('T')[0]
};

let editorConfig: AgeCategoryConfig = defaultConfig;
let selectedAgeCategoryCode: string;
let consideredDate: string;

// Current editor state
const editorState: ParsedAgeCategory = {
  type: 'open'
};

interface CalculatedAgeDetails {
  ageMin?: number;
  ageMax?: number;
  ageMinDate?: string;
  ageMaxDate?: string;
  errors?: string[];
}

let calculatedDetails: CalculatedAgeDetails = {};

/**
 * Calculate age details using factory function
 */
function calculateAgeDetails(): void {
  const code = buildAgeCategoryCode(editorState);
  if (!code || code === 'OPEN') {
    calculatedDetails = {};
    return;
  }

  try {
    const result = eventGovernor.getCategoryAgeDetails({
      category: { ageCategoryCode: code },
      consideredDate
    });

    // Check if result has an error
    if (result.error) {
      calculatedDetails = {
        errors: [typeof result.error === 'string' ? result.error : result.error.message || 'Invalid category or date']
      };
      return;
    }

    calculatedDetails = {
      ageMin: result.ageMin,
      ageMax: result.ageMax,
      ageMinDate: result.ageMinDate,
      ageMaxDate: result.ageMaxDate,
      errors: result.errors
    };
  } catch (error) {
    calculatedDetails = {
      errors: [`Failed to calculate age details: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Update the displayed age category code
 */
function updateAgeCategoryCodeDisplay(): void {
  const code = buildAgeCategoryCode(editorState);
  selectedAgeCategoryCode = code;

  const codeDisplay = document.getElementById('ageCategoryCodeString');
  if (codeDisplay) {
    codeDisplay.innerHTML = code || 'Invalid';
  }

  // Update calculated details display
  calculateAgeDetails();
  updateCalculatedDetailsDisplay();
}

/**
 * Update the calculated details panel
 */
function updateCalculatedDetailsDisplay(): void {
  const detailsPanel = document.getElementById('calculatedDetailsPanel');
  if (!detailsPanel) return;

  if (editorState.type === 'open' || !selectedAgeCategoryCode) {
    detailsPanel.style.display = 'none';
    return;
  }

  detailsPanel.style.display = '';

  const { ageMin, ageMax, ageMinDate, ageMaxDate, errors } = calculatedDetails;

  let html = '<div style="margin-top: 1em; padding: 0.75em; background: #f5f5f5; border-radius: 4px; color: #000;">';

  if (errors && errors.length > 0) {
    html +=
      '<div style="color: red; margin-bottom: 0.5em;"><strong style="color: #000;">Errors:</strong><ul style="margin: 0; padding-left: 1.5em; color: #000;">';
    errors.forEach((err) => {
      html += `<li style="color: red;">${err}</li>`;
    });
    html += '</ul></div>';
  }

  if (ageMin !== undefined || ageMax !== undefined) {
    html += '<div style="margin-bottom: 0.5em; color: #000;"><strong style="color: #000;">Age Range:</strong> ';
    if (ageMin !== undefined && ageMax !== undefined) {
      html += `${ageMin} - ${ageMax}`;
    } else if (ageMin !== undefined) {
      html += `${ageMin} and over`;
    } else if (ageMax !== undefined) {
      html += `${ageMax} and under`;
    }
    html += '</div>';
  }

  if (ageMinDate) {
    html += `<div style="margin-bottom: 0.5em; color: #000;"><strong style="color: #000;">Min Birth Date:</strong> ${ageMinDate}</div>`;
  }

  if (ageMaxDate) {
    html += `<div style="margin-bottom: 0.5em; color: #000;"><strong style="color: #000;">Max Birth Date:</strong> ${ageMaxDate}</div>`;
  }

  html += '</div>';

  detailsPanel.innerHTML = html;
}

/**
 * Update component visibility based on category type
 */
function updateComponentVisibility(): void {
  const { type } = editorState;

  // Age value field (for simple under/over)
  const ageValueElem = document.getElementById('ageValue');
  const ageValueVisible = type === 'under' || type === 'over';
  if (ageValueElem) {
    ageValueElem.style.display = ageValueVisible ? '' : 'none';
  }

  // Position toggle (for simple under/over)
  const positionToggleElem = document.getElementById('positionToggle');
  const positionToggleVisible = type === 'under' || type === 'over';
  if (positionToggleElem) {
    positionToggleElem.style.display = positionToggleVisible ? '' : 'none';
  }

  // Min age field (for range/combined)
  const ageMinElem = document.getElementById('ageMin');
  const ageMinVisible = type === 'range' || type === 'combined';
  if (ageMinElem) {
    ageMinElem.style.display = ageMinVisible ? '' : 'none';
  }

  // Max age field (for range/combined)
  const ageMaxElem = document.getElementById('ageMax');
  const ageMaxVisible = type === 'range' || type === 'combined';
  if (ageMaxElem) {
    ageMaxElem.style.display = ageMaxVisible ? '' : 'none';
  }

  // Combined label
  const combinedLabelElem = document.getElementById('combinedLabel');
  if (combinedLabelElem) {
    combinedLabelElem.style.display = type === 'combined' ? '' : 'none';
  }
}

/**
 * Create button element
 */
function createButton(params: {
  id: string;
  label: string;
  onClick?: (e: Event) => void;
  initiallyHidden?: boolean;
}): HTMLButtonElement {
  const { id, label, onClick, initiallyHidden } = params;
  const button = document.createElement('button');
  button.className = 'accButton';
  button.id = id;
  button.innerHTML = label;
  if (onClick) button.onclick = onClick;
  if (initiallyHidden) button.style.display = 'none';

  // Apply button styles with explicit black text color
  button.style.transition = 'all .2s ease-in-out';
  button.style.backgroundColor = 'inherit';
  button.style.border = 'none';
  button.style.color = '#000'; // Explicit black text
  button.style.padding = '.3em';
  button.style.textAlign = 'center';
  button.style.textDecoration = 'none';
  button.style.fontSize = '1em';
  button.style.cursor = 'pointer';

  return button;
}

// Track currently open dropdown
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

function createDropdown(e: Event, items: Array<{ text: string; onClick: () => void }>) {
  closeCurrentDropdown();

  const dropdown = document.createElement('div');
  dropdown.className = 'dropdown is-active';
  dropdown.style.position = 'absolute';
  dropdown.style.zIndex = '10000';

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'dropdown-menu';
  dropdownMenu.style.backgroundColor = 'white';
  dropdownMenu.style.border = '1px solid #ddd';
  dropdownMenu.style.borderRadius = '4px';
  dropdownMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

  const removeDropdown = () => {
    closeCurrentDropdown();
  };

  items.forEach((item) => {
    const itemDiv = document.createElement('div');
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
      removeDropdown();
      setTimeout(() => {
        item.onClick();
      }, 0);
    };
    itemDiv.onmouseenter = () => {
      itemDiv.style.backgroundColor = '#f5f5f5';
    };
    itemDiv.onmouseleave = () => {
      itemDiv.style.backgroundColor = 'white';
    };
    dropdownMenu.appendChild(itemDiv);
  });

  dropdown.appendChild(dropdownMenu);

  const rect = (e.target as HTMLElement).getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;

  document.body.appendChild(dropdown);
  currentDropdown = dropdown;

  setTimeout(() => {
    currentCleanupListener = (event: MouseEvent) => {
      if (!dropdown.contains(event.target as Node)) {
        removeDropdown();
      }
    };
    document.addEventListener('click', currentCleanupListener);
  }, 100);
}

/**
 * Main function to open the age category modal
 */
export function getAgeCategoryModal({
  existingCategory = {},
  consideredDate: providedDate,
  callback,
  config,
  modalConfig
}: {
  existingCategory?: { ageCategoryCode?: string; [key: string]: any };
  consideredDate?: string;
  callback?: (category: { ageCategoryCode: string; [key: string]: any }) => void;
  config?: AgeCategoryConfig;
  modalConfig?: any;
} = {}) {
  // Merge config
  if (config) {
    editorConfig = {
      labels: { ...defaultConfig.labels, ...config.labels },
      options: { ...defaultConfig.options, ...config.options },
      preDefinedCodes: config.preDefinedCodes || getDefaultPredefinedCodes(),
      defaultConsideredDate: config.defaultConsideredDate || defaultConfig.defaultConsideredDate
    };
  } else {
    editorConfig = { ...defaultConfig, preDefinedCodes: getDefaultPredefinedCodes() };
  }

  // Set considered date (YYYY-MM-DD format)
  consideredDate = providedDate || editorConfig.defaultConsideredDate || new Date().toISOString().split('T')[0];

  // Parse existing code
  const existingCode = existingCategory.ageCategoryCode || 'OPEN';
  selectedAgeCategoryCode = existingCode;

  const parsed = parseAgeCategoryCode(existingCode);
  if (parsed) {
    Object.assign(editorState, parsed);
  } else {
    Object.assign(editorState, { type: 'open' });
  }

  const onSelect = () => {
    const code = buildAgeCategoryCode(editorState);
    if (isFunction(callback)) {
      callback({
        ...existingCategory,
        ageCategoryCode: code
      });
    }
  };

  const buttons = [
    {
      onClick: () => {
        closeCurrentDropdown();
        callback?.({ ...existingCategory, ageCategoryCode: '' });
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
        closeCurrentDropdown();
        onSelect();
      }
    }
  ];

  const content = document.createElement('div');

  // Close dropdown when clicking inside modal
  content.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.classList.contains('accButton')) {
      closeCurrentDropdown();
    }
  });

  // Age Category Code Display
  const codeDisplay = document.createElement('div');
  codeDisplay.id = 'ageCategoryCodeString';
  codeDisplay.innerHTML = selectedAgeCategoryCode;
  codeDisplay.style.fontSize = '1.5em';
  codeDisplay.style.color = 'blue';
  codeDisplay.style.marginBottom = '1em';
  codeDisplay.style.fontWeight = 'bold';
  content.appendChild(codeDisplay);

  // Render form fields using courthive-components renderForm
  const formContainer = document.createElement('div');
  formContainer.style.marginBottom = '1em';

  renderForm(formContainer, [
    // Standard Categories Dropdown
    {
      label: editorConfig.labels?.standardCodesLabel || 'Standard Categories',
      field: 'standardCategory',
      id: 'ageCategorySelector',
      options: [
        {
          label: 'Custom',
          value: 'Custom',
          selected: !editorConfig.preDefinedCodes?.some((f) => f.code === selectedAgeCategoryCode)
        },
        ...(editorConfig.preDefinedCodes || []).map((format) => ({
          selected: format.code === selectedAgeCategoryCode,
          value: format.code,
          label: format.text
        }))
      ],
      onChange: (e: Event) => {
        const code = (e.target as HTMLSelectElement).value;
        if (code === 'Custom') return;

        selectedAgeCategoryCode = code;
        const parsed = parseAgeCategoryCode(code);
        if (parsed) {
          Object.assign(editorState, parsed);
          updateComponentVisibility();
          updateButtonLabels();
          updateAgeCategoryCodeDisplay();
        }
      }
    },
    // Considered Date Input
    {
      label: editorConfig.labels?.consideredDateLabel || 'Considered Date',
      field: 'consideredDate',
      id: 'consideredDateInput',
      value: consideredDate,
      date: true,
      onChange: (e: Event) => {
        consideredDate = (e.target as HTMLInputElement).value;
        updateAgeCategoryCodeDisplay();
      }
    }
  ]);

  content.appendChild(formContainer);

  // Category Type Selector
  const categoryTypeButton = createButton({
    id: 'categoryType',
    label: `${internalToCategory(editorState.type)}${clickable}`,
    onClick: (e) => {
      const types = editorConfig.options?.categoryTypes || getCategoryTypeOptions();
      const items = types.map((type) => ({
        text: type,
        onClick: () => {
          const internalType = categoryTypeToInternal(type);
          editorState.type = internalType;

          // Reset age values when changing type
          editorState.ageValue = undefined;
          editorState.ageMin = undefined;
          editorState.ageMax = undefined;

          // Set defaults for new type
          if (internalType === 'under' || internalType === 'over') {
            editorState.ageValue = 18;
            editorState.uPosition = 'post';
            editorState.oPosition = 'post';
          } else if (internalType === 'range' || internalType === 'combined') {
            editorState.ageMin = 10;
            editorState.ageMax = 18;
            editorState.uPosition = 'post';
            editorState.oPosition = 'post';
            editorState.rangeOrder = 'min-max';
          }

          if (internalType === 'combined') {
            editorState.isCombined = true;
          } else {
            editorState.isCombined = false;
          }

          categoryTypeButton.innerHTML = `${type}${clickable}`;
          updateComponentVisibility();
          updateButtonLabels();
          updateAgeCategoryCodeDisplay();
        }
      }));
      createDropdown(e, items);
    }
  });

  // Configuration Panel
  const configPanel = document.createElement('div');
  configPanel.style.display = 'flex';
  configPanel.style.flexWrap = 'wrap';
  configPanel.style.gap = '0.5em';
  configPanel.style.marginBottom = '1em';

  configPanel.appendChild(categoryTypeButton);

  // Age Value (for simple under/over)
  const ageValueButton = createButton({
    id: 'ageValue',
    label: `${editorState.ageValue || 18}${clickable}`,
    onClick: (e) => {
      const ages = editorConfig.options?.ages || getAgeOptions();
      const items = ages.map((age) => ({
        text: String(age),
        onClick: () => {
          editorState.ageValue = age;
          ageValueButton.innerHTML = `${age}${clickable}`;
          updateAgeCategoryCodeDisplay();
        }
      }));
      createDropdown(e, items);
    },
    initiallyHidden: editorState.type !== 'under' && editorState.type !== 'over'
  });
  configPanel.appendChild(ageValueButton);

  // Position Toggle (for simple under/over)
  const positionToggleButton = createButton({
    id: 'positionToggle',
    label: getPositionLabel(),
    onClick: () => {
      if (editorState.type === 'under') {
        editorState.uPosition = editorState.uPosition === 'pre' ? 'post' : 'pre';
      } else if (editorState.type === 'over') {
        editorState.oPosition = editorState.oPosition === 'pre' ? 'post' : 'pre';
      }
      positionToggleButton.innerHTML = getPositionLabel();
      updateAgeCategoryCodeDisplay();
    },
    initiallyHidden: editorState.type !== 'under' && editorState.type !== 'over'
  });
  configPanel.appendChild(positionToggleButton);

  // Min Age (for range/combined)
  const ageMinButton = createButton({
    id: 'ageMin',
    label: `Min: ${editorState.ageMin || 10}${clickable}`,
    onClick: (e) => {
      const ages = editorConfig.options?.ages || getAgeOptions();
      const items = ages.map((age) => ({
        text: String(age),
        onClick: () => {
          editorState.ageMin = age;
          ageMinButton.innerHTML = `Min: ${age}${clickable}`;
          updateAgeCategoryCodeDisplay();
        }
      }));
      createDropdown(e, items);
    },
    initiallyHidden: editorState.type !== 'range' && editorState.type !== 'combined'
  });
  configPanel.appendChild(ageMinButton);

  // Max Age (for range/combined)
  const ageMaxButton = createButton({
    id: 'ageMax',
    label: `Max: ${editorState.ageMax || 18}${clickable}`,
    onClick: (e) => {
      const ages = editorConfig.options?.ages || getAgeOptions();
      const items = ages.map((age) => ({
        text: String(age),
        onClick: () => {
          editorState.ageMax = age;
          ageMaxButton.innerHTML = `Max: ${age}${clickable}`;
          updateAgeCategoryCodeDisplay();
        }
      }));
      createDropdown(e, items);
    },
    initiallyHidden: editorState.type !== 'range' && editorState.type !== 'combined'
  });
  configPanel.appendChild(ageMaxButton);

  // Combined label
  const combinedLabel = document.createElement('div');
  combinedLabel.id = 'combinedLabel';
  combinedLabel.innerHTML = '<em style="color: #888;">Combined age range</em>';
  combinedLabel.style.display = editorState.type === 'combined' ? '' : 'none';
  combinedLabel.style.padding = '0.3em';
  configPanel.appendChild(combinedLabel);

  content.appendChild(configPanel);

  // Calculated Details Panel
  const detailsPanel = document.createElement('div');
  detailsPanel.id = 'calculatedDetailsPanel';
  content.appendChild(detailsPanel);

  // Helper function to get position label
  function getPositionLabel(): string {
    if (editorState.type === 'under') {
      const age = editorState.ageValue || 18;
      return editorState.uPosition === 'pre' ? `U${age}` : `${age}U`;
    } else if (editorState.type === 'over') {
      const age = editorState.ageValue || 10;
      return editorState.oPosition === 'pre' ? `O${age}` : `${age}O`;
    }
    return '';
  }

  // Helper function to update all button labels
  function updateButtonLabels(): void {
    // Update age value button
    if (editorState.ageValue !== undefined) {
      const ageValueBtn = document.getElementById('ageValue');
      if (ageValueBtn) {
        ageValueBtn.innerHTML = `${editorState.ageValue}${clickable}`;
      }
    }

    // Update position toggle
    const posToggleBtn = document.getElementById('positionToggle');
    if (posToggleBtn) {
      posToggleBtn.innerHTML = getPositionLabel();
    }

    // Update min/max buttons
    if (editorState.ageMin !== undefined) {
      const ageMinBtn = document.getElementById('ageMin');
      if (ageMinBtn) {
        ageMinBtn.innerHTML = `Min: ${editorState.ageMin}${clickable}`;
      }
    }

    if (editorState.ageMax !== undefined) {
      const ageMaxBtn = document.getElementById('ageMax');
      if (ageMaxBtn) {
        ageMaxBtn.innerHTML = `Max: ${editorState.ageMax}${clickable}`;
      }
    }
  }

  // Modal config
  const defaultModalConfig = {
    content: { padding: '1.5' },
    maxWidth: 480,
    fontSize: '14px',
    style: {
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 8px 16px rgba(0, 102, 204, 0.2)'
    }
  };

  const fontSize = modalConfig?.fontSize || modalConfig?.style?.fontSize || defaultModalConfig.fontSize;

  const finalModalConfig = {
    ...defaultModalConfig,
    ...modalConfig,
    fontSize,
    style: {
      ...defaultModalConfig.style,
      ...(config?.style || {}),
      ...(modalConfig?.style || {})
    }
  };

  const modalResult = cModal.open({
    title: editorConfig.labels?.title || 'Age Category',
    content,
    buttons,
    config: finalModalConfig
  });

  // Initial update - calculate and display after modal is rendered
  setTimeout(() => {
    updateComponentVisibility();
    updateButtonLabels();
    updateAgeCategoryCodeDisplay();
  }, 0);

  // Watch for modal removal and clean up dropdowns
  setTimeout(() => {
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
