/**
 * Flight profile form relationships and field interactions.
 * Manages form field dependencies and dynamic updates for flight profile creation.
 */
import { numericValidator } from '../validators/numericValidator';
import { numericRange } from '../validators/numericRange';
import { generateFlightNames } from './flightProfileLogic';
import {
  FLIGHTS_COUNT,
  NAMING_TYPE,
  CUSTOM_NAME,
  SUFFIX_TYPE,
  SCALE_TYPE,
  SCALE_NAME,
  SPLIT_METHOD
} from './getFlightProfileFormItems';

const NONE = 'none';

interface FormInteractionParams {
  fields?: Record<string, HTMLElement>;
  inputs: Record<string, any>;
  e?: Event;
}

export function getFlightProfileFormRelationships(): any[] {
  /**
   * Update OK button state based on validation
   */
  const updateOkButtonState = ({ inputs }: FormInteractionParams) => {
    const okButton = document.getElementById('flightProfileOk') as HTMLButtonElement;
    if (!okButton) return;

    const flightsCountValue = inputs[FLIGHTS_COUNT]?.value;
    const valid = numericRange(2, 10)(flightsCountValue);

    okButton.disabled = !valid;
    okButton.style.opacity = valid ? '1' : '0.5';
    okButton.style.cursor = valid ? 'pointer' : 'not-allowed';
  };

  /**
   * Handle flights count changes
   */
  const flightsCountChange = ({ inputs }: FormInteractionParams) => {
    updateOkButtonState({ inputs });
  };

  /**
   * Handle naming type changes - show/hide custom name fields
   * Note: When using fieldPair, both fields have separate DOM elements
   * and must be shown/hidden individually
   */
  const namingTypeChange = ({ e, fields }: FormInteractionParams) => {
    const namingType = (e!.target as HTMLSelectElement).value;

    if (fields) {
      const isCustom = namingType === 'custom';
      fields[CUSTOM_NAME].style.display = isCustom ? '' : NONE;
      fields[SUFFIX_TYPE].style.display = isCustom ? '' : NONE;
    }
  };

  /**
   * Handle scale type changes - show/hide rating system field
   */
  const scaleTypeChange = ({ e, fields }: FormInteractionParams) => {
    const scaleType = (e!.target as HTMLSelectElement).value;

    if (fields) {
      const isRating = scaleType === 'RATING';
      fields[SCALE_NAME].style.display = isRating ? '' : NONE;
    }
  };

  return [
    {
      onInput: flightsCountChange,
      control: FLIGHTS_COUNT
    },
    {
      onChange: namingTypeChange,
      control: NAMING_TYPE
    },
    {
      onChange: scaleTypeChange,
      control: SCALE_TYPE
    }
  ];
}
