/**
 * LUCKY_DRAW round profiles in the topology builder — play tests (CA, 2026-11-08).
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories src/stories/TopologyLuckyRoundProfileTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';
import '../components/roundProfile/roundProfileEditor.css';

import { TopologyBuilderControl } from '../components/topology-builder/controller/topologyBuilderControl';
import { drawDefinitionConstants } from 'tods-competition-factory';
import { expect } from 'storybook/test';

import type { TopologyNode } from '../components/topology-builder/types';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { LUCKY_DRAW, MAIN } = drawDefinitionConstants;

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Lucky Round Profile',
  tags: ['!dev']
};
export default meta;
type Story = StoryObj;

const EDITOR = '[data-testid="round-profile-editor"]';
const CELL = '.rpe__cell';

let controller: TopologyBuilderControl;
const mount = (drawSize = 40, structureOptions?: any) => {
  const container = document.createElement('div');
  container.style.height = '720px';
  const node: TopologyNode = {
    id: 'main',
    structureName: 'Lucky Draw',
    stage: MAIN as TopologyNode['stage'],
    structureType: LUCKY_DRAW,
    drawSize,
    structureOptions,
    position: { x: 40, y: 40 }
  };
  controller = new TopologyBuilderControl({
    initialState: { drawName: 'Lucky', nodes: [node], edges: [], selectedNodeId: 'main', selectedEdgeId: null }
  });
  controller.render(container);
  return container;
};

const mainNode = () => controller.getState().nodes.find((n) => n.id === 'main')!;
const cells = (root: HTMLElement) => [...root.querySelectorAll<HTMLInputElement>(`${EDITOR} ${CELL}`)];
const setCell = (root: HTMLElement, index: number, value: string) => {
  const cell = cells(root)[index];
  cell.value = value;
  cell.dispatchEvent(new Event('change'));
};
export const EditStoresTheProfile: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(EDITOR)).toBeTruthy();
    await expect(cells(canvasElement).map((c) => Number(c.value))).toEqual([20, 10, 5, 3, 2, 1]);
    // untouched: no explicit profile, the factory derives the same cascade
    await expect(mainNode().structureOptions?.roundProfile).toBeUndefined();

    setCell(canvasElement, 1, '12');
    await expect(mainNode().structureOptions?.roundProfile).toEqual([20, 12, 6, 3, 2, 1]);
    // the panel re-renders from the stored profile
    await expect(cells(canvasElement).map((c) => Number(c.value))).toEqual([20, 12, 6, 3, 2, 1]);
  }
};

export const ResetStoresNothing: Story = {
  render: () => mount(40, { roundProfile: [20, 12, 8, 4, 2, 1] }),
  play: async ({ canvasElement }) => {
    await expect(cells(canvasElement).map((c) => Number(c.value))).toEqual([20, 12, 8, 4, 2, 1]);
    canvasElement.querySelector<HTMLButtonElement>(`${EDITOR} .rpe__reset`)!.click();
    await expect(mainNode().structureOptions?.roundProfile).toBeUndefined();
  }
};

export const DrawSizeChangeDropsTheProfile: Story = {
  render: () => mount(40, { roundProfile: [20, 12, 8, 4, 2, 1] }),
  play: async ({ canvasElement }) => {
    // The node editor's inputs carry no id; find the one under its "Draw Size" label, as an operator would.
    const drawSize = [...canvasElement.querySelectorAll<HTMLElement>('.tb-editor-body .field')]
      .find((field) => field.querySelector('label')?.textContent?.trim() === 'Draw Size')
      ?.querySelector<HTMLInputElement>('input');
    await expect(drawSize).toBeTruthy();
    drawSize!.value = '48';
    drawSize!.dispatchEvent(new Event('input', { bubbles: true }));
    drawSize!.dispatchEvent(new Event('change', { bubbles: true }));
    await expect(mainNode().drawSize).toBe(48);
    await expect(mainNode().structureOptions?.roundProfile).toBeUndefined();
    await expect(cells(canvasElement).map((c) => Number(c.value))).toEqual([24, 12, 6, 3, 2, 1]);
  }
};

export const OddDrawSizeHasNoProfile: Story = {
  render: () => mount(11),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(`${EDITOR}.rpe--disabled`)).toBeTruthy();
    await expect(cells(canvasElement)).toHaveLength(0);
  }
};
