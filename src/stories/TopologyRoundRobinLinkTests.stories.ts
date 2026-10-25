/**
 * Topology builder — round robin links labelled POSITION or WINNER, play tests.
 *
 * A link out of a round robin is directed by its finishingPositions whether it is labelled POSITION or WINNER, and a
 * sourceRoundNumber on it decides nothing (CA ruling 2026-10-23). Records converted from classic TMX carry WINNER, so
 * a draw hydrated into the builder can hand it a WINNER-labelled round robin edge. Each story loads one shape of the
 * same two edges (round robin → Gold [1], → Silver [2]) with the first edge selected, and asserts the canvas and the
 * edge editor treat it as a finishing-position edge: drawn as a position edge, chips on the card, the per-group
 * checkboxes in the editor and no round fields. The two control stories assert the round fields DO appear for a
 * round edge, so an editor that never shows them cannot pass.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories src/stories/TopologyRoundRobinLinkTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { TopologyBuilderControl } from '../components/topology-builder/controller/topologyBuilderControl';
import type { TopologyEdge, TopologyNode, TopologyState } from '../components/topology-builder/types';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Round Robin Links',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const SOURCE_ROUND = 'Source Round';

type Variant = { linkType: TopologyEdge['linkType']; sourceRoundNumber?: number };

const node = (
  id: string,
  stage: TopologyNode['stage'],
  structureType: string,
  drawSize: number,
  x: number,
  y = 40
) => ({
  id,
  structureName: id,
  stage,
  structureType,
  drawSize,
  position: { x, y }
});

type Selection = Pick<TopologyState, 'selectedNodeId' | 'selectedEdgeId'>;

function render(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  selection: Selection = { selectedNodeId: null, selectedEdgeId: 'e1' }
): HTMLElement {
  const container = document.createElement('div');
  container.style.height = '700px';
  const state: Partial<TopologyState> = {
    drawName: 'RR links',
    nodes,
    edges,
    ...selection
  };
  new TopologyBuilderControl({ initialState: state, hideTemplates: true }).render(container);
  return container;
}

function renderRoundRobin(variant: Variant, selection?: Selection): HTMLElement {
  const main = { ...node('Groups', 'MAIN', 'ROUND_ROBIN', 16, 40), structureOptions: { groupSize: 4 } };
  return render(
    [
      main,
      node('Gold', 'PLAY_OFF', 'SINGLE_ELIMINATION', 4, 360),
      node('Silver', 'PLAY_OFF', 'SINGLE_ELIMINATION', 4, 360, 220)
    ],
    [
      { id: 'e1', sourceNodeId: 'Groups', targetNodeId: 'Gold', finishingPositions: [1], ...variant },
      { id: 'e2', sourceNodeId: 'Groups', targetNodeId: 'Silver', finishingPositions: [2], ...variant }
    ],
    selection
  );
}

/** the select a node editor renders for a labelled field */
const fieldSelect = (canvasElement: HTMLElement, label: string) =>
  [...canvasElement.querySelectorAll('label')]
    .find((l) => l.textContent?.trim() === label)
    ?.parentElement?.querySelector<HTMLSelectElement>('select');

const editorText = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll('.tb-editor-header')]
    .map((header) => header.parentElement?.textContent || '')
    .find((text) => text.includes('Link Properties')) || '';

async function assertFinishingPositionEdge(canvasElement: HTMLElement) {
  // canvas: both edges drawn as position edges, the card carries their chips and its advance count
  const visiblePaths = [...canvasElement.querySelectorAll('path')].filter((p) => !p.classList.contains('tb-edge-hit'));
  expect(visiblePaths.filter((p) => p.classList.contains('tb-edge--position'))).toHaveLength(2);
  expect(visiblePaths.filter((p) => p.classList.contains('tb-edge--winner'))).toHaveLength(0);
  const chips = [...canvasElement.querySelectorAll('.tb-card-chip')].map((chip) => chip.textContent);
  expect(chips).toEqual(['P1', 'P2']);
  expect(canvasElement.querySelector('.tb-card-advance')?.textContent).toContain('2 of 4 advance');

  // editor: per-group finishing position checkboxes, no round fields
  const text = editorText(canvasElement);
  expect(text).toContain('Link Properties');
  expect(text).toContain('Finishing Positions');
  expect(text).not.toContain(SOURCE_ROUND);
  expect(text).not.toContain('Qualifying Positions');
  const checkboxes = [...canvasElement.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  expect(checkboxes).toHaveLength(4);
  expect(checkboxes.map((cb) => cb.checked)).toEqual([true, false, false, false]);
  // position 2 belongs to the sibling edge whatever its label
  expect(checkboxes[1].disabled).toBe(true);
}

export const PositionLabel: StoryObj = {
  name: 'POSITION → finishing-position edge',
  render: () => renderRoundRobin({ linkType: 'POSITION' }),
  play: async ({ canvasElement }) => assertFinishingPositionEdge(canvasElement)
};

export const PositionLabelWithRound: StoryObj = {
  name: 'POSITION + sourceRoundNumber → finishing-position edge',
  render: () => renderRoundRobin({ linkType: 'POSITION', sourceRoundNumber: 3 }),
  play: async ({ canvasElement }) => assertFinishingPositionEdge(canvasElement)
};

export const WinnerLabel: StoryObj = {
  name: 'WINNER → finishing-position edge',
  render: () => renderRoundRobin({ linkType: 'WINNER' }),
  play: async ({ canvasElement }) => assertFinishingPositionEdge(canvasElement)
};

export const WinnerLabelWithRound: StoryObj = {
  name: 'WINNER + sourceRoundNumber → finishing-position edge',
  render: () => renderRoundRobin({ linkType: 'WINNER', sourceRoundNumber: 3 }),
  play: async ({ canvasElement }) => assertFinishingPositionEdge(canvasElement)
};

export const EliminationWinnerControl: StoryObj = {
  name: 'control: elimination WINNER → round edge',
  render: () =>
    render(
      [
        node('Qualifying', 'QUALIFYING', 'SINGLE_ELIMINATION', 16, 40),
        node('Main', 'MAIN', 'SINGLE_ELIMINATION', 32, 360)
      ],
      [{ id: 'e1', sourceNodeId: 'Qualifying', targetNodeId: 'Main', linkType: 'WINNER', sourceRoundNumber: 2 }]
    ),
  play: async ({ canvasElement }) => {
    const text = editorText(canvasElement);
    expect(text).toContain(SOURCE_ROUND);
    expect(text).toContain('Qualifying Positions');
    expect(canvasElement.querySelectorAll('path.tb-edge--winner')).toHaveLength(1);
  }
};

export const RoundRobinWinnerWithoutPositionsControl: StoryObj = {
  name: 'control: round robin WINNER naming no finishingPositions → not a finishing-position edge',
  render: () =>
    render(
      [
        { ...node('Groups', 'MAIN', 'ROUND_ROBIN', 16, 40), structureOptions: { groupSize: 4 } },
        node('Gold', 'PLAY_OFF', 'SINGLE_ELIMINATION', 4, 360)
      ],
      [{ id: 'e1', sourceNodeId: 'Groups', targetNodeId: 'Gold', linkType: 'WINNER' }]
    ),
  play: async ({ canvasElement }) => {
    const text = editorText(canvasElement);
    expect(text).toContain(SOURCE_ROUND);
    expect(canvasElement.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(canvasElement.querySelectorAll('path.tb-edge--position')).toHaveLength(0);
  }
};

/** the node editor: the round robin's advance count, and the playoff's draw type field, for every shape */
const NODE_VARIANTS: [string, Variant][] = [
  ['POSITION', { linkType: 'POSITION' }],
  ['POSITION + sourceRoundNumber', { linkType: 'POSITION', sourceRoundNumber: 3 }],
  ['WINNER', { linkType: 'WINNER' }],
  ['WINNER + sourceRoundNumber', { linkType: 'WINNER', sourceRoundNumber: 3 }]
];

export const GroupsNodeAdvancePerGroup: StoryObj = {
  name: 'node editor: the round robin advances 2 per group, for every shape',
  render: () => {
    const wrapper = document.createElement('div');
    for (const [name, variant] of NODE_VARIANTS) {
      const panel = renderRoundRobin(variant, { selectedNodeId: 'Groups', selectedEdgeId: null });
      panel.dataset.variant = name;
      wrapper.appendChild(panel);
    }
    return wrapper;
  },
  play: async ({ canvasElement }) => {
    const panels = [...canvasElement.querySelectorAll<HTMLElement>('[data-variant]')];
    expect(panels).toHaveLength(4);
    for (const panel of panels) {
      const select = fieldSelect(panel, 'Advance Per Group');
      expect(select, panel.dataset.variant).toBeTruthy();
      expect(select?.value, panel.dataset.variant).toBe('2');
      expect(select?.disabled, panel.dataset.variant).toBe(false);
    }
  }
};

export const PlayoffNodeDrawType: StoryObj = {
  name: 'node editor: a playoff fed by the round robin offers its draw type, for every shape',
  render: () => {
    const wrapper = document.createElement('div');
    for (const [name, variant] of NODE_VARIANTS) {
      const panel = renderRoundRobin(variant, { selectedNodeId: 'Gold', selectedEdgeId: null });
      panel.dataset.variant = name;
      wrapper.appendChild(panel);
    }
    return wrapper;
  },
  play: async ({ canvasElement }) => {
    const panels = [...canvasElement.querySelectorAll<HTMLElement>('[data-variant]')];
    expect(panels).toHaveLength(4);
    for (const panel of panels) {
      expect(fieldSelect(panel, 'Playoff Draw Type'), panel.dataset.variant).toBeTruthy();
    }
  }
};
