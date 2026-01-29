/**
 * Flight profile form items configuration.
 * Generates form field definitions for flight profile creation with validation and options.
 */
import { numericRange } from '../validators/numericRange';
import { DEFAULT_COLORS, RATING_SYSTEMS, SPLIT_METHODS, type FlightProfileState } from './flightProfileLogic';

// Field name constants
export const FLIGHTS_COUNT = 'flightsCount';
export const NAMING_TYPE = 'namingType';
export const CUSTOM_NAME = 'customName';
export const SUFFIX_TYPE = 'suffixType';
export const SCALE_TYPE = 'scaleType';
export const SCALE_NAME = 'scaleName';
export const EVENT_TYPE = 'eventType';
export const SPLIT_METHOD = 'splitMethod';

interface FlightProfileFormItemsParams {
  existingProfile?: any;
  eventType?: string;
  editorConfig?: any;
}

export function getFlightProfileFormItems({
  existingProfile,
  eventType,
  editorConfig = {}
}: FlightProfileFormItemsParams = {}): any[] {
  const isExisting = !!existingProfile;

  // If editing existing, parse the profile
  let initialState: Partial<FlightProfileState> = {
    flightsCount: 2,
    namingType: 'colors',
    customName: 'Flight',
    suffixType: 'numbers',
    scaleType: 'RATING',
    scaleName: 'WTN',
    eventType: eventType || 'SINGLES',
    splitMethod: 'LEVEL_BASED'
  };

  if (isExisting && existingProfile) {
    // Parse existing profile
    const { flights, scaleAttributes, splitMethod } = existingProfile;

    if (flights && flights.length > 0) {
      initialState.flightsCount = flights.length;

      // Detect naming pattern
      const firstName = flights[0].drawName;
      if (DEFAULT_COLORS.some((color) => firstName === color)) {
        initialState.namingType = 'colors';
      } else {
        // Try to extract custom pattern
        const match = firstName.match(/^(.+?)\s+([A-Z]|\d+)$/);
        if (match) {
          initialState.namingType = 'custom';
          initialState.customName = match[1];
          initialState.suffixType = /[A-Z]/.test(match[2]) ? 'letters' : 'numbers';
        }
      }
    }

    if (scaleAttributes) {
      initialState.scaleType = scaleAttributes.scaleType || 'RATING';
      initialState.scaleName = scaleAttributes.scaleName;
      initialState.eventType = scaleAttributes.eventType;
    }

    if (splitMethod) {
      const methodMap: Record<string, any> = {
        splitWaterfall: 'WATERFALL',
        splitLevelBased: 'LEVEL_BASED',
        splitShuttle: 'SHUTTLE'
      };
      initialState.splitMethod = methodMap[splitMethod] || 'LEVEL_BASED';
    }
  }

  const items = [
    {
      error: 'Must be in range 2-10',
      placeholder: '2',
      validator: numericRange(2, 10),
      value: initialState.flightsCount,
      label: editorConfig.labels?.flightsCountLabel || 'Number of Flights (2-10)',
      field: FLIGHTS_COUNT,
      selectOnFocus: true,
      type: 'number',
      focus: true,
      hide: isExisting
    },
    {
      options: [
        { label: 'Color Names', value: 'colors', selected: initialState.namingType === 'colors' },
        { label: 'Custom Name', value: 'custom', selected: initialState.namingType === 'custom' }
      ],
      label: editorConfig.labels?.namingTypeLabel || 'Naming',
      field: NAMING_TYPE,
      value: initialState.namingType,
      hide: isExisting
    },
    {
      placeholder: 'Flight',
      value: initialState.customName,
      label: editorConfig.labels?.customNameLabel || 'Custom Name',
      field: CUSTOM_NAME,
      selectOnFocus: true,
      visible: initialState.namingType === 'custom',
      hide: isExisting,
      fieldPair: {
        options: [
          { label: 'Letters (A, B, C)', value: 'letters', selected: initialState.suffixType === 'letters' },
          { label: 'Numbers (1, 2, 3)', value: 'numbers', selected: initialState.suffixType === 'numbers' }
        ],
        label: editorConfig.labels?.suffixTypeLabel || 'Suffix Style',
        field: SUFFIX_TYPE,
        value: initialState.suffixType,
        visible: initialState.namingType === 'custom'
      }
    },
    {
      options: [
        { label: 'Rating', value: 'RATING', selected: initialState.scaleType === 'RATING' },
        { label: 'Ranking', value: 'RANKING', selected: initialState.scaleType === 'RANKING' }
      ],
      label: editorConfig.labels?.scaleTypeLabel || 'Scale Type',
      field: SCALE_TYPE,
      value: initialState.scaleType,
      hide: isExisting
    },
    {
      options: RATING_SYSTEMS.map((system) => ({
        label: system,
        value: system,
        selected: system === initialState.scaleName
      })),
      label: editorConfig.labels?.scaleNameLabel || 'Rating System',
      field: SCALE_NAME,
      value: initialState.scaleName,
      visible: initialState.scaleType === 'RATING',
      hide: isExisting
    },
    {
      options: (editorConfig.options?.eventTypes || ['SINGLES', 'DOUBLES']).map((type) => ({
        label: type,
        value: type,
        selected: type === initialState.eventType
      })),
      label: editorConfig.labels?.eventTypeLabel || 'Event Type',
      field: EVENT_TYPE,
      value: initialState.eventType,
      hide: isExisting || !!eventType
    },
    {
      label: editorConfig.labels?.splitMethodLabel || 'Split Method',
      field: SPLIT_METHOD,
      value: initialState.splitMethod,
      radio: true,
      options: SPLIT_METHODS.map((method) => ({
        text: method.label,
        value: method.value,
        checked: method.value === initialState.splitMethod
      })),
      hide: isExisting
    }
  ];

  return items;
}
