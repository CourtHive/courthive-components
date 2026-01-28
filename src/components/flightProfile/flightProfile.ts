/**
 * Flight Profile editor modal.
 * Allows users to configure flight profiles for automatic participant segmentation.
 */
import { renderForm } from '../forms/renderForm';
import { cModal } from '../modal/cmodal';
import {
  generateFlightNames,
  buildScaleAttributes,
  getSplitMethodConstant,
  parseExistingFlightProfile,
  validateFlightProfile,
  getFlightCountOptions,
  DEFAULT_COLORS,
  RATING_SYSTEMS,
  SPLIT_METHODS,
  type FlightProfileState
} from './flightProfileLogic';

const clickable = '▾'; // clickable character

// Helper functions
function isFunction(fx: any): fx is (...args: any[]) => any {
  return typeof fx === 'function';
}

// Configuration interface
export interface FlightProfileConfig {
  labels?: {
    title?: string;
    flightsCountLabel?: string;
    namingTypeLabel?: string;
    customNameLabel?: string;
    suffixTypeLabel?: string;
    scaleTypeLabel?: string;
    scaleNameLabel?: string;
    eventTypeLabel?: string;
    splitMethodLabel?: string;
    flightNamesLabel?: string;
  };
  options?: {
    eventTypes?: string[];
    ratingTypes?: string[];
  };
  eventType?: string; // Pre-set event type from parent context
}

// Default configuration
const defaultConfig: FlightProfileConfig = {
  labels: {
    title: 'Flight Profile',
    flightsCountLabel: 'Number of Flights',
    namingTypeLabel: 'Naming',
    customNameLabel: 'Custom Name',
    suffixTypeLabel: 'Suffix Style',
    scaleTypeLabel: 'Scale Type',
    scaleNameLabel: 'Rating System',
    eventTypeLabel: 'Event Type',
    splitMethodLabel: 'Split Method',
    flightNamesLabel: 'Flight Names'
  },
  options: {
    eventTypes: ['SINGLES', 'DOUBLES'],
    ratingTypes: RATING_SYSTEMS
  }
};

let editorConfig: FlightProfileConfig = defaultConfig;

// Current editor state
const editorState: FlightProfileState = {
  flightsCount: 2,
  namingType: 'colors',
  customName: 'Flight',
  suffixType: 'numbers',
  scaleType: 'RATING',
  scaleName: 'WTN',
  eventType: 'SINGLES',
  splitMethod: 'LEVEL_BASED',
  isExisting: false
};

/**
 * Get current flight names preview
 */
function getFlightNamesPreview(): string {
  const names = generateFlightNames(editorState);
  return names.join(', ');
}

/**
 * Update preview and button state
 */
function updatePreview(): void {
  const previewElement = document.getElementById('flightNamesPreview');
  if (previewElement) {
    previewElement.textContent = getFlightNamesPreview();
  }
  updateOkButtonState();
}

/**
 * Update OK button enabled/disabled state
 */
function updateOkButtonState(): void {
  const okButton = document.querySelector('.modal-card-foot button.is-success') as HTMLButtonElement;
  if (okButton) {
    const errors = validateFlightProfile(editorState);
    okButton.disabled = errors.length > 0;
    okButton.style.opacity = errors.length > 0 ? '0.5' : '1';
    okButton.style.cursor = errors.length > 0 ? 'not-allowed' : 'pointer';
  }
}

/**
 * Render the flight profile form
 */
function renderFlightProfileForm(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flight-profile-editor';

  if (editorState.isExisting) {
    // Editing existing profile - only allow renaming flights
    const header = document.createElement('div');
    header.className = 'notification is-info is-light';
    header.innerHTML = '<strong style="color: #000;">Note:</strong> Flight split has already been performed. You can only rename the flights.';
    container.appendChild(header);

    // Show current configuration (read-only)
    const configSection = document.createElement('div');
    configSection.className = 'box mb-4';
    configSection.innerHTML = `
      <h3 class="title is-6" style="color: #000;">Current Configuration</h3>
      <div class="content">
        <p><strong style="color: #000;">Number of Flights:</strong> ${editorState.flightsCount}</p>
        <p><strong style="color: #000;">Scale Type:</strong> ${editorState.scaleType}</p>
        ${editorState.scaleName ? `<p><strong style="color: #000;">Rating System:</strong> ${editorState.scaleName}</p>` : ''}
        <p><strong style="color: #000;">Split Method:</strong> ${editorState.splitMethod}</p>
      </div>
    `;
    container.appendChild(configSection);

    // Editable flight names
    const namesSection = document.createElement('div');
    namesSection.className = 'field';
    namesSection.innerHTML = `
      <label class="label">${editorConfig.labels?.flightNamesLabel || 'Flight Names'}</label>
    `;

    if (editorState.flights) {
      editorState.flights.forEach((flight, index) => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field';
        fieldDiv.innerHTML = `
          <div class="control">
            <input 
              type="text" 
              class="input" 
              id="flightName_${index}"
              value="${flight.drawName}"
              placeholder="Flight ${index + 1}"
            />
          </div>
        `;
        
        const input = fieldDiv.querySelector('input') as HTMLInputElement;
        input.addEventListener('input', (e) => {
          if (editorState.flights) {
            editorState.flights[index].drawName = (e.target as HTMLInputElement).value;
          }
        });

        namesSection.appendChild(fieldDiv);
      });
    }

    container.appendChild(namesSection);

  } else {
    // Creating new profile - full configuration
    
    // Number of flights (text input with numeric validation)
    const flightsContainer = document.createElement('div');
    renderForm(flightsContainer, [
      {
        label: editorConfig.labels?.flightsCountLabel || 'Number of Flights (2-10)',
        field: 'flightsCount',
        type: 'number',
        placeholder: '2',
        value: editorState.flightsCount.toString(),
        onChange: (e: Event) => {
          const value = (e.target as HTMLInputElement).value;
          const num = parseInt(value, 10);
          editorState.flightsCount = isNaN(num) ? 0 : num;
          updatePreview();
        }
      }
    ]);
    container.appendChild(flightsContainer);

    // Naming type
    const namingContainer = document.createElement('div');
    renderForm(namingContainer, [
      {
        label: editorConfig.labels?.namingTypeLabel || 'Naming',
        field: 'namingType',
        options: [
          { label: 'Color Names', value: 'colors' },
          { label: 'Custom Name', value: 'custom' }
        ],
        value: editorState.namingType,
        onChange: (e: Event) => {
          editorState.namingType = (e.target as HTMLSelectElement).value as 'colors' | 'custom';
          updatePreview();
          renderFlightProfileModal();
        }
      }
    ]);
    container.appendChild(namingContainer);

    // Custom name and suffix (only if custom naming)
    if (editorState.namingType === 'custom') {
      // Create a container for the two fields side by side
      const customFieldsRow = document.createElement('div');
      customFieldsRow.style.display = 'flex';
      customFieldsRow.style.gap = '1rem';
      customFieldsRow.style.alignItems = 'flex-start';

      // Custom name field (70% width)
      const customNameContainer = document.createElement('div');
      customNameContainer.style.flex = '2';
      renderForm(customNameContainer, [
        {
          label: editorConfig.labels?.customNameLabel || 'Custom Name',
          field: 'customName',
          value: editorState.customName,
          placeholder: 'Flight',
          onChange: (e: Event) => {
            editorState.customName = (e.target as HTMLInputElement).value;
            updatePreview();
          }
        }
      ]);
      customFieldsRow.appendChild(customNameContainer);

      // Suffix style selector (30% width)
      const suffixContainer = document.createElement('div');
      suffixContainer.style.flex = '1';
      renderForm(suffixContainer, [
        {
          label: editorConfig.labels?.suffixTypeLabel || 'Suffix Style',
          field: 'suffixType',
          options: [
            { label: 'Letters (A, B, C)', value: 'letters' },
            { label: 'Numbers (1, 2, 3)', value: 'numbers' }
          ],
          value: editorState.suffixType,
          onChange: (e: Event) => {
            editorState.suffixType = (e.target as HTMLSelectElement).value as 'letters' | 'numbers';
            updatePreview();
          }
        }
      ]);
      customFieldsRow.appendChild(suffixContainer);

      container.appendChild(customFieldsRow);
    }

    // Preview of flight names
    const previewDiv = document.createElement('div');
    previewDiv.className = 'notification is-light mb-4';
    previewDiv.innerHTML = `
      <div class="content">
        <strong style="color: #000;">Flight Names:</strong>
        <div id="flightNamesPreview" style="margin-top: 0.5rem; color: #000;">${getFlightNamesPreview()}</div>
      </div>
    `;
    container.appendChild(previewDiv);

    // Event type
    if (!editorConfig.eventType) {
      const eventTypeContainer = document.createElement('div');
      renderForm(eventTypeContainer, [
        {
          label: editorConfig.labels?.eventTypeLabel || 'Event Type',
          field: 'eventType',
          options: (editorConfig.options?.eventTypes || ['SINGLES', 'DOUBLES']).map(type => ({
            label: type,
            value: type
          })),
          value: editorState.eventType,
          onChange: (e: Event) => {
            editorState.eventType = (e.target as HTMLSelectElement).value;
          }
        }
      ]);
      container.appendChild(eventTypeContainer);
    }

    // Scale type
    const scaleTypeContainer = document.createElement('div');
    renderForm(scaleTypeContainer, [
      {
        label: editorConfig.labels?.scaleTypeLabel || 'Scale Type',
        field: 'scaleType',
        options: [
          { label: 'Rating', value: 'RATING' },
          { label: 'Ranking', value: 'RANKING' }
        ],
        value: editorState.scaleType,
        onChange: (e: Event) => {
          editorState.scaleType = (e.target as HTMLSelectElement).value as 'RATING' | 'RANKING';
          renderFlightProfileModal();
        }
      }
    ]);
    container.appendChild(scaleTypeContainer);

    // Rating system (only if scale type is RATING)
    if (editorState.scaleType === 'RATING') {
      const ratingContainer = document.createElement('div');
      renderForm(ratingContainer, [
        {
          label: editorConfig.labels?.scaleNameLabel || 'Rating System',
          field: 'scaleName',
          options: (editorConfig.options?.ratingTypes || RATING_SYSTEMS).map(type => ({
            label: type,
            value: type
          })),
          value: editorState.scaleName,
          onChange: (e: Event) => {
            editorState.scaleName = (e.target as HTMLSelectElement).value;
          }
        }
      ]);
      container.appendChild(ratingContainer);
    }

    // Split method
    const splitMethodField = document.createElement('div');
    splitMethodField.className = 'field';
    splitMethodField.innerHTML = `
      <label class="label">${editorConfig.labels?.splitMethodLabel || 'Split Method'}</label>
    `;

    SPLIT_METHODS.forEach(method => {
      const radioDiv = document.createElement('div');
      radioDiv.className = 'control';
      radioDiv.style.marginBottom = '0.75rem';
      radioDiv.innerHTML = `
        <label class="radio" style="color: #000; display: block;">
          <input 
            type="radio" 
            name="splitMethod" 
            value="${method.value}"
            ${editorState.splitMethod === method.value ? 'checked' : ''}
            style="margin-right: 0.5rem;"
          />
          <div style="display: inline-block; vertical-align: top;">
            <strong style="color: #000;">${method.label}</strong>
            <div style="color: #666; margin-left: 1.5rem; margin-top: 0.25rem; font-size: 0.9em;">
              ${method.description}
            </div>
          </div>
        </label>
      `;

      const input = radioDiv.querySelector('input') as HTMLInputElement;
      input.addEventListener('change', (e) => {
        editorState.splitMethod = (e.target as HTMLInputElement).value as any;
      });

      splitMethodField.appendChild(radioDiv);
    });

    container.appendChild(splitMethodField);
  }

  return container;
}

let currentModal: any = null;

/**
 * Render or re-render the modal
 */
function renderFlightProfileModal(): void {
  const content = renderFlightProfileForm();
  
  if (currentModal) {
    const modalContent = document.querySelector('.modal-card-body');
    if (modalContent) {
      modalContent.innerHTML = '';
      modalContent.appendChild(content);
      // Update button state after re-render
      setTimeout(() => updateOkButtonState(), 0);
    }
  }
}

/**
 * Opens the Flight Profile editor modal
 * @param existingFlightProfile - Optional existing flight profile to edit
 * @param editorConfigParam - Optional configuration for labels and options
 * @param callback - Called with the flight profile configuration when user clicks OK
 * @returns Modal result with open() and close() functions
 */
export function getFlightProfileModal(params: {
  existingFlightProfile?: any;
  editorConfig?: FlightProfileConfig;
  callback?: (config: any) => void;
}): any {
  const { existingFlightProfile, editorConfig: userConfig, callback } = params;

  // Merge user config with defaults
  editorConfig = {
    labels: { ...defaultConfig.labels, ...userConfig?.labels },
    options: { ...defaultConfig.options, ...userConfig?.options },
    eventType: userConfig?.eventType
  };

  // Initialize state
  if (existingFlightProfile) {
    const parsed = parseExistingFlightProfile(existingFlightProfile);
    Object.assign(editorState, parsed);
  } else {
    // Reset to defaults for new profile
    Object.assign(editorState, {
      flightsCount: 2,
      namingType: 'colors',
      customName: 'Flight',
      suffixType: 'numbers',
      scaleType: 'RATING',
      scaleName: 'WTN',
      eventType: editorConfig.eventType || 'SINGLES',
      splitMethod: 'LEVEL_BASED',
      isExisting: false
    });
  }

  const content = renderFlightProfileForm();

  // Modal buttons
  const buttons = [
    {
      label: 'Cancel',
      close: true,
    },
    {
      label: 'OK',
      intent: 'is-success',
      close: true,
      onClick: () => {
        // Validate
        const errors = validateFlightProfile(editorState);
        if (errors.length > 0) {
          alert(errors.join('\n'));
          return false; // Prevent modal from closing
        }

        if (editorState.isExisting) {
          // Return updated flight names
          if (isFunction(callback)) {
            callback({
              flights: editorState.flights
            });
          }
        } else {
          // Return full configuration for new profile
          const drawNames = generateFlightNames(editorState);
          const scaleAttributes = buildScaleAttributes(editorState);
          const splitMethod = getSplitMethodConstant(editorState.splitMethod);

          if (isFunction(callback)) {
            callback({
              flightsCount: editorState.flightsCount,
              drawNames,
              scaleAttributes,
              splitMethod,
              eventType: editorState.eventType
            });
          }
        }
      }
    }
  ];

  // Open modal
  currentModal = cModal.open({
    title: editorConfig.labels?.title || 'Flight Profile',
    content,
    buttons,
    config: {
      modalSize: 'is-medium'
    }
  });

  // Set initial button state after modal opens
  setTimeout(() => updateOkButtonState(), 0);

  return currentModal;
}
