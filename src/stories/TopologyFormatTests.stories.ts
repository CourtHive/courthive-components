/**
 * Topology builder — a structure's matchUp format (CA, 2026-11-17).
 *
 * A structure added on the canvas starts on the host's default format (TMX: the event's, its competition format's,
 * or Standard Advantage) rather than "Not set"; the properties pane titles the format as it titles every field.
 *
 * Run as tests: `pnpm test:stories src/stories/TopologyFormatTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';
import { TopologyBuilderControl } from '../components/topology-builder/controller/topologyBuilderControl';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

const meta: Meta = {
  title: 'Policies & Setup/Topology Builder/Tests/Format',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const STANDARD_ADVANTAGE = 'SET3-S:6/TB7';
let control: TopologyBuilderControl;

export const AnAddedStructureStartsOnTheHostDefault: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'width: 1000px; height: 560px;';
    control = new TopologyBuilderControl({ defaultMatchUpFormat: STANDARD_ADVANTAGE });
    control.render(container);
    return container;
  },
  play: async ({ canvasElement }) => {
    const addStructure = [...canvasElement.querySelectorAll<HTMLButtonElement>('.tb-toolbar-wrapper button')].find(
      (button) => button.textContent?.trim() === 'Add Structure'
    )!;
    await user.click(addStructure);
    const qualifying = await waitFor(() => {
      const item = [...document.querySelectorAll<HTMLElement>('.dropdown-item')].find(
        (i) => i.textContent?.trim() === 'Qualifying'
      );
      if (!item) throw new Error('menu not open');
      return item;
    });
    await user.click(qualifying);

    const node = control.getState().nodes.find((n) => n.stage === 'QUALIFYING')!;
    await expect(node.matchUpFormat).toBe(STANDARD_ADVANTAGE);
    // a new qualifying structure's count is one its size produces: a quarter of 16
    await expect(node.qualifyingPositions).toBe(4);

    control.loadState({ ...control.getState(), selectedNodeId: node.id });
    const trigger = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('.tb-format-trigger');
      if (!element) throw new Error('properties not shown');
      return element;
    });
    await expect(trigger).toHaveTextContent(STANDARD_ADVANTAGE);
    // the format's title is the form's own label, the size of every other field's
    const title = trigger.previousElementSibling as HTMLElement;
    await expect(title.className).toBe('label');
    const fieldLabel = canvasElement.querySelector<HTMLElement>('.field .label:not(:empty)')!;
    await expect(getComputedStyle(title).fontSize).toBe(getComputedStyle(fieldLabel).fontSize);
  }
};
