/**
 * Node Editor — Side panel form for editing selected node properties.
 * Uses renderForm (items + relationships) pattern.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { renderForm } from '../../forms/renderForm';
import { nameValidator } from '../../../validators/nameValidator';
import { numericRange } from '../../../validators/numericRange';
import type { TopologyNode, TopologyState, UIPanel } from '../types';

const {
  SINGLE_ELIMINATION,
  ROUND_ROBIN,
  ROUND_ROBIN_WITH_PLAYOFF,
  DOUBLE_ELIMINATION,
  FEED_IN_CHAMPIONSHIP,
  FIRST_MATCH_LOSER_CONSOLATION,
  FIRST_ROUND_LOSER_CONSOLATION,
  COMPASS,
  FEED_IN,
  AD_HOC,
  MAIN,
  QUALIFYING,
  CONSOLATION,
  PLAY_OFF,
} = drawDefinitionConstants;

const DRAW_TYPES = [
  { label: 'Single Elimination', value: SINGLE_ELIMINATION },
  { label: 'Round Robin', value: ROUND_ROBIN },
  { label: 'Round Robin w/ Playoff', value: ROUND_ROBIN_WITH_PLAYOFF },
  { label: 'Double Elimination', value: DOUBLE_ELIMINATION },
  { label: 'Fed Consolation', value: FEED_IN_CHAMPIONSHIP },
  { label: 'First Match Loser', value: FIRST_MATCH_LOSER_CONSOLATION },
  { label: 'First Round Loser', value: FIRST_ROUND_LOSER_CONSOLATION },
  { label: 'Compass', value: COMPASS },
  { label: 'Staggered Entry', value: FEED_IN },
  { label: 'Ad-hoc', value: AD_HOC },
];

const STAGES = [
  { label: 'Main', value: MAIN },
  { label: 'Qualifying', value: QUALIFYING },
  { label: 'Consolation', value: CONSOLATION },
  { label: 'Playoff', value: PLAY_OFF },
];

export interface NodeEditorCallbacks {
  onUpdateNode: (nodeId: string, updates: Partial<TopologyNode>) => void;
  onDeleteNode: (nodeId: string) => void;
}

/** Returns descending powers of 2 less than drawSize (e.g. 32 → [16, 8, 4, 2, 1]). */
function validQualifierCounts(drawSize: number): number[] {
  const counts: number[] = [];
  let n = Math.floor(drawSize / 2);
  while (n >= 1) {
    counts.push(n);
    n = Math.floor(n / 2);
  }
  return counts;
}

export function buildNodeEditor(callbacks: NodeEditorCallbacks): UIPanel<TopologyState> {
  const root = document.createElement('div');

  function update(state: TopologyState): void {
    root.innerHTML = '';
    const node = state.selectedNodeId
      ? state.nodes.find((n) => n.id === state.selectedNodeId)
      : null;

    if (!node) return;

    const header = document.createElement('div');
    header.className = 'tb-editor-header';
    header.textContent = 'Structure Properties';
    root.appendChild(header);

    const body = document.createElement('div');
    body.className = 'tb-editor-body';

    const items: any[] = [
      {
        label: 'Name',
        field: 'structureName',
        value: node.structureName,
        validator: nameValidator(1),
        error: 'Name required',
      },
      {
        label: 'Stage',
        field: 'stage',
        value: node.stage,
        options: STAGES.map((s) => ({ ...s, selected: s.value === node.stage })),
      },
      {
        label: 'Draw Type',
        field: 'drawType',
        value: node.drawType,
        options: DRAW_TYPES.map((d) => ({ ...d, selected: d.value === node.drawType })),
      },
      {
        label: 'Draw Size',
        field: 'drawSize',
        type: 'number',
        value: String(node.drawSize),
        validator: numericRange(2, 256),
        error: 'Must be 2-256',
      },
    ];

    const relationships: any[] = [
      {
        control: 'structureName',
        onChange: ({ inputs }: any) =>
          callbacks.onUpdateNode(node.id, { structureName: inputs.structureName.value }),
      },
      {
        control: 'stage',
        onChange: ({ e }: any) =>
          callbacks.onUpdateNode(node.id, { stage: e.target.value }),
      },
      {
        control: 'drawType',
        onChange: ({ e }: any) =>
          callbacks.onUpdateNode(node.id, { drawType: e.target.value }),
      },
      {
        control: 'drawSize',
        onChange: ({ inputs }: any) => {
          const size = parseInt(inputs.drawSize.value);
          if (size >= 2) callbacks.onUpdateNode(node.id, { drawSize: size });
        },
      },
    ];

    // Round Robin group size field
    const isRR = node.drawType === ROUND_ROBIN || node.drawType === ROUND_ROBIN_WITH_PLAYOFF;
    if (isRR) {
      const groupSizeOptions = [3, 4, 5, 6, 8];
      const currentGroupSize = node.structureOptions?.groupSize || 4;
      items.push({
        label: 'Group Size',
        field: 'groupSize',
        value: String(currentGroupSize),
        options: groupSizeOptions.map((n: number) => ({
          label: String(n),
          value: String(n),
          selected: n === currentGroupSize,
        })),
      });
      relationships.push({
        control: 'groupSize',
        onChange: ({ e }: any) =>
          callbacks.onUpdateNode(node.id, {
            structureOptions: { ...node.structureOptions, groupSize: parseInt(e.target.value) },
          }),
      });
    }

    // Qualifying-specific fields
    if (node.stage === QUALIFYING) {
      const qualifierOptions = validQualifierCounts(node.drawSize);
      const current = node.qualifyingPositions ?? qualifierOptions[0];
      items.push({
        label: 'Qualifying Positions',
        field: 'qualifyingPositions',
        value: String(current),
        options: qualifierOptions.map((n: number) => ({
          label: String(n),
          value: String(n),
          selected: n === current,
        })),
      });
      relationships.push({
        control: 'qualifyingPositions',
        onChange: ({ e }: any) =>
          callbacks.onUpdateNode(node.id, { qualifyingPositions: parseInt(e.target.value) }),
      });
    }

    renderForm(body, items, relationships);

    // MatchUp Format trigger
    const formatField = document.createElement('div');
    formatField.className = 'field font-medium';
    formatField.style.cssText = 'flex-grow: 1';

    const formatLabel = document.createElement('label');
    formatLabel.style.cssText = 'font-weight: bold; font-size: larger;';
    formatLabel.textContent = 'MatchUp Format';
    formatField.appendChild(formatLabel);

    const formatTrigger = document.createElement('div');
    formatTrigger.className = 'tb-format-trigger';
    formatTrigger.textContent = node.matchUpFormat || 'Not set';
    formatTrigger.onclick = async () => {
      const { getMatchUpFormatModal } = await import('../../matchUpFormat/matchUpFormat');
      getMatchUpFormatModal({
        existingMatchUpFormat: node.matchUpFormat,
        callback: (format: string) => {
          callbacks.onUpdateNode(node.id, { matchUpFormat: format || undefined });
          formatTrigger.textContent = format || 'Not set';
        },
      });
    };
    formatField.appendChild(formatTrigger);
    body.appendChild(formatField);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tb-editor-delete';
    deleteBtn.textContent = 'Delete Structure';
    deleteBtn.onclick = () => callbacks.onDeleteNode(node.id);
    body.appendChild(deleteBtn);

    root.appendChild(body);
  }

  return { element: root, update };
}
