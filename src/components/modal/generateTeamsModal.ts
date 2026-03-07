/**
 * Generate full teams modal.
 * Creates team participants with individual members, optionally sized from a tieFormat.
 */
import { genderConstants, mocksEngine, participantConstants } from 'tods-competition-factory';
import { renderForm } from '../forms/renderForm';
import { cModal } from './cmodal';

const { FEMALE, MALE, ANY } = genderConstants;
const { TEAM } = participantConstants;

export interface GenerateTeamsConfig {
  callback?: (participants: any[]) => void;
  consideredDate?: string;
  title?: string;
  /** Builtin + user tieFormats for team size inference */
  tieFormats?: { label: string; value: string; tieFormat: any }[];
}

/**
 * Calculate minimum team size from a tieFormat by summing matchUpCount
 * across collections (doubles positions count as 2 players).
 */
function teamSizeFromTieFormat(tieFormat: any): number {
  if (!tieFormat?.collectionDefinitions?.length) return 8;
  let size = 0;
  for (const col of tieFormat.collectionDefinitions) {
    const count = col.matchUpCount || 0;
    const perPosition = col.matchUpType === 'DOUBLES' ? 2 : 1;
    size += count * perPosition;
  }
  return size || 8;
}

export function getGenerateTeamsModal(config: GenerateTeamsConfig = {}): void {
  const {
    callback,
    consideredDate,
    title = 'Generate mock teams',
    tieFormats = [],
  } = config;

  let inputs: any;

  const hasTieFormats = tieFormats.length > 0;
  const NONE = '-';

  const tieFormatOptions = [
    { label: 'Manual team size', value: NONE, selected: true },
    ...tieFormats.map((tf) => ({ label: tf.label, value: tf.value, selected: false })),
  ];

  const generate = () => {
    const teamsCount = Number.parseInt(inputs.teamsCount.value) || 4;
    const gender = inputs.gender.value;
    const sex = gender === ANY ? undefined : gender;

    // Determine team size from tieFormat or manual input
    let teamSize: number;
    const selectedTieFormat = hasTieFormats ? inputs.tieFormatSelect?.value : NONE;
    if (selectedTieFormat && selectedTieFormat !== NONE) {
      const tf = tieFormats.find((t) => t.value === selectedTieFormat);
      teamSize = tf ? teamSizeFromTieFormat(tf.tieFormat) : 8;
      // Add alternates from manual field if specified
      const extraStr = inputs.teamSize?.value;
      const extra = extraStr ? Number.parseInt(extraStr) : 0;
      if (extra > teamSize) teamSize = extra;
    } else {
      teamSize = Number.parseInt(inputs.teamSize?.value) || 8;
    }

    const nationalityCodesCount = inputs.nationalityCodesCount?.value
      ? Number.parseInt(inputs.nationalityCodesCount.value)
      : undefined;

    const { participants } = mocksEngine.generateParticipants({
      participantsCount: teamsCount,
      participantType: TEAM,
      nationalityCodesCount,
      consideredDate,
      teamSize,
      sex,
    });

    if (callback) callback(participants);
  };

  const buttons = [
    { label: 'Cancel', intent: 'none', close: true },
    { label: 'Generate', intent: 'is-info', close: true, onClick: generate },
  ];

  const relationships = hasTieFormats
    ? [
        {
          control: 'tieFormatSelect',
          onChange: ({ inputs: inp }: any) => {
            const val = inp.tieFormatSelect.value;
            if (val && val !== NONE) {
              const tf = tieFormats.find((t) => t.value === val);
              const size = tf ? teamSizeFromTieFormat(tf.tieFormat) : 8;
              inp.teamSize.value = size;
              inp.teamSize.disabled = true;
            } else {
              inp.teamSize.disabled = false;
            }
          },
        },
      ]
    : [];

  const tieFormatField = hasTieFormats
    ? [
        {
          options: tieFormatOptions,
          label: 'Tie format template',
          field: 'tieFormatSelect',
          value: NONE,
        },
      ]
    : [];

  const content = (elem: HTMLElement) =>
    (inputs = renderForm(
      elem,
      [
        {
          options: [
            { label: 'Any', value: ANY, selected: true },
            { label: 'Female', value: FEMALE },
            { label: 'Male', value: MALE },
          ],
          label: 'Gender',
          field: 'gender',
          value: ANY,
        },
        {
          options: [
            { label: '2', value: 2 },
            { label: '4', value: 4, selected: true },
            { label: '8', value: 8 },
            { label: '16', value: 16 },
            { label: '32', value: 32 },
          ],
          label: 'Number of teams',
          field: 'teamsCount',
          value: 4,
        },
        ...tieFormatField,
        {
          label: 'Players per team',
          field: 'teamSize',
          placeholder: 'e.g., 8',
          type: 'number',
          value: 8,
        },
        {
          label: '# of Countries',
          field: 'nationalityCodesCount',
          placeholder: 'e.g., 10',
          type: 'number',
        },
      ],
      relationships,
    ));

  cModal.open({ title, content, buttons });
}
