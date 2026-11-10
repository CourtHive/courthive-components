import { changesKey, stageAcceptanceEntries, stageEntryChanges } from '../domain/acceptanceLine';
import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import type { AcceptanceEntry, TopologyState } from '../types';
import { expect, it } from 'vitest';

const DA = 'DIRECT_ACCEPTANCE';
const ALT = 'ALTERNATE';
const entries: AcceptanceEntry[] = [
  { participantId: 'a', name: 'A', entryStatus: DA, entryStage: 'MAIN', rankOrder: 0 },
  { participantId: 'b', name: 'B', entryStatus: DA, entryStage: 'MAIN', rankOrder: 1 },
  { participantId: 'q', name: 'Q', entryStatus: DA, entryStage: 'QUALIFYING', rankOrder: 2 },
  { participantId: 'qa', name: 'QA', entryStatus: ALT, entryStage: 'QUALIFYING', rankOrder: 3 }
];
const state: TopologyState = {
  nodes: [
    {
      id: 'main',
      stage: 'MAIN',
      structureType: 'SINGLE_ELIMINATION',
      structureName: 'Main',
      drawSize: 2,
      position: { x: 320, y: 40 }
    },
    {
      id: 'q',
      stage: 'QUALIFYING',
      structureType: 'SINGLE_ELIMINATION',
      structureName: 'Qualifying',
      drawSize: 2,
      qualifyingPositions: 1,
      position: { x: 40, y: 40 }
    }
  ],
  edges: [
    {
      id: 'edge',
      sourceNodeId: 'q',
      targetNodeId: 'main',
      linkType: 'WINNER',
      targetRoundNumber: 1,
      sourceRoundNumber: 1
    }
  ],
  selectedNodeId: null,
  selectedEdgeId: null,
  drawName: '',
  proposalEntryChanges: [{ participantId: 'b', from: DA, to: DA, toStage: 'QUALIFYING' }]
};

it('keeps MAIN origins on the main line, and adds them to the ranked qualifying line', () => {
  expect(
    stageAcceptanceEntries(entries, state, 'MAIN').map((entry) => [entry.participantId, entry.entryStatus])
  ).toEqual([
    ['a', DA],
    ['b', ALT]
  ]);
  expect(stageAcceptanceEntries(entries, state, 'QUALIFYING').map((entry) => entry.participantId)).toEqual([
    'b',
    'q',
    'qa'
  ]);
  expect(stageEntryChanges(entries, state)).toEqual(state.proposalEntryChanges);
});

it('moves the main line back without moving any original qualifying entrant to MAIN', () => {
  const changes = stageEntryChanges(entries, { ...state, acceptanceCuts: { MAIN: 2 } });
  expect(changes).toEqual([]);
  expect(
    stageAcceptanceEntries(entries, { ...state, acceptanceCuts: { MAIN: 2 } }, 'QUALIFYING').map(
      (entry) => entry.participantId
    )
  ).toEqual(['q', 'qa']);
});

it('adjusts the qualifying cut while retaining the original MAIN source of a stage move', () => {
  const changes = stageEntryChanges(entries, { ...state, acceptanceCuts: { QUALIFYING: 0 } });
  expect(changes).toEqual([
    { participantId: 'b', from: DA, to: ALT, toStage: 'QUALIFYING' },
    { participantId: 'q', from: DA, to: ALT, fromStage: 'QUALIFYING' }
  ]);
});

it('the main cut feeds qualifying, whose own line can leave entrants as qualifying alternates', () => {
  const changes = stageEntryChanges(entries, {
    ...state,
    proposalEntryChanges: undefined,
    acceptanceCuts: { MAIN: 1, QUALIFYING: 1 }
  });
  expect(changes).toEqual([
    { participantId: 'b', from: DA, to: DA, toStage: 'QUALIFYING' },
    { participantId: 'q', from: DA, to: ALT, fromStage: 'QUALIFYING' }
  ]);
});

it('source and destination stages distinguish the fit cache and requested limits survive conversion', () => {
  expect(changesKey([{ participantId: 'same', from: DA, to: ALT }])).not.toBe(
    changesKey([{ participantId: 'same', from: DA, to: ALT, fromStage: 'QUALIFYING' }])
  );
  expect(
    topologyToDrawOptions({ ...state, constraintOverrides: { drawSize: 64 } }).drawOptions.constraintOverrides
  ).toEqual({ drawSize: 64 });
});
