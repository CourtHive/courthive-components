/**
 * Flight Profile editor modal - Refactored to follow TMX form pattern.
 * Allows users to configure flight profiles for automatic participant segmentation.
 */
import { renderForm } from '../forms/renderForm';
import { cModal } from '../modal/cmodal';
import { getFlightProfileFormItems } from './getFlightProfileFormItems';
import { getFlightProfileFormRelationships } from './getFlightProfileFormRelationships';
import {
  generateFlightNames,
  buildScaleAttributes,
  getSplitMethodConstant,
  validateFlightProfile
} from './flightProfileLogic';

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

/**
 * Opens the Flight Profile editor modal
 * @param existingFlightProfile - Optional existing flight profile to edit
 * @param editorConfig - Optional configuration for labels and options
 * @param callback - Called with the flight profile configuration when user clicks OK
 * @returns Modal result with open() and close() functions
 */
export function getFlightProfileModal(params: {
  existingFlightProfile?: any;
  editorConfig?: FlightProfileConfig;
  callback?: (config: any) => void;
}): any {
  const { existingFlightProfile, editorConfig = {}, callback } = params;

  const isExisting = !!existingFlightProfile;

  let inputs: any;

  const content = (elem: HTMLElement) => {
    // Add info message if editing existing profile
    if (isExisting) {
      const header = document.createElement('div');
      header.className = 'notification is-info is-light';
      header.innerHTML =
        '<strong style="color: #000;">Note:</strong> Flight split has already been performed. You can only rename the flights.';
      elem.appendChild(header);
    }

    // Get form items and relationships
    const items = getFlightProfileFormItems({
      existingProfile: existingFlightProfile,
      editorConfig
    });

    const relationships = getFlightProfileFormRelationships();

    // Render the form with both items and relationships
    const formContainer = document.createElement('div');
    elem.appendChild(formContainer);

    inputs = renderForm(formContainer, items, relationships);

    // Editable flight names for existing profiles
    if (isExisting && existingFlightProfile?.flights) {
      const namesSection = document.createElement('div');
      namesSection.className = 'field';
      namesSection.innerHTML = `
        <label class="label">${editorConfig.labels?.flightNamesLabel || 'Flight Names'}</label>
      `;

      existingFlightProfile.flights.forEach((flight: any, index: number) => {
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
          existingFlightProfile.flights[index].drawName = (e.target as HTMLInputElement).value;
        });

        namesSection.appendChild(fieldDiv);
      });

      elem.appendChild(namesSection);
    }
  };

  const checkParams = () => {
    if (isExisting) {
      // Return updated flight names
      if (isFunction(callback)) {
        callback({
          flights: existingFlightProfile.flights
        });
      }
    } else {
      // Validate and return configuration for new profile
      // Note: eventType will be added by caller from event context
      const state = {
        flightsCount: Number.parseInt(inputs.flightsCount?.value || '0'),
        namingType: inputs.namingType?.value || 'colors',
        customName: inputs.customName?.value || 'Flight',
        suffixType: inputs.suffixType?.value || 'numbers',
        scaleType: inputs.scaleType?.value || 'RATING',
        scaleName: inputs.scaleName?.value,
        splitMethod: inputs.splitMethod?.value || 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      if (errors.length > 0) {
        alert(errors.join('\n'));
        return false; // Prevent modal from closing
      }

      const drawNames = generateFlightNames(state);
      const scaleAttributes = buildScaleAttributes(state);
      const splitMethod = getSplitMethodConstant(state.splitMethod);

      if (isFunction(callback)) {
        callback({
          flightsCount: state.flightsCount,
          drawNames,
          scaleAttributes,
          splitMethod
          // eventType NOT included - will be added by caller from event context
        });
      }
    }
  };

  const buttons = [
    {
      label: 'Cancel',
      close: true
    },
    {
      label: 'OK',
      id: 'flightProfileOk',
      intent: 'is-success',
      close: true,
      onClick: checkParams
    }
  ];

  // Build config with info popover for split methods (only for new profiles)
  const modalConfig: any = {
    modalSize: 'is-medium'
  };

  if (!isExisting) {
    modalConfig.info = `
      <div style="color: #000;">
        <div style="margin-bottom: 1em;">
          <strong style="color: #000;">Waterfall:</strong><br>
          <span style="color: #666;">Distributes evenly like dealing cards: 1→2→3→1→2→3</span>
        </div>
        <div style="margin-bottom: 1em;">
          <strong style="color: #000;">Level Based:</strong><br>
          <span style="color: #666;">Groups by skill tiers: [1-5], [6-10], [11-15]</span>
        </div>
        <div>
          <strong style="color: #000;">Shuttle:</strong><br>
          <span style="color: #666;">Alternating direction like a loom shuttle: 1→2→3→3→2→1→1→2→3</span>
        </div>
      </div>
    `;
  }

  const modalInstance = cModal.open({
    title: editorConfig.labels?.title || 'Flight Profile',
    content,
    buttons,
    config: modalConfig
  });

  return modalInstance;
}
