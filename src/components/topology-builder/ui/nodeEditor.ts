/**
 * Node Editor — Side panel form for editing selected node properties.
 * Uses renderForm (items + relationships) pattern.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { renderForm } from '../../forms/renderForm';
import { getFeedRoundCapacities } from '../domain/feedRounds';
import { nameValidator } from '../../../validators/nameValidator';
import { numericRange } from '../../../validators/numericRange';
import type { TopologyNode, TopologyState, UIPanel } from '../types';

const {
  SINGLE_ELIMINATION,
  ROUND_ROBIN,
  FEED_IN,
  AD_HOC,
  MAIN,
  QUALIFYING,
  CONSOLATION,
  PLAY_OFF,
  WINNER,
} = drawDefinitionConstants;

const STRUCTURE_TYPES = [
  { label: 'Single Elimination', value: SINGLE_ELIMINATION },
  { label: 'Round Robin', value: ROUND_ROBIN },
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
  readOnly?: boolean;
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
  const isReadOnly = !!callbacks.readOnly;

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
        ...(isReadOnly ? { disabled: true } : { validator: nameValidator(1), error: 'Name required' }),
      },
      {
        label: 'Stage',
        field: 'stage',
        value: node.stage,
        disabled: isReadOnly,
        options: STAGES.map((s) => ({ ...s, selected: s.value === node.stage })),
      },
      {
        label: 'Structure Type',
        field: 'structureType',
        value: node.structureType,
        disabled: isReadOnly,
        options: STRUCTURE_TYPES.map((d) => ({ ...d, selected: d.value === node.structureType })),
      },
      {
        label: 'Draw Size',
        field: 'drawSize',
        type: 'number',
        value: String(node.drawSize),
        ...(isReadOnly ? { disabled: true } : { validator: numericRange(2, 256), error: 'Must be 2-256' }),
      },
    ];

    const relationships: any[] = isReadOnly ? [] : [
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
        control: 'structureType',
        onChange: ({ e }: any) =>
          callbacks.onUpdateNode(node.id, { structureType: e.target.value }),
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
    const isRR = node.structureType === ROUND_ROBIN;
    if (isRR) {
      const groupSizeOptions = [3, 4, 5, 6, 8];
      const currentGroupSize = node.structureOptions?.groupSize || 4;
      items.push({
        label: 'Group Size',
        field: 'groupSize',
        value: String(currentGroupSize),
        disabled: isReadOnly,
        options: groupSizeOptions.map((n: number) => ({
          label: String(n),
          value: String(n),
          selected: n === currentGroupSize,
        })),
      });
      if (!isReadOnly) {
        relationships.push({
          control: 'groupSize',
          onChange: ({ e }: any) =>
            callbacks.onUpdateNode(node.id, {
              structureOptions: { ...node.structureOptions, groupSize: parseInt(e.target.value) },
            }),
        });
      }
    }

    // Qualifying-specific fields
    if (node.stage === QUALIFYING) {
      const qualifierOptions = validQualifierCounts(node.drawSize);
      const current = node.qualifyingPositions ?? qualifierOptions[0];
      items.push({
        label: 'Qualifying Positions',
        field: 'qualifyingPositions',
        value: String(current),
        disabled: isReadOnly,
        options: qualifierOptions.map((n: number) => ({
          label: String(n),
          value: String(n),
          selected: n === current,
        })),
      });
      if (!isReadOnly) {
        relationships.push({
          control: 'qualifyingPositions',
          onChange: ({ e }: any) =>
            callbacks.onUpdateNode(node.id, { qualifyingPositions: parseInt(e.target.value) }),
        });
      }
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
    if (isReadOnly) {
      formatTrigger.style.cursor = 'default';
      formatTrigger.style.opacity = '0.7';
    } else {
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
    }
    formatField.appendChild(formatTrigger);
    body.appendChild(formatField);

    // Warnings for qualifying links targeting round > 1:
    // the target round must be a feed round with sufficient capacity.
    const feedCapacities = getFeedRoundCapacities(node.drawSize);
    const demandByRound = new Map<number, number>();
    const feedEntries: { targetRound: number; qp: number; sourceName: string }[] = [];
    for (const edge of state.edges) {
      if (edge.linkType !== WINNER || edge.targetNodeId !== node.id) continue;
      const targetRound = edge.targetRoundNumber || 1;
      if (targetRound <= 1) continue;
      const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
      if (!source || source.stage !== QUALIFYING) continue;
      const qp = source.qualifyingPositions || Math.floor(source.drawSize / 4);
      demandByRound.set(targetRound, (demandByRound.get(targetRound) || 0) + qp);
      feedEntries.push({ targetRound, qp, sourceName: source.structureName });
    }

    const feedWarnings: string[] = [];
    for (const entry of feedEntries) {
      const capacity = feedCapacities.get(entry.targetRound) || 0;
      const demand = demandByRound.get(entry.targetRound) || 0;
      if (capacity >= demand) continue;
      if (capacity === 0) {
        feedWarnings.push(
          `Round ${entry.targetRound} is not a feed round — ${entry.sourceName} sends ${entry.qp} qualifiers`,
        );
      } else {
        feedWarnings.push(
          `Round ${entry.targetRound} has ${capacity} feed positions but ${entry.sourceName} sends ${entry.qp} qualifiers`,
        );
      }
    }

    if (feedWarnings.length > 0) {
      const warningBox = document.createElement('div');
      warningBox.className = 'tb-editor-warning';
      for (const msg of feedWarnings) {
        const line = document.createElement('div');
        line.textContent = `\u26a0 ${msg}`;
        warningBox.appendChild(line);
      }
      const hint = document.createElement('div');
      hint.style.marginTop = '6px';
      hint.textContent = 'Change the target round to a feed round, or increase the draw size to create feed positions at that round.';
      warningBox.appendChild(hint);
      body.appendChild(warningBox);
    }

    // Delete button (hidden in readOnly mode)
    if (!isReadOnly) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tb-editor-delete';
      deleteBtn.textContent = 'Delete Structure';
      deleteBtn.onclick = () => callbacks.onDeleteNode(node.id);
      body.appendChild(deleteBtn);
    }

    root.appendChild(body);
  }

  return { element: root, update };
}
