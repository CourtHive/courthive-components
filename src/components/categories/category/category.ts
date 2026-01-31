/**
 * Category editor modal.
 * Allows users to configure complete category definitions including age, rating, and ball type.
 */
import { eventGovernor } from 'tods-competition-factory';
import { renderForm } from '../../forms/renderForm';
import { cModal } from '../../modal/cmodal';
import { getAgeCategoryModal } from '../ageCategory/ageCategory';

// Configuration interface
export interface CategoryConfig {
  labels?: {
    title?: string;
    categoryNameLabel?: string;
    typeLabel?: string;
    ageCategoryCodeLabel?: string;
    ratingTypeLabel?: string;
    ratingMinLabel?: string;
    ratingMaxLabel?: string;
    ballTypeLabel?: string;
    notesLabel?: string;
  };
  options?: {
    types?: string[];
    ratingTypes?: string[];
    ballTypes?: string[];
  };
  defaultConsideredDate?: string; // YYYY-MM-DD format for age calculations
  modalConfig?: any;
}

// Default configuration
const defaultConfig: CategoryConfig = {
  labels: {
    title: 'Category',
    categoryNameLabel: 'Category Name',
    typeLabel: 'Category Type',
    ageCategoryCodeLabel: 'Age Category Code',
    ratingTypeLabel: 'Rating Type',
    ratingMinLabel: 'Minimum Rating',
    ratingMaxLabel: 'Maximum Rating',
    ballTypeLabel: 'Ball Type',
    notesLabel: 'Notes'
  },
  options: {
    types: ['AGE', 'RATING', 'BOTH'],
    ratingTypes: ['WTN', 'UTR', 'TRN', 'NTRP', 'DUPR'],
    ballTypes: [
      'HIGH_ALTITUDE',
      'STAGE1GREEN',
      'STAGE2ORANGE',
      'STAGE3RED',
      'T2STANDARD_PRESSURELESS',
      'T2STANDARD_PRESSURISED',
      'TYPE1FAST',
      'TYPE3SLOW'
    ]
  },
  defaultConsideredDate: new Date().toISOString().split('T')[0]
};

// Helper functions
function isFunction(fx: any): fx is (...args: any[]) => any {
  return typeof fx === 'function';
}

export interface Category {
  ageCategoryCode?: string;
  ageMax?: number;
  ageMaxDate?: string;
  ageMin?: number;
  ageMinDate?: string;
  ballType?: string;
  categoryName?: string;
  categoryType?: string;
  notes?: string;
  ratingMax?: number;
  ratingMin?: number;
  ratingType?: string;
  type?: 'AGE' | 'RATING' | 'BOTH';
}

/**
 * Opens the Category editor modal
 * @param existingCategory - Optional existing category to edit
 * @param editorConfig - Optional configuration for labels and options
 * @param callback - Called with the category when user clicks OK
 * @returns Modal result with open() and close() functions
 */
export function getCategoryModal(params: {
  existingCategory?: Category;
  editorConfig?: CategoryConfig;
  callback?: (category: Category) => void;
}): any {
  const { existingCategory, editorConfig: userConfig, callback } = params;

  // Merge user config with defaults
  const config: CategoryConfig = {
    labels: { ...defaultConfig.labels, ...userConfig?.labels },
    options: { ...defaultConfig.options, ...userConfig?.options },
    defaultConsideredDate: userConfig?.defaultConsideredDate || defaultConfig.defaultConsideredDate,
    modalConfig: userConfig?.modalConfig || {}
  };

  // Initialize category state
  const category: Category = {
    categoryName: existingCategory?.categoryName || '',
    type: existingCategory?.type,
    ageCategoryCode: existingCategory?.ageCategoryCode,
    ratingType: existingCategory?.ratingType,
    ratingMin: existingCategory?.ratingMin,
    ratingMax: existingCategory?.ratingMax,
    ballType: existingCategory?.ballType,
    notes: existingCategory?.notes || '',
    // Calculated age fields (read-only, calculated from ageCategoryCode)
    ageMin: existingCategory?.ageMin,
    ageMax: existingCategory?.ageMax,
    ageMinDate: existingCategory?.ageMinDate,
    ageMaxDate: existingCategory?.ageMaxDate
  };

  const consideredDate = config.defaultConsideredDate;

  // Create modal content
  const content = document.createElement('div');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.gap = '1em';
  content.style.minWidth = '400px';

  // Update calculated age details display
  const updateAgeDetailsDisplay = () => {
    const detailsPanel = content.querySelector('#ageDetailsPanel') as HTMLElement;
    if (!detailsPanel) return;

    if (!category.ageCategoryCode || category.ageCategoryCode === 'OPEN') {
      detailsPanel.style.display = 'none';
      return;
    }

    try {
      const result = eventGovernor.getCategoryAgeDetails({
        category: { ageCategoryCode: category.ageCategoryCode },
        consideredDate
      });

      if (result.error) {
        detailsPanel.style.display = 'block';
        detailsPanel.innerHTML = `
          <div style="padding: 0.75em; background-color: #ffe8e8; border-left: 4px solid #ff4444; border-radius: 4px; color: #000;">
            <strong style="color: #000;">Error:</strong> ${
              typeof result.error === 'string' ? result.error : result.error.message || 'Invalid category'
            }
          </div>
        `;
        return;
      }

      // Update category with calculated values
      category.ageMin = result.ageMin;
      category.ageMax = result.ageMax;
      category.ageMinDate = result.ageMinDate;
      category.ageMaxDate = result.ageMaxDate;

      detailsPanel.style.display = 'block';
      detailsPanel.innerHTML = `
        <div style="padding: 0.75em; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; color: #000;">
          <strong style="color: #000;">Age Range:</strong> ${result.ageMin || 'N/A'} - ${result.ageMax || 'N/A'}<br>
          <strong style="color: #000;">Min Birth Date:</strong> ${result.ageMinDate || 'N/A'}<br>
          <strong style="color: #000;">Max Birth Date:</strong> ${result.ageMaxDate || 'N/A'}
        </div>
      `;
    } catch (error: any) {
      detailsPanel.style.display = 'block';
      detailsPanel.innerHTML = `
        <div style="padding: 0.75em; background-color: #ffe8e8; border-left: 4px solid #ff4444; border-radius: 4px; color: #000;">
          <strong style="color: #000;">Error:</strong> ${error?.message || 'Failed to calculate age details'}
        </div>
      `;
    }
  };

  // Render form fields using courthive-components renderForm
  const formContainer = document.createElement('div');

  // Validation function that reads LIVE values from inputs (not stale state)
  const isValid = (inputs: any): boolean => {
    // Require category name to be at least 5 characters
    const categoryName = inputs.categoryName?.value || '';
    if (categoryName.trim().length < 5) {
      return false;
    }

    // Require type to be selected
    const type = inputs.type?.value;
    if (!type) {
      return false;
    }

    // Require either age category OR rating to be defined
    const hasAgeCategory = type === 'AGE' || type === 'BOTH';
    const hasRating = type === 'RATING' || type === 'BOTH';

    if (hasAgeCategory && !hasRating) {
      // Type is AGE - require ageCategoryCode
      return !!category.ageCategoryCode;
    } else if (!hasAgeCategory && hasRating) {
      // Type is RATING - require ratingType (from state, not inputs since it's in a separate form)
      return !!category.ratingType;
    } else if (hasAgeCategory && hasRating) {
      // Type is BOTH - require at least one (ageCategoryCode OR ratingType)
      return !!(category.ageCategoryCode || category.ratingType);
    }

    return false;
  };

  // Update button state function - reads from inputs
  const updateButtonState = (inputs: any) => {
    const okButton = document.getElementById('categoryOkButton') as HTMLButtonElement;
    if (okButton) {
      okButton.disabled = !isValid(inputs);
    }
  };

  const nameValidator =
    (minLength: number, maxLength?: number) =>
    (value: string): boolean =>
      value?.trim().length >= minLength && (!maxLength || value?.trim().length <= maxLength);

  const formInputs = renderForm(
    formContainer,
    [
      // Category Name
      {
        label: config.labels?.categoryNameLabel || 'Category Name',
        validator: nameValidator(5),
        error: 'Minimum 5 characters',
        field: 'categoryName',
        placeholder: 'e.g., Boys U18, Open Singles, 3.5-4.0',
        value: category.categoryName,
        focus: true,
        onChange: (e: Event) => {
          category.categoryName = (e.target as HTMLInputElement).value;
        }
      },
      // Type Selector
      {
        label: config.labels?.typeLabel || 'Category Type',
        field: 'type',
        options: [
          { label: 'Select type...', value: '', selected: !category.type },
          ...(config.options?.types || []).map((type) => ({
            label: type,
            value: type,
            selected: type === category.type
          }))
        ],
        onChange: (e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          category.type = value as 'AGE' | 'RATING' | 'BOTH' | undefined;
          updateFieldVisibility();
        }
      },
      // Ball Type Selector
      {
        label: config.labels?.ballTypeLabel || 'Ball Type',
        field: 'ballType',
        options: [
          { label: 'None', value: '', selected: !category.ballType },
          ...(config.options?.ballTypes || []).map((ballType) => ({
            label: ballType,
            value: ballType,
            selected: ballType === category.ballType
          }))
        ],
        onChange: (e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          category.ballType = value || undefined;
        }
      },
      // Notes
      {
        label: config.labels?.notesLabel || 'Notes',
        field: 'notes',
        placeholder: 'Additional information...',
        value: category.notes,
        onChange: (e: Event) => {
          category.notes = (e.target as HTMLInputElement).value;
        }
      }
    ],
    // Relationships for responsive button state updates (onInput fires on every keystroke)
    [
      {
        control: 'categoryName',
        onInput: ({ inputs }: any) => {
          updateButtonState(inputs);
        }
      },
      {
        control: 'type',
        onInput: ({ inputs }: any) => {
          updateButtonState(inputs);
        }
      },
      {
        control: 'ballType',
        onInput: ({ inputs }: any) => {
          updateButtonState(inputs);
        }
      },
      {
        control: 'notes',
        onInput: ({ inputs }: any) => {
          updateButtonState(inputs);
        }
      }
    ]
  );

  content.appendChild(formContainer);

  // Age Category section (conditional)
  const ageCategorySection = document.createElement('div');
  ageCategorySection.id = 'ageCategorySection';
  ageCategorySection.style.display = category.type === 'AGE' || category.type === 'BOTH' ? 'block' : 'none';

  const ageCategoryLabel = document.createElement('label');
  ageCategoryLabel.textContent = config.labels?.ageCategoryCodeLabel || 'Age Category Code';
  ageCategoryLabel.style.display = 'block';
  ageCategoryLabel.style.marginBottom = '0.5em';
  ageCategoryLabel.style.fontWeight = 'bold';
  ageCategoryLabel.style.fontSize = '0.9em';
  ageCategoryLabel.style.color = '#000';
  ageCategorySection.appendChild(ageCategoryLabel);

  const ageCategoryDisplay = document.createElement('div');
  ageCategoryDisplay.style.display = 'flex';
  ageCategoryDisplay.style.alignItems = 'center';
  ageCategoryDisplay.style.gap = '0.5em';

  const ageCategoryValue = document.createElement('div');
  ageCategoryValue.id = 'ageCategoryValue';
  ageCategoryValue.style.padding = '0.5em';
  ageCategoryValue.style.border = '1px solid #b5b5b5';
  ageCategoryValue.style.borderRadius = '4px';
  ageCategoryValue.style.backgroundColor = '#f5f5f5';
  ageCategoryValue.style.flex = '1';
  ageCategoryValue.style.minHeight = '2.5em';
  ageCategoryValue.style.display = 'flex';
  ageCategoryValue.style.alignItems = 'center';
  ageCategoryValue.style.color = '#000';
  ageCategoryValue.textContent = category.ageCategoryCode || 'Not set';
  ageCategoryDisplay.appendChild(ageCategoryValue);

  const editAgeCategoryButton = document.createElement('button');
  editAgeCategoryButton.className = 'button is-info is-small';
  editAgeCategoryButton.textContent = category.ageCategoryCode ? 'Edit' : 'Set';
  editAgeCategoryButton.onclick = () => {
    // Launch Age Category editor with current category's ageCategoryCode
    getAgeCategoryModal({
      existingAgeCategoryCode: category.ageCategoryCode, // Pass current value for round-trip editing
      editorConfig: {
        defaultConsideredDate: consideredDate
      },
      callback: (result) => {
        category.ageCategoryCode = result.ageCategoryCode;
        ageCategoryValue.textContent = result.ageCategoryCode || 'Not set';
        editAgeCategoryButton.textContent = result.ageCategoryCode ? 'Edit' : 'Set';
        updateAgeDetailsDisplay();
        updateButtonState(formInputs);
      }
    });
  };
  ageCategoryDisplay.appendChild(editAgeCategoryButton);

  ageCategorySection.appendChild(ageCategoryDisplay);

  // Age details panel (shows calculated age ranges)
  const ageDetailsPanel = document.createElement('div');
  ageDetailsPanel.id = 'ageDetailsPanel';
  ageDetailsPanel.style.marginTop = '0.5em';
  ageDetailsPanel.style.display = 'none';
  ageCategorySection.appendChild(ageDetailsPanel);

  content.appendChild(ageCategorySection);

  // Rating section (conditional)
  const ratingSection = document.createElement('div');
  ratingSection.id = 'ratingSection';
  ratingSection.style.display = category.type === 'RATING' || category.type === 'BOTH' ? 'block' : 'none';

  const ratingSectionContainer = document.createElement('div');
  renderForm(
    ratingSectionContainer,
    [
      // Rating Type
      {
        label: config.labels?.ratingTypeLabel || 'Rating Type',
        field: 'ratingType',
        options: [
          { label: 'Select rating type...', value: '', selected: !category.ratingType },
          ...(config.options?.ratingTypes || []).map((ratingType) => ({
            label: ratingType,
            value: ratingType,
            selected: ratingType === category.ratingType
          }))
        ],
        onChange: (e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          category.ratingType = value || undefined;
        }
      },
      // Rating Range (side by side)
      {
        label: config.labels?.ratingMinLabel || 'Minimum Rating',
        field: 'ratingMin',
        type: 'number',
        placeholder: 'Min',
        value: category.ratingMin?.toString() || '',
        onChange: (e: Event) => {
          const value = (e.target as HTMLInputElement).value;
          category.ratingMin = value ? Number.parseFloat(value) : undefined;
        },
        fieldPair: {
          label: config.labels?.ratingMaxLabel || 'Maximum Rating',
          field: 'ratingMax',
          type: 'number',
          placeholder: 'Max',
          value: category.ratingMax?.toString() || '',
          onChange: (e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            category.ratingMax = value ? Number.parseFloat(value) : undefined;
          }
        }
      }
    ],
    // Relationships for responsive button state updates (onInput fires on every keystroke)
    [
      {
        control: 'ratingType',
        onInput: () => {
          updateButtonState(formInputs);
        }
      },
      {
        control: 'ratingMin',
        onInput: () => {
          updateButtonState(formInputs);
        }
      },
      {
        control: 'ratingMax',
        onInput: () => {
          updateButtonState(formInputs);
        }
      }
    ]
  );

  ratingSection.appendChild(ratingSectionContainer);
  content.appendChild(ratingSection);

  // Function to update field visibility based on type
  const updateFieldVisibility = () => {
    const showAge = category.type === 'AGE' || category.type === 'BOTH';
    const showRating = category.type === 'RATING' || category.type === 'BOTH';

    ageCategorySection.style.display = showAge ? 'block' : 'none';
    ratingSection.style.display = showRating ? 'block' : 'none';

    if (showAge) {
      updateAgeDetailsDisplay();
    }
  };

  // Initial update
  setTimeout(() => {
    updateFieldVisibility();
    updateAgeDetailsDisplay();
  }, 0);

  // Modal buttons
  const buttons = [
    {
      label: 'Cancel',
      close: true
    },
    {
      label: 'OK',
      id: 'categoryOkButton',
      intent: 'is-success',
      close: true,
      disabled: true, // Initially disabled until validation passes
      onClick: () => {
        if (isFunction(callback)) {
          callback(category);
        }
      }
    }
  ];

  // Merge modal config
  const finalModalConfig = {
    ...config.modalConfig
  };

  // Open modal
  const modalResult = cModal.open({
    title: config.labels?.title || 'Category',
    content,
    buttons,
    config: finalModalConfig
  });

  // Initial button state check after modal renders
  setTimeout(() => {
    updateButtonState(formInputs);
  }, 0);

  return modalResult;
}
