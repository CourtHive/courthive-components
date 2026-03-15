/**
 * Node Editor — Side panel form for editing selected node properties.
 * Uses renderForm (items + relationships) pattern.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { getMatchUpFormatModal } from '../../matchUpFormat/matchUpFormat';
import { renderForm } from '../../forms/renderForm';
import { getFeedRoundCapacities, getNodeTotalRounds } from '../domain/feedRounds';
import { nameValidator } from '../../../validators/nameValidator';
import { numericRange } from '../../../validators/numericRange';
import type { TopologyEdge, TopologyNode, TopologyState, UIPanel } from '../types';

const {
  SINGLE_ELIMINATION,
  ROUND_ROBIN,
  FEED_IN,
  FEED_IN_CHAMPIONSHIP,
  FIRST_MATCH_LOSER_CONSOLATION,
  COMPASS,
  OLYMPIC,
  AD_HOC,
  LUCKY_DRAW,
  MAIN,
  QUALIFYING,
  CONSOLATION,
  PLAY_OFF,
  WINNER,
} = drawDefinitionConstants;

const POSITION = 'POSITION';

const PLAYOFF_DRAW_TYPES = [
  { label: 'Single Elimination', value: SINGLE_ELIMINATION },
  { label: 'Round Robin', value: ROUND_ROBIN },
  { label: 'Feed-In Championship', value: FEED_IN_CHAMPIONSHIP },
  { label: 'FMLC', value: FIRST_MATCH_LOSER_CONSOLATION },
  { label: 'Compass', value: COMPASS },
  { label: 'Olympic', value: OLYMPIC },
  { label: 'Ad-hoc', value: AD_HOC },
];

const STRUCTURE_TYPES = [
  { label: 'Single Elimination', value: SINGLE_ELIMINATION },
  { label: 'Round Robin', value: ROUND_ROBIN },
  { label: 'Lucky Draw', value: LUCKY_DRAW },
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
  onUpdateEdge: (edgeId: string, updates: Partial<TopologyEdge>) => void;
  onDeleteNode: (nodeId: string) => void;
  readOnly?: boolean;
  hideDelete?: boolean;
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

/**
 * Mirrors factory getValidGroupSizes logic.
 * Returns group sizes (3..groupSizeLimit) where drawSize distributes
 * evenly enough (≤1 bye per group, byes < groupSize).
 */
function getValidGroupSizes(drawSize: number, groupSizeLimit = 8): number[] {
  const valid: number[] = [];
  for (let gs = 3; gs <= groupSizeLimit; gs++) {
    const groupsCount = Math.ceil(drawSize / gs);
    const byesCount = groupsCount * gs - drawSize;
    const maxPerGroup = Math.ceil(drawSize / groupsCount);
    const maxByesPerGroup = Math.ceil(byesCount / groupsCount);
    if (
      (!byesCount || byesCount < gs) &&
      maxPerGroup === gs &&
      maxPerGroup >= 3 &&
      maxByesPerGroup < 2
    ) {
      valid.push(gs);
    }
  }
  return valid;
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
          if (size < 2) return;
          const updates: Partial<TopologyNode> = { drawSize: size };
          // Auto-correct groupSize if it becomes invalid for the new drawSize
          if (node.structureType === ROUND_ROBIN) {
            const currentGS = node.structureOptions?.groupSize || 4;
            const valid = getValidGroupSizes(size);
            if (!valid.includes(currentGS) && valid.length > 0) {
              updates.structureOptions = { ...node.structureOptions, groupSize: valid[0] };
            }
          }
          callbacks.onUpdateNode(node.id, updates);
        },
      },
    ];

    // Round Robin group size field
    const isRR = node.structureType === ROUND_ROBIN;
    if (isRR) {
      const validSizes = getValidGroupSizes(node.drawSize);
      const currentGroupSize = node.structureOptions?.groupSize || 4;
      // Ensure current value is in the list even if drawSize changed
      const groupSizeOptions = validSizes.includes(currentGroupSize)
        ? validSizes
        : [currentGroupSize, ...validSizes].sort((a, b) => a - b);
      const groupCount = Math.ceil(node.drawSize / currentGroupSize);

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

      items.push({
        label: 'Groups',
        field: 'groupCount',
        value: String(groupCount),
        disabled: true,
      });

      if (!isReadOnly) {
        relationships.push({
          control: 'groupSize',
          onChange: ({ e }: any) => {
            const newGroupSize = parseInt(e.target.value);
            callbacks.onUpdateNode(node.id, {
              structureOptions: { ...node.structureOptions, groupSize: newGroupSize },
            });
          },
        });
      }

      // Advance Per Group — editable dropdown (1 to groupSize)
      const positionEdges = state.edges.filter(
        (e) => e.sourceNodeId === node.id && e.linkType === POSITION,
      );
      const allPositions = new Set(positionEdges.flatMap((e) => e.finishingPositions || []));
      const advanceCount = allPositions.size || 0;
      const advanceOptions = Array.from({ length: currentGroupSize }, (_, i) => i + 1);

      items.push({
        label: 'Advance Per Group',
        field: 'advancePerGroup',
        value: String(advanceCount),
        disabled: isReadOnly || positionEdges.length === 0,
        options: advanceOptions.map((n: number) => ({
          label: String(n),
          value: String(n),
          selected: n === advanceCount,
        })),
      });

      if (!isReadOnly && positionEdges.length > 0) {
        relationships.push({
          control: 'advancePerGroup',
          onChange: ({ e }: any) => {
            const newAdvance = parseInt(e.target.value);
            const currentAdvance = allPositions.size;
            if (newAdvance === currentAdvance) return;

            if (newAdvance > currentAdvance) {
              // Add unclaimed positions to the last POSITION edge
              const lastEdge = positionEdges[positionEdges.length - 1];
              const toAdd: number[] = [];
              for (let p = 1; p <= currentGroupSize && allPositions.size + toAdd.length < newAdvance; p++) {
                if (!allPositions.has(p)) toAdd.push(p);
              }
              if (toAdd.length > 0) {
                callbacks.onUpdateEdge(lastEdge.id, {
                  finishingPositions: [...(lastEdge.finishingPositions || []), ...toAdd].sort((a, b) => a - b),
                });
              }
            } else {
              // Remove highest positions across all edges
              const sortedPositions = [...allPositions].sort((a, b) => b - a);
              const toRemove = new Set(sortedPositions.slice(0, currentAdvance - newAdvance));
              for (const edge of positionEdges) {
                const filtered = (edge.finishingPositions || []).filter((p) => !toRemove.has(p));
                if (filtered.length !== (edge.finishingPositions || []).length) {
                  callbacks.onUpdateEdge(edge.id, { finishingPositions: filtered });
                }
              }
            }
          },
        });
      }

      // Show playoff targets summary
      if (positionEdges.length > 0 && advanceCount > 0) {
        const byTarget = new Map<string, number[]>();
        for (const edge of positionEdges) {
          if (!byTarget.has(edge.targetNodeId)) byTarget.set(edge.targetNodeId, []);
          byTarget.get(edge.targetNodeId)!.push(...(edge.finishingPositions || []));
        }

        const targetSummaries: string[] = [];
        for (const [targetId, positions] of byTarget) {
          const targetNode = state.nodes.find((n) => n.id === targetId);
          const sorted = [...new Set(positions)].sort();
          const posLabel = sorted.length === 1 ? `P${sorted[0]}` : `P${sorted.join(',')}`;
          targetSummaries.push(`${posLabel} → ${targetNode?.structureName || '?'} (${sorted.length * groupCount})`);
        }

        if (targetSummaries.length > 0) {
          items.push({
            label: 'Playoff Groups',
            field: 'playoffSummary',
            value: targetSummaries.join('\n'),
            disabled: true,
          });
        }
      }
    }

    // Playoff draw type for PLAY_OFF nodes receiving POSITION edges from RR
    if (node.stage === PLAY_OFF) {
      const inboundPositionEdge = state.edges.find(
        (e) => e.targetNodeId === node.id && e.linkType === POSITION,
      );
      if (inboundPositionEdge) {
        const sourceNode = state.nodes.find((n) => n.id === inboundPositionEdge.sourceNodeId);
        if (sourceNode?.structureType === ROUND_ROBIN) {
          const currentDrawType = node.structureOptions?.playoffDrawType || SINGLE_ELIMINATION;
          items.push({
            label: 'Playoff Draw Type',
            field: 'playoffDrawType',
            value: currentDrawType,
            disabled: isReadOnly,
            options: PLAYOFF_DRAW_TYPES.map((d) => ({ ...d, selected: d.value === currentDrawType })),
          });
          if (!isReadOnly) {
            relationships.push({
              control: 'playoffDrawType',
              onChange: ({ e }: any) =>
                callbacks.onUpdateNode(node.id, {
                  structureOptions: { ...node.structureOptions, playoffDrawType: e.target.value },
                }),
            });
          }

          // Group size for RR playoff type
          if (currentDrawType === ROUND_ROBIN) {
            const playoffGroupSize = node.structureOptions?.groupSize || 4;
            items.push({
              label: 'Playoff Group Size',
              field: 'playoffGroupSize',
              value: String(playoffGroupSize),
              disabled: isReadOnly,
              options: [3, 4, 5, 6, 8].map((n: number) => ({
                label: String(n),
                value: String(n),
                selected: n === playoffGroupSize,
              })),
            });
            if (!isReadOnly) {
              relationships.push({
                control: 'playoffGroupSize',
                onChange: ({ e }: any) =>
                  callbacks.onUpdateNode(node.id, {
                    structureOptions: { ...node.structureOptions, groupSize: parseInt(e.target.value) },
                  }),
              });
            }
          }
        }
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
      formatTrigger.onclick = () => {
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

    // Delete button (hidden in readOnly or hideDelete mode)
    if (!isReadOnly && !callbacks.hideDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'sp-btn sp-btn--danger sp-btn--full';
      deleteBtn.style.marginTop = '12px';
      deleteBtn.textContent = 'Delete Structure';
      deleteBtn.onclick = () => callbacks.onDeleteNode(node.id);
      body.appendChild(deleteBtn);
    }

    root.appendChild(body);
  }

  return { element: root, update };
}
