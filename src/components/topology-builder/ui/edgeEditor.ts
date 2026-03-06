/**
 * Edge Editor — Side panel form for editing selected edge properties.
 * Uses renderForm (items + relationships) pattern.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { renderForm } from '../../forms/renderForm';
import { getPlayoffProfiles } from '../domain/playoffProfilesCache';
import type { TopologyEdge, TopologyState, UIPanel } from '../types';

const { WINNER, LOSER, TOP_DOWN, BOTTOM_UP, QUALIFYING, ROUND_ROBIN } = drawDefinitionConstants;
const POSITION = 'POSITION';
const ALTERNATING = 'ALTERNATING';

const isRoundRobin = (structureType: string) => structureType === ROUND_ROBIN;

const LINK_TYPES = [
  { label: 'Winner', value: WINNER },
  { label: 'Loser', value: LOSER },
  { label: 'Position', value: POSITION },
];

const FEED_PROFILES = [
  { label: 'Top-Down', value: TOP_DOWN },
  { label: 'Bottom-Up', value: BOTTOM_UP },
  { label: 'Alternating', value: ALTERNATING },
];

export interface EdgeEditorCallbacks {
  onUpdateEdge: (edgeId: string, updates: Partial<TopologyEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
  readOnly?: boolean;
}

export function buildEdgeEditor(callbacks: EdgeEditorCallbacks): UIPanel<TopologyState> {
  const root = document.createElement('div');
  const isReadOnly = !!callbacks.readOnly;

  function update(state: TopologyState): void {
    root.innerHTML = '';
    const edge = state.selectedEdgeId
      ? state.edges.find((e) => e.id === state.selectedEdgeId)
      : null;

    if (!edge) return;

    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    const target = state.nodes.find((n) => n.id === edge.targetNodeId);

    const header = document.createElement('div');
    header.className = 'tb-editor-header';
    header.textContent = 'Link Properties';
    root.appendChild(header);

    const body = document.createElement('div');
    body.className = 'tb-editor-body';

    // Connection info
    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:var(--chc-text-muted);margin-bottom:8px;';
    info.textContent = `${source?.structureName || 'Source'} → ${target?.structureName || 'Target'}`;
    body.appendChild(info);

    const isQualifyingWinner = edge.linkType === WINNER && source?.stage === QUALIFYING;
    const sourceMaxRound = source ? Math.ceil(Math.log2(source.drawSize)) : 8;
    const targetMaxRound = target ? Math.ceil(Math.log2(target.drawSize)) : 8;
    const isRRPosition = edge.linkType === POSITION && source && isRoundRobin(source.structureType);

    const items: any[] = [
      {
        label: 'Link Type',
        field: 'linkType',
        value: edge.linkType,
        disabled: isReadOnly,
        options: LINK_TYPES.map((lt) => ({ ...lt, selected: lt.value === edge.linkType })),
      },
    ];

    const relationships: any[] = isReadOnly ? [] : [
      {
        control: 'linkType',
        onChange: ({ e }: any) =>
          callbacks.onUpdateEdge(edge.id, { linkType: e.target.value }),
      },
    ];

    // Hide round fields for RR POSITION links (not applicable)
    if (!isRRPosition) {
      // Build Source Round field — dropdown from playoff profiles when available
      const profiles = source
        ? getPlayoffProfiles(source.structureType, source.drawSize, source.structureOptions?.groupSize)
        : {};
      const hasRoundRanges = profiles.playoffRoundsRanges && profiles.playoffRoundsRanges.length > 0;

      if (hasRoundRanges) {
        const roundOptions = profiles.playoffRoundsRanges!.map((r) => ({
          label: `R${r.roundNumber} (${r.finishingPositionRange})`,
          value: String(r.roundNumber),
          selected: r.roundNumber === (edge.sourceRoundNumber || sourceMaxRound),
        }));
        items.push({
          label: 'Source Round',
          field: 'sourceRoundNumber',
          value: String(edge.sourceRoundNumber || sourceMaxRound),
          disabled: isReadOnly,
          options: roundOptions,
        });
      } else {
        items.push({
          label: 'Source Round',
          field: 'sourceRoundNumber',
          type: 'number',
          value: String(edge.sourceRoundNumber || sourceMaxRound),
          disabled: isReadOnly,
        });
      }

      items.push({
        label: isQualifyingWinner ? 'Enter at Round' : 'Target Round',
        field: 'targetRoundNumber',
        type: 'number',
        value: String(edge.targetRoundNumber || 0),
        disabled: isReadOnly,
      });

      if (!isReadOnly) {
        if (hasRoundRanges) {
          relationships.push({
            control: 'sourceRoundNumber',
            onChange: ({ e }: any) => {
              const val = parseInt(e.target.value) || 0;
              callbacks.onUpdateEdge(edge.id, { sourceRoundNumber: val || undefined });
            },
          });
        } else {
          relationships.push({
            control: 'sourceRoundNumber',
            onChange: ({ inputs }: any) => {
              const val = parseInt(inputs.sourceRoundNumber.value) || 0;
              const clamped = Math.max(0, Math.min(val, sourceMaxRound));
              callbacks.onUpdateEdge(edge.id, { sourceRoundNumber: clamped || undefined });
            },
          });
        }

        relationships.push({
          control: 'targetRoundNumber',
          onChange: ({ inputs }: any) => {
            const val = parseInt(inputs.targetRoundNumber.value) || 0;
            const clamped = Math.max(0, Math.min(val, targetMaxRound));
            callbacks.onUpdateEdge(edge.id, { targetRoundNumber: clamped || undefined });
          },
        });
      }
    }

    // Qualifying positions (for WINNER links from qualifying structures)
    if (isQualifyingWinner && source) {
      const maxPositions = Math.floor(source.drawSize / 2);
      const defaultPositions = Math.floor(source.drawSize / 4);
      const currentValue = edge.qualifyingPositions || defaultPositions;
      items.push({
        label: 'Qualifying Positions',
        field: 'qualifyingPositions',
        type: 'number',
        value: String(currentValue),
        disabled: isReadOnly,
      });
      if (!isReadOnly) {
        relationships.push({
          control: 'qualifyingPositions',
          onChange: ({ inputs }: any) => {
            const val = parseInt(inputs.qualifyingPositions.value) || 1;
            const clamped = Math.max(1, Math.min(val, maxPositions));
            callbacks.onUpdateEdge(edge.id, { qualifyingPositions: clamped });
          },
        });
      }
    }

    // Feed profile (for LOSER links)
    if (edge.linkType === LOSER) {
      items.push({
        label: 'Feed Profile',
        field: 'feedProfile',
        value: edge.feedProfile || TOP_DOWN,
        disabled: isReadOnly,
        options: FEED_PROFILES.map((fp) => ({
          ...fp,
          selected: fp.value === (edge.feedProfile || TOP_DOWN),
        })),
      });
      if (!isReadOnly) {
        relationships.push({
          control: 'feedProfile',
          onChange: ({ e }: any) =>
            callbacks.onUpdateEdge(edge.id, { feedProfile: e.target.value }),
        });
      }
    }

    // Finishing positions (for POSITION links)
    if (edge.linkType === POSITION && !isRRPosition) {
      items.push({
        label: 'Finishing Positions',
        field: 'finishingPositions',
        value: (edge.finishingPositions || []).join(', '),
        placeholder: 'e.g., 1, 2',
        disabled: isReadOnly,
      });
      if (!isReadOnly) {
        relationships.push({
          control: 'finishingPositions',
          onChange: ({ inputs }: any) => {
            const positions = inputs.finishingPositions.value
              .split(',')
              .map((v: string) => parseInt(v.trim()))
              .filter((n: number) => !isNaN(n));
            callbacks.onUpdateEdge(edge.id, { finishingPositions: positions });
          },
        });
      }
    }

    renderForm(body, items, relationships);

    // Checkbox-based finishing positions for RR POSITION links
    if (isRRPosition && source) {
      const groupSize = source.structureOptions?.groupSize || 4;
      const currentPositions = new Set(edge.finishingPositions || []);

      // Check which positions are claimed by other POSITION links from the same source
      const otherPositionEdges = state.edges.filter(
        (e) => e.id !== edge.id && e.sourceNodeId === edge.sourceNodeId && e.linkType === POSITION,
      );
      const claimedPositions = new Set<number>();
      for (const other of otherPositionEdges) {
        for (const pos of other.finishingPositions || []) {
          claimedPositions.add(pos);
        }
      }

      const posField = document.createElement('div');
      posField.className = 'field';
      posField.style.marginBottom = '10px';

      const posLabel = document.createElement('label');
      posLabel.style.cssText = 'font-size:11px;font-weight:600;color:var(--chc-text-secondary);margin-bottom:3px;display:block;';
      posLabel.textContent = 'Finishing Positions';
      posField.appendChild(posLabel);

      for (let i = 1; i <= groupSize; i++) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;padding:2px 0;cursor:pointer;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = currentPositions.has(i);
        const isClaimed = claimedPositions.has(i);
        if (isReadOnly || isClaimed) {
          cb.disabled = true;
        } else {
          cb.addEventListener('change', () => {
            const updated = new Set(currentPositions);
            if (cb.checked) {
              updated.add(i);
            } else {
              updated.delete(i);
            }
            callbacks.onUpdateEdge(edge.id, { finishingPositions: Array.from(updated).sort() });
          });
        }

        const labelText = document.createElement('span');
        labelText.textContent = `Position ${i}`;

        if (isClaimed) {
          labelText.style.color = 'var(--chc-text-muted, #999)';
          labelText.title = 'Used by another link';
          row.style.opacity = '0.5';
          row.style.cursor = 'not-allowed';
        }

        row.appendChild(cb);
        row.appendChild(labelText);
        posField.appendChild(row);
      }

      body.appendChild(posField);
    }

    // Delete button (hidden in readOnly mode)
    if (!isReadOnly) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'sp-btn sp-btn--danger sp-btn--full';
      deleteBtn.style.marginTop = '12px';
      deleteBtn.textContent = 'Delete Link';
      deleteBtn.onclick = () => callbacks.onDeleteEdge(edge.id);
      body.appendChild(deleteBtn);
    }

    root.appendChild(body);
  }

  return { element: root, update };
}
