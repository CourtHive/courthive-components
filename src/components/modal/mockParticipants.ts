/**
 * Mock participants generator modal.
 * Creates mock players with configurable age ranges, gender, ratings, and count.
 * Supports all rating types from the factory's ratingsParameters.
 *
 * @module mockParticipants
 */
import { genderConstants, factoryConstants, fixtures, mocksEngine } from 'tods-competition-factory';
import { renderForm } from '../forms/renderForm';
import { cModal } from './cmodal';

const { ratingsParameters } = fixtures;
const { WTN, UTR } = factoryConstants.ratingConstants;
const { FEMALE, MALE, ANY } = genderConstants;

/**
 * Configuration for mock participants generation
 */
export interface MockParticipantsConfig {
  /** Callback invoked when participants are generated */
  callback?: (participants: any[]) => void;
  /** Tournament end date for birthdate calculation (ISO format: YYYY-MM-DD) */
  consideredDate?: string;
  /** Custom title for the modal */
  title?: string;
  /** Custom labels for form fields */
  labels?: {
    gender?: string;
    count?: string;
    ageRange?: string;
    minAge?: string;
    maxAge?: string;
    ratings?: string;
    /** @deprecated Use ratings label instead */
    wtn?: string;
    /** @deprecated Use ratings label instead */
    utr?: string;
  };
  /** Default values for form fields */
  defaults?: {
    gender?: string;
    participantsCount?: number;
    ageMin?: number;
    ageMax?: number;
    /** Array of rating type names to pre-select (e.g., ['WTN', 'UTR', 'DUPR']) */
    ratings?: string[];
    /** @deprecated Use ratings: ['WTN'] instead */
    wtnRating?: boolean;
    /** @deprecated Use ratings: ['UTR'] instead */
    utrRating?: boolean;
  };
}

/**
 * Opens a modal for generating mock participants with configurable options.
 * 
 * Features:
 * - Gender selection (Any/Male/Female)
 * - Participant count (8-256)
 * - Age range with automatic validation (ageMax >= ageMin)
 * - Optional WTN/UTR ratings
 * - Birthdate generation based on consideredDate and age range
 * 
 * @param config - Configuration options
 * @returns void
 * 
 * @example
 * // Basic usage
 * getMockParticipantsModal({
 *   callback: (participants) => {
 *     console.log('Generated participants:', participants);
 *     // Add participants to tournament
 *   }
 * });
 * 
 * @example
 * // With consideredDate and defaults
 * getMockParticipantsModal({
 *   consideredDate: '2024-12-31',
 *   callback: (participants) => {
 *     // Add participants to tournament
 *   },
 *   defaults: {
 *     participantsCount: 64,
 *     ageMin: 10,
 *     ageMax: 18,
 *     wtnRating: true
 *   }
 * });
 */
export function getMockParticipantsModal(config: MockParticipantsConfig = {}): void {
  const {
    callback,
    consideredDate,
    title = 'Generate mock players',
    labels = {},
    defaults = {}
  } = config;

  let inputs: any;

  // Merge default labels with custom labels
  const finalLabels = {
    gender: labels.gender || 'Participant gender',
    count: labels.count || 'Participant count',
    ageRange: labels.ageRange || 'Participant Age Range',
    minAge: labels.minAge || 'Minimum Age',
    maxAge: labels.maxAge || 'Maximum Age',
    ratings: labels.ratings || 'Generate Ratings',
  };

  // Backward compatibility: convert legacy wtnRating/utrRating booleans to ratings array
  const selectedRatings: string[] = defaults.ratings
    ? [...defaults.ratings]
    : [
        ...(defaults.wtnRating ? [WTN] : []),
        ...(defaults.utrRating ? [UTR] : []),
      ];

  // Merge default values with custom defaults
  const finalDefaults = {
    gender: defaults.gender || ANY,
    participantsCount: defaults.participantsCount || 32,
    ageMin: defaults.ageMin,
    ageMax: defaults.ageMax,
  };

  // Build rating options for multi-select dropdown (exclude deprecated)
  const ratingOptions = Object.entries(ratingsParameters)
    .filter(([_, params]: [string, any]) => !params.deprecated)
    .map(([key]: [string, any]) => ({
      label: key,
      value: key,
      selected: selectedRatings.includes(key),
    }));

  const generate = () => {
    const count = inputs.participantsCount.value;
    const gender = inputs.gender.value;
    const sex = gender === ANY ? undefined : gender;
    const ageMin = inputs.ageMin?.value ? Number.parseInt(inputs.ageMin.value) : undefined;
    const ageMax = inputs.ageMax?.value ? Number.parseInt(inputs.ageMax.value) : undefined;

    // Collect selected rating types from multi-select dropdown
    const selected: string[] = inputs.ratings?.selectedValues || [];
    const categories = selected
      .map((key: string) => {
        const params = (ratingsParameters as any)[key];
        if (!params) return null;
        const [a, b] = params.range || [0, 100];
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        const span = max - min;
        return { ratingType: key, ratingMin: min + span * 0.3, ratingMax: min + span * 0.7 };
      })
      .filter(Boolean);

    // Build category object for age-based birthdate generation
    const category =
      ageMin || ageMax
        ? {
            ageMin,
            ageMax
          }
        : undefined;

    const { participants } = mocksEngine.generateParticipants({
      participantsCount: Number.parseInt(count),
      scaleAllParticipants: true,
      consideredDate,
      categories,
      category,
      sex
    });

    // Invoke callback with generated participants
    if (callback) {
      callback(participants);
    }
  };

  const buttons = [
    { label: 'Cancel', intent: 'none', close: true },
    { label: 'Generate', intent: 'is-info', close: true, onClick: generate }
  ];

  // Relationships to ensure ageMax >= ageMin
  const relationships = [
    {
      control: 'ageMin',
      onChange: ({ inputs }: any) => {
        const minValue = Number.parseInt(inputs.ageMin.value) || 0;
        const maxValue = Number.parseInt(inputs.ageMax.value) || 0;

        // If min > max, adjust max to equal min
        if (minValue > maxValue && maxValue > 0) {
          inputs.ageMax.value = minValue;
        }
      }
    },
    {
      control: 'ageMax',
      onChange: ({ inputs }: any) => {
        const minValue = Number.parseInt(inputs.ageMin.value) || 0;
        const maxValue = Number.parseInt(inputs.ageMax.value) || 0;

        // If max < min, adjust min to equal max
        if (maxValue < minValue && minValue > 0 && maxValue > 0) {
          inputs.ageMin.value = maxValue;
        }
      }
    }
  ];

  const content = (elem: HTMLElement) =>
    (inputs = renderForm(
      elem,
      [
        {
          options: [
            { label: 'Any', value: ANY, selected: finalDefaults.gender === ANY },
            { label: 'Female', value: FEMALE, selected: finalDefaults.gender === FEMALE },
            { label: 'Male', value: MALE, selected: finalDefaults.gender === MALE }
          ],
          label: finalLabels.gender,
          field: 'gender',
          value: finalDefaults.gender
        },
        {
          options: [
            { label: '8', value: 8, selected: finalDefaults.participantsCount === 8 },
            { label: '16', value: 16, selected: finalDefaults.participantsCount === 16 },
            { label: '32', value: 32, selected: finalDefaults.participantsCount === 32 },
            { label: '64', value: 64, selected: finalDefaults.participantsCount === 64 },
            { label: '128', value: 128, selected: finalDefaults.participantsCount === 128 },
            { label: '256', value: 256, selected: finalDefaults.participantsCount === 256 }
          ],
          label: finalLabels.count,
          field: 'participantsCount',
          value: finalDefaults.participantsCount
        },
        {
          text: finalLabels.ageRange,
          header: true
        },
        {
          label: finalLabels.minAge,
          field: 'ageMin',
          placeholder: 'e.g., 10',
          type: 'number',
          value: finalDefaults.ageMin
        },
        {
          label: finalLabels.maxAge,
          field: 'ageMax',
          placeholder: 'e.g., 18',
          type: 'number',
          value: finalDefaults.ageMax
        },
        {
          label: finalLabels.ratings,
          field: 'ratings',
          id: 'ratings',
          multiple: true,
          options: ratingOptions,
        }
      ],
      relationships
    ));

  cModal.open({ title, content, buttons });
}
